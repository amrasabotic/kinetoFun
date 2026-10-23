# Raspberry Pi TV kit

Turns a Raspberry Pi into a KinetoFun TV: it boots straight into Chromium full screen on the TV
pairing page, with the webcam allowed for the site so no permission prompt ever appears.

## Hardware

- Raspberry Pi 5, 8 GB, with the official 27 W power supply and the active cooler
- NVMe drive or an A2 microSD card
- Micro-HDMI to HDMI cable
- 720p or 1080p wide-angle webcam with good low-light performance, mounted on the TV

## Install

On a fresh Raspberry Pi OS Bookworm 64-bit (desktop), as the user that should run the kiosk:

    git clone <repository> && cd <repository>/device/raspberry-pi
    sudo ./setup.sh KF-TV-001
    sudo reboot

`KF-TV-001` is this unit's device key. Use a different key for every unit: the server ties
pairing and the signed-in account to the key. Keys are 3 to 64 letters, digits, `-` or `_`.
A second argument overrides the site, for example `https://staging.example.com`.

## What it installs

| File | Purpose |
| --- | --- |
| `/etc/chromium/policies/managed/kinetofun.json` | Camera and autoplay allowed for the site; no sign-in, translate or notification prompts |
| `/etc/kinetofun.env` | The page the kiosk opens, including the device key |
| `/usr/local/bin/kinetofun-kiosk` | Launcher that restarts Chromium if it exits or crashes |
| `~/.config/labwc/autostart` | Starts the launcher with the desktop session |
| `/boot/firmware/cmdline.txt` | Both HDMI ports forced to 1920×1080 at 60 Hz, so every TV (4K included) behaves the same |

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
