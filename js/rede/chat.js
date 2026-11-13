'use strict';
// ECLIPSE ZERO · Chat entre jogadores e painel do Game Master (cliente)
// ---------------------------------------------------------------------------
// Liga o jogo ao servidor de chat e GM (pasta servidor/, WebSocket). Aqui fica só a tela e a
// aplicação dos EFEITOS que o servidor manda; quem decide o que cada conta pode fazer é o servidor.
// O navegador não guarda papel nem permissão: o painel do GM só aparece para quem o servidor disse
// que é da equipe, e mesmo um cliente adulterado só consegue ENVIAR pedidos — que o servidor recusa.
//   Rede  — conexão, conta (entrar / criar), reconexão e envio do estado do personagem
//   Chat  — janela com as abas GLOBAL, GRUPO, GUILDA, PRIVADO e SISTEMA, lista de quem está
//           online, emojis, avisos de mensagem nova, minimizar e redimensionar (Enter abre)
//   PainelGM — comandos por categoria com os parâmetros, console com autocompletar (Tab) e
//           histórico (↑ ↓), jogadores conectados com busca e botões rápidos, Modo Deus do Mundo
//   GMFx  — aplica no jogo de verdade o que o servidor mandou (nível, itens, células, teleporte,
//           clima, hora, evento, inimigos, chefes, vida infinita, noclip, mundo congelado…)
// Endereço do servidor: window.EZ_SERVIDOR (js/rede/config.js), ?servidor=wss://… na URL ou o
// campo da própria janela. Sem servidor configurado o jogo segue igual, só sem chat.
// ---------------------------------------------------------------------------
const Rede = {
  ws: null, estado: 'desligado', sessao: null, mundo: null, online: [], ouvintes: {}, _t: 0, _tenta: 0,
  endereco() {
    try { const q = new URLSearchParams(location.search).get('servidor'); if (q) { localStorage.setItem('ez_servidor', q); return q; } } catch (e) { /* sem URL */ }
    try { const s = localStorage.getItem('ez_servidor'); if (s) return s; } catch (e) { /* sem armazenamento */ }
    return (typeof window !== 'undefined' && window.EZ_SERVIDOR) || '';
  },
  definirEndereco(u) { try { if (u) localStorage.setItem('ez_servidor', u); else localStorage.removeItem('ez_servidor'); } catch (e) { /* nada */ } this.fechar(); this.ligar(); },
  em(t, fn) { (this.ouvintes[t] || (this.ouvintes[t] = [])).push(fn); },
  avisa(t, m) { for (const f of this.ouvintes[t] || []) { try { f(m); } catch (e) { console.error('Rede', t, e); } } },
  manda(o) { if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(o)); return true; } return false; },
  equipe() { return !!this.sessao && this.sessao.papel !== 'jogador'; },
  ligar() {
    const u = this.endereco();
    if (!u || typeof WebSocket === 'undefined') { this.estado = 'sem_servidor'; this.avisa('estado'); return; }
    if (this.ws && this.ws.readyState <= 1) return;
    this.estado = 'ligando'; this.avisa('estado');
    let ws;
    try { ws = this.ws = new WebSocket(u); } catch (e) { this.estado = 'erro'; this.avisa('estado'); return; }
    ws.onopen = () => { this._tenta = 0; this.estado = 'visitante'; this.avisa('estado'); let tk = null; try { tk = localStorage.getItem('ez_sessao'); } catch (e) { /* nada */ } if (tk) this.manda({ t: 'entrar', token: tk }); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this.receber(m); };
    ws.onclose = () => { if (this.ws !== ws) return; const era = this.estado; this.ws = null; this.sessao = null; this.online = []; this.estado = era === 'expulso' ? 'expulso' : 'caiu'; this.avisa('estado'); if (era !== 'expulso') setTimeout(() => this.ligar(), Math.min(30000, 2000 * ++this._tenta)); };
    ws.onerror = () => {};
  },
  fechar() { const w = this.ws; this.ws = null; if (w) { try { w.close(); } catch (e) { /* nada */ } } this.sessao = null; this.estado = 'desligado'; },
  entrar(nome, senha, criar, chave) { this.manda({ t: criar ? 'registrar' : 'entrar', nome, senha, chave }); },
  sair() { let tk = null; try { tk = localStorage.getItem('ez_sessao'); localStorage.removeItem('ez_sessao'); } catch (e) { /* nada */ } this.manda({ t: 'sair', token: tk }); },
  comando(texto) { return this.manda({ t: 'cmd', texto, id: Math.random().toString(36).slice(2) + Date.now().toString(36) }); },
  falar(canal, texto, para) { return this.manda({ t: 'chat', canal, texto, para, id: Math.random().toString(36).slice(2) }); },
  receber(m) {
    if (m.t === 'sessao') { this.sessao = m; this.mundo = m.mundo; this.estado = 'dentro'; try { localStorage.setItem('ez_sessao', m.token); } catch (e) { /* nada */ } GMFx.mundo(m.mundo, true); this.avisa('estado'); this.avisa('sessao', m); this._t = 0; return; }
    if (m.t === 'erro') { if (m.cod === 'sessao') { try { localStorage.removeItem('ez_sessao'); } catch (e) { /* nada */ } } this.avisa('erro', m); return; }
    if (m.t === 'online') { this.online = m.lista || []; this.avisa('online'); return; }
    if (m.t === 'mundo') { this.mundo = m.mundo; GMFx.mundo(m.mundo, false); this.avisa('mundo'); return; }
    if (m.t === 'efeito') { GMFx.aplicar(m.e, m.de); return; }
    if (m.t === 'papel') { if (this.sessao) this.sessao.papel = m.papel; this.avisa('estado'); return; }
    if (m.t === 'sair') { this.estado = 'expulso'; this.avisa('sair', m); return; }
    this.avisa(m.t, m);   // chat, resposta, anuncio, limpar, observado
  },
  // O que o servidor sabe do personagem (para /info, /localizar, /observar e a lista): a cada 3 s
  pulso(dt) {
    if (this.estado !== 'dentro' || typeof game === 'undefined' || !game.player) return;
    if ((this._t -= dt) > 0) return;
    this._t = 3;
    const p = game.player, z = typeof World !== 'undefined' && game.world ? World.zone : null, pr = game.activeProgress ? game.activeProgress() : null;
    this.manda({ t: 'estado', e: { zona: z ? z.id : '', zonaNome: z ? z.name : 'Campanha', x: Math.round(p.x), y: Math.round(p.y), nivel: pr ? pr.level : 1, hp: Math.round(p.hp), hpMax: Math.round(p.maxHp), heroi: p.def ? p.def.id : '', celulas: game.stats ? game.stats.soulsBank : 0 } });
  },
};

