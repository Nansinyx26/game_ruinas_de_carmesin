'use strict';
// ECLIPSE ZERO · Missões de lealdade dos aliados (Refúgio dos Desconectados)
// ---------------------------------------------------------------------------
// Depois que o Refúgio é liberado, cada aliado do grupo que não está em campo aparece lá
// (com o próprio modelo 3D) e, ao conversar ([E]), oferece uma missão opcional:
//   LYRA    Caçada Longe da Rede   abates jogando com a Lyra
//   DRAKOS  Onze Anos              legionários derrubados jogando com o Drakos
//   SERA    Silêncio na Rede       máquinas destruídas jogando com a Sera
//   ORION   Ninguém Me Vê Chegar   abates jogando com o Orion
// O progresso conta em qualquer setor seguinte. Ao completar, o aliado fala pelo rádio e
// libera a recompensa lendária: a armadura suprema dele (que pelo nível só sairia no 100)
// e a arma especial (RosterManager.unlockArmor / unlockWeapon). As falas novas são só texto;
// a dublagem já gravada toca quando a fala é a mesma da gravação (falas: [texto, áudio]).
// Estado no salvamento: game.flags.lealdade = { <id>: { st: 'ativa' | 'feita', n } }.
// ---------------------------------------------------------------------------
const LOYALTY_QUESTS = {
  lyra: {
    title: 'Caçada Longe da Rede', count: 25, rgb: '166,77,255',
    goal: 'Elimine inimigos jogando com a Lyra',
    offer: [
      ['Você fala sozinho, sabia? E sempre sobre essa espada. Pode falar comigo também.', 'dublagem/lyra/lyra_radio_setor1.mp3'],
      ['Me deixa mostrar como se caça longe da rede. Vinte e cinco abates com o meu arco — e eu te conto o que aprendi nos túneis.'],
    ],
    wait: ['Ainda estou contando. Arco tenso, respiração solta.'],
    done: ['Viu? Ninguém da rede nos achou. Fica com isto: era a armadura que eu guardava para o dia em que deixasse de fugir.'],
    reward: { armor: 'lyra_suprema', weapon: 'arco_lyra_3d' },
  },
  drakos: {
    title: 'Onze Anos', count: 6, rgb: '255,46,61', enemy: 'legionario',
    goal: 'Derrube legionários jogando com o Drakos',
    offer: [
      ['Onze anos ouvindo a voz da Legião no lugar da minha.', 'dublagem/drakos/drakos_encontro_soldado.mp3'],
      ['Seis legionários. Cada um que eu derrubar com as minhas mãos é um ano que eu pego de volta.'],
    ],
    wait: ['Ainda faltam alguns. A Legião não manda soldados sozinhos.'],
    done: ['Pronto. A armadura que a Legião me deu fica para trás — esta eu forjei para mim. E o martelo também.'],
    reward: { armor: 'drakos_suprema', weapon: 'martelo_drakos_3d' },
  },
  sera: {
    title: 'Silêncio na Rede', count: 15, rgb: '25,230,210', mech: true,
    goal: 'Destrua máquinas jogando com a Sera',
    offer: [
      ['Estou ouvindo o canal da Legião. Eles chamam este refúgio de “foco de infecção”.', 'dublagem/sera/sera_radio_setor3.mp3'],
      ['Cada máquina que cai deixa um pedaço de código para trás. Quinze delas e eu reescrevo o meu traje para não pedir permissão a ninguém.'],
    ],
    wait: ['Ainda estou juntando os fragmentos. Mais algumas máquinas.'],
    done: ['Consegui. O traje agora responde só a mim — e o drone também. Obrigada por me dar o silêncio de que eu precisava.'],
    reward: { armor: 'sera_suprema', weapon: 'drone_sera_3d' },
  },
  orion: {
    title: 'Ninguém Me Vê Chegar', count: 20, rgb: '255,138,31',
    goal: 'Elimine inimigos jogando com o Orion',
    offer: [
      ['Se não voltar em uma hora, eu subo. Ninguém vai me ver chegar.', 'dublagem/orion/orion_vigil_torre.mp3'],
      ['Vinte alvos, sem testemunhas. Quando terminar, apago o meu nome de mais um registro.'],
    ],
    wait: ['Ainda há alvos. Paciência é metade do trabalho.'],
    done: ['Feito. Esta armadura não aparece em nenhum registro — nem esta arma. Agora são suas também.'],
    reward: { armor: 'orion_suprema', weapon: 'arma_primaria_orion_3d' },
  },
};

