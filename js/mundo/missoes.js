'use strict';
// ECLIPSE ZERO · Mundo aberto: missões das regiões (WorldQuests)
// ---------------------------------------------------------------------------
// Cada região tem 3 missões em sequência, dadas pelo NPC de missão (quest: true) da zona de
// chegada: conversar com ele aceita a próxima, mostra o andamento da atual e, quando ela está
// pronta, entrega a recompensa (células, experiência e uma relíquia com raridade mínima).
// Tipos: 'matar' (n inimigos, de um tipo ou qualquer, na região), 'elite' (n elites), 'baus'
// (n baús abertos na região), 'terminais' (todos os terminais da região), 'explorar' (todas
// as zonas da região) e 'chefe' (o chefe regional). Os de contagem só andam com a missão
// aceita; os outros leem o estado do mundo. A linha da missão atual vai para o quadro de
// missão do HUD (World.objective) e a aba MISSÕES da mochila lista todas.
// O estado fica em World.state.missoes = { [id]: { st: 'ativa' | 'feita', prog } }.
// ---------------------------------------------------------------------------
const WORLD_QUESTS = {
  carmesin: [
    { id: 'car1', name: 'Ecos das Ruínas', tipo: 'matar', n: 12, rec: { cells: 40, xp: 250, min: 1 },
      ini: 'As máquinas tomaram as ruas. Derrube doze delas e as pessoas voltam a sair.', fim: 'Ouvi passos na avenida hoje. Passos de gente. Obrigada.' },
    { id: 'car2', name: 'Vozes nos Terminais', tipo: 'terminais', rec: { cells: 60, xp: 400, min: 1 },
      ini: 'Os terminais ainda guardam o que a cidade viu. Leia todos: eu preciso saber o que aconteceu.', fim: '"Não olhem para o céu"... Então era isso.' },
    { id: 'car3', name: 'O Guardião Carmesim', tipo: 'chefe', rec: { cells: 120, xp: 800, min: 2 },
      ini: 'O guardião do Coração não dorme. Enquanto ele estiver lá, a fenda fica aberta.', fim: 'A luz vermelha diminuiu. Pela primeira vez em anos. Siga o mapa: Velmora abriu.' },
  ],
  velmora: [
    { id: 'vel1', name: 'Pragas entre as Raízes', tipo: 'matar', alvo: 'rastejador', n: 10, rec: { cells: 80, xp: 600, min: 1 },
      ini: 'Os rastejadores estão comendo as raízes por dentro. Dez a menos já ajudam a floresta.', fim: 'As árvores pararam de gemer à noite. Você ouviu?' },
    { id: 'vel2', name: 'Tesouros Engolidos', tipo: 'baus', n: 4, rec: { cells: 100, xp: 700, min: 2 },
      ini: 'A cidade velha deixou caixas por toda parte. Abra quatro antes que as raízes fechem tudo.', fim: 'Isso aqui era de uma escola. Vou guardar.' },
    { id: 'vel3', name: 'A Guardiã das Raízes', tipo: 'chefe', rec: { cells: 180, xp: 1200, min: 2 },
      ini: 'No coração da floresta mora a guardiã. Ela já foi uma de nós.', fim: 'Ela descansa agora. Velmora vai crescer em paz.' },
  ],
  lagoa: [
    { id: 'lag1', name: 'Drones sobre a Água', tipo: 'matar', alvo: 'drone', n: 10, rec: { cells: 110, xp: 900, min: 1 },
      ini: 'Os drones assustam os peixes e as pessoas. Derrube dez e a lagoa respira.', fim: 'O céu ficou quieto. Dá para pescar de novo.' },
    { id: 'lag2', name: 'Mapa da Lagoa', tipo: 'explorar', rec: { cells: 130, xp: 1000, min: 2 },
      ini: 'Ninguém mapeou a lagoa depois do Dia Zero. Pise em cada canto dela por mim.', fim: 'Um mapa inteiro. Meu avô ia gostar de ver.' },
    { id: 'lag3', name: 'Sentinela do Abismo', tipo: 'chefe', rec: { cells: 220, xp: 1600, min: 3 },
      ini: 'A luz embaixo d\'água é a sentinela. Ela chama quem chega perto da borda.', fim: 'A água apagou. Só a lua brilha nela agora.' },
  ],
  nexus: [
    { id: 'nex1', name: 'Patrulha da Legião', tipo: 'matar', alvo: 'legionario', n: 6, rec: { cells: 130, xp: 1000, min: 1 },
      ini: 'A Legião patrulha as avenidas. Derrube seis e a cúpula vai perceber que alguém resiste.', fim: 'Eles mudaram a rota da patrulha. Estão com medo.' },
    { id: 'nex2', name: 'Unidades de Elite', tipo: 'elite', n: 3, rec: { cells: 160, xp: 1200, min: 2 },
      ini: 'As unidades de elite guardam as chaves da cúpula. Três delas e o caminho abre.', fim: 'Três chaves. A cúpula está ao seu alcance.' },
    { id: 'nex3', name: 'O Arauto', tipo: 'chefe', rec: { cells: 260, xp: 2000, min: 3 },
      ini: 'O Arauto fala com a cidade inteira. Cale essa voz.', fim: 'Silêncio na cidade. Ouço as pessoas pensando de novo.' },
  ],
  seraph: [
    { id: 'ser1', name: 'Caçadores das Dunas', tipo: 'matar', alvo: 'cacador', n: 10, rec: { cells: 150, xp: 1300, min: 1 },
      ini: 'Os caçadores seguem as caravanas pela areia. Dez a menos e passamos.', fim: 'A caravana chegou inteira. Primeira vez neste ano.' },
    { id: 'ser2', name: 'Relíquias da Areia', tipo: 'baus', n: 5, rec: { cells: 180, xp: 1500, min: 2 },
      ini: 'A areia esconde caixas antigas. Abra cinco e veremos o que o deserto engoliu.', fim: 'Equipamento de antes de NEXUS. Isso muda tudo.' },
    { id: 'ser3', name: 'O Faraó de Sucata', tipo: 'chefe', rec: { cells: 300, xp: 2400, min: 3 },
      ini: 'Na tumba vive o Faraó de Sucata, feito do que o deserto não quis.', fim: 'O vento mudou. Seraph é de quem atravessa agora.' },
  ],
  asterion: [
    { id: 'ast1', name: 'A Vigília', tipo: 'matar', alvo: 'legionario', n: 8, rec: { cells: 180, xp: 1700, min: 2 },
      ini: 'A fortaleza manda legionários para a encosta. Oito a menos e subimos.', fim: 'A trilha está livre até a fortaleza.' },
    { id: 'ast2', name: 'Cume a Cume', tipo: 'explorar', rec: { cells: 210, xp: 1900, min: 2 },
      ini: 'Quero saber o que há em cada passo da montanha. Vá a todos os lugares de Asterion.', fim: 'Você viu o pico de perto. Como é lá em cima?' },
    { id: 'ast3', name: 'Titã do Pico', tipo: 'chefe', rec: { cells: 340, xp: 2800, min: 3 },
      ini: 'O titã no pico repete seu nome no rádio. Vá responder.', fim: 'O rádio parou. Só o vento agora.' },
  ],
  obsidiano: [
    { id: 'obs1', name: 'Fogo e Ferro', tipo: 'matar', n: 20, rec: { cells: 220, xp: 2200, min: 2 },
      ini: 'Tudo aqui quer te queimar. Derrube vinte e a forja volta a ser nossa.', fim: 'A forja esquentou com fogo nosso. Dá para trabalhar.' },
    { id: 'obs2', name: 'Elite da Cratera', tipo: 'elite', n: 4, rec: { cells: 260, xp: 2600, min: 3 },
      ini: 'As elites guardam o caminho para o núcleo. Quatro delas.', fim: 'O caminho está aberto. Não vou mentir: o que vem é pior.' },
    { id: 'obs3', name: 'O Núcleo de Obsidiana', tipo: 'chefe', rec: { cells: 420, xp: 3600, min: 4 },
      ini: 'O núcleo alimenta metade das máquinas do mundo. Apague-o.', fim: 'As máquinas do mundo inteiro piscaram. Você sentiu?' },
  ],
};
const WORLD_ALVO_NOME = { rastejador: 'rastejadores', drone: 'drones', legionario: 'legionários', cacador: 'caçadores', sacerdote: 'sacerdotes' };

