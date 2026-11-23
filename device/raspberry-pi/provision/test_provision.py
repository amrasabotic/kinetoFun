"""Run with: python3 -m unittest discover -s device/raspberry-pi/provision"""
import json
import os
import sys
import threading
import time
import unittest
from http.server import ThreadingHTTPServer
from urllib import error, request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import logic  # noqa: E402
import service  # noqa: E402

FAST = {"boot_saved": 0.2, "boot_none": 0.1, "poll": 0.02, "retry_every": 0.1, "retry_window": 0.1,
        "reply_grace": 0.01, "internet_wait": 0.1, "tick": 0.05}


class LogicTest(unittest.TestCase):
    def test_split_terse_unescapes(self):
        self.assertEqual(logic.split_terse(r"Cafe\: Guest:70:WPA2"), ["Cafe: Guest", "70", "WPA2"])
        self.assertEqual(logic.split_terse(r"back\\slash:5:"), ["back\\slash", "5", ""])

    def test_parse_scan_dedupes_sorts_and_drops_noise(self):
        out = "\n".join([
            "Home:40:WPA2",
            "Home:80:WPA2",
            ":90:WPA2",
            "KinetoFun-1A2B:99:WPA2",
            "Open Cafe:60:",
            "Office:50:WPA2 802.1X",
            "Old:20:--",
        ])
        nets = logic.parse_scan(out)
        self.assertEqual([n["ssid"] for n in nets], ["Home", "Open Cafe", "Office", "Old"])
        self.assertEqual(nets[0]["signal"], 80)
        self.assertFalse(nets[1]["secure"])
        self.assertTrue(nets[2]["enterprise"])
        self.assertFalse(nets[3]["secure"])

    def test_parse_profiles_keeps_wifi_only(self):
        out = "Home:uuid-1:802-11-wireless\nWired connection 1:uuid-2:802-3-ethernet\nlo:uuid-3:loopback"
        self.assertEqual(logic.parse_profiles(out), [{"name": "Home", "uuid": "uuid-1"}])

    def test_ethernet_connected(self):
        self.assertTrue(logic.ethernet_connected("wifi:disconnected\nethernet:connected"))
        self.assertFalse(logic.ethernet_connected("ethernet:unavailable\nwifi:connected"))

    def test_count_stations(self):
        dump = "Station aa:bb:cc:dd:ee:ff (on wlan0)\n\tinactive time: 10 ms\nStation 11:22:33:44:55:66 (on wlan0)"
        self.assertEqual(logic.count_stations(dump), 2)
        self.assertEqual(logic.count_stations(""), 0)

    def test_password_alphabet_has_no_lookalikes(self):
        for ch in "0O1lI":
            self.assertNotIn(ch, logic.PASSWORD_ALPHABET)
        pw = logic.generate_password()
        self.assertEqual(len(pw), 8)
        self.assertTrue(all(c in logic.PASSWORD_ALPHABET for c in pw))

    def test_hotspot_ssid_from_mac(self):
        self.assertEqual(logic.hotspot_ssid("dc:a6:32:12:7f:3a"), "KinetoFun-7F3A")
        self.assertEqual(logic.hotspot_ssid(""), "KinetoFun-0000")

    def test_wifi_qr_escapes_specials(self):
        self.assertEqual(logic.wifi_qr_string("KinetoFun-7F3A", "ABCD2345"), "WIFI:T:WPA;S:KinetoFun-7F3A;P:ABCD2345;;")
        self.assertEqual(logic.escape_wifi_qr('a;b,c:d"e\\f'), 'a\\;b\\,c\\:d\\"e\\\\f')

    def test_validate_ssid(self):
        self.assertIsNone(logic.validate_ssid("Home"))
        self.assertIsNotNone(logic.validate_ssid(""))
        self.assertIsNotNone(logic.validate_ssid("x" * 33))
        self.assertIsNotNone(logic.validate_ssid("bad\nname"))

    def test_validate_password(self):
        self.assertIsNone(logic.validate_password("", False))
        self.assertIsNotNone(logic.validate_password("secret12", False))
        self.assertIsNone(logic.validate_password("secret12", True))
        self.assertIsNone(logic.validate_password("a" * 63, True))
        self.assertIsNone(logic.validate_password("0123456789abcdef" * 4, True))
        self.assertIsNotNone(logic.validate_password("short", True))
        self.assertIsNotNone(logic.validate_password("z" * 64, True))
        self.assertIsNotNone(logic.validate_password("cafécafé", True))

    def test_classify_connect_error(self):
        self.assertEqual(logic.classify_connect_error(10, "Error: No network with SSID 'X' found."), "not_found")
        self.assertEqual(logic.classify_connect_error(4, "Error: Connection activation failed: (7) Secrets were required, but not provided."), "wrong_password")
        self.assertEqual(logic.classify_connect_error(4, "Error: ... (53) The Wi-Fi network could not be found."), "not_found")
        self.assertEqual(logic.classify_connect_error(3, "Error: Timeout expired"), "failed")

    def test_activated_uuid(self):
        out = "Device 'wlan0' successfully activated with '3f1c2a9e-8b7d-4c6e-9f0a-1b2c3d4e5f60'."
        self.assertEqual(logic.activated_uuid(out), "3f1c2a9e-8b7d-4c6e-9f0a-1b2c3d4e5f60")
        self.assertIsNone(logic.activated_uuid("Error: Timeout expired"))

    def test_error_messages_are_distinct(self):
        texts = {logic.error_message(code, "Home") for code in logic.ERROR_CODES}
        self.assertEqual(len(texts), len(logic.ERROR_CODES))
        self.assertIn("“Home”", logic.error_message("wrong_password", "Home"))