const LoyaltyQuests = {
  init() { RosterManager.on('characterChanged', () => { if (game.room) this.spawn(); }); },
  // Estado de uma missão ({ st, n }; nunca falta)
  state(id) {
    const f = game.flags, L = f.lealdade || (f.lealdade = {});
    return L[id] || (L[id] = { st: 'nova', n: 0 });
  },
  name(id) { const d = CHARACTERS_BY_ID[id]; return d ? d.name.split(' ')[0].toUpperCase() : id.toUpperCase(); },

  // Aliados no Refúgio liberado (chamado ao carregar o setor e ao terminar as ondas)
  spawn() {
    const room = game.room;
    if (!room || !room.def || room.def.theme !== 'refuge' || game.waves.state !== 'cleared') return;
    // quem entrou em campo (troca de personagem na pausa) deixa de aparecer como NPC
    for (let k = game.npcs.length - 1; k >= 0; k--) if (game.npcs[k].quest === RosterManager.active) game.npcs.splice(k, 1);
    const spots = [[0.5, 0.3], [0.62, 0.55], [0.38, 0.6], [0.5, 0.78]];
    let i = 0;
    for (const id in LOYALTY_QUESTS) {
      if (id === RosterManager.active || !RosterManager.isUnlocked(id) || game.npcs.some((n) => n.quest === id)) continue;
      const def = CHARACTERS_BY_ID[id], at = spots[i++ % spots.length];
      const pt = npcSpot(room, at[0], at[1]);
      const n = new NPC({ model: heroModelKey(def), name: def.name.toUpperCase(), at, facing: Math.PI * 0.5, lines: ['…'] }, pt.x, pt.y);
      n.quest = id;
      n.height = 58;
      n.talk = () => this.talk(n, id);
      game.npcs.push(n);
    }
  },

  // Conversa com o aliado: oferece, lembra o objetivo ou agradece
  talk(n, id) {
    const Q = LOYALTY_QUESTS[id], S = this.state(id), who = this.name(id);
    n.talkT = 3.6;
    if (S.st === 'nova') {
      S.st = 'ativa';
      this.lines(who, Q.offer);
      game.hud.toast(`MISSÃO DE LEALDADE · ${Q.title} — ${Q.goal} (0/${Q.count})`, Q.rgb);
      game.audio.play('memory');
      game.saveGame();
    } else if (S.st === 'ativa') {
      this.lines(who, [[`${Q.wait[0]} (${S.n}/${Q.count})`]]);
    } else {
      this.lines(who, [[Q.done[0]]]);
    }
  },
  // Falas em sequência no quadro de legenda (com a dublagem quando houver)
  lines(who, list) {
    let delay = 0;
    list.forEach(([text, audio]) => {
      const dur = clamp(text.length * 0.055, 2.6, 6.5);
      setTimeout(() => {
        if (game.state !== 'playing') return;
        game.hud.say(who, text, dur, 0, true);
        if (audio) game.audio.narration.play(audio);
      }, delay * 1000);
      delay += dur + 0.2;
    });
  },

  // Abate: conta para a missão do personagem em campo
  onKill(e) {
    const id = RosterManager.active, Q = LOYALTY_QUESTS[id];
    if (!Q) return;
    const S = this.state(id);
    if (S.st !== 'ativa') return;
    if (Q.enemy && e.type !== Q.enemy) return;
    if (Q.mech && !(e.T && e.T.mech)) return;
    S.n++;
    if (S.n >= Q.count) { this.complete(id); return; }
    if (S.n % Math.max(1, Math.round(Q.count / 4)) === 0) game.hud.toast(`${Q.title} · ${S.n}/${Q.count}`, Q.rgb);
  },
  // Missão cumprida: fala pelo rádio e libera a armadura suprema e a arma especial
  complete(id) {
    const Q = LOYALTY_QUESTS[id], S = this.state(id);
    S.st = 'feita'; S.n = Q.count;
    const got = [];
    if (Q.reward.armor && ARMOR_DEFS[Q.reward.armor]) { RosterManager.unlockArmor(Q.reward.armor); got.push(`Armadura ${ARMOR_DEFS[Q.reward.armor].name}`); }
    if (Q.reward.weapon && WEAPON_DEFS[Q.reward.weapon]) { RosterManager.unlockWeapon(Q.reward.weapon); got.push(WEAPON_DEFS[Q.reward.weapon].name); }
    game.hud.toast(`LEALDADE CONQUISTADA · ${Q.title} — ${got.join(' + ')} (lendário)`, Q.rgb);
    this.lines(this.name(id), [[Q.done[0]]]);
    game.audio.play('skill');
    game.saveGame();
  },
  // Linha do quadro de missões do HUD (missão ativa do personagem em campo), ou null
  hudLine() {
    const id = RosterManager.active, Q = LOYALTY_QUESTS[id];
    if (!Q || !game.flags.lealdade || !game.flags.lealdade[id]) return null;
    const S = game.flags.lealdade[id];
    return S.st === 'ativa' ? `${Q.title}: ${S.n}/${Q.count}` : null;
  },
};
