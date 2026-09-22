const CACHE_NAME='hls-pwa-v141';
const CORE=[
  './',
  './index.html',
  './court-preview.js',
  './roster-manager.js',
  './roster-manager.css',
  './team-logo.js',
  './team-logo.css',
  './player-preview.js',
  './player-assets/head.png',
  './player-assets/eye-white.png',
  './player-assets/eye-color.png',
  './player-assets/brow-color.png',
  './player-assets/unibrow-color.png',
  './player-assets/idle.png',
  './player-assets/hair.png',
  './player-assets/facial-hair.png',
  './player-assets/head-accessories.png',
  './player-assets/team-letters.png',
  './data/player-blueprint.json',
  './manifest.webmanifest',
  './icons/favicon.png',
  './images/hls_logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(CORE))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));
          }
          return response;
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith(
      caches.match(request).then(cached=>{
        const network=fetch(request).then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
          }
          return response;
        }).catch(()=>cached);
        return cached||network;
      })
    );
    return;
  }

  if(url.hostname==='raw.githubusercontent.com'){
    event.respondWith(
      caches.match(request).then(cached=>{
        // Preview images may be opaque; the color picker needs a CORS-readable response.
        const compatible=cached&&(cached.type!=='opaque'||request.mode==='no-cors');
        if(compatible&&request.cache!=='reload'&&request.cache!=='no-store')return cached;
        return fetch(request).then(response=>{
          if(request.cache!=='no-store'&&(response.ok||response.type==='opaque')){
            const copy=response.clone();
            caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
          }
          return response;
        });
      })
    );
  }
});
