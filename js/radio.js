'use strict';
// ECLIPSE ZERO · Rádio dos aliados: falas curtas durante o jogo
// ---------------------------------------------------------------------------
// RÁDIO: depois de encontrados, Lyra, Drakos, Sera e Orion falam com Kael pelo
// rádio em três momentos: início de setor, aparição de NEXUS e fragmento de
// memória recuperado. Os textos ficam em ALLY_RADIO (js/story.js). Para não
// poluir a tela:
//   · no máximo uma fala por evento, e cada evento fala uma vez por jornada
//     (morrer e voltar ao início do setor não repete a fala)
//   · só fala quem já está com Kael (allyJoined: liberado no elenco e encontrado
//     na história) e só com a opção 'Falas durante o jogo' ligada (Settings.v.gameSubs)
//   · espera a legenda atual terminar: nunca interrompe NEXUS, o setor ou um NPC
//   · descarta a fala se o setor mudar, se Kael cair ou se não surgir uma brecha a tempo
// Não usa Math.random nem mexe na simulação: a jogabilidade do Kael não muda.
// ---------------------------------------------------------------------------
const RADIO = {
  gap: 0.8,        // silêncio mínimo depois da legenda anterior (s)
  cooldown: 14,    // intervalo mínimo entre duas falas do rádio (s)
  maxWait: 14,     // tempo máximo esperando uma brecha depois do atraso (s)
  suffix: ' · RÁDIO',
};
// Legendas do rádio usam a cor do aliado (SPEAKERS em js/hud.js): "LYRA · RÁDIO"
for (const id of ALLY_IDS) {
  const k = id.toUpperCase();
  if (SPEAKERS[k]) SPEAKERS[k + RADIO.suffix] = SPEAKERS[k];
}

const AllyRadio = {
  pending: null, said: new Set(), quiet: 0, since: 99,

  // Nova jornada (jogo novo, continuar ou novo ciclo)
  reset() { this.pending = null; this.said.clear(); this.quiet = 0; this.since = 99; },

  // Um evento do jogo: escolhe a fala do primeiro aliado presente e a agenda
  // kind: 'room' (key = setor) | 'boss' | 'memory' (key = índice do fragmento)
  event(kind, key = '', delay = 1) {
    if (!Settings.v.gameSubs) return false;
    const id = `${kind}:${key}`;
    if (this.said.has(id)) return false;
    const pool = kind === 'boss' ? ALLY_RADIO.boss : (ALLY_RADIO[kind] || {})[key];
    const line = (pool || []).find(([ally]) => allyJoined(ally));
    if (!line) return false;
    this.said.add(id);
    if (kind === 'room') this.since = RADIO.cooldown;   // setor novo: o intervalo do setor anterior não conta
    const [ally, text] = line;
    this.pending = { who: ally.toUpperCase() + RADIO.suffix, text, delay, age: 0, room: game.waves.roomIndex };
    return true;
  },

  // Chamado a cada quadro de jogo (pausa, árvore e telas de história congelam o rádio)
  update(dt) {
    this.since += dt;
    const p = this.pending, hud = game.hud;
    if (!p) return;
    p.age += dt;
    // Setor trocado, espera longa demais, falas desligadas ou Kael caiu: a fala perde o sentido
    if (p.room !== game.waves.roomIndex || p.age > p.delay + RADIO.maxWait || !Settings.v.gameSubs ||
        (game.player && game.player.state === 'dead')) { this.pending = null; return; }
    // Alguém está falando (ou vai falar): espera a legenda terminar
    if (hud.sub) { this.quiet = 0; return; }
    this.quiet += dt;
    if (p.age < p.delay || this.quiet < RADIO.gap || this.since < RADIO.cooldown) return;
    hud.say(p.who, p.text, clamp(3.2 + p.text.length * 0.026, 3.8, 6.2));
    game.audio.play('uiMove');   // clique do rádio
    this.pending = null; this.since = 0;
  },
};