// ------------------------------------------------------------------ efeitos do servidor no jogo
const GMFx = {
  god: false, noclip: false, vel: 1, invisivel: false, dif: 1, velMundo: 1, congelado: false, missao: null, _climaAuto: null, _horaAuto: null,
  aviso(txt, rgb = '255,120,120') { if (typeof game !== 'undefined' && game.hud && game.hud.toast) game.hud.toast(txt, rgb); },
  noMundo() { return typeof game !== 'undefined' && !!game.world && typeof World !== 'undefined' && !!World.zone && !!game.room; },
  perto(d = 90) { const p = game.player, R = game.room; for (let i = 0; i < 24; i++) { const a = Math.random() * 6.283, x = p.x + Math.cos(a) * (d + i * 6), y = p.y + Math.sin(a) * (d + i * 6); if (R.canStand(x, y, 16)) return { x, y }; } return { x: p.x + 40, y: p.y + 40 }; },
  item(id) {   // item_id → { t, k } pelos catálogos do jogo
    const [a, b] = id.split(':'), k = b || a;
    if ((a === 'mat' || !b) && typeof WORLD_MATERIAIS !== 'undefined' && WORLD_MATERIAIS[k]) return { t: 'mat', k };
    if ((a === 'cons' || !b) && typeof WORLD_CONSUMIVEIS !== 'undefined' && WORLD_CONSUMIVEIS[k]) return { t: 'cons', k };
    if (a === 'capsula') return { t: 'capsula' };
    if (a === 'reliquia') return { t: 'reliquia', r: b ? clamp(parseInt(b, 10) || 0, 0, 5) : 2 };
    return null;
  },
  aplicar(e, de) {
    if (!e || typeof game === 'undefined' || !game.player) return;
    const g = game, p = g.player, mundo = this.noMundo();
    switch (e.k) {
      case 'god': this.god = !!e.on; this.aviso(e.on ? 'Vida infinita ligada' : 'Vida infinita desligada'); break;
      case 'noclip': this.noclip = !!e.on; this.aviso(e.on ? 'Noclip ligado: você atravessa paredes' : 'Noclip desligado'); break;
      case 'invisivel': this.invisivel = !!e.on; break;
      case 'velocidade': this.vel = clamp(+e.v || 1, 0.25, 4); if (p.recalc) p.recalc(false); this.aviso(`Velocidade ${this.vel}x`); break;
      case 'heal': p.hp = p.maxHp; p.fury = p.maxEnergy; this.aviso(`Curado por ${de}`, '120,255,170'); break;
      case 'reviver': if (p.state === 'dead' || p.hp <= 0) { p.hp = p.maxHp; p.state = 'idle'; p.stateTime = 0; p.invuln = 2; if (g.state !== 'playing') g.state = 'playing'; } else p.hp = p.maxHp; this.aviso(`Revivido por ${de}`, '120,255,170'); break;
      case 'mana': p.fury = Math.min(p.maxEnergy, p.fury + (e.n | 0)); break;
      case 'xp': g.gainXP(e.n | 0, p.x, p.y); break;
      case 'level': { const pr = g.activeProgress(), de0 = pr.level, n = clamp(e.n | 0, 1, PROG.maxLevel); pr.level = n; pr.xp = 0; if (n > de0 && g.onLevelUp) g.onLevelUp(de0, n); p.recalc(true); if (g.saveGame) g.saveGame(); this.aviso(`Nível ${n} (por ${de})`, '185,168,255'); break; }
      case 'money': g.stats.soulsBank = Math.max(0, g.stats.soulsBank + (e.n | 0)); this.aviso(`${e.n > 0 ? '+' : ''}${e.n} células (${de})`, '120,200,255'); break;
      case 'item': {
        const I = this.item(String(e.item || '')), n = e.n | 0;
        if (!I || !mundo) { this.aviso(`Item desconhecido: ${e.item}`); break; }
        if (I.t === 'mat') { if (n > 0) Oficios.dar(I.k, n, true); else Oficios.S.mat[I.k] = Math.max(0, (Oficios.S.mat[I.k] || 0) + n); }
        else if (I.t === 'cons') { if (n > 0) Oficios.darCons(I.k, n); else Oficios.S.cons[I.k] = Math.max(0, Oficios.cons(I.k) + n); }
        else if (I.t === 'capsula') WorldInv.S.capsulas = clamp(WorldInv.S.capsulas + n, 0, WorldInv.CAPS);
        else if (I.t === 'reliquia' && n > 0) for (let i = 0; i < Math.min(n, 10); i++) { const S = WorldInv.S; if (S.itens.length >= WorldInv.MAX) break; const it = WorldInv.gerar(g.activeProgress().level, World.zone.region, I.r); it.id = S.seq++; S.itens.push(it); }
        this.aviso(`${n > 0 ? '+' : ''}${n} ${e.item} (${de})`, '255,214,120'); World.save();
        break;
      }
      case 'limpar_inventario': if (mundo) { const S = WorldInv.S; S.itens = S.itens.filter((it) => Object.values(S.equip || {}).includes(it.id)); for (const k in Oficios.S.mat) Oficios.S.mat[k] = 0; for (const k in Oficios.S.cons) Oficios.S.cons[k] = 0; World.save(); this.aviso(`Sua bolsa foi esvaziada por ${de}`); } break;
      case 'arma': case 'armadura': if (mundo && typeof Arsenal !== 'undefined') { const [a, b] = String(e.item).split(':'), fam = b || a, slot = e.k === 'arma' ? 'arma' : (b ? a : 'peitoral'); let it = null; try { it = Arsenal.gerar(slot, fam, 3, g.activeProgress().level); } catch (er) { it = null; } if (it) { Arsenal.guardar(it, true); const r = Arsenal.equipar(it.id); this.aviso(r && typeof r === 'string' ? r : `${e.k === 'arma' ? 'Arma' : 'Armadura'} equipada: ${fam}`, '255,214,120'); } else this.aviso(`Peça desconhecida: ${e.item}`); } break;
      case 'mapa': if (mundo && WORLD_ZONES[e.zona]) { World.loadZone(e.zona, null); if (Number.isFinite(e.x) && Number.isFinite(e.y) && game.room.canStand(e.x, e.y, 14)) { game.player.x = e.x; game.player.y = e.y; } this.aviso(`Teleporte: ${WORLD_ZONES[e.zona].name}`, '170,120,255'); } else this.aviso(`Mapa desconhecido: ${e.zona}`); break;
      case 'tp': p.x = clamp(+e.x || 0, 20, g.room.w - 20); p.y = clamp(+e.y || 0, 20, g.room.h - 20); p.z = Math.max(0, +e.z || 0); break;
      case 'kill_all': for (const en of g.enemies.slice()) { if (en.state !== 'dying' && en.takeDamage) en.takeDamage(1e9, p.x, p.y); } break;
      case 'limpar_inimigos': g.enemies.length = 0; break;
      case 'spawn_npc': case 'spawn_boss': {
        const id = String(e.id), tipoOk = (typeof ENEMY_VARIANTS !== 'undefined' && ENEMY_VARIANTS[id]) || (typeof ENEMY_TYPES !== 'undefined' && ENEMY_TYPES[id]);
        if (e.mundial && (!mundo || World.zone.seguro)) break;   // invasão e chefe mundial: só fora das cidades
        if (!tipoOk) { const P = mundo && typeof Povo !== 'undefined' && Povo.persona && Povo.persona(id); if (P && typeof Rotina !== 'undefined') { const q = this.perto(70); Rotina.criar(id, g.room, q.x, q.y); this.aviso(`${P.nome} chegou`); } else this.aviso(`NPC desconhecido: ${id}`); break; }
        const lv = mundo ? World.zone.lv : 1, n = e.k === 'spawn_boss' ? 1 : clamp(e.n | 0, 1, 30);
        for (let i = 0; i < n; i++) {
          const q = this.perto(140 + i * 8), en = criarInimigo(id, q.x, q.y, lv);
          if (e.k === 'spawn_boss') { en.elite = true; en.lider = true; en.maxHp = Math.round(en.maxHp * 6); en.hp = en.maxHp; en.varNome = (en.varNome || id).toUpperCase(); }
          if (this.dif !== 1) { en.maxHp = Math.round(en.maxHp * this.dif); en.hp = en.maxHp; }
          g.enemies.push(en);
        }
        if (e.mundial) this.aviso(e.k === 'spawn_boss' ? 'CHEFE MUNDIAL POR PERTO!' : 'INVASÃO!', '255,90,90');
        break;
      }
      case 'spawn_item': if (mundo && typeof Baus !== 'undefined') { const q = this.perto(70), I = this.item(String(e.id)); const n = clamp(e.n | 0, 1, 999); if (I) { g.pickups && g.pickups.spawnSouls ? null : null; this.aplicar({ k: 'item', item: e.id, n }, de); this.aviso(`Item criado: ${e.id} ×${n}`, '255,214,120'); } else this.aviso(`Item desconhecido: ${e.id}`); void q; } break;
      case 'missao': this.missao = { titulo: e.titulo, falta: e.abates | 0, total: e.abates | 0, celulas: e.celulas | 0 }; this.aviso(`MISSÃO ESPECIAL: ${e.titulo} (${e.abates} abates)`, '255,214,120'); break;
    }
  },
  // Estado do mundo que vale para todos: clima, hora, evento, dificuldade, velocidade, congelado
  mundo(M, quieto) {
    if (!M || typeof game === 'undefined') return;
    this.dif = clamp(+M.dificuldade || 1, 0.25, 5); this.velMundo = clamp(+M.velocidade || 1, 0.25, 3); this.congelado = !!M.congelado;
    this._clima = M.clima || null; this._hora = M.hora === null || M.hora === undefined ? null : M.hora;
    if (typeof Guardiao !== 'undefined') {   // evento de XP: o mesmo multiplicador das bênçãos do Guardião (vale o maior)
      const E = M.evento && M.evento.tipo === 'xp' && M.evento.ate > Date.now() ? M.evento : null;
      Guardiao._evRede = E ? { mult: E.mult, de: E.de, ate: E.ate, nome: E.nome } : null;
    }
    this.impor();
  },
  // Clima e hora mandados pelo GM valem em toda zona (reaplica ao trocar de zona)
  impor() {
    if (!this.noMundo() || typeof WorldTime === 'undefined' || !WorldTime.S) return;
    if (this._clima && WORLD_CLIMAS[this._clima] && WorldTime.clima() !== this._clima) WorldTime.definir(this._clima, World.zone.region, false, 0.9);
    if (this._clima && WorldTime.S.clima) WorldTime.S.clima.t = 600;   // (não troca sozinho enquanto o GM segura)
    if (this._hora !== null && this._hora !== undefined) WorldTime.S.hora = this._hora + (WorldTime.S.hora % 1 || 0);
  },
  abate() { const m = this.missao; if (!m) return; if (--m.falta <= 0) { game.stats.soulsBank += m.celulas; this.aviso(`MISSÃO ESPECIAL CONCLUÍDA: +${m.celulas} células`, '255,214,120'); if (game.audio) game.audio.play('levelup'); this.missao = null; } },
  // Ganchos nos sistemas do jogo (uma vez): vida infinita, dificuldade, noclip, velocidade, tempo do mundo
  instalar() {
    if (this._ok || typeof Player === 'undefined' || typeof Room === 'undefined' || typeof Game === 'undefined') return;
    this._ok = true;
    const F = this, dano = Player.prototype.takeDamage, col = Room.prototype.collide, rec = Player.prototype.recalc, upd = Game.prototype.update;
    Player.prototype.takeDamage = function (dmg, ...r) { if (this === game.player) { if (F.god) return false; dmg *= F.dif; } return dano.call(this, dmg, ...r); };
    Room.prototype.collide = function (e, isPlayer) { if (isPlayer && F.noclip && e === game.player) { e.x = clamp(e.x, 10, this.w - 10); e.y = clamp(e.y, 10, this.h - 10); return; } return col.call(this, e, isPlayer); };
    Player.prototype.recalc = function (fill) { rec.call(this, fill); if (this === game.player && F.vel !== 1) this.stats.speedMult *= F.vel; };
    Game.prototype.update = function (dt) {
      Rede.pulso(dt);
      if (F.congelado && this.state === 'playing' && this.world && !Rede.equipe()) return;   // mundo congelado pelo GM (a equipe continua andando)
      const n0 = this.stats ? this.stats.kills : 0;
      upd.call(this, this.world && this.state === 'playing' ? dt * F.velMundo : dt);
      if (F.missao && this.stats && this.stats.kills > n0) for (let i = n0; i < this.stats.kills; i++) F.abate();
      if (this.world && (F._clima || F._hora !== null)) { F._imp = (F._imp || 0) - dt; if (F._imp <= 0) { F._imp = 1; F.impor(); } }
    };
    if (typeof Guardiao !== 'undefined') { const xm = Guardiao.xpMult.bind(Guardiao); Guardiao.xpMult = () => { const E = Guardiao._evRede; return Math.max(xm(), E && E.ate > Date.now() ? E.mult : 1); }; }
  },
};

