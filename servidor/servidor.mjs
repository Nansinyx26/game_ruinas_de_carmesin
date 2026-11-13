// ECLIPSE ZERO · Servidor de chat e de Game Master (WebSocket)
// ---------------------------------------------------------------------------
// O jogo é um site estático; este servidor é a parte que NÃO pode ficar no navegador: contas,
// sessões, papéis (OWNER, GM, MODERADOR), o chat entre jogadores e os comandos administrativos.
// Todo comando é conferido AQUI (papel da conta, parâmetros, limites) antes de virar efeito; o
// navegador só recebe efeitos que vieram desta conexão. Nada do que o cliente diz sobre o próprio
// papel é levado em conta.
//
//   node servidor.mjs                          (porta 8787)
//   PORTA=9000 EZ_OWNER=SeuNome EZ_OWNER_CHAVE=segredo node servidor.mjs
//
// Variáveis: PORTA · EZ_DADOS (pasta dos dados, padrão ./dados) · EZ_OWNER (nome da conta dona:
// só ela é OWNER) · EZ_OWNER_CHAVE (segredo pedido para CRIAR a conta dona; sem ele ninguém cria)
// · EZ_ORIGENS (origens do navegador aceitas, separadas por vírgula; vazio = qualquer).
// Dados em JSON na pasta de dados: contas, sessões, histórico do chat, estado do mundo, registro
// dos comandos (log_gm.jsonl) e denúncias. Senhas com scrypt e sal por conta.
// ---------------------------------------------------------------------------
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const VERSAO = '1.0.0';
const NIVEL = { jogador: 0, moderador: 1, gm: 2, owner: 3 };
const CANAIS = ['global', 'grupo', 'guilda', 'privado', 'sistema'];
const CLIMAS = ['limpo', 'chuva', 'tempestade', 'neve', 'nevasca', 'neblina', 'areia', 'cinzas'];
const LIM = { texto: 300, nivel: 100, xp: 10e6, dinheiro: 1e6, itens: 999, mana: 1000, vel: [0.25, 4], velMundo: [0.25, 3], dif: [0.25, 5], mudoMax: 7 * 24 * 60, spawn: 30 };
const PALAVROES = ['porra', 'caralho', 'merda', 'buceta', 'viado', 'puta', 'fdp', 'arrombado', 'cuzao', 'cuzão', 'otario', 'otário', 'fuck', 'shit', 'bitch'];
const agora = () => Date.now();
const limpar = (s, n = LIM.texto) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const num = (v) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const entre = (v, a, b) => Math.min(b, Math.max(a, v));

// Comandos administrativos: papel mínimo, parâmetros (para a ajuda e o autocompletar) e o que fazem
// alvo: 'jogador' = o primeiro parâmetro é um jogador (ou "eu"; omitido = quem digitou)
const COMANDOS = {
  // administração
  gm: { p: 'moderador', a: '[help]', d: 'Abre o painel / lista os comandos do seu papel', cat: 'adm' },
  anunciar: { p: 'gm', a: '<mensagem>', d: 'Anúncio global para todos', cat: 'adm' },
  aviso: { p: 'moderador', a: '<mensagem>', d: 'Aviso do sistema no chat', cat: 'adm' },
  kick: { p: 'moderador', a: '<jogador> [motivo]', d: 'Expulsa o jogador da sessão', cat: 'adm' },
  ban: { p: 'gm', a: '<jogador> <motivo>', d: 'Bane a conta', cat: 'adm', destrutivo: true },
  unban: { p: 'gm', a: '<jogador>', d: 'Tira o banimento', cat: 'adm' },
  mute: { p: 'moderador', a: '<jogador> [minutos]', d: 'Silencia no chat (padrão 10 min)', cat: 'adm' },
  unmute: { p: 'moderador', a: '<jogador>', d: 'Devolve a fala', cat: 'adm' },
  limpar_chat: { p: 'moderador', a: '[canal]', d: 'Apaga o histórico do canal (padrão global)', cat: 'adm', destrutivo: true },
  promover: { p: 'owner', a: '<jogador> <moderador|gm|jogador>', d: 'Define o papel de uma conta', cat: 'adm' },
  denuncias: { p: 'moderador', a: '', d: 'Mostra as últimas denúncias', cat: 'adm' },
  desfazer: { p: 'moderador', a: '', d: 'Desfaz o seu último comando reversível', cat: 'adm' },
  // personagem
  god: { p: 'gm', a: '[jogador]', d: 'Vida infinita', cat: 'personagem', alvo: 1 },
  ungod: { p: 'gm', a: '[jogador]', d: 'Tira a vida infinita', cat: 'personagem', alvo: 1 },
  level: { p: 'gm', a: '[jogador] <nível 1-100>', d: 'Define o nível', cat: 'personagem', alvo: 1 },
  xp: { p: 'gm', a: '[jogador] <quantidade>', d: 'Dá experiência', cat: 'personagem', alvo: 1 },
  heal: { p: 'gm', a: '[jogador]', d: 'Cura por completo', cat: 'personagem', alvo: 1 },
  mana: { p: 'gm', a: '[jogador] <quantidade>', d: 'Dá energia', cat: 'personagem', alvo: 1 },
  reviver: { p: 'gm', a: '[jogador]', d: 'Revive', cat: 'personagem', alvo: 1 },
  noclip: { p: 'gm', a: '[jogador]', d: 'Liga/desliga atravessar paredes e voar', cat: 'personagem', alvo: 1 },
  velocidade: { p: 'gm', a: '[jogador] <0.25-4>', d: 'Velocidade do personagem', cat: 'personagem', alvo: 1 },
  teleportar: { p: 'gm', a: '<jogador> <mapa|jogador>', d: 'Leva o jogador a um mapa ou até outro jogador', cat: 'personagem', alvo: 1 },
  invisivel: { p: 'gm', a: '', d: 'Liga/desliga a invisibilidade do GM', cat: 'personagem' },
  // economia e inventário
  dar_money: { p: 'gm', a: '[jogador] <quantidade>', d: 'Dá células', cat: 'economia', alvo: 1 },
  remover_money: { p: 'gm', a: '[jogador] <quantidade>', d: 'Tira células', cat: 'economia', alvo: 1 },
  dar_item: { p: 'gm', a: '[jogador] <item_id> [quantidade]', d: 'Entrega item', cat: 'economia', alvo: 1 },
  remover_item: { p: 'gm', a: '[jogador] <item_id> [quantidade]', d: 'Tira item', cat: 'economia', alvo: 1 },
  limpar_inventario: { p: 'gm', a: '<jogador>', d: 'Esvazia a bolsa', cat: 'economia', alvo: 1, destrutivo: true },
  setar_arma: { p: 'gm', a: '[jogador] <arma_id>', d: 'Equipa uma arma', cat: 'economia', alvo: 1 },
  setar_armadura: { p: 'gm', a: '[jogador] <armadura_id>', d: 'Equipa uma armadura', cat: 'economia', alvo: 1 },
  // mundo e eventos
  evento: { p: 'gm', a: '<nome> [minutos]', d: 'Inicia um evento global (xp2, xp3, xp5, xp10, invasao, ou um nome livre)', cat: 'mundo' },
  parar_evento: { p: 'gm', a: '', d: 'Encerra o evento atual', cat: 'mundo' },
  resetar_evento: { p: 'gm', a: '', d: 'Reinicia o relógio do evento atual', cat: 'mundo' },
  spawn_npc: { p: 'gm', a: '<npc_id> [quantidade]', d: 'Cria NPC/inimigo perto de você', cat: 'mundo' },
  spawn_boss: { p: 'gm', a: '<boss_id>', d: 'Cria um chefe perto de você', cat: 'mundo' },
  spawn_item: { p: 'gm', a: '<item_id> [quantidade]', d: 'Cria um baú com o item perto de você', cat: 'mundo' },
  clima: { p: 'gm', a: `<${CLIMAS.join('|')}|auto>`, d: 'Clima de todos os mapas', cat: 'mundo' },
  hora: { p: 'gm', a: '<0-23|auto>', d: 'Hora do mundo', cat: 'mundo' },
  tp: { p: 'gm', a: '<x> <y> [z]', d: 'Teleporte por coordenadas', cat: 'mundo' },
  mudar_mapa: { p: 'gm', a: '<mapa_id>', d: 'Vai para outro mapa', cat: 'mundo' },
  kill_all: { p: 'gm', a: '', d: 'Elimina os inimigos da sua área', cat: 'mundo', destrutivo: true },
  limpar_inimigos: { p: 'gm', a: '', d: 'Remove os inimigos da sua área (sem recompensa)', cat: 'mundo' },
  // modo deus do mundo
  invasao: { p: 'gm', a: '<inimigo_id> [quantidade]', d: 'Invasão: o inimigo aparece para todos os jogadores', cat: 'deus' },
  boss_mundial: { p: 'gm', a: '<boss_id>', d: 'Chefe mundial: aparece para todos', cat: 'deus' },
  dificuldade: { p: 'gm', a: '<0.25-5>', d: 'Dificuldade global', cat: 'deus' },
  velocidade_mundo: { p: 'gm', a: '<0.25-3>', d: 'Velocidade do tempo do mundo', cat: 'deus' },
  congelar: { p: 'gm', a: '', d: 'Congela/descongela o mundo', cat: 'deus' },
  recompensa_todos: { p: 'gm', a: '<item_id|money|xp> <quantidade>', d: 'Recompensa para todos os jogadores online', cat: 'deus' },
  missao_especial: { p: 'gm', a: '<abates> <células> <título>', d: 'Missão especial para todos', cat: 'deus' },
  evento_secreto: { p: 'gm', a: '<mapa_id> <boss_id>', d: 'Evento secreto: um chefe escondido num mapa, sem anúncio', cat: 'deus' },
  observar: { p: 'moderador', a: '[jogador]', d: 'Acompanha um jogador (sem parâmetro: para)', cat: 'deus' },
  // consulta
  info: { p: 'moderador', a: '<jogador>', d: 'Dados da conta e do personagem', cat: 'consulta' },
  online: { p: 'jogador', a: '', d: 'Quem está conectado', cat: 'consulta' },
  localizar: { p: 'moderador', a: '<jogador>', d: 'Mapa e posição do jogador', cat: 'consulta' },
  status_servidor: { p: 'moderador', a: '', d: 'Estado do servidor', cat: 'consulta' },
};

