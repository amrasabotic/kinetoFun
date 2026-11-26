#!/usr/bin/env bash
# Provisions a Raspberry Pi (Raspberry Pi OS Trixie 64-bit, desktop) as a KinetoFun TV.
# Usage: sudo ./setup.sh <DEVICE_KEY> [BASE_URL] [--wifi-country=XX]
set -euo pipefail

USAGE="Usage: sudo ./setup.sh <DEVICE_KEY> [BASE_URL] [--wifi-country=XX]"
WIFI_COUNTRY=""
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --wifi-country=*) WIFI_COUNTRY="${arg#*=}" ;;
    *) ARGS+=("$arg") ;;
  esac
done
set -- "${ARGS[@]}"

DEVICE_KEY="${1:-}"
BASE_URL="${2:-https://kineto.fun}"
KIOSK_USER="${SUDO_USER:-pi}"

if [[ $EUID -ne 0 ]]; then echo "Run with sudo." >&2; exit 1; fi
if [[ -z "$DEVICE_KEY" ]]; then echo "$USAGE" >&2; exit 1; fi
# Keys are 3-64 characters; the server rejects anything else.
if [[ ! "$DEVICE_KEY" =~ ^[A-Za-z0-9_-]{3,64}$ ]]; then echo "DEVICE_KEY must be 3-64 letters, digits, - or _." >&2; exit 1; fi
# Written into shell and systemd files below, so only a plain origin is accepted.
if [[ ! "$BASE_URL" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then echo "BASE_URL must look like https://example.com (no path or quotes)." >&2; exit 1; fi
# The radio stays blocked until a country is set, and then the setup hotspot can't start.
if [[ -z "$WIFI_COUNTRY" ]]; then WIFI_COUNTRY="$(raspi-config nonint get_wifi_country 2>/dev/null || true)"; fi
if [[ ! "$WIFI_COUNTRY" =~ ^[A-Z]{2}$ ]]; then echo "Set the Wi-Fi country, for example --wifi-country=AL. $USAGE" >&2; exit 1; fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_HOME="$(getent passwd "$KIOSK_USER" | cut -d: -f6)"

apt-get update
apt-get install -y chromium v4l-utils plymouth plymouth-themes swaybg fonts-noto-color-emoji curl \
  python3 qrencode iw dnsmasq-base

raspi-config nonint do_wifi_country "$WIFI_COUNTRY"

# Managed policy: camera allowed for our origin, so no permission prompt ever appears.
install -d /etc/chromium/policies/managed
sed "s#__BASE_URL__#${BASE_URL}#g" "$HERE/chromium-policy.json" > /etc/chromium/policies/managed/kinetofun.json

# Launcher and config.
install -m 0755 "$HERE/kinetofun-kiosk.sh" /usr/local/bin/kinetofun-kiosk
# Single quotes read the same in bash (the launcher sources it) and in a systemd
# EnvironmentFile (the Wi-Fi setup service), and keep a "&" in a hand-edited address intact.
cat > /etc/kinetofun.env <<ENV
KF_URL='${BASE_URL}/tvsetup?device=${DEVICE_KEY}'
KF_ORIGIN='${BASE_URL}'
KF_DEVICE_KEY='${DEVICE_KEY}'
ENV

# Clock: several NTP sources, plus a service that falls back to the site's time when NTP is blocked.
install -d /etc/systemd/timesyncd.conf.d
printf '[Time]\nFallbackNTP=time.cloudflare.com time.google.com pool.ntp.org\n' > /etc/systemd/timesyncd.conf.d/kinetofun.conf
timedatectl set-ntp true || true
systemctl restart systemd-timesyncd || true
install -m 0755 "$HERE/kinetofun-timesync.sh" /usr/local/bin/kinetofun-timesync
install -m 0644 "$HERE/kinetofun-timesync.service" /etc/systemd/system/kinetofun-timesync.service

# Wi-Fi setup: a hotspot and phone setup page whenever the box has no network at boot.
install -d /usr/local/lib/kinetofun-provision
install -m 0644 "$HERE/provision/service.py" "$HERE/provision/logic.py" "$HERE/provision/portal.html" /usr/local/lib/kinetofun-provision/
install -d /etc/NetworkManager/dnsmasq-shared.d
install -m 0644 "$HERE/provision/dnsmasq-portal.conf" /etc/NetworkManager/dnsmasq-shared.d/kinetofun-portal.conf
install -m 0644 "$HERE/kinetofun-provision.service" /etc/systemd/system/kinetofun-provision.service

# Start on login of the desktop session (labwc on Bookworm), restarted by the launcher loop.
install -d -o "$KIOSK_USER" -g "$KIOSK_USER" "$USER_HOME/.config/labwc"
AUTOSTART="$USER_HOME/.config/labwc/autostart"
install -m 0644 "$HERE/background.png" /usr/share/kinetofun-background.png
install -d /usr/share/kinetofun
install -m 0644 "$HERE/loading.html" /usr/share/kinetofun/loading.html
install -m 0644 "$HERE/plymouth/logo.png" /usr/share/kinetofun/logo.png
# The Pi session runs labwc with -m, so system and user autostart files both run.
SYS_AUTOSTART=/etc/xdg/labwc/autostart
if [[ -f "$SYS_AUTOSTART" ]]; then
  # Desktop and taskbar off so only the logo shows before Chromium.
  sed -i -E 's@^([^#].*(pcmanfm|wf-panel).*)$@# \1@' "$SYS_AUTOSTART"
  # Logo background first: the system file runs before ours and its other entries can be slow.
  grep -q kinetofun-background "$SYS_AUTOSTART" || sed -i '1i swaybg -c ffffff -i /usr/share/kinetofun-background.png -m fill &' "$SYS_AUTOSTART"
fi
echo '/usr/local/bin/kinetofun-kiosk &' > "$AUTOSTART"

# A fully transparent cursor theme for the desktop session. The TV is driven by hand, and the
# compositor otherwise draws the arrow in the middle of the screen even with no mouse attached.
CURSOR_DIR=/usr/share/icons/kinetofun-blank
install -d "$CURSOR_DIR/cursors"
printf '[Icon Theme]\nName=KinetoFun blank\n' > "$CURSOR_DIR/index.theme"
python3 - "$CURSOR_DIR/cursors/default" <<'PY'
import struct, sys
# Xcursor file with one 1x1 image whose only pixel is fully transparent.
IMAGE, NOMINAL = 0xFFFD0002, 24
header = struct.pack("<4sIII", b"Xcur", 16, 0x10000, 1) + struct.pack("<III", IMAGE, NOMINAL, 28)
image = struct.pack("<9I", 36, IMAGE, NOMINAL, 1, 1, 1, 0, 0, 0) + struct.pack("<I", 0)
with open(sys.argv[1], "wb") as f:
    f.write(header + image)
PY
# CSS cursor names (cursor-shape protocol) and their classic X11 equivalents.
for name in left_ptr arrow top_left_arrow pointer hand hand1 hand2 text xterm ibeam vertical-text \
  crosshair cross wait watch progress left_ptr_watch help question_arrow context-menu cell copy alias \
  move fleur grab grabbing openhand closedhand all-scroll not-allowed no-drop crossed_circle \
  col-resize row-resize ew-resize ns-resize nesw-resize nwse-resize n-resize s-resize e-resize w-resize \
  ne-resize nw-resize se-resize sw-resize sb_h_double_arrow sb_v_double_arrow zoom-in zoom-out X_cursor; do
  ln -sf default "$CURSOR_DIR/cursors/$name"
done
LABWC_ENV="$USER_HOME/.config/labwc/environment"
touch "$LABWC_ENV"
sed -i '/^XCURSOR_THEME=/d' "$LABWC_ENV"
echo 'XCURSOR_THEME=kinetofun-blank' >> "$LABWC_ENV"
chown "$KIOSK_USER:$KIOSK_USER" "$LABWC_ENV"

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
systemctl enable kinetofun-timesync.service
systemctl enable kinetofun-provision.service
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

echo "Done. Device key: $DEVICE_KEY. Wi-Fi country: $WIFI_COUNTRY. Reboot to start the kiosk."
