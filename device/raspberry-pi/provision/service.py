#!/usr/bin/env python3
"""Wi-Fi setup for the KinetoFun TV box: hotspot, phone setup page and status for the TV screen."""
import argparse
import json
import os
import queue
import re
import socket
import ssl
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import logic  # noqa: E402

HOTSPOT_NAME = "kinetofun-hotspot"
TRY_NAME = "kinetofun-try"
HOTSPOT_ADDR = "192.168.4.1"
PORTAL_URL = "http://%s/" % HOTSPOT_ADDR
# tmpfs, so the hotspot password survives a service restart but not a reboot.
PASSWORD_FILE = "/run/kinetofun-hotspot-password"
SO_BINDTODEVICE = getattr(socket, "SO_BINDTODEVICE", 25)

REAL_TIMINGS = {
    "boot_saved": 120,
    "boot_none": 20,
    "poll": 3,
    "retry_every": 180,
    "retry_window": 30,
    "reply_grace": 2.5,
    "internet_wait": 20,
    "tick": 5,
}
FAKE_TIMINGS = dict(REAL_TIMINGS, boot_saved=4, boot_none=2, retry_every=60, retry_window=4, internet_wait=3)


def log(msg):
    print(msg, flush=True)


def run(args, timeout=60):
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except subprocess.TimeoutExpired:
        return 124, "timeout"
    except FileNotFoundError:
        return 127, "%s not found" % args[0]


def site_reachable(origin, iface=None, timeout=8):
    """True when the site serves its logo; bound to iface so a cable can't make Wi-Fi look online."""
    u = urlsplit(origin)
    host = u.hostname
    https = u.scheme == "https"
    port = u.port or (443 if https else 80)
    try:
        addrs = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
    except OSError:
        return False
    for family, kind, proto, _, addr in addrs[:3]:
        sock = socket.socket(family, kind, proto)
        sock.settimeout(timeout)
        try:
            if iface:
                sock.setsockopt(socket.SOL_SOCKET, SO_BINDTODEVICE, iface.encode())
            sock.connect(addr)
            if https:
                ctx = ssl.create_default_context()
                # The clock may be wrong until it syncs, so the certificate can't be checked yet.
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                sock = ctx.wrap_socket(sock, server_hostname=host)
            req = "HEAD /logo.png HTTP/1.1\r\nHost: %s\r\nUser-Agent: kinetofun-tv\r\nConnection: close\r\n\r\n" % host
            sock.sendall(req.encode("ascii"))
            head = b""
            while b"\r\n\r\n" not in head and len(head) < 16384:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                head += chunk
            text = head.decode("latin-1").lower()
            # A hotel login page also answers, so only our own logo counts.
            if re.match(r"http/1\.[01] 200", text) and re.search(r"^content-type:\s*image/png", text, re.M):
                return True
        except OSError:
            pass
        finally:
            sock.close()
    return False


