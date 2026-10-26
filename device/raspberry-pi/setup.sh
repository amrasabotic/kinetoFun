#!/usr/bin/env bash
# Provisions a Raspberry Pi (Raspberry Pi OS Bookworm 64-bit, desktop) as a KinetoFun TV.
# Usage: sudo ./setup.sh <DEVICE_KEY> [BASE_URL]
set -euo pipefail

DEVICE_KEY="${1:-}"
BASE_URL="${2:-https://kineto.fun}"
KIOSK_USER="${SUDO_USER:-pi}"

if [[ $EUID -ne 0 ]]; then echo "Run with sudo." >&2; exit 1; fi
if [[ -z "$DEVICE_KEY" ]]; then echo "Usage: sudo ./setup.sh <DEVICE_KEY> [BASE_URL]" >&2; exit 1; fi
# Keys are 3-64 characters; the server rejects anything else.
if [[ ! "$DEVICE_KEY" =~ ^[A-Za-z0-9_-]{3,64}$ ]]; then echo "DEVICE_KEY must be 3-64 letters, digits, - or _." >&2; exit 1; fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_HOME="$(getent passwd "$KIOSK_USER" | cut -d: -f6)"

apt-get update
apt-get install -y chromium unclutter v4l-utils plymouth plymouth-themes swaybg fonts-noto-color-emoji

# Managed policy: camera allowed for our origin, so no permission prompt ever appears.
install -d /etc/chromium/policies/managed
sed "s#__BASE_URL__#${BASE_URL}#g" "$HERE/chromium-policy.json" > /etc/chromium/policies/managed/kinetofun.json

# Launcher and config.
install -m 0755 "$HERE/kinetofun-kiosk.sh" /usr/local/bin/kinetofun-kiosk
cat > /etc/kinetofun.env <<ENV
KF_URL=${BASE_URL}/tvsetup?device=${DEVICE_KEY}
ENV

# Start on login of the desktop session (labwc on Bookworm), restarted by the launcher loop.
install -d -o "$KIOSK_USER" -g "$KIOSK_USER" "$USER_HOME/.config/labwc"
AUTOSTART="$USER_HOME/.config/labwc/autostart"
install -m 0644 "$HERE/background.png" /usr/share/kinetofun-background.png
# The Pi session runs labwc with -m, so system and user autostart files both run.
SYS_AUTOSTART=/etc/xdg/labwc/autostart
if [[ -f "$SYS_AUTOSTART" ]]; then
  # Desktop and taskbar off so only the logo shows before Chromium.
  sed -i -E 's@^([^#].*(pcmanfm|wf-panel).*)$@# \1@' "$SYS_AUTOSTART"
  # Logo background first: the system file runs before ours and its other entries can be slow.
  grep -q kinetofun-background "$SYS_AUTOSTART" || sed -i '1i swaybg -c ffffff -i /usr/share/kinetofun-background.png -m fill &' "$SYS_AUTOSTART"
fi
echo '/usr/local/bin/kinetofun-kiosk &' > "$AUTOSTART"

# The desktop ignores the kernel video= setting and picks the TV's preferred mode (4K at 30 Hz on 4K sets).
install -d -o "$KIOSK_USER" -g "$KIOSK_USER" "$USER_HOME/.config/kanshi"
printf 'profile {\n  output * mode 1920x1080@60Hz\n}\n' > "$USER_HOME/.config/kanshi/config"
chown "$KIOSK_USER:$KIOSK_USER" "$USER_HOME/.config/kanshi/config"

# Leave the boot logo on screen when the splash quits, instead of a black frame until the desktop draws.
install -d /etc/systemd/system/plymouth-quit.service.d
cat > /etc/systemd/system/plymouth-quit.service.d/retain-splash.conf <<UNIT
[Service]
ExecStart=
ExecStart=-/usr/bin/plymouth quit --retain-splash
UNIT
systemctl daemon-reload
# The tty1 console login clears the screen to black between the boot logo and the desktop; SSH still works.
systemctl mask getty@tty1.service
chown "$KIOSK_USER:$KIOSK_USER" "$AUTOSTART"

# Run every TV at 1080p, even 4K sets: the TV upscales, and the Pi draws a quarter of the pixels.
CMDLINE=/boot/firmware/cmdline.txt
if [[ -f "$CMDLINE" ]]; then
  for port in HDMI-A-1 HDMI-A-2; do
    grep -q "video=$port:" "$CMDLINE" || sed -i "1 s/\$/ video=$port:1920x1080@60/" "$CMDLINE"
  done
  # Show only the KinetoFun boot logo: no boot text, Linux logo or blinking cursor.
  for opt in quiet splash loglevel=3 logo.nologo vt.global_cursor_default=0; do
    grep -qw "$opt" "$CMDLINE" || sed -i "1 s/\$/ $opt/" "$CMDLINE"
  done
else
  echo "Set 1080p output manually: $CMDLINE not found." >&2
fi

# Skip the firmware's rainbow test screen.
CONFIG=/boot/firmware/config.txt
if [[ -f "$CONFIG" ]]; then
  grep -q "^disable_splash=" "$CONFIG" || echo "disable_splash=1" >> "$CONFIG"
fi

THEME_DIR=/usr/share/plymouth/themes/kinetofun
install -d "$THEME_DIR"
install -m 0644 "$HERE/plymouth/kinetofun.plymouth" "$HERE/plymouth/kinetofun.script" "$HERE/plymouth/logo.png" "$THEME_DIR/"
plymouth-set-default-theme -R kinetofun

# Log the kiosk user in without a password prompt and keep the screen on.
raspi-config nonint do_boot_behaviour B4 || echo "Set desktop autologin manually in raspi-config." >&2
raspi-config nonint do_blanking 1 || echo "Disable screen blanking manually in raspi-config." >&2

echo "Done. Device key: $DEVICE_KEY. Reboot to start the kiosk."