// ------------------------------------------------------------------ janela do chat
const Chat = {
  el: null, aba: 'global', msgs: { global: [], grupo: [], guilda: [], privado: [], sistema: [] }, novas: {}, aberto: false, mini: false, para: '',
  ABAS: [['global', '🌐 Global'], ['grupo', '👥 Grupo'], ['guilda', '🛡 Guilda'], ['privado', '✉ Privado'], ['sistema', '⚙ Sistema']],
  EMOJIS: ['😀', '😂', '😎', '😢', '😡', '👍', '👋', '🙏', '🔥', '⚔️', '🛡️', '💀', '❤️', '💜', '⭐', '🎁', '💰', '🏆'],
  tecla() { try { return localStorage.getItem('ez_chat_tecla') || 'Enter'; } catch (e) { return 'Enter'; } },
  css() {
    if (document.getElementById('ez-chat-css')) return;
    const s = document.createElement('style'); s.id = 'ez-chat-css';
    s.textContent = `
.ezc,.ezc *{box-sizing:border-box;font-family:Rajdhani,"Segoe UI",system-ui,sans-serif}
.ezc-btn{position:fixed;left:12px;bottom:150px;z-index:40;width:46px;height:46px;border-radius:12px;border:1px solid rgba(0,229,255,.7);background:rgba(4,10,24,.82);color:#9ff3ff;font-size:22px;cursor:pointer;box-shadow:0 0 12px rgba(0,229,255,.35);backdrop-filter:blur(6px)}
.ezc-btn b{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;border-radius:9px;background:#ff3d81;color:#fff;font-size:11px;line-height:18px;padding:0 4px;display:none}
.ezc-btn.gm{bottom:204px;border-color:rgba(255,70,90,.8);color:#ff8a98;box-shadow:0 0 12px rgba(255,70,90,.4)}
.ezc-jan{position:fixed;left:12px;bottom:12px;z-index:41;width:min(460px,calc(100vw - 24px));height:min(380px,calc(100vh - 90px));min-width:270px;min-height:170px;display:none;flex-direction:column;resize:both;overflow:hidden;border-radius:12px;border:1px solid rgba(0,229,255,.65);background:linear-gradient(160deg,rgba(3,8,22,.88),rgba(10,6,28,.86));box-shadow:0 0 22px rgba(0,229,255,.25),inset 0 0 30px rgba(120,60,255,.08);backdrop-filter:blur(9px);color:#dfe9ff;animation:ezc-in .18s ease-out}
.ezc-jan.gm{left:auto;right:12px;top:70px;bottom:auto;width:min(520px,calc(100vw - 24px));height:min(560px,calc(100vh - 90px));border-color:rgba(255,70,90,.75);box-shadow:0 0 22px rgba(255,70,90,.25)}
@keyframes ezc-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.ezc-top{display:flex;align-items:center;gap:2px;padding:6px 6px 0;border-bottom:1px solid rgba(0,229,255,.3)}
.ezc-aba{position:relative;flex:1;padding:7px 4px;border:1px solid transparent;border-bottom:none;border-radius:8px 8px 0 0;background:none;color:#8fa6c8;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.ezc-aba.on{color:#fff;background:rgba(0,229,255,.14);border-color:rgba(0,229,255,.55)}
.ezc-aba i{position:absolute;top:2px;right:4px;width:8px;height:8px;border-radius:4px;background:#ff3d81;display:none}
.ezc-x{width:28px;height:28px;border:none;background:none;color:#9fb3d6;font-size:16px;cursor:pointer}
.ezc-corpo{flex:1;display:flex;min-height:0}
.ezc-lista{flex:1;overflow-y:auto;padding:8px 10px;font-size:14px;line-height:1.35;scrollbar-width:thin;scrollbar-color:rgba(0,229,255,.5) transparent}
.ezc-m{margin:1px 0;word-break:break-word}.ezc-m time{color:#6f86ab;font-size:12px;margin-right:4px}
.ezc-m .n{font-weight:700;color:#7fe7ff;cursor:pointer}.ezc-m .nv{color:#8fa6c8;font-size:12px}
.ezc-m.gm .n,.ezc-m.owner .n{color:#ff6b7d}.ezc-m.moderador .n{color:#ffb86b}
.ezc-m.sistema{color:#ffd166}.ezc-m.priv{color:#e3a6ff}.ezc-m.erro{color:#ff8a8a}
.ezc-gmbox{margin:6px 0;padding:8px 10px;border:1px solid rgba(255,70,90,.8);border-radius:8px;background:rgba(80,8,20,.5);color:#ffd9de}.ezc-gmbox b{color:#ff6b7d}
.ezc-on{width:150px;border-left:1px solid rgba(0,229,255,.25);overflow-y:auto;padding:6px 8px;font-size:13px;display:none}
.ezc-on div{padding:2px 0;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ezc-on .gm,.ezc-on .owner{color:#ff6b7d}.ezc-on .moderador{color:#ffb86b}
.ezc-pe{display:flex;gap:6px;padding:8px;border-top:1px solid rgba(0,229,255,.3);align-items:center}
.ezc input,.ezc select{flex:1;min-width:0;padding:8px 10px;border-radius:8px;border:1px solid rgba(0,229,255,.45);background:rgba(2,6,16,.8);color:#eaf2ff;font-size:14px;outline:none}
.ezc input:focus{border-color:#00e5ff;box-shadow:0 0 8px rgba(0,229,255,.45)}
.ezc-bt{padding:8px 12px;border-radius:8px;border:1px solid rgba(0,229,255,.7);background:rgba(0,229,255,.16);color:#bff6ff;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}
.ezc-bt.r{border-color:rgba(255,70,90,.8);background:rgba(255,70,90,.16);color:#ffc2c9}.ezc-bt.p{padding:5px 8px;font-size:12px}
.ezc-emo{position:absolute;bottom:52px;right:8px;display:none;flex-wrap:wrap;gap:2px;width:204px;padding:6px;border-radius:8px;border:1px solid rgba(0,229,255,.5);background:rgba(3,8,22,.96)}.ezc-emo span{cursor:pointer;font-size:20px;width:30px;text-align:center}
.ezc-log{display:flex;flex-direction:column;gap:6px;padding:14px}.ezc-log p{margin:0;font-size:13px;color:#9fb3d6}
.ezc-gm-cab{padding:8px 12px;font-weight:700;color:#ff6b7d;letter-spacing:1px;display:flex;align-items:center;border-bottom:1px solid rgba(255,70,90,.35)}
.ezc-cats{display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px}.ezc-gm-meio{flex:1;display:flex;min-height:0}
.ezc-cmds{flex:1.3;overflow-y:auto;padding:2px 8px;font-size:13px}.ezc-cmd{padding:3px 4px;border-radius:5px;cursor:pointer}.ezc-cmd:hover{background:rgba(255,70,90,.14)}.ezc-cmd b{color:#ff8a98}.ezc-cmd u{color:#ffd166;text-decoration:none}.ezc-cmd span{color:#9fb3d6}
.ezc-jogs{flex:1;border-left:1px solid rgba(255,70,90,.25);display:flex;flex-direction:column;min-width:0}.ezc-jogs .l{flex:1;overflow-y:auto;padding:2px 8px;font-size:13px}.ezc-jogs .l div{padding:3px 4px;border-radius:5px;cursor:pointer}.ezc-jogs .l .sel{background:rgba(255,70,90,.25)}
.ezc-rap{display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px;border-top:1px solid rgba(255,70,90,.25)}
.ezc-saida{height:96px;overflow-y:auto;padding:6px 10px;font-size:12.5px;white-space:pre-wrap;border-top:1px solid rgba(255,70,90,.25);color:#cfe0ff}.ezc-saida .ok{color:#8dffb0}.ezc-saida .no{color:#ff8a8a}
.ezc-dica{padding:2px 10px;font-size:12px;color:#ffd166;min-height:18px}
@media (max-width:640px){.ezc-jan{left:6px;right:6px;bottom:6px;width:auto;height:46vh}.ezc-jan.gm{top:6px;height:60vh}.ezc-on{width:110px}.ezc-btn{bottom:210px}.ezc-btn.gm{bottom:262px}}`;
    document.head.appendChild(s);
  },
  h(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; },
  montar() {
    if (this.el || typeof document === 'undefined') return;
    this.css();
    const H = this.h.bind(this), E = this.el = {};
    E.btn = H('button', 'ezc ezc-btn', '💬'); E.btn.title = 'Chat (Enter)'; E.cont = H('b'); E.btn.appendChild(E.cont);
    E.jan = H('div', 'ezc ezc-jan');
    const top = H('div', 'ezc-top'); E.abas = {};
    for (const [id, nome] of this.ABAS) { const b = H('button', 'ezc-aba', nome); b.appendChild(H('i')); b.onclick = () => this.trocar(id); top.appendChild(b); E.abas[id] = b; }
    E.bOn = H('button', 'ezc-x', '👥'); E.bOn.title = 'Quem está online'; E.bMin = H('button', 'ezc-x', '▁'); E.bMin.title = 'Minimizar'; E.bX = H('button', 'ezc-x', '✕');
    top.append(E.bOn, E.bMin, E.bX);
    const corpo = H('div', 'ezc-corpo'); E.lista = H('div', 'ezc-lista'); E.on = H('div', 'ezc-on'); corpo.append(E.lista, E.on);
    const pe = H('div', 'ezc-pe'); E.inp = H('input'); E.inp.maxLength = 300; E.inp.placeholder = 'Digite sua mensagem…'; E.inp.autocomplete = 'off';
    E.bEmo = H('button', 'ezc-bt p', '😀'); E.bEnv = H('button', 'ezc-bt', '➤'); pe.append(E.inp, E.bEmo, E.bEnv);
    E.emo = H('div', 'ezc-emo'); for (const m of this.EMOJIS) { const s = H('span', '', m); s.onclick = () => { E.inp.value += m; E.inp.focus(); }; E.emo.appendChild(s); }
    E.jan.append(top, corpo, pe, E.emo);
    document.body.append(E.btn, E.jan);
    // o jogo não recebe as teclas digitadas aqui
    const parar = (ev) => ev.stopPropagation();
    for (const t of ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'click', 'wheel', 'touchstart', 'touchend', 'pointerdown', 'pointerup']) E.jan.addEventListener(t, parar);
    E.btn.addEventListener('mousedown', parar); E.btn.addEventListener('touchstart', parar);
    E.btn.onclick = () => this.abrir(!this.aberto);
    E.bX.onclick = () => this.abrir(false);
    E.bMin.onclick = () => { this.mini = !this.mini; corpo.style.display = this.mini ? 'none' : 'flex'; E.jan.style.height = this.mini ? 'auto' : ''; };
    E.bOn.onclick = () => { E.on.style.display = E.on.style.display === 'block' ? 'none' : 'block'; };
    E.bEmo.onclick = () => { E.emo.style.display = E.emo.style.display === 'flex' ? 'none' : 'flex'; };
    E.bEnv.onclick = () => this.enviar();
    E.inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); this.enviar(); } else if (ev.key === 'Escape') { this.abrir(false); } });
    window.addEventListener('keydown', (ev) => {
      if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
      if (ev.code === this.tecla() && !this.aberto && typeof game !== 'undefined' && game.state === 'playing' && Rede.endereco()) { ev.preventDefault(); ev.stopPropagation(); this.abrir(true); }
    }, true);
    Rede.em('estado', () => this.pintar());
    Rede.em('sessao', (m) => { for (const k of ['global', 'sistema', 'guilda']) this.msgs[k] = (m.historico[k] || []).slice(); this.pintar(); PainelGM.atualizar(); });
    Rede.em('chat', (m) => this.receber(m));
    Rede.em('erro', (m) => this.local(m.txt, 'erro'));
    Rede.em('resposta', (m) => { if (!PainelGM.aberto || !Rede.equipe()) this.local(m.txt, m.ok ? 'sistema' : 'erro'); PainelGM.resposta(m); });
    Rede.em('anuncio', (m) => { this.receber({ canal: 'global', anuncio: true, de: m.de, texto: m.texto, hora: m.hora }); if (typeof game !== 'undefined' && game.hud) { game.hud.message('MENSAGEM DO GM', m.texto, 5, true); if (game.audio) game.audio.play('levelup'); } });
    Rede.em('limpar', (m) => { this.msgs[m.canal] = []; this.pintar(); });
    Rede.em('online', () => { this.pintarOnline(); PainelGM.pintarJogadores(); });
    Rede.em('sair', (m) => { this.local(`Você foi desconectado: ${m.motivo}`, 'erro'); if (typeof game !== 'undefined' && game.hud) game.hud.message('DESCONECTADO', m.motivo, 5, true); });
    Rede.em('observado', (m) => PainelGM.observado(m));
    this.pintar();
  },
  abrir(v) {
    this.aberto = v; const E = this.el; if (!E) return;
    E.jan.style.display = v ? 'flex' : 'none';
    if (v) { this.novas = {}; this.pintar(); if (Rede.estado === 'desligado' || Rede.estado === 'caiu') Rede.ligar(); setTimeout(() => { const i = E.jan.querySelector('input'); if (i) i.focus(); }, 30); }
    else { E.inp.blur(); const c = document.getElementById('game'); if (c) c.focus(); }
    this.marcas();
  },
  trocar(aba) { this.aba = aba; this.novas[aba] = 0; this.pintar(); },
  hora(t) { const d = new Date(t || Date.now()); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; },
  local(txt, tipo) { this.receber({ canal: this.aba === 'sistema' ? 'sistema' : this.aba, de: '', papel: tipo || 'sistema', texto: txt, hora: Date.now(), local: true }); },
  receber(m) {
    const canal = this.msgs[m.canal] ? m.canal : 'global', L = this.msgs[canal];
    L.push(m); if (L.length > 250) L.shift();
    if (canal === this.aba && this.aberto) this.linha(m, true);
    else if (!m.local) { this.novas[canal] = (this.novas[canal] || 0) + 1; this.marcas(); }
  },
  marcas() {
    const E = this.el; if (!E) return;
    let n = 0;
    for (const [id] of this.ABAS) { const q = this.novas[id] || 0; n += q; E.abas[id].querySelector('i').style.display = q && id !== this.aba ? 'block' : 'none'; E.abas[id].classList.toggle('on', id === this.aba); }
    E.cont.textContent = n > 99 ? '99+' : String(n); E.cont.style.display = n && !this.aberto ? 'block' : 'none';
  },
  linha(m, rolar) {
    const E = this.el, H = this.h.bind(this);
    if (m.anuncio) { const b = H('div', 'ezc-gmbox'); b.appendChild(H('b', '', `👑 Mensagem do GM (${m.de}) `)); b.appendChild(document.createTextNode(m.texto)); E.lista.appendChild(b); }
    else {
      const d = H('div', `ezc-m ${m.papel || ''}${m.canal === 'privado' ? ' priv' : ''}`);
      d.appendChild(H('time', '', `[${this.hora(m.hora)}]`));
      if (m.de && m.papel !== 'sistema') {
        const n = H('span', 'n', `${m.papel === 'owner' || m.papel === 'gm' ? '👑 [GM] ' : m.papel === 'moderador' ? '[MOD] ' : ''}${m.de}`); n.onclick = () => { this.para = m.de; this.trocar('privado'); E.inp.focus(); };
        d.appendChild(n); if (m.nivel) d.appendChild(H('span', 'nv', ` nv ${m.nivel}`));
        d.appendChild(document.createTextNode(m.canal === 'privado' && m.para ? ` → ${m.para}: ` : ': '));
      }
      d.appendChild(document.createTextNode(m.texto));
      E.lista.appendChild(d);
    }
    if (rolar) E.lista.scrollTop = E.lista.scrollHeight;
  },
  pintarOnline() {
    const E = this.el; if (!E) return; E.on.textContent = '';
    E.on.appendChild(this.h('div', '', `Online: ${Rede.online.length}`)).style.color = '#8dffb0';
    for (const j of Rede.online) { const d = this.h('div', j.papel, `${j.papel !== 'jogador' ? '👑 ' : ''}${j.nome} · ${j.nivel}${j.invisivel ? ' 👁' : ''}`); d.title = `${j.zona || ''}${j.guilda ? ' · ' + j.guilda : ''}`; d.onclick = () => { this.para = j.nome; this.trocar('privado'); }; E.on.appendChild(d); }
  },
  pintar() {
    const E = this.el; if (!E) return; const H = this.h.bind(this);
    E.lista.textContent = ''; E.inp.parentNode.style.display = 'flex';
    const st = Rede.estado;
    E.btn.style.display = typeof game !== 'undefined' && game.state && /^(playing|world)/.test(game.state) ? 'block' : (this.aberto ? 'block' : 'none');
    if (st !== 'dentro') {
      E.inp.parentNode.style.display = 'none';
      const f = H('div', 'ezc-log');
      if (st === 'sem_servidor' || st === 'erro' || st === 'desligado') {
        f.appendChild(H('p', '', 'O chat entre jogadores precisa do servidor do Eclipse Zero (pasta servidor/ do projeto). Informe o endereço:'));
        const i = H('input'); i.placeholder = 'wss://seu-servidor.exemplo  ou  ws://localhost:8787'; i.value = Rede.endereco();
        const b = H('button', 'ezc-bt', 'Conectar'); b.onclick = () => Rede.definirEndereco(i.value.trim()); f.append(i, b);
      } else if (st === 'ligando' || st === 'caiu') f.appendChild(H('p', '', st === 'ligando' ? 'Conectando ao servidor…' : 'Sem conexão. Tentando de novo…'));
      else if (st === 'expulso') { f.appendChild(H('p', '', 'Você foi desconectado pelo servidor.')); const b = H('button', 'ezc-bt', 'Conectar de novo'); b.onclick = () => { Rede.estado = 'desligado'; Rede.ligar(); }; f.appendChild(b); }
      else {
        f.appendChild(H('p', '', 'Entre na sua conta para falar com os outros jogadores.'));
        const n = H('input'); n.placeholder = 'Nome (3 a 16 letras)'; n.maxLength = 16; const s = H('input'); s.type = 'password'; s.placeholder = 'Senha (6+ caracteres)'; s.maxLength = 64;
        const l = H('div', 'ezc-pe'); l.style.border = 'none'; l.style.padding = '0';
        const b1 = H('button', 'ezc-bt', 'Entrar'), b2 = H('button', 'ezc-bt', 'Criar conta'); b1.onclick = () => Rede.entrar(n.value.trim(), s.value, false); b2.onclick = () => Rede.entrar(n.value.trim(), s.value, true);
        s.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') Rede.entrar(n.value.trim(), s.value, false); });
        l.append(b1, b2); f.append(n, s, l);
        for (const m of this.msgs[this.aba].filter((q) => q.local).slice(-2)) f.appendChild(H('p', '', m.texto)).style.color = '#ff8a8a';
      }
      E.lista.appendChild(f); this.marcas(); return;
    }
    E.inp.placeholder = this.aba === 'privado' ? (this.para ? `Mensagem para ${this.para}…` : 'Clique num nome para falar em privado') : this.aba === 'sistema' ? 'Canal só de leitura' : 'Digite sua mensagem…';
    for (const m of this.msgs[this.aba].slice(-120)) this.linha(m, false);
    E.lista.scrollTop = E.lista.scrollHeight;
    this.pintarOnline(); this.marcas(); PainelGM.botao();
  },
  enviar() {
    const E = this.el, t = E.inp.value.trim(); if (!t) return;
    E.inp.value = ''; E.emo.style.display = 'none';
    if (t.startsWith('/')) { Rede.comando(t); return; }
    if (this.aba === 'sistema') return this.local('O canal Sistema é só de leitura.', 'erro');
    if (this.aba === 'privado' && !this.para) return this.local('Clique no nome de um jogador para falar em privado.', 'erro');
    Rede.falar(this.aba, t, this.para);
  },
};

