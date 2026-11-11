#!/usr/bin/env bash
# Runs Chromium full screen on the TV page and restarts it if it exits or crashes.
set -u
source /etc/kinetofun.env

# Local loader first so an offline boot shows the logo, not the browser's offline page.
LOADER="file:///usr/share/kinetofun/loading.html?to=${KF_URL}"

# Hide the pointer when idle; harmless if unclutter has no display to talk to.
unclutter -idle 0.1 -root &

while true; do
  chromium \
    --kiosk \
    --password-store=basic \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-features=Translate \
    --autoplay-policy=no-user-gesture-required \
    --ozone-platform=wayland \
    --disable-component-update \
    --disable-default-apps \
    --disable-sync \
    --no-first-run \
    "$LOADER"
  sleep 3
done
