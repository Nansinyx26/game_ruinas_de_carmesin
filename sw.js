'use strict';
// ECLIPSE ZERO · Service worker do app instalável (PWA)
// ---------------------------------------------------------------------------
// Só funciona servido por http(s) (python3 -m http.server, GitHub Pages…); pelo file:// o
// jogo roda como sempre, sem ele. Estratégia: o essencial (página, estilo e ícones) vai para
// o cache na instalação; o resto (scripts, imagens, sons, .glb) entra no cache na primeira
// vez que o jogo usa e depois abre mesmo sem internet. Os scripts são revalidados em segundo
// plano (a próxima abertura já pega a versão nova); mude VERSAO para descartar o cache antigo.
// ---------------------------------------------------------------------------
const VERSAO = 'eclipse-zero-v1';
const ESSENCIAL = ['./', './index.html', './css/main.css', './manifest.webmanifest',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESSENCIAL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const codigo = /\.(js|css|html|webmanifest)$|\/$/.test(new URL(req.url).pathname);
  e.respondWith(caches.open(VERSAO).then(async (c) => {
    const salvo = await c.match(req);
    if (salvo && !codigo) return salvo;                 // mídia e modelos: o salvo basta
    const rede = fetch(req).then((r) => {
      if (r && r.ok && r.status === 200) c.put(req, r.clone());
      return r;
    });
    if (salvo) { e.waitUntil(rede.catch(() => {})); return salvo; }   // código: usa o salvo e atualiza por trás
    return rede;
  }));
});
