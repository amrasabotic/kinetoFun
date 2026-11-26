# Raspberry Pi TV kit

Turns a Raspberry Pi into a KinetoFun TV: it boots straight into Chromium full screen on the TV
pairing page, with the webcam allowed for the site so no permission prompt ever appears.

## Hardware

- Raspberry Pi 5, 8 GB, with the official 27 W power supply and the active cooler
- NVMe drive or an A2 microSD card
- Micro-HDMI to HDMI cable
- 720p or 1080p wide-angle webcam with good low-light performance, mounted on the TV

## Install

On a fresh Raspberry Pi OS Trixie 64-bit (desktop), as the user that should run the kiosk:

    git clone <repository> && cd <repository>/device/raspberry-pi
    sudo ./setup.sh KF-TV-001 --wifi-country=AL
    sudo reboot

`KF-TV-001` is this unit's device key. Use a different key for every unit: the server ties
pairing and the signed-in account to the key. Keys are 3 to 64 letters, digits, `-` or `_`.
A second argument overrides the site, for example `https://staging.example.com` (an origin only:
no path, no quotes).

`--wifi-country` is the two-letter code of the country the unit ships to. The Wi-Fi radio stays
blocked until it is set. Kosovo (`XK`) is not in the regulatory database, so use `AL` there.
It can be left out when the Pi already has a country set.

Before shipping, delete any Wi-Fi networks used at the workshop, so the customer's unit goes to
Wi-Fi setup after 20 seconds instead of retrying them for two minutes:

    nmcli -t -f NAME,TYPE connection show | awk -F: '$2=="802-11-wireless"{print $1}' | xargs -r -d '\n' -n1 sudo nmcli connection delete

## Wi-Fi setup

A unit with no network at boot starts its own hotspot, and the customer connects it to their
Wi-Fi from a phone:

1. The TV shows a QR code, the hotspot name (`KinetoFun-` plus the last four characters of the
   Wi-Fi MAC address) and a password. The password is random and changes on each boot.
2. The phone camera reads the code and joins the hotspot. The setup page opens by itself
   (captive portal) or at `http://192.168.4.1`.
3. The customer picks their network and types its password. The phone loses the hotspot while
   the unit tries the network, so the TV shows the progress and the result.
4. Success means the site answers over Wi-Fi, not just that the network was joined. Wrong
   password, network not found, no address from the router and joined-but-no-internet each get
   their own message, and the hotspot comes back with the same password for another try.

How an attempt works, and why:

- NetworkManager's automatic reconnect is held off on the Wi-Fi device for the length of the
  attempt. Otherwise it rejoins a saved network the moment the hotspot stops and races the attempt.
- Each attempt uses a fresh profile (`kinetofun-try`). `nmcli device wifi connect` refuses any
  password for a network that already has a saved profile, so a changed router password could
  never be entered. The saved profile stays untouched when the attempt fails, and is replaced by
  the new one when it succeeds.
- An iPhone usually needs 10 to 12 seconds from "Join" until the setup page shows. The unit
  answers within a fraction of a second; the rest is the phone joining and checking for a
  sign-in page.

When it starts setup:

- No saved Wi-Fi network and no cable: after 20 seconds.
- Saved networks that don't reach the site: after two minutes. While waiting for setup, saved
  networks are tried again every three minutes, but never while a phone is on the hotspot.
- A connected network cable always skips setup.

Not supported yet: networks that need a username (WPA2-Enterprise), hotel-style sign-in pages,
and Wi-Fi dropping while the unit is in use (unplug and replug to get back to the boot check).

