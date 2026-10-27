// Loaded by every built game. Reports where the player's hand is so the platform's
// "Back to games" button can be pressed by hand during a round.
// Position is normalised (0-1) in screen space: x is mirrored like the camera preview.
(function () {
  // On a TV the platform sends the smallest readable font size; smaller text is raised to it.
  var minFont = 0;
  var raised = [];
  var pending = false;

  function raiseText() {
    pending = false;
    // Undo earlier raises first so text a game has since enlarged keeps its own size.
    for (var i = 0; i < raised.length; i++) raised[i].style.removeProperty('font-size');
    raised = [];
    if (!minFont || !document.body) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var seen = new Set();
    for (var t = walker.nextNode(); t; t = walker.nextNode()) {
      var el = t.parentElement;
      if (!el || seen.has(el) || !t.textContent.trim()) continue;
      seen.add(el);
      if (parseFloat(getComputedStyle(el).fontSize) < minFont) raised.push(el);
    }
    for (var j = 0; j < raised.length; j++) raised[j].style.setProperty('font-size', minFont + 'px', 'important');
  }

  function scheduleRaise() {
    if (pending || !minFont) return;
    pending = true;
    // At most twice a second; the Pi has little time to spare during a round.
    setTimeout(raiseText, 500);
  }

  window.__kfTvText = function (px) {
    minFont = px > 0 ? px : 0;
    if (minFont && !document.getElementById('kf-tv-style')) {
      // Nothing can scroll by hand on a TV, so a scrollbar only takes space.
      var style = document.createElement('style');
      style.id = 'kf-tv-style';
      style.textContent = '*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important}';
      document.head.appendChild(style);
    }
    raiseText();
    if (!window.__kfTvObserver && document.body) {
      window.__kfTvObserver = new MutationObserver(scheduleRaise);
      window.__kfTvObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  };

  if (window.parent === window) return;

  // Same origin as the platform, so the TV flag set by /tvsetup is readable before any game code runs.
  var tvLite = false;
  try { tvLite = window.localStorage.getItem('kf_tv_mode') === '1'; } catch (e) { /* storage blocked: full quality */ }

  if (tvLite) {
    // Canvas glows are among the slowest things a Raspberry Pi can draw, and most games add one to every sprite.
    try {
      var proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
      var blur = proto && Object.getOwnPropertyDescriptor(proto, 'shadowBlur');
      if (blur && blur.set) {
        Object.defineProperty(proto, 'shadowBlur', {
          configurable: true,
          get: function () { return 0; },
          set: function () { blur.set.call(this, 0); },
        });
      }
    } catch (e) { /* keep glows */ }
    // Blurring whatever animates behind a panel is redone every frame.
    var lite = document.createElement('style');
    lite.textContent = '*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
    document.documentElement.appendChild(lite);
  }

  window.addEventListener('message', function (e) {
    if (e.source === window.parent && e.data && e.data.type === 'KF_TV_TEXT') window.__kfTvText(e.data.minFont);
  });

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

  // With hand and body trackers both running, body results would make the cursor jump to the wrist.
  var lastHandAt = -Infinity;

  function report(points, isHand) {
    var now = performance.now();
    if (isHand) lastHandAt = now;
    else if (now - lastHandAt < 1000) return;
    var p = pointer(points);
    if (p) send(p.x, p.y, true); else send(0, 0, false);
  }

  // Called by the patched tasks-vision builds (see scripts/patch-game-builds.js).
  window.__kfTap = function (result) {
    // Face results (faceLandmarks) say nothing about a hand; letting them through would hide the cursor.
    if (!result || !('landmarks' in result)) return;
    try {
      report(result.landmarks, 'handedness' in result || 'handednesses' in result || 'gestures' in result);
    } catch (e) { /* never let reporting break a game */ }
  };

  // Many games detect on every screen refresh; on a TV, an already analysed camera frame returns its result.
  window.__kfDetect = function (inst, args, run) {
    var src = args[0];
    var hasCallback = false;
    for (var i = 0; i < args.length; i++) if (typeof args[i] === 'function') hasCallback = true;
    if (!tvLite || hasCallback || !src || typeof src.currentTime !== 'number') return run();
    var c = inst.__kfFrame;
    if (c && c.src === src && c.time === src.currentTime) return c.result;
    var r = run();
    inst.__kfFrame = { src: src, time: src.currentTime, result: r };
    return r;
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
              try {
                var lm = r && r[key];
                var isHand = key === 'multiHandLandmarks';
                report(isHand ? lm : lm && [lm], isHand);
              } catch (e) { /* never let reporting break a game */ }
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