class NmNetwork:
    """Wi-Fi control through NetworkManager's nmcli."""

    def __init__(self, iface, origin):
        self.iface = iface
        self.origin = origin

    def radio_on(self):
        run(["nmcli", "radio", "wifi", "on"])

    def wifi_available(self):
        code, out = run(["nmcli", "-t", "-f", "DEVICE,STATE", "device"])
        for line in out.splitlines():
            fields = logic.split_terse(line)
            if len(fields) >= 2 and fields[0] == self.iface:
                return fields[1] not in ("unavailable", "unmanaged")
        return False

    def ethernet_connected(self):
        code, out = run(["nmcli", "-t", "-f", "TYPE,STATE", "device"])
        return code == 0 and logic.ethernet_connected(out)

    def mac(self):
        try:
            with open("/sys/class/net/%s/address" % self.iface) as f:
                return f.read().strip()
        except OSError:
            return ""

    def saved_wifi(self):
        code, out = run(["nmcli", "-t", "-f", "NAME,UUID,TYPE", "connection", "show"])
        return [p for p in logic.parse_profiles(out) if p["name"] != HOTSPOT_NAME] if code == 0 else []

    def profile_ssid(self, uuid):
        code, out = run(["nmcli", "-t", "-g", "802-11-wireless.ssid", "connection", "show", uuid])
        # Rejoining the split fields undoes terse escaping whether or not nmcli applied it.
        return ":".join(logic.split_terse(out.strip())) if code == 0 else None

    def delete_profile(self, uuid):
        run(["nmcli", "connection", "delete", uuid])

    def prune_profiles(self, ssid, keep):
        for p in self.saved_wifi():
            if p["uuid"] not in keep and self.profile_ssid(p["uuid"]) == ssid:
                self.delete_profile(p["uuid"])

    def scan(self, rescan=True):
        code, out = run(["nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY", "device", "wifi", "list",
                         "ifname", self.iface, "--rescan", "yes" if rescan else "no"], timeout=30)
        return logic.parse_scan(out) if code == 0 else []

    def hotspot_up(self, ssid, password):
        self.hotspot_delete()
        code, _ = run([
            "nmcli", "connection", "add", "type", "wifi", "ifname", self.iface,
            "con-name", HOTSPOT_NAME, "autoconnect", "no", "ssid", ssid,
            "802-11-wireless.mode", "ap", "802-11-wireless.band", "bg", "802-11-wireless.channel", "6",
            "ipv4.method", "shared", "ipv4.addresses", HOTSPOT_ADDR + "/24", "ipv6.method", "disabled",
            # WPA2/CCMP only and no PMF: the Pi's Wi-Fi chip and some phones fail to pair otherwise.
            "wifi-sec.key-mgmt", "wpa-psk", "wifi-sec.proto", "rsn", "wifi-sec.pairwise", "ccmp",
            "wifi-sec.group", "ccmp", "wifi-sec.pmf", "disable", "wifi-sec.psk", password,
        ])
        if code != 0:
            return False
        code, _ = run(["nmcli", "--wait", "20", "connection", "up", HOTSPOT_NAME], timeout=30)
        return code == 0

    def hotspot_down(self):
        run(["nmcli", "connection", "down", HOTSPOT_NAME])

    def hotspot_delete(self):
        run(["nmcli", "connection", "delete", HOTSPOT_NAME])

    def clients(self):
        code, out = run(["iw", "dev", self.iface, "station", "dump"])
        return logic.count_stations(out) if code == 0 else None

    def hold_autoconnect(self, hold):
        # While held, NetworkManager does not rejoin a saved network on its own. Without this it
        # does so the moment the hotspot stops, racing the attempt and emptying its scan.
        run(["nmcli", "device", "set", self.iface, "autoconnect", "no" if hold else "yes"])

    def device_state(self):
        code, out = run(["nmcli", "-g", "GENERAL.STATE", "device", "show", self.iface])
        return out.strip() if code == 0 else ""

    def connect(self, ssid, password, hidden, sae_only=False):
        """Join a network through a fresh profile; returns (error_code or None, kept uuids, detail).

        `nmcli device wifi connect` refuses any password for an SSID that already has a saved
        profile ("key-mgmt: property is missing"), so a changed router password could never be
        entered. A separate profile also leaves the saved one untouched when the attempt fails.
        """
        self.delete_profile(TRY_NAME)
        if not hidden:
            # The scan cache is stale after hotspot mode, so look a couple of times. A scan that
            # finds nothing at all means the chip was busy, not that the network is gone.
            seen_any = False
            for _ in range(3):
                found = self.scan(rescan=True)
                if any(n["ssid"] == ssid for n in found):
                    break
                seen_any = seen_any or bool(found)
                time.sleep(3)
            else:
                if seen_any:
                    return "not_found", [], "not in scan"
        args = ["nmcli", "connection", "add", "type", "wifi", "ifname", self.iface, "con-name", TRY_NAME,
                "autoconnect", "yes", "ssid", ssid] + logic.security_args(password, sae_only)
        if hidden:
            args += ["802-11-wireless.hidden", "yes"]
        code, out = run(args)
        uuid = logic.added_uuid(out)
        if code != 0 or not uuid:
            return "failed", [], logic.first_error_line(out)
        # Association plus a slow router's DHCP can take most of a minute.
        code, out = run(["nmcli", "--wait", "60", "connection", "up", uuid], timeout=75)
        if code != 0:
            error = logic.classify_connect_error(code, out, self.device_state())
            self.delete_profile(uuid)
            return error, [], logic.first_error_line(out)
        return None, [uuid], ""

    def keep_profile(self, uuid, ssid):
        """Give a profile that worked the network's name, as nmcli itself would have."""
        run(["nmcli", "connection", "modify", uuid, "connection.id", ssid])

    def site_reachable(self, via_wifi):
        return site_reachable(self.origin, self.iface if via_wifi else None)


