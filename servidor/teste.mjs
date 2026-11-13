// ECLIPSE ZERO · Testes do servidor de chat e GM (node servidor/teste.mjs)
// Sobe o servidor numa pasta temporária e conversa com ele por WebSocket como quatro contas
// (dono, GM, moderador e jogador): chat entre clientes, permissões, comandos, limites,
// confirmação, desfazer, registro e persistência.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { iniciar } from './servidor.mjs';

const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-srv-'));
let S = await iniciar({ porta: 0, dados, owner: 'Dono', ownerChave: 'chave-do-dono', quieto: true });
let ok = 0, falhas = 0;
const teste = (nome, cond, info = '') => { if (cond) ok++; else { falhas++; console.log(`  FALHOU ${nome} ${info}`); } };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function cliente() {
  const ws = new WebSocket(`ws://127.0.0.1:${S.porta}`), fila = [];
  const c = { ws, fila, sessao: null,
    manda: (o) => ws.send(JSON.stringify(o)),
    // espera a próxima mensagem que passa no filtro (e tira da fila)
    ate: async (f, ms = 1500) => { const t0 = Date.now(); for (;;) { const i = fila.findIndex(f); if (i >= 0) return fila.splice(i, 1)[0]; if (Date.now() - t0 > ms) return null; await espera(15); } },
    cmd: async (texto) => { c.manda({ t: 'cmd', texto, id: Math.random().toString(36).slice(2) }); return c.ate((m) => m.t === 'resposta'); },
    limpa: () => { fila.length = 0; } };
  ws.on('message', (b) => fila.push(JSON.parse(String(b))));
  return new Promise((r) => ws.on('open', () => r(c)));
}
async function conta(nome, senha, chave) {
  const c = await cliente();
  c.manda({ t: 'registrar', nome, senha, chave });
  const m = await c.ate((x) => x.t === 'sessao' || x.t === 'erro');
  c.sessao = m && m.t === 'sessao' ? m : null; c.erro = m && m.t === 'erro' ? m : null;
  return c;
}

// ---- contas e papéis
const falso = await conta('Dono', 'senha123');
teste('nome do dono é reservado sem a chave', !falso.sessao && falso.erro && /reservado/.test(falso.erro.txt));
const dono = await conta('Dono', 'senha123', 'chave-do-dono');
teste('dono entra com a chave e é OWNER', dono.sessao && dono.sessao.papel === 'owner');
const gm = await conta('Mestre', 'senha123'), mod = await conta('Vigia', 'senha123'), jog = await conta('Renan', 'senha123'), jog2 = await conta('Lyra', 'senha123');
teste('conta nova é jogador', jog.sessao && jog.sessao.papel === 'jogador' && Object.keys(jog.sessao.comandos).length === 1 && !!jog.sessao.comandos.online);
teste('senha curta é recusada', !(await conta('Curto', '123')).sessao);
teste('nome repetido é recusado', !(await conta('renan', 'senha123')).sessao);
let r = await dono.cmd('/promover Mestre gm'); teste('dono promove a GM', r.ok, r.txt);
r = await dono.cmd('/promover Vigia moderador'); teste('dono promove a moderador', r.ok);
r = await dono.cmd('/promover Renan owner'); teste('ninguém vira OWNER por comando', !r.ok);
r = await gm.cmd('/promover Renan gm'); teste('GM não promove', !r.ok && /permissão/.test(r.txt));
teste('promovido recebe o papel novo na hora', !!(await gm.ate((m) => m.t === 'papel' && m.papel === 'gm', 600)));
for (const c of [dono, gm, mod, jog, jog2]) c.manda({ t: 'estado', e: { zona: 'aurora', zonaNome: 'Refúgio da Aurora', x: 100, y: 200, nivel: 7, hp: 90, hpMax: 100 } });
await espera(80);

// ---- chat
for (const c of [dono, gm, mod, jog, jog2]) c.limpa();
jog.manda({ t: 'chat', canal: 'global', texto: 'Olá a todos!' });
const g1 = await jog2.ate((m) => m.t === 'chat' && m.canal === 'global');
teste('mensagem global chega aos outros com nome, nível e hora', g1 && g1.de === 'Renan' && g1.texto === 'Olá a todos!' && g1.nivel === 7 && g1.hora > 0);
jog.manda({ t: 'chat', canal: 'privado', para: 'Lyra', texto: 'só para você' });
teste('privado chega só ao destinatário', !!(await jog2.ate((m) => m.t === 'chat' && m.canal === 'privado')) && !(await gm.ate((m) => m.t === 'chat' && m.canal === 'privado', 200)));
jog.manda({ t: 'chat', canal: 'global', texto: 'que merda de dia' });
const g2 = await jog2.ate((m) => m.t === 'chat' && m.canal === 'global');
teste('filtro de palavras', g2 && !/merda/.test(g2.texto) && /\*{5}/.test(g2.texto), g2 && g2.texto);
jog.manda({ t: 'chat', canal: 'sistema', texto: 'x' });
teste('canal Sistema é só de leitura', !!(await jog.ate((m) => m.t === 'erro')));
for (let i = 0; i < 7; i++) jog.manda({ t: 'chat', canal: 'global', texto: 'spam ' + i });
teste('anti-spam segura a rajada', !!(await jog.ate((m) => m.t === 'erro' && /Devagar/.test(m.txt))));
await espera(100); for (const c of [dono, gm, mod, jog, jog2]) c.limpa();
// grupo e guilda
r = await jog.cmd('/grupo criar'); teste('grupo: criar', r.ok);
r = await jog.cmd('/grupo convidar Lyra'); teste('grupo: convidar', r.ok);
jog2.manda({ t: 'cmd', texto: '/grupo aceitar' }); await espera(80);
jog2.limpa(); gm.limpa();
jog2.manda({ t: 'chat', canal: 'grupo', texto: 'no grupo' });
teste('grupo: a mensagem fica no grupo', !!(await jog.ate((m) => m.t === 'chat' && m.canal === 'grupo' && m.texto === 'no grupo')) && !(await gm.ate((m) => m.t === 'chat' && m.canal === 'grupo', 200)));
r = await jog2.cmd('/guilda criar Aurora Livre'); teste('guilda: criar', r.ok, r && r.txt);