def wait_for(pred, timeout=3.0):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if pred():
            return True
        time.sleep(0.01)
    return False


class ControllerTest(unittest.TestCase):
    def start(self, net=None, force=False):
        net = net or service.FakeNetwork(delay=0)
        c = service.Controller(net, force=force, timings=FAST, password="ABCD2345")
        threading.Thread(target=c.run, daemon=True).start()
        self.assertTrue(wait_for(lambda: c.state == "setup" and c.hotspot_active), "never reached setup")
        return c, net

    def test_boot_goes_online_when_site_answers(self):
        net = service.FakeNetwork(delay=0)
        net.saved = [{"ssid": "Home", "uuid": "u1"}]
        net.has_internet = True
        c = service.Controller(net, timings=FAST)
        c.boot()
        self.assertEqual(c.state, "online")

    def test_boot_starts_hotspot_when_offline(self):
        c, net = self.start()
        self.assertTrue(net.hotspot)
        self.assertEqual(c.status(True)["hotspotPassword"], "ABCD2345")
        self.assertNotIn("hotspotPassword", c.status(False))
        self.assertEqual(len(c.network_list()), 4)

    def test_wrong_password_returns_to_setup_with_same_password(self):
        c, net = self.start()
        self.assertEqual(c.submit_connect("Home Wi-Fi", "wrongpass", False)[0], 202)
        self.assertTrue(wait_for(lambda: c.state == "setup" and c.error == "wrong_password"))
        self.assertTrue(c.hotspot_active)
        self.assertEqual(c.password, "ABCD2345")
        self.assertEqual(net.saved, [])

    def test_not_found(self):
        c, _ = self.start()
        self.assertEqual(c.submit_connect("Missing", "secret123", True)[0], 202)
        self.assertTrue(wait_for(lambda: c.error == "not_found"))

    def test_no_internet_removes_profile(self):
        c, net = self.start()
        c.submit_connect("Home Wi-Fi", "nointernet", False)
        self.assertTrue(wait_for(lambda: c.error == "no_internet" and c.state == "setup"))
        self.assertEqual(net.saved, [])

    def test_success_goes_online(self):
        c, net = self.start()
        c.submit_connect("Home Wi-Fi", "correct-horse", False)
        self.assertTrue(wait_for(lambda: c.state == "online"))
        self.assertEqual(c.target, "Home Wi-Fi")
        self.assertFalse(net.hotspot)
        self.assertEqual(len(net.saved), 1)

    def test_rejects_bad_input_without_dropping_hotspot(self):
        c, net = self.start()
        self.assertEqual(c.submit_connect("Home Wi-Fi", "short", False)[0], 400)
        self.assertEqual(c.submit_connect("Office", "longenough", False)[0], 400)
        self.assertEqual(c.submit_connect("Cafe Guest", "unexpected", False)[0], 400)
        self.assertEqual(c.state, "setup")
        self.assertTrue(net.hotspot)

    def test_rejects_second_attempt_while_busy(self):
        net = service.FakeNetwork(delay=0.3)
        c, _ = self.start(net)
        self.assertEqual(c.submit_connect("Home Wi-Fi", "correct-horse", False)[0], 202)
        self.assertEqual(c.submit_connect("Home Wi-Fi", "correct-horse", False)[0], 409)

    def test_no_retry_while_phone_connected(self):
        net = service.FakeNetwork(delay=0)
        net.saved = [{"ssid": "Home", "uuid": "u1"}]
        net.clients = lambda: 1
        c, _ = self.start(net)
        time.sleep(0.4)
        self.assertTrue(c.hotspot_active)
        self.assertFalse(c.retrying)

    def test_retry_finds_router_that_came_back(self):
        net = service.FakeNetwork(delay=0)
        net.saved = [{"ssid": "Home", "uuid": "u1"}]
        c, _ = self.start(net)
        net.has_internet = True
        self.assertTrue(wait_for(lambda: c.state == "online", timeout=8))


class HttpTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.controller = service.Controller(service.FakeNetwork(delay=0), timings=FAST, password="ABCD2345")
        threading.Thread(target=cls.controller.run, daemon=True).start()
        wait_for(lambda: cls.controller.state == "setup")
        service.Handler.controller = cls.controller
        service.Handler.fake = True
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), service.Handler)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = "http://127.0.0.1:%d" % cls.server.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def get(self, path):
        with request.urlopen(self.base + path) as r:
            return r.status, r.headers.get("Content-Type"), r.read().decode("utf-8", "replace")

    def post(self, path, body, content_type="application/json"):
        req = request.Request(self.base + path, data=json.dumps(body).encode(), method="POST",
                              headers={"Content-Type": content_type})
        try:
            with request.urlopen(req) as r:
                return r.status, json.loads(r.read())
        except error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_portal_page_and_networks(self):
        status, ctype, body = self.get("/")
        self.assertEqual(status, 200)
        self.assertIn("Connect your box to Wi-Fi", body)
        _, _, nets = self.get("/api/networks")
        self.assertEqual(len(json.loads(nets)["networks"]), 4)

    def test_tv_status_script_carries_hotspot_details(self):
        _, ctype, body = self.get("/tv/status.js")
        self.assertIn("javascript", ctype)
        self.assertTrue(body.startswith("window.kfStatus && window.kfStatus("))
        self.assertIn("ABCD2345", body)

    def test_phone_state_hides_hotspot_password(self):
        _, _, body = self.get("/api/state")
        self.assertNotIn("ABCD2345", body)

    def test_loader_and_qr_are_served(self):
        self.assertEqual(self.get("/tv/loading.html")[0], 200)
        self.assertEqual(self.get("/logo.png")[1], "image/png")
        self.assertIn("svg", self.get("/tv/qr.svg")[1])

    def test_connect_validates_and_requires_json(self):
        self.assertEqual(self.post("/api/connect", {"ssid": "Home Wi-Fi", "password": "x"})[0], 400)
        self.assertEqual(self.post("/api/connect", {"ssid": "Home Wi-Fi", "password": "longenough"}, "text/plain")[0], 400)


if __name__ == "__main__":
    unittest.main()