class FakeNetwork:
    """Stands in for nmcli on a laptop; the password typed picks the outcome."""

    NETWORKS = [
        {"ssid": "Home Wi-Fi", "signal": 82, "secure": True, "enterprise": False},
        {"ssid": "Neighbour 5G", "signal": 54, "secure": True, "enterprise": False},
        {"ssid": "Cafe Guest", "signal": 41, "secure": False, "enterprise": False},
        {"ssid": "Office", "signal": 30, "secure": True, "enterprise": True},
    ]

    def __init__(self, delay=1.5):
        self.delay = delay
        self.saved = []
        self.counter = 0
        self.has_internet = False
        self.hotspot = False
        self.autoconnect_held = False

    def radio_on(self):
        pass

    def wifi_available(self):
        return True

    def ethernet_connected(self):
        return False

    def mac(self):
        return "dc:a6:32:12:7f:3a"

    def saved_wifi(self):
        return [{"name": p["ssid"], "uuid": p["uuid"]} for p in self.saved]

    def delete_profile(self, uuid):
        self.saved = [p for p in self.saved if p["uuid"] != uuid]

    def prune_profiles(self, ssid, keep):
        self.saved = [p for p in self.saved if p["uuid"] in keep or p["ssid"] != ssid]

    def scan(self, rescan=True):
        return [dict(n) for n in self.NETWORKS]

    def hotspot_up(self, ssid, password):
        self.hotspot = True
        return True

    def hotspot_down(self):
        self.hotspot = False

    def hotspot_delete(self):
        self.hotspot = False

    def clients(self):
        return 0

    def hold_autoconnect(self, hold):
        self.autoconnect_held = hold

    def connect(self, ssid, password, hidden, sae_only=False):
        time.sleep(self.delay)
        if ssid.lower() == "missing" or (not hidden and not any(n["ssid"] == ssid for n in self.NETWORKS)):
            return "not_found", [], "not in scan"
        for prefix, code in (("wrong", "wrong_password"), ("noaddress", "no_address"), ("failed", "failed")):
            if password.startswith(prefix):
                return code, [], "fake %s" % code
        self.counter += 1
        uuid = "fake-%d" % self.counter
        self.saved.append({"ssid": ssid, "uuid": uuid})
        self.has_internet = not password.startswith("nointernet")
        return None, [uuid], ""

    def keep_profile(self, uuid, ssid):
        pass

    def site_reachable(self, via_wifi):
        return bool(self.saved) and self.has_internet