// ------------------------------------------------------------------ painel do Game Master
const PainelGM = {
  el: null, aberto: false, cat: 'adm', sel: '', hist: [], hi: -1,
  CATS: [['adm', 'Administração'], ['personagem', 'Personagem'], ['economia', 'Economia'], ['mundo', 'Mundo'], ['deus', 'Modo Deus'], ['consulta', 'Consulta']],
  RAPIDOS: [['Curar', '/heal {j}'], ['God', '/god {j}'], ['Sem god', '/ungod {j}'], ['Noclip', '/noclip {j}'], ['Info', '/info {j}'], ['Localizar', '/localizar {j}'], ['Observar', '/observar {j}'], ['Ir até', '/teleportar eu {j}'], ['Trazer', '/teleportar {j} eu'], ['Mute 10', '/mute {j} 10'], ['Kick', '/kick {j}']],
  MUNDO: [['☀ Limpo', '/clima limpo'], ['🌧 Chuva', '/clima chuva'], ['⛈ Tempestade', '/clima tempestade'], ['❄ Neve', '/clima neve'], ['🌫 Neblina', '/clima neblina'], ['Clima auto', '/clima auto'], ['🌅 6h', '/hora 6'], ['🌞 12h', '/hora 12'], ['🌙 22h', '/hora 22'], ['Hora auto', '/hora auto'], ['XP 2x 30min', '/evento xp2 30'], ['XP 5x 30min', '/evento xp5 30'], ['Parar evento', '/parar_evento'], ['🧊 Congelar', '/congelar'], ['Difícil 2x', '/dificuldade 2'], ['Normal', '/dificuldade 1'], ['Invisível', '/invisivel']],
  botao() {
    if (typeof document === 'undefined') return;
    const C = Chat.h.bind(Chat);
    if (!this.btn) { this.btn = C('button', 'ezc ezc-btn gm', '👑'); this.btn.title = 'Painel do GM'; this.btn.onclick = () => this.abrir(!this.aberto); this.btn.addEventListener('mousedown', (e) => e.stopPropagation()); document.body.appendChild(this.btn); }
    this.btn.style.display = Rede.equipe() && Chat.el && Chat.el.btn.style.display !== 'none' ? 'block' : 'none';
    if (!Rede.equipe() && this.aberto) this.abrir(false);
  },
  montar() {
    if (this.el) return;
    const H = Chat.h.bind(Chat), E = this.el = {};
    E.jan = H('div', 'ezc ezc-jan gm');
    const cab = H('div', 'ezc-gm-cab', '👑 PAINEL GM'); E.papel = H('span', '', ''); E.papel.style.cssText = 'margin-left:8px;font-size:12px;color:#ffd166;flex:1'; const x = H('button', 'ezc-x', '✕'); x.onclick = () => this.abrir(false); cab.append(E.papel, x);
    E.cats = H('div', 'ezc-cats'); const meio = H('div', 'ezc-gm-meio'); E.cmds = H('div', 'ezc-cmds');
    const jg = H('div', 'ezc-jogs'); E.busca = H('input'); E.busca.placeholder = 'Buscar jogador…'; E.busca.style.margin = '4px 8px'; E.busca.oninput = () => this.pintarJogadores(); E.jl = H('div', 'l'); jg.append(E.busca, E.jl);
    meio.append(E.cmds, jg);
    E.rap = H('div', 'ezc-rap'); E.dica = H('div', 'ezc-dica'); E.saida = H('div', 'ezc-saida');
    const pe = H('div', 'ezc-pe'); E.inp = H('input'); E.inp.placeholder = 'Digite um comando…  (Tab completa, ↑ ↓ histórico)'; E.inp.autocomplete = 'off'; const b = H('button', 'ezc-bt r', '➤'); b.onclick = () => this.executar(); pe.append(E.inp, b);
    E.jan.append(cab, E.cats, meio, E.rap, E.dica, E.saida, pe);
    document.body.appendChild(E.jan);
    const parar = (ev) => ev.stopPropagation();
    for (const t of ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'click', 'wheel', 'touchstart', 'touchend', 'pointerdown', 'pointerup']) E.jan.addEventListener(t, parar);
    E.inp.addEventListener('input', () => this.dica());
    E.inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); this.executar(); }
      else if (ev.key === 'Tab') { ev.preventDefault(); this.completar(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (this.hi < this.hist.length - 1) E.inp.value = this.hist[this.hist.length - 1 - ++this.hi]; this.dica(); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); this.hi = Math.max(-1, this.hi - 1); E.inp.value = this.hi < 0 ? '' : this.hist[this.hist.length - 1 - this.hi]; this.dica(); }
      else if (ev.key === 'Escape') this.abrir(false);
    });
  },
  abrir(v) { if (v && !Rede.equipe()) return; this.montar(); this.aberto = v; this.el.jan.style.display = v ? 'flex' : 'none'; if (v) { this.atualizar(); setTimeout(() => this.el.inp.focus(), 30); } },
  comandos() { return (Rede.sessao && Rede.sessao.comandos) || {}; },
  atualizar() {
    if (!this.el) return; const E = this.el, H = Chat.h.bind(Chat), C = this.comandos();
    E.papel.textContent = Rede.sessao ? `${Rede.sessao.nome} · ${Rede.sessao.papel.toUpperCase()}` : '';
    E.cats.textContent = '';
    for (const [id, nome] of this.CATS) { if (!Object.values(C).some((c) => c.cat === id)) continue; const b = H('button', 'ezc-bt p' + (id === this.cat ? ' r' : ''), nome); b.onclick = () => { this.cat = id; this.atualizar(); }; E.cats.appendChild(b); }
    E.cmds.textContent = '';
    for (const k of Object.keys(C).filter((q) => C[q].cat === this.cat)) { const d = H('div', 'ezc-cmd'); d.appendChild(H('b', '', '/' + k)); d.appendChild(H('u', '', ' ' + C[k].a)); d.appendChild(H('span', '', ' — ' + C[k].d)); d.onclick = () => { E.inp.value = `/${k} ${/jogador/.test(C[k].a) && this.sel ? this.sel + ' ' : ''}`; E.inp.focus(); this.dica(); }; E.cmds.appendChild(d); }
    E.rap.textContent = '';
    for (const [nome, cmd] of this.cat === 'deus' || this.cat === 'mundo' ? this.MUNDO : this.RAPIDOS) { const c = cmd.slice(1).split(' ')[0]; if (!C[c]) continue; const b = H('button', 'ezc-bt p', nome); b.onclick = () => { if (/\{j\}/.test(cmd) && !this.sel) return this.escreve('Selecione um jogador na lista.', false); this.executar(cmd.replace('{j}', this.sel)); }; E.rap.appendChild(b); }
    this.pintarJogadores();
  },
  pintarJogadores() {
    if (!this.el) return; const E = this.el, f = E.busca.value.trim().toLowerCase(); E.jl.textContent = '';
    for (const j of Rede.online.filter((q) => !f || q.nome.toLowerCase().includes(f))) { const d = Chat.h('div', j.nome === this.sel ? 'sel' : '', `${j.papel !== 'jogador' ? '👑 ' : ''}${j.nome} · nv ${j.nivel}${j.zona ? ' · ' + j.zona : ''}`); d.onclick = () => { this.sel = this.sel === j.nome ? '' : j.nome; this.atualizar(); }; E.jl.appendChild(d); }
  },
  dica() {   // parâmetros do comando que está sendo digitado, ou os comandos que começam assim
    const E = this.el, t = E.inp.value, C = this.comandos();
    if (!t.startsWith('/')) { E.dica.textContent = ''; return; }
    const nome = t.slice(1).split(' ')[0];
    if (C[nome] && t.includes(' ')) E.dica.textContent = `/${nome} ${C[nome].a}${C[nome].destrutivo ? '  ⚠ pede confirmação' : ''}`;
    else E.dica.textContent = Object.keys(C).filter((k) => k.startsWith(nome)).slice(0, 8).map((k) => '/' + k).join('   ');
  },
  completar() {
    const E = this.el, t = E.inp.value, C = this.comandos();
    if (!t.startsWith('/')) return;
    const partes = t.slice(1).split(' ');
    if (partes.length === 1) { const L = Object.keys(C).filter((k) => k.startsWith(partes[0])); if (L.length) { this._ci = ((this._ci || 0) + 1) % L.length; E.inp.value = '/' + (L.length === 1 ? L[0] + ' ' : L[this._ci]); } }
    else { const u = partes[partes.length - 1].toLowerCase(), L = Rede.online.map((j) => j.nome).filter((n) => n.toLowerCase().startsWith(u)); if (L.length) { partes[partes.length - 1] = L[0]; E.inp.value = '/' + partes.join(' ') + ' '; } }
    this.dica();
  },
  escreve(txt, ok) { if (!this.el) return; const d = Chat.h('div', ok ? 'ok' : 'no', `[${Chat.hora()}] ${txt}`); this.el.saida.appendChild(d); this.el.saida.scrollTop = this.el.saida.scrollHeight; },
  executar(cmd) {
    const E = this.el, t = (cmd || E.inp.value).trim(); if (!t) return;
    if (!cmd) { E.inp.value = ''; this.hist.push(t); if (this.hist.length > 50) this.hist.shift(); this.hi = -1; this.dica(); }
    const d = Chat.h('div', '', `> ${t}`); E.saida.appendChild(d);
    if (!Rede.comando(t.startsWith('/') ? t : '/' + t)) this.escreve('Sem conexão com o servidor.', false);
  },
  resposta(m) {
    if (m.painel && Rede.equipe()) this.abrir(true);
    if (!this.el || !this.aberto) return;
    this.escreve(m.txt, m.ok);
    if (m.confirmar) { const b = Chat.h('button', 'ezc-bt r p', 'CONFIRMAR'); b.onclick = () => { Rede.comando('/confirmar ' + m.confirmar); b.remove(); }; this.el.saida.appendChild(b); this.el.saida.scrollTop = this.el.saida.scrollHeight; }
  },
  observado(m) { const e = m.estado || {}; this.escreve(`👁 ${m.nome}: ${e.zonaNome || e.zona || '?'} (${e.x}, ${e.y}) · nv ${e.nivel} · vida ${e.hp}/${e.hpMax} · células ${e.celulas}`, true); },
};

if (typeof window !== 'undefined') {
  window.Rede = Rede; window.Chat = Chat; window.PainelGM = PainelGM; window.GMFx = GMFx;
  window.addEventListener('load', () => { GMFx.instalar(); Chat.montar(); if (Rede.endereco()) Rede.ligar(); setInterval(() => { if (Chat.el) { const v = typeof game !== 'undefined' && game.state && (/^(playing|world)/.test(game.state)); Chat.el.btn.style.display = v || Chat.aberto ? 'block' : 'none'; PainelGM.botao(); } }, 700); });
}