The service is `kinetofun-provision` (`journalctl -u kinetofun-provision` shows what it did,
including nmcli's own error line for a failed attempt; it never logs passwords). To try setup on a
unit that is online, plug in a cable so SSH keeps working, then:

    sudo systemctl stop kinetofun-provision
    sudo python3 /usr/local/lib/kinetofun-provision/service.py --force-setup

`--force-setup` skips the boot check, ignores the cable and checks the site through Wi-Fi only.

### On a laptop

The service has a fake mode that replaces `nmcli` with a scripted list of networks:

    python3 device/raspberry-pi/provision/service.py --fake

Open the phone page at `http://127.0.0.1:8080/` and the TV screen at
`http://127.0.0.1:8080/tv/loading.html?to=https://kineto.fun/tvsetup`. The password picks the
outcome: one starting with `wrong`, `noaddress`, `failed` or `nointernet` (for example
`wrongpass`) fails that way, and any other password of 8 or more characters connects. Type the
network name `Missing` under "Network not listed?" to get "network not found". Tests:
`python3 -m unittest discover -s device/raspberry-pi/provision`.

## The kiosk browser

The launcher (`kinetofun-kiosk.sh`) starts Chromium with:

- `WebRtcPipeWireCamera` disabled. Through PipeWire, Chromium asks the desktop portal for the
  camera, and the portal shows its own "Allow app to use the camera" dialog, which the managed
  policy cannot answer. Without it Chromium opens the USB camera directly.
- `NonMilestoneUpdateToast` disabled: no "Chrome was updated" bubble after an OS update of
  Chromium.
- A 1920×1080 window from the start, so the loader does not render small and then jump.

The desktop uses a fully transparent cursor theme (`kinetofun-blank`), because the compositor
draws the arrow in the middle of the screen even with no mouse attached. A mouse plugged in at the
workshop is invisible too; use SSH for maintenance.

The loader's logo covers exactly the logo of the desktop background, so the hand-over from the
background to the browser shows no jump. Regenerate `background.png` and keep the loader's logo
width in step when the logo changes.

Known: between the boot logo and the desktop the TV goes black for a moment while the desktop
takes over the display. Its length depends on the TV (about 2 to 3 seconds on an older 1080p set).

## What it installs

| File | Purpose |
| --- | --- |
| `/etc/chromium/policies/managed/kinetofun.json` | Camera and autoplay allowed for the site; no sign-in, translate or notification prompts |
| `/etc/kinetofun.env` | The page the kiosk opens, the site origin and the device key, each in single quotes |
| `/usr/share/kinetofun/loading.html` | Offline-safe logo and spinner shown at boot; opens the TV page once the site answers, and shows the Wi-Fi setup screen when the setup service is running it |
| `/usr/local/lib/kinetofun-provision/` | Wi-Fi setup service: hotspot, phone setup page, status for the TV screen |
| `kinetofun-provision.service` | Runs the Wi-Fi setup service as root at boot, restarted if it stops |
| `/etc/NetworkManager/dnsmasq-shared.d/kinetofun-portal.conf` | While the hotspot runs, every name resolves to the unit so phones open the setup page |
| `kinetofun-timesync.service` | Sets the clock at boot (the Pi has no battery clock); uses the site's time when a network blocks NTP |
| `/etc/systemd/timesyncd.conf.d/kinetofun.conf` | Extra NTP servers |
| `/usr/local/bin/kinetofun-kiosk` | Launcher that restarts Chromium if it exits or crashes |
| `~/.config/labwc/autostart` | Starts the launcher with the desktop session |
| `~/.config/labwc/environment` | Selects the transparent cursor theme |
| `/usr/share/icons/kinetofun-blank` | The transparent cursor theme |
| `~/.config/kanshi/config` | Desktop forced to 1920×1080 at 60 Hz to match the boot screen |
| `/etc/xdg/labwc/autostart` | Logo background started first; desktop icons and taskbar lines commented out (uncomment them to get the normal desktop back) |
| `getty@tty1.service` | Masked, so no text console login blanks the screen during boot; use SSH, or `sudo systemctl unmask getty@tty1` to restore it |
| `/usr/share/kinetofun-background.png` | White screen with the logo, shown until Chromium opens; regenerate `background.png` when the logo changes |
| `/boot/firmware/cmdline.txt` | Both HDMI ports forced to 1920×1080 at 60 Hz, so every TV (4K included) behaves the same; boot text hidden |
| `/boot/firmware/config.txt` | Rainbow boot screen turned off |
| `/usr/share/plymouth/themes/kinetofun` | Boot splash showing the KinetoFun logo; copy `public/logo.png` to `plymouth/logo.png` when the logo changes |

## Checking a unit

1. Open `chrome://gpu` and confirm WebGL reports hardware acceleration. Software rendering is too slow for the games.
2. Open the TV page with `?handdebug=1` appended to read hand-tracking frame rate.
3. Confirm the webcam is seen: `v4l2-ctl --list-devices`.
4. `journalctl -t kinetofun-kiosk` is empty on a healthy unit; a line there means the address in
   `/etc/kinetofun.env` was unusable and the kiosk fell back to another one.

## Changing the device key or site

Edit `/etc/kinetofun.env` and the policy file, then reboot. Keep every value in single quotes, for
example `KF_URL='https://kineto.fun/tvsetup?device=KF-TV-001&handdebug=1'`; without them an `&`
cuts the address. If `KF_URL` is missing or unusable, the kiosk opens the site from `KF_ORIGIN`
with `KF_DEVICE_KEY`, or `https://kineto.fun/tvsetup` when those are missing too. Re-running
`setup.sh` also works.

## Updates

The kiosk always loads the live site, so site updates need no action on the Pi. Update the system with
`sudo apt update && sudo apt full-upgrade`, then reboot.

## Verified on hardware

On a Raspberry Pi 5 with Raspberry Pi OS Trixie 64-bit, Chromium 156, labwc 0.20 and
NetworkManager 1.52:

- Boot into the loader and the TV page; the loader served by the setup service.
- No camera dialog with no stored portal permission; hand control works.
- No update bubble after a simulated Chromium update.
- No pointer on screen, with or without a mouse.
- A quoted address with two query parameters opens intact; an unquoted `&` falls back to the
  unit's own address and logs it.
- Wi-Fi setup from an iPhone: the QR code joins the hotspot and the setup page opens by itself.
  Wrong password on a saved and on a new network, a correct password on a network that already
  has a saved profile, and a connect through to the TV page.
- A unit with no saved network and no cable goes to setup by itself and is set up from a phone.
- A unit whose saved network is out of reach goes to setup about two minutes after boot.

Not verified yet: an Android phone joining the hotspot from the QR code and opening the setup page.
