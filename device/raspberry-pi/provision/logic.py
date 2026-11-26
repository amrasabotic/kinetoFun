"""Pure helpers for the Wi-Fi setup service: parsing, validation and messages, no I/O."""
import re
import secrets

HOTSPOT_PREFIX = "KinetoFun-"
# No 0/O, 1/I/l: the password is read off a TV and typed on a phone.
PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
PASSWORD_LENGTH = 8

ERROR_CODES = ("wrong_password", "not_found", "no_address", "no_internet", "no_wifi", "failed")


def generate_password(length=PASSWORD_LENGTH):
    return "".join(secrets.choice(PASSWORD_ALPHABET) for _ in range(length))


def hotspot_ssid(mac):
    tail = re.sub(r"[^0-9A-Fa-f]", "", mac or "")[-4:].upper()
    return HOTSPOT_PREFIX + (tail or "0000")


def split_terse(line):
    """Split one line of `nmcli -t` output, which escapes ':' and '\\' with a backslash."""
    fields, cur, i = [], [], 0
    while i < len(line):
        ch = line[i]
        if ch == "\\" and i + 1 < len(line):
            cur.append(line[i + 1])
            i += 2
            continue
        if ch == ":":
            fields.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
        i += 1
    fields.append("".join(cur))
    return fields


def parse_scan(output):
    """Parse `nmcli -t -f SSID,SIGNAL,SECURITY device wifi list` into a deduped list, strongest first."""
    best = {}
    for line in output.splitlines():
        if not line.strip():
            continue
        fields = split_terse(line)
        if len(fields) < 3:
            continue
        ssid, signal, security = fields[0], fields[1], fields[2]
        # Hidden networks have no name to show; other units' setup hotspots are noise.
        if not ssid or ssid.startswith(HOTSPOT_PREFIX):
            continue
        try:
            strength = int(signal)
        except ValueError:
            strength = 0
        security = security.strip()
        entry = {
            "ssid": ssid,
            "signal": max(0, min(100, strength)),
            "secure": security not in ("", "--"),
            "enterprise": "802.1X" in security,
            # WPA3-only networks refuse a WPA2 (psk) profile; mixed WPA2/WPA3 accepts it.
            "sae_only": "WPA3" in security and "WPA2" not in security and "WPA1" not in security,
        }
        if ssid not in best or entry["signal"] > best[ssid]["signal"]:
            best[ssid] = entry
    return sorted(best.values(), key=lambda n: (-n["signal"], n["ssid"].lower()))


def parse_profiles(output):
    """Parse `nmcli -t -f NAME,UUID,TYPE connection show` into Wi-Fi profiles."""
    profiles = []
    for line in output.splitlines():
        fields = split_terse(line)
        if len(fields) >= 3 and fields[2] in ("802-11-wireless", "wifi"):
            profiles.append({"name": fields[0], "uuid": fields[1]})
    return profiles


def ethernet_connected(device_output):
    """True when `nmcli -t -f TYPE,STATE device` lists a connected Ethernet device."""
    for line in device_output.splitlines():
        fields = split_terse(line)
        if len(fields) >= 2 and fields[0] == "ethernet" and fields[1].startswith("connected"):
            return True
    return False


def count_stations(station_dump):
    return sum(1 for line in station_dump.splitlines() if line.startswith("Station "))


def escape_wifi_qr(value):
    return re.sub(r'([\\;,:"])', r"\\\1", value)


def wifi_qr_string(ssid, password):
    """Wi-Fi join payload understood by the iPhone and Android camera apps."""
    return "WIFI:T:WPA;S:%s;P:%s;;" % (escape_wifi_qr(ssid), escape_wifi_qr(password))


def validate_ssid(ssid):
    if not isinstance(ssid, str) or not ssid:
        return "Enter the network name."
    if len(ssid.encode("utf-8")) > 32:
        return "Network names are at most 32 characters."
    if any(ord(c) < 32 or ord(c) == 127 for c in ssid):
        return "The network name has characters that can't be used."
    return None


def validate_password(password, secure):
    if not isinstance(password, str):
        return "Enter the Wi-Fi password."
    if not secure:
        return None if password == "" else "This network has no password. Leave the field empty."
    if re.fullmatch(r"[0-9A-Fa-f]{64}", password):
        return None
    if len(password) < 8:
        return "Wi-Fi passwords are at least 8 characters."
    if len(password) > 63:
        return "Wi-Fi passwords are at most 63 characters."
    if any(ord(c) < 32 or ord(c) > 126 for c in password):
        return "The password has characters Wi-Fi doesn't allow. Check for spaces or symbols added by the keyboard."
    return None


def classify_connect_error(exit_code, output, device_state=""):
    """Map a failed `nmcli connection up` to a code the TV can explain.

    nmcli reports a timeout the same way whatever stalled, so the device state read at that
    moment tells a router that never handed out an address apart from other failures.
    """
    text = (output or "").lower()
    if exit_code == 10 or "no network with ssid" in text or "could not be found" in text:
        return "not_found"
    if "secrets were required" in text or "no-secrets" in text or "psk: property is invalid" in text:
        return "wrong_password"
    if "ip configuration" in (device_state or "").lower():
        return "no_address"
    return "failed"


def first_error_line(output):
    """nmcli's own error line, safe to log: nmcli never echoes the password back."""
    lines = [ln.strip() for ln in (output or "").splitlines() if ln.strip()]
    errors = [ln for ln in lines if ln.lower().startswith("error")]
    return (errors or lines or [""])[0][:200]


def security_args(password, sae_only):
    """nmcli settings for a new Wi-Fi profile; an empty password means an open network."""
    if not password:
        return []
    return ["wifi-sec.key-mgmt", "sae" if sae_only else "wpa-psk", "wifi-sec.psk", password]


def added_uuid(output):
    """Profile UUID from nmcli's "Connection 'x' (<uuid>) successfully added." line."""
    m = re.search(r"\(([0-9a-fA-F-]{36})\) successfully added", output or "")
    return m.group(1) if m else None


def error_message(code, ssid):
    name = "“%s”" % ssid if ssid else "the network"
    messages = {
        "wrong_password": "Wrong password for %s. Scan the code again and retype it." % name,
        "not_found": "Couldn't find %s. Move the box closer to the router, check the name and try again." % name,
        "no_address": "Joined %s, but the router didn't give the box an address. Restart the router and try again." % name,
        "no_internet": "Joined %s, but it has no internet. Try another network or plug in a network cable." % name,
        "no_wifi": "Wi-Fi isn't available on this box. Plug in a network cable.",
        "failed": "Couldn't connect to %s. Try again." % name,
    }
    return messages.get(code, messages["failed"])
