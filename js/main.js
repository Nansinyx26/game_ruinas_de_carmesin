'use strict';
// ECLIPSE ZERO · Inicialização (boot) — deve ser o último script carregado
// ---------------------------------------------------------------------------
// INICIALIZAÇÃO
// ---------------------------------------------------------------------------
function boot() {
  game = new Game();
  window.__game = game;   // acesso pelo console para depuração
}
boot();

// App instalável (PWA, manifest.webmanifest + sw.js): só por http(s); pelo file:// segue normal
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch((e) => console.warn('PWA:', e.message)); });
}
// O navegador oferece a instalação: guarda o convite para o botão INSTALAR APP do menu inicial
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); game.installPrompt = e; });
window.addEventListener('appinstalled', () => { game.installPrompt = null; });