class Controller:
    """Boot check, hotspot and connect attempts; one thread owns all network changes."""

    def __init__(self, net, force=False, timings=None, password=None):
        self.net = net
        self.force = force
        self.t = dict(REAL_TIMINGS, **(timings or {}))
        self.lock = threading.Lock()
        self.jobs = queue.Queue()
        self.state = "starting"
        self.target = None
        self.error = None
        self.error_ssid = None
        self.retrying = False
        self.hotspot_active = False
        self.networks = []
        self.ssid = logic.hotspot_ssid(net.mac())
        self.password = password or logic.generate_password()
        self.last_retry = time.monotonic()
        self.last_setup_try = 0.0

    def status(self, include_secret):
        with self.lock:
            s = {
                "state": self.state,
                "target": self.target,
                "error": self.error,
                "errorSsid": self.error_ssid,
                "message": logic.error_message(self.error, self.error_ssid) if self.error else None,
                "retrying": self.retrying,
                "hotspot": self.hotspot_active,
                "portal": PORTAL_URL,
            }
            if include_secret:
                s["hotspotSsid"] = self.ssid
                s["hotspotPassword"] = self.password
            return s

    def network_list(self):
        with self.lock:
            return [dict(n) for n in self.networks]

    def refresh_networks(self):
        # Most Wi-Fi chips can't scan while running a hotspot; keep the last list if this returns nothing.
        found = self.net.scan(rescan=True)
        with self.lock:
            if found:
                self.networks = found
            return [dict(n) for n in self.networks]

    def submit_connect(self, ssid, password, hidden):
        """Validates and queues an attempt; returns (http status, reply)."""
        if not isinstance(ssid, str) or not isinstance(password, str):
            return 400, {"error": "Enter the network name and password."}
        known = next((n for n in self.network_list() if n["ssid"] == ssid), None)
        if known and known["enterprise"]:
            return 400, {"error": "This network needs a username as well. It isn't supported yet; use a network cable."}
        secure = known["secure"] if known else password != ""
        problem = logic.validate_ssid(ssid) or logic.validate_password(password, secure)
        if problem:
            return 400, {"error": problem}
        with self.lock:
            if self.state != "setup" or not self.hotspot_active:
                return 409, {"error": "The box is busy. Wait a moment and try again."}
            self.state = "connecting"
            self.target = ssid
            self.error = None
            self.error_ssid = None
        self.jobs.put((ssid, password, bool(hidden) or known is None, bool(known and known.get("sae_only"))))
        return 202, {"ok": True}

    def _set(self, **kw):
        with self.lock:
            for k, v in kw.items():
                setattr(self, k, v)

    def _go_online(self, target=None):
        self.net.hotspot_delete()
        self._set(state="online", target=target, error=None, error_ssid=None, retrying=False, hotspot_active=False)
        log("online" + (" via %s" % target if target else ""))

    def _enter_setup(self):
        self.last_setup_try = time.monotonic()
        if not self.net.wifi_available():
            self._set(state="setup", hotspot_active=False, error="no_wifi", error_ssid=None)
            log("setup: Wi-Fi unavailable (check the Wi-Fi country)")
            return
        # Scan before the hotspot starts; the chip can't scan properly once it is serving.
        found = self.net.scan(rescan=True)
        if found:
            self._set(networks=found)
        up = self.net.hotspot_up(self.ssid, self.password)
        with self.lock:
            self.state = "setup"
            self.target = None
            self.hotspot_active = up
            if not up:
                self.error, self.error_ssid = "no_wifi", None
            elif self.error == "no_wifi":
                self.error = None
        log("setup: hotspot %s %s" % (self.ssid, "up" if up else "failed to start"))

    def boot(self):
        self.net.radio_on()
        # A hotspot left over from a crash would keep saved networks from connecting.
        self.net.hotspot_delete()
        if not self.force:
            start = time.monotonic()
            while True:
                if self.net.site_reachable(False):
                    self._go_online()
                    return
                limit = self.t["boot_saved"] if self.net.saved_wifi() else self.t["boot_none"]
                # A connected cable never needs the hotspot, even when the site is down.
                if not self.net.ethernet_connected() and time.monotonic() - start > limit:
                    break
                time.sleep(self.t["poll"])
        self._enter_setup()

    def _attempt(self, ssid, password, hidden, sae_only=False):
        # Let the phone get its reply before the hotspot goes away.
        time.sleep(self.t["reply_grace"])
        self.net.hold_autoconnect(True)
        try:
            self.net.hotspot_down()
            self._set(hotspot_active=False)
            error, created, detail = self.net.connect(ssid, password, hidden, sae_only)
            if not error:
                self._set(state="checking")
                deadline = time.monotonic() + self.t["internet_wait"]
                while True:
                    if self.net.site_reachable(True):
                        self.net.prune_profiles(ssid, created)
                        for uuid in created:
                            self.net.keep_profile(uuid, ssid)
                        self._go_online(target=ssid)
                        return
                    if time.monotonic() > deadline:
                        break
                    time.sleep(self.t["poll"])
                for uuid in created:
                    self.net.delete_profile(uuid)
                error, detail = "no_internet", "site not reachable over Wi-Fi"
            log("connect to %s failed: %s (%s)" % (ssid, error, detail))
            self._set(error=error, error_ssid=ssid)
            self._enter_setup()
        finally:
            self.net.hold_autoconnect(False)

    def _retry_saved(self):
        now = time.monotonic()
        if not self.force and self.net.ethernet_connected() and self.net.site_reachable(False):
            log("cable connected")
            self._go_online()
            return
        if not self.hotspot_active:
            if now - self.last_setup_try > 30:
                self._enter_setup()
            return
        if now - self.last_retry < self.t["retry_every"]:
            return
        if not self.net.saved_wifi():
            self.last_retry = now
            return
        # Never pull the hotspot out from under a phone that is mid-setup.
        clients = self.net.clients()
        if clients is None or clients > 0:
            return
        self.last_retry = now
        self._set(retrying=True)
        self.net.hotspot_down()
        self._set(hotspot_active=False)
        log("trying saved networks")
        deadline = time.monotonic() + self.t["retry_window"]
        while time.monotonic() < deadline:
            if self.net.site_reachable(self.force):
                self._go_online()
                return
            time.sleep(self.t["poll"])
        self._set(retrying=False)
        self._enter_setup()

    def run(self):
        try:
            self.boot()
            while self.state != "online":
                try:
                    job = self.jobs.get(timeout=self.t["tick"])
                except queue.Empty:
                    self._retry_saved()
                    continue
                self._attempt(*job)
        except Exception as e:  # noqa: BLE001
            log("controller failed: %r" % e)
            # Exit so systemd restarts us instead of serving a frozen state.
            os._exit(1)