export function iniciar(op = {}) {
  const PORTA = op.porta ?? Number(process.env.PORTA || 8787);
  const DADOS = op.dados || process.env.EZ_DADOS || path.join(AQUI, 'dados');
  const OWNER = (op.owner ?? process.env.EZ_OWNER ?? '').toLowerCase();
  const OWNER_CHAVE = op.ownerChave ?? process.env.EZ_OWNER_CHAVE ?? '';
  const ORIGENS = (op.origens ?? process.env.EZ_ORIGENS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  fs.mkdirSync(DADOS, { recursive: true });
  const inicio = agora();

  // ------------------------------------------------------------ dados em disco
  const ler = (nome, padrao) => { try { return JSON.parse(fs.readFileSync(path.join(DADOS, nome), 'utf8')); } catch { return padrao; } };
  const pend = new Map();
  const gravar = (nome, v) => {   // grava logo depois (junta várias mudanças) e por troca de arquivo
    if (pend.has(nome)) return;
    pend.set(nome, setTimeout(() => { pend.delete(nome); const f = path.join(DADOS, nome); try { fs.writeFileSync(f + '.tmp', JSON.stringify(v())); fs.renameSync(f + '.tmp', f); } catch (e) { console.error('gravar', nome, e.message); } }, 150));
  };
  const anexar = (nome, obj) => { try { fs.appendFileSync(path.join(DADOS, nome), JSON.stringify(obj) + '\n'); } catch (e) { console.error('anexar', nome, e.message); } };
  const contas = ler('contas.json', {});            // chave: nome em minúsculas
  const sessoes = ler('sessoes.json', {});          // token → { conta, ate }
  const historico = ler('historico.json', { global: [], sistema: [], guildas: {} });
  const mundo = Object.assign({ clima: null, hora: null, evento: null, dificuldade: 1, velocidade: 1, congelado: false }, ler('mundo.json', {}));
  const salvarContas = () => gravar('contas.json', () => contas), salvarSessoes = () => gravar('sessoes.json', () => sessoes);
  const salvarHist = () => gravar('historico.json', () => historico), salvarMundo = () => gravar('mundo.json', () => mundo);

  // ------------------------------------------------------------ contas e papéis
  const papelDe = (c) => (OWNER && c.chave === OWNER ? 'owner' : c.papel === 'owner' ? 'jogador' : c.papel || 'jogador');   // OWNER só pela variável do servidor
  const pode = (c, papel) => NIVEL[papelDe(c)] >= NIVEL[papel];
  const hashSenha = (senha, sal) => crypto.scryptSync(senha, sal, 32).toString('hex');
  const nomeOk = (n) => /^[A-Za-zÀ-ÿ0-9_]{3,16}$/.test(n);
  function registrar(nome, senha, chave) {
    nome = limpar(nome, 16); senha = String(senha || '');
    if (!nomeOk(nome)) return 'Nome: de 3 a 16 letras, números ou _.';
    if (senha.length < 6 || senha.length > 64) return 'Senha: de 6 a 64 caracteres.';
    const k = nome.toLowerCase();
    if (contas[k]) return 'Esse nome já tem dono.';
    if (OWNER && k === OWNER && (!OWNER_CHAVE || chave !== OWNER_CHAVE)) return 'Esse nome é reservado.';
    if (PALAVROES.some((p) => k.includes(p))) return 'Escolha outro nome.';
    const sal = crypto.randomBytes(16).toString('hex');
    contas[k] = { chave: k, nome, sal, hash: hashSenha(senha, sal), papel: 'jogador', criado: agora(), banido: null, mudo: 0, guilda: null, ignorados: [] };
    salvarContas();
    return contas[k];
  }
  function abrirSessao(c) {
    const token = crypto.randomBytes(32).toString('hex');
    sessoes[token] = { conta: c.chave, ate: agora() + 30 * 24 * 3600e3 };
    salvarSessoes();
    return token;
  }

  // ------------------------------------------------------------ conexões
  const conexoes = new Set();
  const tentativas = new Map();   // ip → [instantes] (entrar/registrar)
  const grupos = new Map();       // id → Set de chaves de conta (em memória)
  const convites = new Map();     // chave do convidado → { tipo, de, id|guilda, ate }
  const mandar = (cx, obj) => { if (cx.ws.readyState === 1) cx.ws.send(JSON.stringify(obj)); };
  const logadas = () => [...conexoes].filter((c) => c.conta);
  const conexaoDe = (nome) => { const k = String(nome || '').toLowerCase(); return logadas().find((c) => c.conta.chave === k) || null; };
  const todos = (obj, filtro) => { for (const c of logadas()) if (!filtro || filtro(c)) mandar(c, obj); };
  const equipe = (obj) => todos(obj, (c) => pode(c.conta, 'moderador'));
  const cartao = (c) => ({ nome: c.conta.nome, nivel: c.estado.nivel || 1, papel: papelDe(c.conta), zona: c.estado.zonaNome || '', guilda: c.conta.guilda || null });
  function listaOnline(para) {
    const staff = para && pode(para.conta, 'moderador');
    return logadas().filter((c) => staff || !c.invisivel).map((c) => Object.assign(cartao(c), c.invisivel ? { invisivel: true } : {}));
  }
  const avisarOnline = () => { for (const c of logadas()) mandar(c, { t: 'online', lista: listaOnline(c) }); };
  function sistema(texto, para) {
    const m = { t: 'chat', canal: 'sistema', de: 'Sistema', papel: 'sistema', texto, hora: agora() };
    if (para) { mandar(para, m); return; }
    historico.sistema.push(m); if (historico.sistema.length > 100) historico.sistema.shift(); salvarHist();
    todos(m);
  }
  function mensagemGM(texto, de) { todos({ t: 'chat', canal: 'global', de: de.conta.nome, papel: papelDe(de.conta), nivel: de.estado.nivel || 1, texto, hora: agora(), gm: true }); }
  function expulsar(cx, motivo) { mandar(cx, { t: 'sair', motivo }); setTimeout(() => { try { cx.ws.close(4001, 'expulso'); } catch { /* já fechou */ } }, 80); }

  // ------------------------------------------------------------ chat
  const filtrar = (txt) => { let t = txt; for (const p of PALAVROES) t = t.replace(new RegExp(p, 'gi'), (m) => '*'.repeat(m.length)); return t; };
  function chat(cx, m) {
    const c = cx.conta, canal = CANAIS.includes(m.canal) ? m.canal : 'global';
    let texto = limpar(m.texto);
    if (!texto) return;
    if (canal === 'sistema') return mandar(cx, { t: 'erro', txt: 'O canal Sistema é só de leitura.' });
    if (c.mudo > agora()) return mandar(cx, { t: 'erro', txt: `Você está silenciado por mais ${Math.ceil((c.mudo - agora()) / 60000)} min.` });
    // anti-spam: 5 mensagens a cada 8 s, sem repetir a mesma em 4 s
    const t = agora(); cx.ult = cx.ult.filter((x) => t - x < 8000);
    if (cx.ult.length >= 5) return mandar(cx, { t: 'erro', txt: 'Devagar: muitas mensagens em pouco tempo.' });
    if (cx.ultTxt === texto && t - cx.ultT < 4000) return mandar(cx, { t: 'erro', txt: 'Mensagem repetida.' });
    cx.ult.push(t); cx.ultTxt = texto; cx.ultT = t;
    texto = filtrar(texto);
    const msg = { t: 'chat', canal, de: c.nome, nivel: cx.estado.nivel || 1, papel: papelDe(c), texto, hora: t };
    if (canal === 'global') {
      historico.global.push(msg); if (historico.global.length > 200) historico.global.shift(); salvarHist();
      todos(msg, (d) => !d.conta.ignorados.includes(c.chave));
    } else if (canal === 'privado') {
      const d = conexaoDe(m.para);
      if (!d || (d.invisivel && !pode(c, 'moderador'))) return mandar(cx, { t: 'erro', txt: 'Jogador não está online.' });
      if (d.conta.ignorados.includes(c.chave)) return mandar(cx, { t: 'erro', txt: 'Esse jogador não recebe mensagens suas.' });
      msg.para = d.conta.nome; mandar(d, msg); if (d !== cx) mandar(cx, msg);
    } else if (canal === 'grupo') {
      const g = cx.grupo && grupos.get(cx.grupo);
      if (!g) return mandar(cx, { t: 'erro', txt: 'Você não está em um grupo. Use /grupo criar.' });
      todos(msg, (d) => g.has(d.conta.chave));
    } else if (canal === 'guilda') {
      if (!c.guilda) return mandar(cx, { t: 'erro', txt: 'Você não está em uma guilda. Use /guilda criar <nome>.' });
      const H = historico.guildas[c.guilda] || (historico.guildas[c.guilda] = []);
      H.push(msg); if (H.length > 100) H.shift(); salvarHist();
      todos(msg, (d) => d.conta.guilda === c.guilda);
    }
  }
  // comandos de qualquer jogador (grupo, guilda, privado, denúncia, ignorar)
  function comandoJogador(cx, nome, args, resto) {
    const c = cx.conta, R = (txt, ok = true) => mandar(cx, { t: 'resposta', ok, txt });
    if (nome === 'ajuda' || nome === 'comandos') return R('/p <jogador> <msg> · /grupo criar|convidar <j>|aceitar|sair · /guilda criar <nome>|convidar <j>|aceitar|sair · /ignorar <j> · /denunciar <j> <motivo> · /online' + (pode(c, 'moderador') ? ' · /gm help' : '')), true;
    if (nome === 'p' || nome === 'w' || nome === 'privado') { chat(cx, { canal: 'privado', para: args[0], texto: args.slice(1).join(' ') }); return true; }
    if (nome === 'ignorar') {
      const k = String(args[0] || '').toLowerCase();
      if (!contas[k] || k === c.chave) return R('Jogador não encontrado.', false), true;
      const i = c.ignorados.indexOf(k); if (i >= 0) c.ignorados.splice(i, 1); else c.ignorados.push(k);
      salvarContas(); return R(i >= 0 ? `Você voltou a ouvir ${contas[k].nome}.` : `Você não vê mais as mensagens de ${contas[k].nome}.`), true;
    }
    if (nome === 'denunciar') {
      const k = String(args[0] || '').toLowerCase(), motivo = limpar(args.slice(1).join(' '), 200);
      if (!contas[k] || !motivo) return R('Use: /denunciar <jogador> <motivo>', false), true;
      const d = { quando: agora(), de: c.nome, alvo: contas[k].nome, motivo };
      anexar('denuncias.jsonl', d); equipe({ t: 'chat', canal: 'sistema', de: 'Sistema', papel: 'sistema', texto: `Denúncia de ${d.de} contra ${d.alvo}: ${motivo}`, hora: agora() });
      return R('Denúncia registrada. A moderação foi avisada.'), true;
    }
    if (nome === 'grupo' || nome === 'guilda') {
      const sub = args[0], gu = nome === 'guilda';
      if (sub === 'criar') {
        if (gu) { const n = limpar(args.slice(1).join(' '), 24); if (n.length < 3 || PALAVROES.some((p) => n.toLowerCase().includes(p))) return R('Nome da guilda: de 3 a 24 caracteres.', false), true; if (c.guilda) return R('Saia da guilda atual primeiro.', false), true; c.guilda = n; salvarContas(); avisarOnline(); return R(`Guilda "${n}" criada.`), true; }
        if (cx.grupo) return R('Você já está em um grupo.', false), true;
        const id = crypto.randomBytes(6).toString('hex'); grupos.set(id, new Set([c.chave])); cx.grupo = id; return R('Grupo criado. Convide com /grupo convidar <jogador>.'), true;
      }
      if (sub === 'convidar') {
        const d = conexaoDe(args[1]);
        if (!d || d === cx) return R('Jogador não está online.', false), true;
        if (gu ? !c.guilda : !cx.grupo) return R(gu ? 'Você não está em uma guilda.' : 'Crie um grupo primeiro.', false), true;
        convites.set(d.conta.chave, { tipo: nome, de: c.nome, id: gu ? c.guilda : cx.grupo, ate: agora() + 120e3 });
        sistema(`${c.nome} convidou você para ${gu ? `a guilda "${c.guilda}"` : 'o grupo'}. Digite /${nome} aceitar.`, d); return R('Convite enviado.'), true;
      }
      if (sub === 'aceitar') {
        const v = convites.get(c.chave);
        if (!v || v.tipo !== nome || v.ate < agora()) return R('Não há convite pendente.', false), true;
        convites.delete(c.chave);
        if (gu) { c.guilda = v.id; salvarContas(); avisarOnline(); return R(`Você entrou na guilda "${v.id}".`), true; }
        const g = grupos.get(v.id); if (!g) return R('O grupo não existe mais.', false), true;
        if (cx.grupo) sairGrupo(cx); g.add(c.chave); cx.grupo = v.id; todos({ t: 'chat', canal: 'grupo', de: 'Sistema', papel: 'sistema', texto: `${c.nome} entrou no grupo.`, hora: agora() }, (d) => g.has(d.conta.chave)); return true;
      }
      if (sub === 'sair') {
        if (gu) { if (!c.guilda) return R('Você não está em uma guilda.', false), true; const n = c.guilda; c.guilda = null; salvarContas(); avisarOnline(); return R(`Você saiu da guilda "${n}".`), true; }
        if (!cx.grupo) return R('Você não está em um grupo.', false), true;
        sairGrupo(cx); return R('Você saiu do grupo.'), true;
      }
      return R(`Use: /${nome} criar${gu ? ' <nome>' : ''} | convidar <jogador> | aceitar | sair`, false), true;
    }
    return false;
  }
  function sairGrupo(cx) { const g = grupos.get(cx.grupo); if (g) { g.delete(cx.conta.chave); if (!g.size) grupos.delete(cx.grupo); } cx.grupo = null; }

  // ------------------------------------------------------------ comandos do GM
  const idsVistos = new Map();    // id do comando → instante (não executa duas vezes)
  const confirmacoes = new Map(); // token → { cx, nome, args, ate }
  function registro(cx, texto, alvo, resultado, ok) { anexar('log_gm.jsonl', { quando: agora(), gm: cx.conta.nome, papel: papelDe(cx.conta), comando: texto, alvo: alvo || null, resultado, ok }); }
  function efeito(alvo, e, de) { mandar(alvo, { t: 'efeito', e, de: de.conta.nome, id: crypto.randomBytes(6).toString('hex') }); }
  function comando(cx, texto, id) {
    const c = cx.conta;
    texto = limpar(texto, 400);
    if (!texto.startsWith('/')) return;
    const partes = texto.slice(1).split(/\s+/), nome = (partes.shift() || '').toLowerCase(), args = partes;
    const R = (txt, ok = true, extra) => mandar(cx, Object.assign({ t: 'resposta', ok, txt, comando: nome }, extra));
    if (id) { if (idsVistos.has(id)) return; idsVistos.set(id, agora()); if (idsVistos.size > 5000) for (const [k, t] of idsVistos) if (agora() - t > 60e3) idsVistos.delete(k); }
    if (nome === 'confirmar') {
      const v = confirmacoes.get(args[0]);
      if (!v || v.cx !== cx || v.ate < agora()) return R('Nada para confirmar (ou o prazo acabou).', false);
      confirmacoes.delete(args[0]);
      return executar(cx, v.nome, v.args, v.texto, R);
    }
    if (nome !== 'online' && comandoJogador(cx, nome, args)) return;
    const C = COMANDOS[nome];
    if (!C) return R(`Comando desconhecido: /${nome}. Use /ajuda.`, false);
    if (!pode(c, C.p)) { if (NIVEL[C.p] > 0) registro(cx, texto, null, 'sem permissão', false); return R('Você não tem permissão para esse comando.', false); }
    if (C.destrutivo) {
      const tk = crypto.randomBytes(4).toString('hex');
      confirmacoes.set(tk, { cx, nome, args, texto, ate: agora() + 30e3 });
      return R(`Ação destrutiva: /${nome} ${args.join(' ')} — confirme em 30 s.`, true, { confirmar: tk });
    }
    executar(cx, nome, args, texto, R);
  }
  // Separa o jogador-alvo dos demais parâmetros: "eu", um jogador online, ou (omitido) quem digitou
  function alvoArgs(cx, args, exigir) {
    const a0 = String(args[0] || '').toLowerCase();
    if (a0 === 'eu' || a0 === 'me') return { alvo: cx, resto: args.slice(1) };
    const d = a0 && conexaoDe(a0);
    if (d) return { alvo: d, resto: args.slice(1) };
    if (exigir || (a0 && contas[a0])) return { alvo: null, resto: args.slice(1), nome: args[0] };
    return { alvo: cx, resto: args };
  }
  function executar(cx, nome, args, texto, R) {
    const c = cx.conta, C = COMANDOS[nome];
    const fim = (txt, ok = true, alvo, extra) => { registro(cx, texto, alvo && alvo.conta ? alvo.conta.nome : alvo, txt, ok); R(txt, ok, extra); };
    const desfaz = (inv) => { cx.desfazer.push(inv); if (cx.desfazer.length > 20) cx.desfazer.shift(); };
    let A = null;
    if (C.alvo) {
      A = alvoArgs(cx, args, nome === 'teleportar' || nome === 'limpar_inventario');
      if (!A.alvo) return fim(`Jogador "${A.nome || ''}" não está online.`, false);
      if (A.alvo !== cx && NIVEL[papelDe(A.alvo.conta)] >= NIVEL[papelDe(c)] && papelDe(c) !== 'owner') return fim('Você não pode agir sobre alguém do mesmo papel ou acima.', false, A.alvo);
    }
    const alvo = A && A.alvo, r = A ? A.resto : args, quem = alvo ? alvo.conta.nome : '';
    const n1 = (i, min, max, rot) => { const v = num(r[i]); if (!Number.isFinite(v) || v < min || v > max) { fim(`${rot}: de ${min} a ${max}.`, false, alvo); return null; } return v; };
    switch (nome) {
      case 'gm': return R(args[0] === 'help' ? Object.entries(COMANDOS).filter(([, v]) => pode(c, v.p)).map(([k, v]) => `/${k} ${v.a} — ${v.d}`).join('\n') : 'Painel do GM aberto.', true, { painel: true });
      case 'anunciar': { const t = limpar(args.join(' ')); if (!t) return fim('Use: /anunciar <mensagem>', false); todos({ t: 'anuncio', texto: t, de: c.nome, hora: agora() }); sistema(`📢 ${t}`); return fim('Anúncio enviado.'); }
      case 'aviso': { const t = limpar(args.join(' ')); if (!t) return fim('Use: /aviso <mensagem>', false); sistema(`⚠ ${t}`); return fim('Aviso enviado.'); }
      case 'kick': case 'ban': case 'mute': case 'unmute': case 'unban': case 'promover': case 'info': case 'localizar': {
        const k = String(args[0] || '').toLowerCase(), ct = contas[k], d = conexaoDe(k);
        if (!ct) return fim('Conta não encontrada.', false);
        if ((nome === 'kick' || nome === 'ban' || nome === 'mute' || nome === 'promover') && NIVEL[papelDe(ct)] >= NIVEL[papelDe(c)]) return fim('Você não pode agir sobre alguém do mesmo papel ou acima.', false, ct.nome);
        if (nome === 'kick') { if (!d) return fim('Jogador não está online.', false, ct.nome); expulsar(d, `Expulso por ${c.nome}${args[1] ? ': ' + limpar(args.slice(1).join(' '), 120) : ''}`); sistema(`${ct.nome} foi expulso.`); return fim(`${ct.nome} expulso.`, true, ct.nome); }
        if (nome === 'ban') { const motivo = limpar(args.slice(1).join(' '), 160); if (!motivo) return fim('Use: /ban <jogador> <motivo>', false); ct.banido = { motivo, por: c.nome, quando: agora() }; salvarContas(); for (const tk in sessoes) if (sessoes[tk].conta === k) delete sessoes[tk]; salvarSessoes(); if (d) expulsar(d, `Banido: ${motivo}`); desfaz(['unban', [k]]); sistema(`${ct.nome} foi banido.`); return fim(`${ct.nome} banido.`, true, ct.nome); }
        if (nome === 'unban') { ct.banido = null; salvarContas(); return fim(`${ct.nome} pode entrar de novo.`, true, ct.nome); }
        if (nome === 'mute') { const min = args[1] === undefined ? 10 : num(args[1]); if (!(min >= 1 && min <= LIM.mudoMax)) return fim(`Minutos: de 1 a ${LIM.mudoMax}.`, false); ct.mudo = agora() + min * 60e3; salvarContas(); if (d) sistema(`Você foi silenciado por ${min} min.`, d); desfaz(['unmute', [k]]); return fim(`${ct.nome} silenciado por ${min} min.`, true, ct.nome); }
        if (nome === 'unmute') { ct.mudo = 0; salvarContas(); if (d) sistema('Você pode falar de novo.', d); return fim(`${ct.nome} pode falar.`, true, ct.nome); }
        if (nome === 'promover') { const p = String(args[1] || '').toLowerCase(); if (!['moderador', 'gm', 'jogador'].includes(p)) return fim('Papel: moderador, gm ou jogador (OWNER é só o dono do servidor).', false); ct.papel = p; salvarContas(); if (d) { mandar(d, { t: 'papel', papel: papelDe(ct) }); sistema(`Seu papel agora é ${p.toUpperCase()}.`, d); } avisarOnline(); return fim(`${ct.nome} agora é ${p}.`, true, ct.nome); }
        const E = d ? d.estado : null;
        if (nome === 'localizar') return fim(d ? `${ct.nome}: ${E.zonaNome || E.zona || '?'} (${Math.round(E.x || 0)}, ${Math.round(E.y || 0)})` : `${ct.nome} está offline.`, true, ct.nome, { dados: E });
        return fim(`${ct.nome} · ${papelDe(ct)} · ${d ? 'online' : 'offline'}${E ? ` · nível ${E.nivel || 1} · vida ${E.hp || '?'}/${E.hpMax || '?'} · ${E.zonaNome || '?'} · células ${E.celulas ?? '?'}` : ''} · guilda ${ct.guilda || '—'} · conta de ${new Date(ct.criado).toLocaleDateString('pt-BR')}${ct.banido ? ' · BANIDO: ' + ct.banido.motivo : ''}${ct.mudo > agora() ? ' · silenciado' : ''}`, true, ct.nome, { dados: E });
      }
      case 'limpar_chat': { const canal = args[0] === 'sistema' ? 'sistema' : 'global'; historico[canal] = []; salvarHist(); todos({ t: 'limpar', canal }); return fim(`Histórico do canal ${canal} apagado.`); }
      case 'denuncias': { let L = []; try { L = fs.readFileSync(path.join(DADOS, 'denuncias.jsonl'), 'utf8').trim().split('\n').slice(-8).map((l) => JSON.parse(l)); } catch { /* nenhuma */ } return R(L.length ? L.map((d) => `${new Date(d.quando).toLocaleString('pt-BR')} · ${d.de} → ${d.alvo}: ${d.motivo}`).join('\n') : 'Nenhuma denúncia.'); }
      case 'desfazer': { const inv = cx.desfazer.pop(); if (!inv) return R('Nada para desfazer.', false); return executar(cx, inv[0], inv[1], `/${inv[0]} ${inv[1].join(' ')} (desfazer)`, R); }
      case 'online': return R(listaOnline(cx).map((j) => `${j.nome} (nv ${j.nivel}${j.papel !== 'jogador' ? ', ' + j.papel.toUpperCase() : ''}${j.invisivel ? ', invisível' : ''})${j.zona ? ' · ' + j.zona : ''}`).join('\n') || 'Ninguém online.');
      case 'status_servidor': { const m = process.memoryUsage(); return R(`Servidor ${VERSAO} · no ar há ${Math.round((agora() - inicio) / 60000)} min · ${logadas().length} online · ${Object.keys(contas).length} contas · memória ${Math.round(m.rss / 1048576)} MB · evento: ${mundo.evento ? mundo.evento.nome : 'nenhum'} · clima: ${mundo.clima || 'auto'} · hora: ${mundo.hora ?? 'auto'} · dificuldade ${mundo.dificuldade}`); }
      case 'invisivel': cx.invisivel = !cx.invisivel; avisarOnline(); efeito(cx, { k: 'invisivel', on: cx.invisivel }, cx); return fim(cx.invisivel ? 'Você está invisível: não aparece na lista dos jogadores.' : 'Você voltou a aparecer.');
      case 'observar': { const d = args[0] ? conexaoDe(args[0]) : null; if (args[0] && !d) return fim('Jogador não está online.', false); cx.observa = d ? d.conta.chave : null; if (d) mandar(cx, { t: 'observado', nome: d.conta.nome, estado: d.estado }); return fim(d ? `Observando ${d.conta.nome}.` : 'Observação encerrada.', true, d); }
      // ---- personagem
      case 'god': case 'ungod': efeito(alvo, { k: 'god', on: nome === 'god' }, cx); if (nome === 'god') desfaz(['ungod', [quem]]); return fim(`${quem}: vida infinita ${nome === 'god' ? 'ligada' : 'desligada'}.`, true, alvo);
      case 'heal': efeito(alvo, { k: 'heal' }, cx); return fim(`${quem} curado.`, true, alvo);
      case 'reviver': efeito(alvo, { k: 'reviver' }, cx); return fim(`${quem} revivido.`, true, alvo);
      case 'noclip': alvo.noclip = !alvo.noclip; efeito(alvo, { k: 'noclip', on: alvo.noclip }, cx); return fim(`${quem}: noclip ${alvo.noclip ? 'ligado' : 'desligado'}.`, true, alvo);
      case 'level': { const v = n1(0, 1, LIM.nivel, 'Nível'); if (v === null) return; desfaz(['level', [quem, String(alvo.estado.nivel || 1)]]); efeito(alvo, { k: 'level', n: Math.round(v) }, cx); return fim(`${quem}: nível ${Math.round(v)}.`, true, alvo); }
      case 'xp': { const v = n1(0, 1, LIM.xp, 'Experiência'); if (v === null) return; efeito(alvo, { k: 'xp', n: Math.round(v) }, cx); return fim(`${quem}: +${Math.round(v)} de experiência.`, true, alvo); }
      case 'mana': { const v = n1(0, 1, LIM.mana, 'Energia'); if (v === null) return; efeito(alvo, { k: 'mana', n: Math.round(v) }, cx); return fim(`${quem}: +${Math.round(v)} de energia.`, true, alvo); }
      case 'velocidade': { const v = n1(0, LIM.vel[0], LIM.vel[1], 'Velocidade'); if (v === null) return; desfaz(['velocidade', [quem, '1']]); efeito(alvo, { k: 'velocidade', v }, cx); return fim(`${quem}: velocidade ${v}x.`, true, alvo); }
      case 'teleportar': { const dest = String(r[0] || ''); if (!dest) return fim('Use: /teleportar <jogador> <mapa|jogador>', false, alvo); const d = conexaoDe(dest); efeito(alvo, d ? { k: 'mapa', zona: d.estado.zona, x: d.estado.x, y: d.estado.y } : { k: 'mapa', zona: limpar(dest, 40) }, cx); return fim(`${quem} levado para ${d ? d.conta.nome : dest}.`, true, alvo); }
      // ---- economia
      case 'dar_money': case 'remover_money': { const v = n1(0, 1, LIM.dinheiro, 'Quantidade'); if (v === null) return; const s = nome === 'dar_money' ? 1 : -1; desfaz([s > 0 ? 'remover_money' : 'dar_money', [quem, String(Math.round(v))]]); efeito(alvo, { k: 'money', n: s * Math.round(v) }, cx); return fim(`${quem}: ${s > 0 ? '+' : '−'}${Math.round(v)} células.`, true, alvo); }
      case 'dar_item': case 'remover_item': { const item = limpar(r[0], 48).toLowerCase(); if (!/^[a-z0-9_:.-]{2,48}$/.test(item)) return fim('Informe o item_id.', false, alvo); const q = r[1] === undefined ? 1 : num(r[1]); if (!(q >= 1 && q <= LIM.itens)) return fim(`Quantidade: de 1 a ${LIM.itens}.`, false, alvo); const s = nome === 'dar_item' ? 1 : -1; desfaz([s > 0 ? 'remover_item' : 'dar_item', [quem, item, String(Math.round(q))]]); efeito(alvo, { k: 'item', item, n: s * Math.round(q) }, cx); return fim(`${quem}: ${s > 0 ? '+' : '−'}${Math.round(q)} ${item}.`, true, alvo); }
      case 'limpar_inventario': efeito(alvo, { k: 'limpar_inventario' }, cx); return fim(`Bolsa de ${quem} esvaziada.`, true, alvo);
      case 'setar_arma': case 'setar_armadura': { const item = limpar(r[0], 48).toLowerCase(); if (!/^[a-z0-9_:.-]{2,48}$/.test(item)) return fim(`Use: /${nome} [jogador] <id>`, false, alvo); efeito(alvo, { k: nome === 'setar_arma' ? 'arma' : 'armadura', item }, cx); return fim(`${quem}: ${nome === 'setar_arma' ? 'arma' : 'armadura'} ${item}.`, true, alvo); }
      // ---- mundo
      case 'clima': { const v = String(args[0] || '').toLowerCase(); if (v !== 'auto' && !CLIMAS.includes(v)) return fim(`Clima: ${CLIMAS.join(', ')} ou auto.`, false); desfaz(['clima', [mundo.clima || 'auto']]); mundo.clima = v === 'auto' ? null : v; salvarMundo(); todos({ t: 'mundo', mundo }); sistema(v === 'auto' ? 'O clima voltou ao normal.' : `O clima mudou: ${v}.`); return fim(`Clima: ${v}.`); }
      case 'hora': { const a = String(args[0] || '').toLowerCase(), v = num(a); if (a !== 'auto' && !(v >= 0 && v <= 23)) return fim('Hora: de 0 a 23, ou auto.', false); desfaz(['hora', [mundo.hora === null ? 'auto' : String(mundo.hora)]]); mundo.hora = a === 'auto' ? null : Math.floor(v); salvarMundo(); todos({ t: 'mundo', mundo }); return fim(`Hora do mundo: ${a === 'auto' ? 'automática' : Math.floor(v) + 'h'}.`); }
      case 'evento': { const n = limpar(args[0], 40); if (!n) return fim('Use: /evento <nome> [minutos]', false); const min = args[1] === undefined ? 30 : num(args[1]); if (!(min >= 1 && min <= 1440)) return fim('Minutos: de 1 a 1440.', false); const xp = /^xp(2|3|5|10)$/i.exec(n); mundo.evento = { nome: xp ? `EVENTO DE EXPERIÊNCIA ${xp[1]}x` : n, tipo: xp ? 'xp' : n.toLowerCase(), mult: xp ? Number(xp[1]) : 1, de: agora(), ate: agora() + min * 60e3, por: c.nome }; salvarMundo(); desfaz(['parar_evento', []]); todos({ t: 'mundo', mundo }); todos({ t: 'anuncio', texto: `O evento "${mundo.evento.nome}" começou! (${min} min)`, de: c.nome, hora: agora() }); sistema(`📢 O evento "${mundo.evento.nome}" começou e dura ${min} minutos.`); return fim(`Evento "${mundo.evento.nome}" iniciado.`); }
      case 'parar_evento': { if (!mundo.evento) return fim('Não há evento em andamento.', false); const n = mundo.evento.nome; mundo.evento = null; salvarMundo(); todos({ t: 'mundo', mundo }); sistema(`O evento "${n}" terminou.`); return fim('Evento encerrado.'); }
      case 'resetar_evento': { if (!mundo.evento) return fim('Não há evento em andamento.', false); const dur = mundo.evento.ate - mundo.evento.de; mundo.evento.de = agora(); mundo.evento.ate = agora() + dur; salvarMundo(); todos({ t: 'mundo', mundo }); return fim('Relógio do evento reiniciado.'); }
      case 'spawn_npc': case 'spawn_boss': case 'spawn_item': case 'invasao': case 'boss_mundial': {
        const idn = limpar(args[0], 48).toLowerCase(); if (!/^[a-z0-9_:.-]{2,48}$/.test(idn)) return fim(`Use: /${nome} <id>`, false);
        const q = args[1] === undefined ? (nome === 'invasao' ? 6 : 1) : num(args[1]); if (!(q >= 1 && q <= LIM.spawn)) return fim(`Quantidade: de 1 a ${LIM.spawn}.`, false);
        if (nome === 'invasao' || nome === 'boss_mundial') { todos({ t: 'efeito', e: { k: nome === 'invasao' ? 'spawn_npc' : 'spawn_boss', id: idn, n: Math.round(q), mundial: true }, de: c.nome, id: crypto.randomBytes(6).toString('hex') }); todos({ t: 'anuncio', texto: nome === 'invasao' ? `INVASÃO! ${idn} por toda parte.` : `CHEFE MUNDIAL: ${idn} despertou!`, de: c.nome, hora: agora() }); sistema(nome === 'invasao' ? `📢 Invasão de ${idn} em todos os mapas!` : `📢 O chefe mundial ${idn} despertou!`); return fim(`${nome}: ${idn} para ${logadas().length} jogadores.`); }
        efeito(cx, { k: nome, id: idn, n: Math.round(q) }, cx); return fim(`${nome}: ${idn}${q > 1 ? ' ×' + Math.round(q) : ''}.`);
      }
      case 'evento_secreto': { const zona = limpar(args[0], 40), boss = limpar(args[1], 48).toLowerCase(); if (!zona || !boss) return fim('Use: /evento_secreto <mapa_id> <boss_id>', false); mundo.secreto = { zona, boss, por: c.nome, de: agora() }; salvarMundo(); todos({ t: 'mundo', mundo }); return fim(`Evento secreto armado em ${zona}: ${boss} (sem anúncio).`); }
      case 'tp': { const x = num(args[0]), y = num(args[1]), z = args[2] === undefined ? 0 : num(args[2]); if (![x, y, z].every(Number.isFinite) || Math.abs(x) > 1e5 || Math.abs(y) > 1e5 || Math.abs(z) > 1e4) return fim('Use: /tp <x> <y> [z]', false); efeito(cx, { k: 'tp', x, y, z }, cx); return fim(`Teleporte para (${x}, ${y}, ${z}).`); }
      case 'mudar_mapa': { const zona = limpar(args[0], 40); if (!zona) return fim('Use: /mudar_mapa <mapa_id>', false); efeito(cx, { k: 'mapa', zona }, cx); return fim(`Indo para ${zona}.`); }
      case 'kill_all': efeito(cx, { k: 'kill_all' }, cx); return fim('Inimigos da área eliminados.');
      case 'limpar_inimigos': efeito(cx, { k: 'limpar_inimigos' }, cx); return fim('Inimigos da área removidos.');
      case 'dificuldade': { const v = num(args[0]); if (!(v >= LIM.dif[0] && v <= LIM.dif[1])) return fim(`Dificuldade: de ${LIM.dif[0]} a ${LIM.dif[1]}.`, false); desfaz(['dificuldade', [String(mundo.dificuldade)]]); mundo.dificuldade = v; salvarMundo(); todos({ t: 'mundo', mundo }); sistema(`A dificuldade do mundo mudou para ${v}x.`); return fim(`Dificuldade global: ${v}x.`); }
      case 'velocidade_mundo': { const v = num(args[0]); if (!(v >= LIM.velMundo[0] && v <= LIM.velMundo[1])) return fim(`Velocidade do mundo: de ${LIM.velMundo[0]} a ${LIM.velMundo[1]}.`, false); desfaz(['velocidade_mundo', [String(mundo.velocidade)]]); mundo.velocidade = v; salvarMundo(); todos({ t: 'mundo', mundo }); return fim(`Velocidade do mundo: ${v}x.`); }
      case 'congelar': mundo.congelado = !mundo.congelado; salvarMundo(); todos({ t: 'mundo', mundo }); sistema(mundo.congelado ? 'O mundo foi congelado pelo Game Master.' : 'O mundo voltou a andar.'); return fim(mundo.congelado ? 'Mundo congelado.' : 'Mundo descongelado.');
      case 'recompensa_todos': { const item = limpar(args[0], 48).toLowerCase(), q = num(args[1]); if (!/^[a-z0-9_:.-]{2,48}$/.test(item) || !(q >= 1)) return fim('Use: /recompensa_todos <item_id|money|xp> <quantidade>', false); const max = item === 'money' ? LIM.dinheiro : item === 'xp' ? LIM.xp : LIM.itens; if (q > max) return fim(`Quantidade máxima: ${max}.`, false); const e = item === 'money' ? { k: 'money', n: Math.round(q) } : item === 'xp' ? { k: 'xp', n: Math.round(q) } : { k: 'item', item, n: Math.round(q) }; for (const d of logadas()) efeito(d, e, cx); sistema(`🎁 Recompensa do Game Master para todos: ${Math.round(q)} ${item === 'money' ? 'células' : item}.`); return fim(`Recompensa enviada a ${logadas().length} jogadores.`); }
      case 'missao_especial': { const ab = num(args[0]), cel = num(args[1]), tit = limpar(args.slice(2).join(' '), 80); if (!(ab >= 1 && ab <= 500) || !(cel >= 0 && cel <= LIM.dinheiro) || !tit) return fim('Use: /missao_especial <abates 1-500> <células> <título>', false); const e = { k: 'missao', titulo: tit, abates: Math.round(ab), celulas: Math.round(cel) }; for (const d of logadas()) efeito(d, e, cx); sistema(`📜 Missão especial: ${tit} — derrote ${Math.round(ab)} inimigos (recompensa: ${Math.round(cel)} células).`); return fim('Missão especial enviada.'); }
    }
    fim('Comando ainda sem execução.', false);
  }

  // ------------------------------------------------------------ rede
  const http_ = http.createServer((req, res) => {
    if (req.url === '/saude') { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify({ ok: true, versao: VERSAO, online: logadas().length })); return; }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Eclipse Zero · servidor de chat e GM\n');
  });
  const wss = new WebSocketServer({ server: http_, maxPayload: 16 * 1024 });
  wss.on('connection', (ws, req) => {
    const origem = req.headers.origin || '';
    if (ORIGENS.length && origem && !ORIGENS.includes(origem)) { ws.close(4003, 'origem'); return; }
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const cx = { ws, ip, conta: null, estado: {}, ult: [], ultTxt: '', ultT: 0, grupo: null, invisivel: false, noclip: false, observa: null, desfazer: [], vivo: true, msgs: [] };
    conexoes.add(cx);
    mandar(cx, { t: 'ola', versao: VERSAO });
    ws.on('pong', () => { cx.vivo = true; });
    ws.on('message', (bruto) => {
      let m; try { m = JSON.parse(String(bruto)); } catch { return; }
      if (!m || typeof m.t !== 'string') return;
      const t = agora(); cx.msgs = cx.msgs.filter((x) => t - x < 1000); cx.msgs.push(t);
      if (cx.msgs.length > 30) { ws.close(4008, 'excesso'); return; }   // inundação de pacotes
      if (m.t === 'registrar' || m.t === 'entrar') {
        const L = (tentativas.get(ip) || []).filter((x) => t - x < 60e3); L.push(t); tentativas.set(ip, L);
        if (L.length > 10) return mandar(cx, { t: 'erro', txt: 'Muitas tentativas. Espere um minuto.', cod: 'limite' });
        let c = null;
        if (m.t === 'registrar') { const r = registrar(m.nome, m.senha, m.chave); if (typeof r === 'string') return mandar(cx, { t: 'erro', txt: r, cod: 'registro' }); c = r; }
        else if (m.token) { const s = sessoes[String(m.token)]; if (!s || s.ate < t || !contas[s.conta]) return mandar(cx, { t: 'erro', txt: 'Sessão expirada. Entre de novo.', cod: 'sessao' }); c = contas[s.conta]; }
        else { c = contas[String(m.nome || '').toLowerCase()]; if (!c || !crypto.timingSafeEqual(Buffer.from(hashSenha(String(m.senha || ''), c.sal), 'hex'), Buffer.from(c.hash, 'hex'))) return mandar(cx, { t: 'erro', txt: 'Nome ou senha incorretos.', cod: 'senha' }); }
        if (c.banido) return mandar(cx, { t: 'erro', txt: `Conta banida: ${c.banido.motivo}`, cod: 'banido' });
        const antiga = conexaoDe(c.chave); if (antiga && antiga !== cx) expulsar(antiga, 'Sua conta entrou em outro lugar.');
        cx.conta = c; if (!c.ignorados) c.ignorados = [];
        const token = m.token && sessoes[m.token] ? m.token : abrirSessao(c);
        mandar(cx, { t: 'sessao', nome: c.nome, papel: papelDe(c), token, guilda: c.guilda, mundo, comandos: Object.fromEntries(Object.entries(COMANDOS).filter(([, v]) => pode(c, v.p)).map(([k, v]) => [k, { a: v.a, d: v.d, cat: v.cat, destrutivo: !!v.destrutivo }])),
          historico: { global: historico.global.slice(-60), sistema: historico.sistema.slice(-30), guilda: c.guilda ? (historico.guildas[c.guilda] || []).slice(-40) : [] } });
        avisarOnline();
        return;
      }
      if (!cx.conta) return mandar(cx, { t: 'erro', txt: 'Entre na sua conta primeiro.', cod: 'entrar' });
      if (m.t === 'estado') {
        const e = m.e || {};
        cx.estado = { zona: limpar(e.zona, 40), zonaNome: limpar(e.zonaNome, 40), x: num(e.x) || 0, y: num(e.y) || 0, nivel: entre(Math.round(num(e.nivel) || 1), 1, 100), hp: Math.round(num(e.hp) || 0), hpMax: Math.round(num(e.hpMax) || 0), heroi: limpar(e.heroi, 24), celulas: Math.round(num(e.celulas) || 0) };
        if (cx.estado.nivel !== cx.nivelVisto) { cx.nivelVisto = cx.estado.nivel; avisarOnline(); }
        for (const g of logadas()) if (g.observa === cx.conta.chave) mandar(g, { t: 'observado', nome: cx.conta.nome, estado: cx.estado });
      } else if (m.t === 'chat') {
        const txt = limpar(m.texto, 400);
        if (txt.startsWith('/')) comando(cx, txt, m.id); else chat(cx, m);
      } else if (m.t === 'cmd') comando(cx, m.texto, m.id);
      else if (m.t === 'sair') { for (const tk in sessoes) if (tk === m.token) delete sessoes[tk]; salvarSessoes(); ws.close(1000, 'saiu'); }
    });
    ws.on('close', () => { conexoes.delete(cx); if (cx.conta) { if (cx.grupo) sairGrupo(cx); avisarOnline(); } });
    ws.on('error', () => {});
  });
  // conexões mortas saem; evento que acabou é encerrado
  const pulso = setInterval(() => {
    for (const cx of conexoes) { if (!cx.vivo) { try { cx.ws.terminate(); } catch { /* nada */ } continue; } cx.vivo = false; try { cx.ws.ping(); } catch { /* nada */ } }
    if (mundo.evento && mundo.evento.ate < agora()) { const n = mundo.evento.nome; mundo.evento = null; salvarMundo(); todos({ t: 'mundo', mundo }); sistema(`O evento "${n}" terminou.`); }
  }, 20000);
  return new Promise((ok) => http_.listen(PORTA, () => {
    const porta = http_.address().port;
    if (!op.quieto) console.log(`Eclipse Zero · servidor de chat e GM na porta ${porta}${OWNER ? ` · dono: ${OWNER}` : ' · sem dono definido (EZ_OWNER)'}`);
    ok({ porta, fechar: () => new Promise((f) => { clearInterval(pulso); for (const [, t] of pend) clearTimeout(t); for (const cx of conexoes) { try { cx.ws.terminate(); } catch { /* nada */ } } wss.close(() => http_.close(() => f())); }), COMANDOS, contas, mundo });
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) iniciar();
