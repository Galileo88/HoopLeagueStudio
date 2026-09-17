const CACHE_NAME='hlls-pwa-v100';
const CORE=[
  './',
  './index.html',
  './manifest-v100.webmanifest',
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
        if(cached)return cached;
        return fetch(request).then(response=>{
          if(response.ok||response.type==='opaque'){
            const copy=response.clone();
            caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
          }
          return response;
        });
      })
    );
  }
});
