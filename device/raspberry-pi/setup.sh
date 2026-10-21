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
apt-get install -y chromium-browser unclutter v4l-utils

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
touch "$AUTOSTART"
grep -q kinetofun-kiosk "$AUTOSTART" || echo '/usr/local/bin/kinetofun-kiosk &' >> "$AUTOSTART"
chown "$KIOSK_USER:$KIOSK_USER" "$AUTOSTART"

# Log the kiosk user in without a password prompt and keep the screen on.
raspi-config nonint do_boot_behaviour B4 || echo "Set desktop autologin manually in raspi-config." >&2
raspi-config nonint do_blanking 1 || echo "Disable screen blanking manually in raspi-config." >&2

echo "Done. Device key: $DEVICE_KEY. Reboot to start the kiosk."
