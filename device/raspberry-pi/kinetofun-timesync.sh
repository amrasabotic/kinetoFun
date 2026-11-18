#!/usr/bin/env bash
# The Pi has no battery clock and boots with the last saved time, which breaks HTTPS until it is corrected.
set -u
source /etc/kinetofun.env

synced() { [[ "$(timedatectl show -p NTPSynchronized --value 2>/dev/null)" == "yes" ]]; }

# Some networks block NTP (UDP 123), so fall back to the Date header of our own site.
# -k is needed because the certificate looks invalid until the clock is right; only the time is read.
set_from_site() {
  local d
  d="$(curl -skI --max-time 10 "$KF_ORIGIN" | tr -d '\r' | sed -n 's/^[Dd]ate: //p' | head -1)"
  [[ -n "$d" ]] && date -s "$d" >/dev/null
}

while true; do
  for _ in $(seq 1 15); do
    synced && break
    sleep 2
  done
  if ! synced; then
    until set_from_site; do sleep 5; done
  fi
  # Re-check periodically so drift is corrected on networks where NTP never works.
  sleep 21600
done
