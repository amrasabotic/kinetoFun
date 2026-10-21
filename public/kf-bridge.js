// Loaded by every built game. Reports where the player's hand is so the platform's
// "Back to games" button can be pressed by hand during a round.
// Position is normalised (0-1) in screen space: x is mirrored like the camera preview.
(function () {
  if (window.parent === window) return;

  var INDEX_TIP = 8;
  var lastSent = 0;
  var lastVisible = false;

  function send(x, y, visible) {
    var now = performance.now();
    // Reports are cheap, but there is no need for more than ~30 a second.
    if (visible === lastVisible && now - lastSent < 33) return;
    lastSent = now;
    lastVisible = visible;
    window.parent.postMessage({ type: 'KF_HAND', x: x, y: y, visible: visible }, '*');
  }

  function pointer(hands) {
    var first = hands && hands[0];
    if (!first) return null;
    // 21 points: a hand. 33 points: a body pose, where the higher wrist is the pointer.
    if (first.length === 21) return { x: 1 - first[INDEX_TIP].x, y: first[INDEX_TIP].y };
    if (first.length === 33) {
      var l = first[15], r = first[16];
      var w = (l.visibility || 0) >= (r.visibility || 0) ? l : r;
      return { x: 1 - w.x, y: w.y };
    }
    return null;
  }

  // Called by the patched tasks-vision builds (see scripts/patch-game-builds.js).
  window.__kfTap = function (result) {
    try {
      var p = pointer(result && result.landmarks);
      if (p) send(p.x, p.y, true);
      else send(0, 0, false);
    } catch (e) { /* never let reporting break a game */ }
  };

  // The platform's Back button asks the game to step back one screen. A game answers by
  // setting window.__kfBack = () => true (it stepped back) or false (already at its start).
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'KF_BACK') return;
    var handled = false;
    try { handled = typeof window.__kfBack === 'function' && window.__kfBack() === true; } catch (err) { /* treat as not handled */ }
    if (handled) window.parent.postMessage({ type: 'KF_BACK_HANDLED' }, '*');
  });

  // Games on the older @mediapipe/hands and @mediapipe/pose packages.
  function wrapLegacy(name, key) {
    var legacy;
    Object.defineProperty(window, name, {
      configurable: true,
      get: function () { return legacy; },
      set: function (C) {
        legacy = C;
        try {
          var orig = C.prototype.onResults;
          C.prototype.onResults = function (cb) {
            return orig.call(this, function (r) {
              var lm = r && r[key];
              var p = pointer(key === 'multiHandLandmarks' ? lm : lm && [lm]);
              if (p) send(p.x, p.y, true); else send(0, 0, false);
              return cb(r);
            });
          };
        } catch (e) { /* leave the original class alone */ }
      },
    });
  }
  wrapLegacy('Hands', 'multiHandLandmarks');
  wrapLegacy('Pose', 'poseLandmarks');
})();