// ---- permissões e comandos
r = await jog.cmd('/god'); teste('jogador não usa comando de GM', !r.ok && /permissão/.test(r.txt));
r = await jog.cmd('/dar_money Renan 999'); teste('jogador não dá dinheiro a si mesmo', !r.ok);
r = await mod.cmd('/dar_item Renan couro 5'); teste('moderador não mexe em itens', !r.ok);
r = await mod.cmd('/mute Renan 5'); teste('moderador silencia', r.ok);
jog.limpa(); await espera(4100);
jog.manda({ t: 'chat', canal: 'global', texto: 'posso falar?' });
teste('silenciado não fala', !!(await jog.ate((m) => m.t === 'erro' && /silenciado/.test(m.txt))));
r = await mod.cmd('/desfazer'); teste('desfazer devolve a fala', r.ok, r.txt);
jog.limpa();
r = await gm.cmd('/level Renan 50'); const e1 = await jog.ate((m) => m.t === 'efeito');
teste('level: o efeito chega ao alvo, vindo do servidor', r.ok && e1 && e1.e.k === 'level' && e1.e.n === 50 && e1.de === 'Mestre');
r = await gm.cmd('/level Renan 500'); teste('level fora do limite é recusado', !r.ok);
r = await gm.cmd('/dar_item Renan couro 5'); const e2 = await jog.ate((m) => m.t === 'efeito');
teste('dar_item', r.ok && e2 && e2.e.k === 'item' && e2.e.item === 'couro' && e2.e.n === 5);
r = await gm.cmd('/dar_item Renan couro 5000'); teste('quantidade acima do limite é recusada', !r.ok);
r = await gm.cmd('/dar_money Renan 300'); await jog.ate((m) => m.t === 'efeito');
r = await gm.cmd('/desfazer'); const e3 = await jog.ate((m) => m.t === 'efeito');
teste('desfazer dar_money tira o mesmo valor', r.ok && e3 && e3.e.k === 'money' && e3.e.n === -300);
r = await gm.cmd('/heal'); const e4 = await gm.ate((m) => m.t === 'efeito');
teste('sem jogador, o comando vale para quem digitou', r.ok && e4 && e4.e.k === 'heal');
r = await gm.cmd('/god Dono'); teste('GM não age sobre o dono', !r.ok);
r = await gm.cmd('/teleportar Renan Lyra'); const e5 = await jog.ate((m) => m.t === 'efeito');
teste('teleportar até outro jogador leva ao mapa e à posição dele', r.ok && e5 && e5.e.k === 'mapa' && e5.e.zona === 'aurora' && e5.e.x === 100);
// mundo
for (const c of [jog, jog2]) c.limpa();
r = await gm.cmd('/clima tempestade'); const m1 = await jog2.ate((m) => m.t === 'mundo');
teste('clima muda para todos', r.ok && m1 && m1.mundo.clima === 'tempestade');
r = await gm.cmd('/clima granizo'); teste('clima inválido é recusado', !r.ok);
r = await gm.cmd('/hora 22'); const m2 = await jog.ate((m) => m.t === 'mundo' && m.mundo.hora === 22); teste('hora do mundo', r.ok && !!m2);
r = await gm.cmd('/evento xp3 45'); const m3 = await jog.ate((m) => m.t === 'mundo' && m.mundo.evento);
teste('evento global de XP com anúncio', r.ok && m3 && m3.mundo.evento.mult === 3 && !!(await jog.ate((m) => m.t === 'anuncio')));
r = await gm.cmd('/parar_evento'); teste('parar evento', r.ok);
r = await gm.cmd('/spawn_boss zumbi_zero'); const e6 = await gm.ate((m) => m.t === 'efeito' && m.e.k === 'spawn_boss'); teste('spawn_boss vai para a área do GM', r.ok && !!e6);
jog.limpa();
r = await gm.cmd('/invasao zumbi 8'); const e7 = await jog.ate((m) => m.t === 'efeito' && m.e.k === 'spawn_npc');
teste('invasão chega a todos', r.ok && e7 && e7.e.n === 8 && e7.e.mundial);
r = await gm.cmd('/recompensa_todos money 100'); teste('recompensa para todos', r.ok && !!(await jog2.ate((m) => m.t === 'efeito' && m.e.k === 'money' && m.e.n === 100)));
r = await gm.cmd('/congelar'); teste('congelar o mundo', r.ok && !!(await jog.ate((m) => m.t === 'mundo' && m.mundo.congelado))); await gm.cmd('/congelar');
r = await gm.cmd('/dificuldade 9'); teste('dificuldade fora do limite', !r.ok);
r = await mod.cmd('/info Renan'); teste('info do jogador', r.ok && /Renan/.test(r.txt) && /nível 7/.test(r.txt), r.txt);
r = await mod.cmd('/localizar Renan'); teste('localizar', r.ok && /Refúgio da Aurora/.test(r.txt));
r = await jog.cmd('/online'); teste('jogador vê quem está online', r.ok && /Lyra/.test(r.txt));
r = await gm.cmd('/invisivel'); r = await jog.cmd('/online'); teste('GM invisível some da lista dos jogadores', r.ok && !/Mestre/.test(r.txt));
r = await mod.cmd('/online'); teste('…mas a equipe continua vendo', /Mestre/.test(r.txt));
r = await mod.cmd('/observar Renan'); jog.manda({ t: 'estado', e: { zona: 'cm_praca', zonaNome: 'Praça', x: 5, y: 6, nivel: 8, hp: 50, hpMax: 100 } });
teste('observar recebe o estado do jogador ao vivo', r.ok && !!(await mod.ate((m) => m.t === 'observado' && m.estado.zona === 'cm_praca')));
// destrutivos pedem confirmação
r = await gm.cmd('/ban Lyra ofensas'); teste('ban pede confirmação', r.ok && !!r.confirmar);
teste('sem confirmar, nada acontece', !S.contas.lyra.banido);
const r2 = await gm.cmd('/confirmar ' + r.confirmar); teste('confirmado, bane e derruba a conexão', r2.ok && !!S.contas.lyra.banido && !!(await jog2.ate((m) => m.t === 'sair')));
const volta = await cliente(); volta.manda({ t: 'entrar', nome: 'Lyra', senha: 'senha123' });
teste('banido não entra', !!(await volta.ate((m) => m.t === 'erro' && m.cod === 'banido')));
r = await mod.cmd('/kick Renan teste'); teste('kick derruba o jogador', r.ok && !!(await jog.ate((m) => m.t === 'sair')));
// comando repetido (mesmo id) não roda duas vezes
gm.limpa(); gm.manda({ t: 'cmd', texto: '/aviso uma vez', id: 'igual' }); gm.manda({ t: 'cmd', texto: '/aviso uma vez', id: 'igual' }); await espera(200);
teste('o mesmo comando (mesmo id) roda uma vez só', gm.fila.filter((m) => m.t === 'resposta').length === 1);
// conta falsa não vira GM mandando campos a mais
const esperto = await cliente(); esperto.manda({ t: 'registrar', nome: 'Esperto', senha: 'senha123', papel: 'owner', gm: true }); const se = await esperto.ate((m) => m.t === 'sessao');
teste('o cliente não escolhe o próprio papel', se && se.papel === 'jogador');
esperto.manda({ t: 'efeito', e: { k: 'money', n: 9999 } }); esperto.manda({ t: 'cmd', texto: '/anunciar sou gm' });
teste('…nem emite efeitos ou anúncios', !!(await esperto.ate((m) => m.t === 'resposta' && !m.ok)) && !(await dono.ate((m) => m.t === 'anuncio' && /sou gm/.test(m.texto), 200)));
// registro e persistência
await espera(400);
const log = fs.readFileSync(path.join(dados, 'log_gm.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
teste('registro com GM, comando, alvo, data e resultado', log.length > 15 && log.some((l) => l.gm === 'Mestre' && /\/level Renan 50/.test(l.comando) && l.alvo === 'Renan' && l.ok && l.quando > 0));
teste('tentativas negadas também ficam no registro', log.some((l) => !l.ok && /permissão/.test(l.resultado)));
const tokenDono = dono.sessao.token;
await S.fechar();
S = await iniciar({ porta: 0, dados, owner: 'Dono', ownerChave: 'chave-do-dono', quieto: true });
const d2 = await cliente(); d2.manda({ t: 'entrar', token: tokenDono }); const s2 = await d2.ate((m) => m.t === 'sessao' || m.t === 'erro');
teste('depois de reiniciar: sessão, papel, histórico e mundo continuam', s2 && s2.t === 'sessao' && s2.papel === 'owner' && s2.historico.global.some((m) => m.texto === 'Olá a todos!') && s2.mundo.clima === 'tempestade' && S.contas.mestre.papel === 'gm' && !!S.contas.lyra.banido);
await S.fechar();
fs.rmSync(dados, { recursive: true, force: true });
console.log(`SERVIDOR: ${ok}/${ok + falhas} ok, ${falhas} falhas`);
process.exit(falhas ? 1 : 0);
