const CACHE = "cpo-info-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./glossary.html",
  "./info.html",
  "./archive.html",
  "./status.html",
  "./qa.html",
  "./sources.html",
  "./css/app.css",
  "./js/app.js",
  "./js/search.js",
  "./js/reference.js",
  "./js/qa.js",
  "./js/firebase-config.js",
  "./data/content.js",
  "./data/stations.js",
  "./data/reference.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
