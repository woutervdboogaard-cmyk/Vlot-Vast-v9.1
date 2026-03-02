diff --git a/sw.js b/sw.js
index 749274bdfe6b6da9eede35f47784f63894ce2696..a300c2d70c1c197b2b60004ee05aea8506cfa744 100644
--- a/sw.js
+++ b/sw.js
@@ -1,20 +1,20 @@
-const CACHE="vlotvast-v9-1";
+const CACHE="vlotvast-v9-2";
 const ASSETS = [
   "./",
   "./index.html",
   "./numbers.html",
   "./letters.html",
   "./parent.html",
   "./rewards.html",
   "./manifest.json",
   "./assets/styles.css",
   "./assets/core.js",
   "./assets/mascot_fox.svg",
   "./assets/icon_numbers.svg",
   "./assets/icon_letters.svg",
   "./assets/icon-192.png",
   "./assets/icon-512.png"
 ];
 self.addEventListener("install",(e)=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); self.skipWaiting(); });
 self.addEventListener("activate",(e)=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k))))); self.clients.claim(); });
 self.addEventListener("fetch",(e)=>{ e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request).catch(()=>caches.match("./index.html")))); });
