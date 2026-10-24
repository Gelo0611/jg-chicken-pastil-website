const VERSION='jg-suki-p1h-a3-owner-pagination-p1h-customer-history-email-20261024-v4-p1h-a12-account-settings-20261024-p1h-a13-mobile-settings-ui-20261024-p1h-a15-email-verified-password-20261024-p1h-a16-reset-tabs-ui-20261024-p1i-a15-selective-enroll-20261024';
const ASSETS=['./','./index.html','./styles.css','./app.js','./account-settings.js','./qr.js','./api.js','./offline.js','./issuance-safety.js','./config.js','./manifest.webmanifest','./assets/jg-logo.png','./assets/icon-180.png','./assets/icon-192.png','./assets/icon-512.png','./vendor/jsqr/jsQR.js','./vendor/qr/index.js','./vendor/qr/QR8bitByte.js','./vendor/qr/QRBitBuffer.js','./vendor/qr/QRErrorCorrectLevel.js','./vendor/qr/QRMaskPattern.js','./vendor/qr/QRMath.js','./vendor/qr/QRMode.js','./vendor/qr/QRPolynomial.js','./vendor/qr/QRRSBlock.js','./vendor/qr/QRUtil.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith('jg-suki-')&&n!==VERSION).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==location.origin) return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(res=>{if(res.ok){const copy=res.clone();caches.open(VERSION).then(cache=>cache.put('./index.html',copy));}return res;}).catch(()=>caches.match('./index.html')));
  return;
 }
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});

// P1I-A15-SELECTIVE-ENROLLMENT-20261024
