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