def load_password():
    try:
        with open(PASSWORD_FILE) as f:
            pw = f.read().strip()
        if len(pw) == logic.PASSWORD_LENGTH and all(c in logic.PASSWORD_ALPHABET for c in pw):
            return pw
    except OSError:
        pass
    pw = logic.generate_password()
    try:
        fd = os.open(PASSWORD_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(pw)
    except OSError:
        pass
    return pw


def first_existing(*paths):
    for p in paths:
        if os.path.isfile(p):
            return p
    return None


def logo_path():
    return first_existing("/usr/share/kinetofun/logo.png", os.path.join(HERE, "..", "plymouth", "logo.png"))


class QrCache:
    def __init__(self):
        self.key = None
        self.svg = None

    def get(self, payload):
        if payload != self.key:
            code, out = run(["qrencode", "-t", "SVG", "-m", "2", "-l", "M", "-o", "-", payload], timeout=10)
            if code != 0:
                return None
            self.key, self.svg = payload, out
        return self.svg


class Handler(BaseHTTPRequestHandler):
    server_version = "KinetoFun"
    sys_version = ""
    controller = None
    fake = False
    qr = QrCache()

    def log_message(self, fmt, *args):
        pass

    def _zone(self):
        if self.fake:
            return "both"
        local = self.connection.getsockname()[0]
        if local.startswith("127."):
            return "tv"
        if local == HOTSPOT_ADDR:
            return "portal"
        return None

    def _send(self, status, body, content_type, extra=None):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def _json(self, status, obj):
        self._send(status, json.dumps(obj), "application/json")

    def _file(self, path, content_type):
        if not path:
            self._send(404, "Not found", "text/plain")
            return
        with open(path, "rb") as f:
            self._send(200, f.read(), content_type)

    def _redirect(self):
        self._send(302, "", "text/plain", {"Location": PORTAL_URL})

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        zone = self._zone()
        path = urlsplit(self.path).path
        if zone is None:
            self._send(403, "Forbidden", "text/plain")
            return
        if zone in ("tv", "both") and path.startswith("/tv/"):
            self._tv(path)
            return
        if zone == "portal":
            host = (self.headers.get("Host") or "").split(":")[0]
            # Phones probe sites like captive.apple.com; sending them here opens the setup page.
            if host != HOTSPOT_ADDR:
                self._redirect()
                return
        if zone in ("portal", "both"):
            if path == "/":
                self._file(os.path.join(HERE, "portal.html"), "text/html; charset=utf-8")
            elif path == "/logo.png":
                self._file(logo_path(), "image/png")
            elif path == "/api/state":
                self._json(200, self.controller.status(include_secret=False))
            elif path == "/api/networks":
                self._json(200, {"networks": self.controller.network_list()})
            elif zone == "portal":
                self._redirect()
            else:
                self._send(404, "Not found", "text/plain")
            return
        self._send(404, "Not found", "text/plain")

    def _tv(self, path):
        if path == "/tv/status.js":
            status = json.dumps(self.controller.status(include_secret=True))
            self._send(200, "window.kfStatus && window.kfStatus(%s);" % status, "application/javascript")
        elif path == "/tv/qr.svg":
            c = self.controller
            svg = self.qr.get(logic.wifi_qr_string(c.ssid, c.password))
            if svg is None and self.fake:
                svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#ede9fe"/>'
                       '<text x="5" y="6" font-size="2" text-anchor="middle" fill="#6d28d9">QR</text></svg>')
            if svg is None:
                self._send(503, "qrencode missing", "text/plain")
            else:
                self._send(200, svg, "image/svg+xml")
        elif path == "/tv/loading.html":
            self._file(first_existing("/usr/share/kinetofun/loading.html", os.path.join(HERE, "..", "loading.html")),
                       "text/html; charset=utf-8")
        elif path == "/tv/logo.png":
            self._file(logo_path(), "image/png")
        else:
            self._send(404, "Not found", "text/plain")

    def do_POST(self):
        zone = self._zone()
        path = urlsplit(self.path).path
        if zone not in ("portal", "both"):
            self._send(403, "Forbidden", "text/plain")
            return
        if path == "/api/networks/refresh":
            self._json(200, {"networks": self.controller.refresh_networks()})
            return
        if path != "/api/connect":
            self._send(404, "Not found", "text/plain")
            return
        length = int(self.headers.get("Content-Length") or 0)
        if not (self.headers.get("Content-Type") or "").startswith("application/json") or length > 4096:
            self._json(400, {"error": "Bad request."})
            return
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            self._json(400, {"error": "Bad request."})
            return
        if not isinstance(body, dict):
            self._json(400, {"error": "Bad request."})
            return
        status, reply = self.controller.submit_connect(body.get("ssid"), body.get("password", ""), body.get("hidden", False))
        self._json(status, reply)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--force-setup", action="store_true", help="skip the boot check and ignore a connected cable")
    p.add_argument("--fake", action="store_true", help="laptop mode: no nmcli, scripted networks")
    p.add_argument("--port", type=int)
    p.add_argument("--iface", default="wlan0")
    a = p.parse_args()
    fake = a.fake or os.environ.get("KF_PROVISION_FAKE") == "1"
    origin = os.environ.get("KF_ORIGIN", "https://kineto.fun")

    if fake:
        controller = Controller(FakeNetwork(), force=a.force_setup, timings=FAKE_TIMINGS)
        bind = ("127.0.0.1", a.port or 8080)
    else:
        controller = Controller(NmNetwork(a.iface, origin), force=a.force_setup, password=load_password())
        bind = ("0.0.0.0", a.port or 80)

    Handler.controller = controller
    Handler.fake = fake
    server = ThreadingHTTPServer(bind, Handler)
    server.daemon_threads = True
    threading.Thread(target=controller.run, daemon=True).start()
    if fake:
        print("Fake mode. Phone page: http://%s:%d/  TV: http://%s:%d/tv/loading.html?to=%s/tvsetup" % (bind + bind + (origin,)))
        print("Passwords starting with 'wrong', 'failed' or 'nointernet' fail that way; anything else connects.")
    server.serve_forever()


if __name__ == "__main__":
    main()