const WorldQuests = {
  get S() { const W = World.state; if (!W.missoes) W.missoes = {}; return W.missoes; },
  lista(reg) { return WORLD_QUESTS[reg] || []; },
  regDe(q) { for (const r in WORLD_QUESTS) if (WORLD_QUESTS[r].includes(q)) return r; return 'carmesin'; },
  // Quem dá as missões da região (o NPC quest da zona de chegada)
  doador(reg) {
    const z = worldZonesOf(reg).find((q) => q.hub), n = z && (z.npcs || []).find((q) => q.quest);
    return { nome: n ? n.name : 'o contato da região', zona: z ? z.name : '' };
  },
  // Andamento e meta de uma missão (os tipos de leitura contam direto do estado do mundo)
  meta(q) {
    const reg = this.regDe(q), zs = worldZonesOf(reg);
    if (q.tipo === 'terminais') return zs.filter((z) => z.terminal).length;
    if (q.tipo === 'explorar') return zs.length;
    if (q.tipo === 'chefe') return 1;
    return q.n;
  },
  prog(q) {
    const W = World.state, reg = this.regDe(q), zs = worldZonesOf(reg), s = this.S[q.id];
    if (q.tipo === 'terminais') return zs.filter((z) => z.terminal && W.terminais.includes(z.id)).length;
    if (q.tipo === 'explorar') return zs.filter((z) => W.descobertos.includes(z.id)).length;
    if (q.tipo === 'chefe') return World.bossDone(reg) ? 1 : 0;
    if (q.tipo === 'baus') return W.baus.filter((k) => zs.some((z) => k.indexOf(z.id + ':') === 0)).length;
    return s ? s.prog || 0 : 0;
  },
  pronta(q) { const s = this.S[q.id]; return !!s && s.st === 'ativa' && this.prog(q) >= this.meta(q); },
  atual(reg) { return this.lista(reg).find((q) => this.S[q.id] && this.S[q.id].st === 'ativa') || null; },
  proxima(reg) { return this.lista(reg).find((q) => !this.S[q.id]) || null; },
  texto(q) {
    const alvo = q.alvo ? WORLD_ALVO_NOME[q.alvo] : 'inimigos', nome = worldRegion(this.regDe(q)).name;
    return { matar: `Derrote ${q.n} ${alvo} em ${nome}`, elite: `Derrote ${q.n} unidades de elite em ${nome}`, baus: `Abra ${q.n} baús em ${nome}`,
      terminais: `Leia todos os terminais de ${nome}`, explorar: `Descubra todos os locais de ${nome}`, chefe: `Derrote ${worldRegion(this.regDe(q)).boss.name}` }[q.tipo];
  },
  // Linha do quadro de missão do HUD ('' = mostra o objetivo da região)
  line() {
    if (!World.zone) return '';
    const reg = World.zone.region, q = this.atual(reg);
    if (!q) return '';
    if (this.pronta(q)) return `✓ ${q.name}: fale com ${this.doador(reg).nome}`;
    return `${q.name}: ${this.texto(q)} (${Math.min(this.prog(q), this.meta(q))}/${this.meta(q)})`;
  },

  // Conversa com o NPC de missão: entrega a pronta, lembra a atual ou dá a próxima.
  // Devolve false quando a região não tem mais missões (o NPC fala as falas de sempre)
  talk(npc) {
    const reg = World.zone.region, q = this.atual(reg), g = game;
    const say = (txt) => { g.hud.say(npc.name, txt, 4.6, 0, true); npc.talkT = 3.4; g.audio.play('uiMove'); };
    if (q && this.pronta(q)) {
      this.S[q.id].st = 'feita';
      const R = q.rec, p = g.player;
      for (let i = 0; i < 6; i++) g.pickups.drop('soul', p.x, p.y, Math.round(R.cells / 6));
      g.gainXP(R.xp, p.x, p.y);
      WorldInv.ganhar(WorldInv.gerar(World.zone.lv + 1, reg, R.min, 0.3), p.x, p.y);
      g.hud.message('MISSÃO CONCLUÍDA', q.name.toUpperCase(), 2.6, false, true);
      g.audio.play('upgrade');
      say(q.fim);
      World.save();
      return true;
    }
    if (q) { say(`${q.name}: ${this.texto(q)} (${Math.min(this.prog(q), this.meta(q))}/${this.meta(q)}).`); return true; }
    const nx = this.proxima(reg);
    if (!nx) return false;
    this.S[nx.id] = { st: 'ativa', prog: 0 };
    say(nx.ini);
    g.hud.toast(`NOVA MISSÃO · ${nx.name}`, '255,212,122');
    this.check();
    World.save();
    return true;
  },
  // Avisa quando a missão atual fica pronta (chamado depois de cada evento do mundo)
  check() {
    if (!World.zone) return;
    const reg = World.zone.region, q = this.atual(reg), s = q && this.S[q.id];
    if (q && this.pronta(q) && !s.avisada) { s.avisada = true; game.hud.toast(`MISSÃO PRONTA · ${q.name} — volte a ${this.doador(reg).nome}`, '255,212,122'); }
  },
  onKill(e) {
    if (!World.zone) return;
    const q = this.atual(World.zone.region);
    if (q && (q.tipo === 'matar' && (!q.alvo || e.type === q.alvo) || q.tipo === 'elite' && e.elite)) {
      const s = this.S[q.id];
      if ((s.prog || 0) < q.n) { s.prog = (s.prog || 0) + 1; if (s.prog < q.n && (s.prog % 5 === 0 || q.n - s.prog <= 2)) game.hud.toast(`${q.name} · ${s.prog}/${q.n}`, '255,212,122'); }
    }
    this.check();
  },
  // NPCs com missão para dar (!) ou para entregar (?) mostram a marca acima da cabeça
  marca(npc) {
    if (!npc.quest || !World.zone) return '';
    const reg = World.zone.region, q = this.atual(reg);
    return q ? (this.pronta(q) ? '?' : '') : this.proxima(reg) ? '!' : '';
  },
  drawMarks(ctx, t) {
    for (const n of game.npcs) {
      const mk = this.marca(n);
      if (!mk || game.talkTarget === n) continue;
      const q = hudHeadPoint(n, 22 - Math.sin(t * 3) * 3);
      if (!q) continue;
      ctx.save();
      ctx.font = `bold 24px ${FONT_TITLE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,12,0,0.85)'; ctx.strokeText(mk, q.x, q.y);
      ctx.fillStyle = mk === '?' ? '#7dffb0' : '#ffd47a'; ctx.fillText(mk, q.x, q.y);
      ctx.restore();
    }
  },

  // Aba MISSÕES da mochila: as 3 de cada região (a região atual primeiro)
  drawTab(ctx, Ly, t) {
    const here = World.zone ? World.zone.region : 'carmesin';
    const regs = [here, ...WORLD_REGIONS.slice().sort((a, b) => a.order - b.order).map((r) => r.id).filter((r) => r !== here)];
    let y = Ly.top - 8;
    const colW = (VIEW_W - 72 - 24) / 2;
    ctx.textBaseline = 'middle';
    regs.forEach((reg, i) => {
      const x = 36 + (i === 0 ? 0 : ((i - 1) % 2) * (colW + 24)), R = worldRegion(reg), open = World.regionOpen(reg);
      if (i === 1) y += 8;
      ctx.textAlign = 'left';
      ctx.font = `bold ${i === 0 ? 15 : 12}px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = rgba(R.rgb, open ? 1 : 0.5);
      const D = this.doador(reg);
      ctx.fillText(`${R.name.toUpperCase()}${open ? '' : ' · 🔒'}${i === 0 ? ` · com ${D.nome} (${D.zona})` : ''}`, x, y);
      ctx.letterSpacing = '0px';
      if (i === 0) {
        this.lista(reg).forEach((q, k) => {
          const s = this.S[q.id], yy = y + 26 + k * 52, st = !s ? 'nova' : s.st === 'feita' ? 'feita' : this.pronta(q) ? 'pronta' : 'ativa';
          ctx.fillStyle = st === 'ativa' || st === 'pronta' ? 'rgba(40,60,100,0.6)' : 'rgba(12,20,36,0.8)'; ctx.fillRect(x, yy - 4, VIEW_W - 72, 46);
          ctx.font = `bold 14px ${FONT_UI}`; ctx.fillStyle = st === 'feita' ? 'rgba(160,175,200,0.7)' : '#ffffff';
          ctx.fillText(`${st === 'feita' ? '✓' : st === 'pronta' ? '?' : st === 'ativa' ? '▸' : '·'} ${q.name}`, x + 12, yy + 8);
          ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)';
          const info = st === 'nova' ? (this.proxima(reg) === q ? `Fale com ${D.nome} para aceitar` : 'Depois da anterior')
            : st === 'feita' ? 'Concluída' : st === 'pronta' ? `Pronta: volte a ${D.nome}` : `${this.texto(q)} · ${Math.min(this.prog(q), this.meta(q))}/${this.meta(q)}`;
          ctx.fillText(info, x + 28, yy + 28);
          ctx.textAlign = 'right'; ctx.fillStyle = '#9fd0ff';
          ctx.fillText(`${q.rec.cells} células · ${q.rec.xp} XP · relíquia ${WORLD_RARIDADES[q.rec.min].name.toLowerCase()}+`, x + VIEW_W - 84, yy + 8);
          ctx.textAlign = 'left';
        });
        y += 26 + 3 * 52 + 14;
      } else {
        const feitas = this.lista(reg).filter((q) => this.S[q.id] && this.S[q.id].st === 'feita').length;
        ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.8)';
        ctx.fillText(`${feitas}/3 missões · ${this.atual(reg) ? this.atual(reg).name : feitas === 3 ? 'todas concluídas' : open ? `com ${D.nome}` : 'região bloqueada'}`, x + 2, y + 20);
        if ((i - 1) % 2 === 1) y += 44;
      }
    });
  },
};
