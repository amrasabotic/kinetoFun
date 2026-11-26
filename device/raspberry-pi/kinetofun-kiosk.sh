#!/usr/bin/env bash
# Runs Chromium full screen on the TV page and restarts it if it exits or crashes.
set -u

DEFAULT_URL="https://kineto.fun/tvsetup"
KF_URL=""
KF_ORIGIN=""
KF_DEVICE_KEY=""
# A malformed file (an unquoted "&" in the address, for example) must not stop the kiosk:
# the TV would show only the logo background with no error anywhere on screen.
source /etc/kinetofun.env 2>/dev/null || true

valid_url() { [[ "$1" =~ ^https?://[^[:space:]\"\'\`\$\;\|\<\>]+$ ]]; }

if ! valid_url "$KF_URL"; then
  if valid_url "$KF_ORIGIN" && [[ "$KF_DEVICE_KEY" =~ ^[A-Za-z0-9_-]{3,64}$ ]]; then
    FALLBACK="${KF_ORIGIN}/tvsetup?device=${KF_DEVICE_KEY}"
  else
    FALLBACK="$DEFAULT_URL"
  fi
  logger -t kinetofun-kiosk "KF_URL in /etc/kinetofun.env is missing or invalid; opening $FALLBACK"
  KF_URL="$FALLBACK"
fi

# Local loader first so an offline boot shows the logo, not the browser's offline page.
# Served by the Wi-Fi setup service when it runs, so the loader can read its status same-origin.
SERVED_LOADER="http://127.0.0.1/tv/loading.html?to=${KF_URL}"
FILE_LOADER="file:///usr/share/kinetofun/loading.html?to=${KF_URL}"

pick_loader() {
  local tries="$1"
  for _ in $(seq 1 "$tries"); do
    if curl -sf -o /dev/null --max-time 1 http://127.0.0.1/tv/loading.html; then
      LOADER="$SERVED_LOADER"
      return
    fi
    sleep 1
  done
  LOADER="$FILE_LOADER"
}

# Disabled features:
# - WebRtcPipeWireCamera: the PipeWire camera path asks the desktop portal, which shows its own
#   "Allow app to use the camera" dialog that the managed policy cannot answer. Without it
#   Chromium opens the USB camera directly and the policy's allow list applies.
# - NonMilestoneUpdateToast: the "Chrome was updated" bubble after an OS update of Chromium,
#   which nobody can dismiss on a unit without a mouse.
# The service can start a little after the desktop, so wait for it once at boot.
TRIES=15
while true; do
  pick_loader "$TRIES"
  TRIES=1
  chromium \
    --kiosk \
    --password-store=basic \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-features=Translate,WebRtcPipeWireCamera,NonMilestoneUpdateToast \
    --autoplay-policy=no-user-gesture-required \
    --ozone-platform=wayland \
    --disable-component-update \
    --disable-default-apps \
    --disable-sync \
    --no-first-run \
    "$LOADER"
  sleep 3
done
