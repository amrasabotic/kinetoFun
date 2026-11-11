// Replaces the browser's offline page on TV screens with a branded loader that retries on its own.
const CACHE = "kf-tv-offline-v1";
const LOGO = "/logo.png";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(LOGO)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kf-tv-offline-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => offlinePage()));
    return;
  }
  // The loader's logo has to load while the network is down.
  if (new URL(request.url).pathname === LOGO) {
    event.respondWith(fetch(request).catch(() => caches.match(LOGO)));
  }
});

function offlinePage() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>KinetoFun</title>
<style>
html,body{margin:0;height:100%;background:#fff;overflow:hidden;cursor:none}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;font-family:Nunito,"Noto Sans",sans-serif;color:#6d28d9}
img{width:360px;max-width:40vw}
.s{width:64px;height:64px;border-radius:50%;border:7px solid #ede9fe;border-top-color:#7c3aed;animation:r .9s linear infinite}
p{margin:0;font-size:28px;font-weight:700;opacity:.8}
@keyframes r{to{transform:rotate(360deg)}}
</style></head><body>
<img src="${LOGO}" alt="KinetoFun"><div class="s"></div><p>Connecting to Wi-Fi…</p>
<script>
// A cache-busted logo request reaches the network only when the site is back.
(function probe(){var i=new Image();i.onload=function(){location.reload()};i.onerror=function(){setTimeout(probe,2000)};i.src="${LOGO}?t="+Date.now()})();
</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
