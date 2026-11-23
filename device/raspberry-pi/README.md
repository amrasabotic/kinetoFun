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
A second argument overrides the site, for example `https://staging.example.com`.

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
   password, network not found and joined-but-no-internet each get their own message, and the
   hotspot comes back with the same password for another try.

When it starts setup:

- No saved Wi-Fi network and no cable: after 20 seconds.
- Saved networks that don't reach the site: after two minutes. While waiting for setup, saved
  networks are tried again every three minutes, but never while a phone is on the hotspot.
- A connected network cable always skips setup.

Not supported yet: networks that need a username (WPA2-Enterprise), hotel-style sign-in pages,
and Wi-Fi dropping while the unit is in use (unplug and replug to get back to the boot check).

The service is `kinetofun-provision` (`journalctl -u kinetofun-provision` shows what it did; it
never logs passwords). To try setup on a unit that is online, plug in a cable so SSH keeps working,
then:

    sudo systemctl stop kinetofun-provision
    sudo python3 /usr/local/lib/kinetofun-provision/service.py --force-setup

`--force-setup` skips the boot check, ignores the cable and checks the site through Wi-Fi only.

### On a laptop

The service has a fake mode that replaces `nmcli` with a scripted list of networks:

    python3 device/raspberry-pi/provision/service.py --fake

Open the phone page at `http://127.0.0.1:8080/` and the TV screen at
`http://127.0.0.1:8080/tv/loading.html?to=https://kineto.fun/tvsetup`. The password picks the
outcome: one starting with `wrong`, `failed` or `nointernet` (for example `wrongpass`) fails that
way, and any other password of 8 or more characters connects. Type the network name `Missing` under "Network not listed?" to get "network
not found". Tests: `python3 -m unittest discover -s device/raspberry-pi/provision`.

## What it installs

| File | Purpose |
| --- | --- |
| `/etc/chromium/policies/managed/kinetofun.json` | Camera and autoplay allowed for the site; no sign-in, translate or notification prompts |
| `/etc/kinetofun.env` | The page the kiosk opens, including the device key |
| `/usr/share/kinetofun/loading.html` | Offline-safe logo and spinner shown at boot; opens the TV page once the site answers, and shows the Wi-Fi setup screen when the setup service is running it |
| `/usr/local/lib/kinetofun-provision/` | Wi-Fi setup service: hotspot, phone setup page, status for the TV screen |
| `kinetofun-provision.service` | Runs the Wi-Fi setup service as root at boot, restarted if it stops |
| `/etc/NetworkManager/dnsmasq-shared.d/kinetofun-portal.conf` | While the hotspot runs, every name resolves to the unit so phones open the setup page |
| `kinetofun-timesync.service` | Sets the clock at boot (the Pi has no battery clock); uses the site's time when a network blocks NTP |
| `/etc/systemd/timesyncd.conf.d/kinetofun.conf` | Extra NTP servers |
| `/usr/local/bin/kinetofun-kiosk` | Launcher that restarts Chromium if it exits or crashes |
| `~/.config/labwc/autostart` | Starts the launcher with the desktop session |
| `~/.config/kanshi/config` | Desktop forced to 1920×1080 at 60 Hz to match the boot screen |
| `/etc/xdg/labwc/autostart` | Logo background started first; desktop icons and taskbar lines commented out (uncomment them to get the normal desktop back) |
| `/etc/systemd/system/plymouth-quit.service.d/retain-splash.conf` | Keeps the boot logo on screen until the desktop session draws |
| `getty@tty1.service` | Masked, so no text console login blanks the screen during boot; use SSH, or `sudo systemctl unmask getty@tty1` to restore it |
| `/usr/share/kinetofun-background.png` | White screen with the logo, shown until Chromium opens; regenerate `background.png` when the logo changes |
| `/boot/firmware/cmdline.txt` | Both HDMI ports forced to 1920×1080 at 60 Hz, so every TV (4K included) behaves the same; boot text hidden |
| `/boot/firmware/config.txt` | Rainbow boot screen turned off |
| `/usr/share/plymouth/themes/kinetofun` | Boot splash showing the KinetoFun logo; copy `public/logo.png` to `plymouth/logo.png` when the logo changes |

## Checking a unit

1. Open `chrome://gpu` and confirm WebGL reports hardware acceleration. Software rendering is too slow for the games.
2. Open the TV page with `?handdebug=1` appended to read hand-tracking frame rate.
3. Confirm the webcam is seen: `v4l2-ctl --list-devices`.

## Changing the device key or site

Edit `/etc/kinetofun.env` and the policy file, then reboot. Re-running `setup.sh` also works.

## Updates

The kiosk always loads the live site, so site updates need no action on the Pi. Update the system with
`sudo apt update && sudo apt full-upgrade`, then reboot.

## Not yet verified on hardware

This kit was written without a Pi to hand. Before rolling out, check on a real unit that the
autostart file is read by the desktop session, that the pointer hides, and that the camera policy
suppresses the permission prompt.

Wi-Fi setup has only run in fake mode. On a unit, check that the kiosk opens the loader from
`http://127.0.0.1/tv/` (and still works from `file://` with the service stopped), that the hotspot
starts and both an iPhone and an Android camera can join it from the QR code, that the setup page
opens by itself, each failure message, a successful connect through to the pairing page, and a
reboot going straight online. On the Pi's chip a rescan during the hotspot may return nothing; the
setup page then keeps the list scanned before the hotspot started.
