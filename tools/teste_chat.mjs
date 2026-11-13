// ECLIPSE ZERO · Teste do chat e do painel do GM no navegador (ferramenta de desenvolvimento)
// Sobe o servidor de chat numa pasta temporária, abre o jogo em DOIS navegadores sem tela (o dono e
// um jogador), cria as contas pela janela do chat, troca mensagens, usa comandos do GM e confere que
// o efeito chegou ao jogo do outro. Grava capturas em <pasta>.  Uso: node tools/teste_chat.mjs [pasta]
import http from 'node:http'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
import { iniciar } from '../servidor/servidor.mjs';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), saida = process.argv[2] || path.join(raiz, '.capturas');
let chromium; try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
fs.mkdirSync(saida, { recursive: true });
const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-chat-'));
const S = await iniciar({ porta: 0, dados, owner: 'Dono', ownerChave: 'chave', quieto: true });
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(raiz, p);
  if (!f.startsWith(raiz + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const nav = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let ok = 0, falhas = 0; const erros = [];
const ate = async (pg, fn, arg, ms = 60000) => { const t0 = Date.now(); for (;;) { if (await pg.evaluate(fn, arg)) return true; if (Date.now() - t0 > ms) throw new Error('espera esgotada: ' + fn); await new Promise((r) => setTimeout(r, 300)); } };
const teste = (n, c, i = '') => { if (c) ok++; else { falhas++; console.log('  FALHOU', n, i); } };
async function jogador(nome, chave) {
  const pg = await nav.newPage({ viewport: { width: 1280, height: 720 } });
  pg.on('pageerror', (e) => erros.push(`${nome}: ${e.message}`));
  await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?servidor=ws://127.0.0.1:${S.porta}`);
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => { const g = game; g.slot = 2; g.saveGame = () => {}; World.save = () => {}; World.start(); g.state = 'playing'; World.loadZone('aurora', null); g.fade = g.fadeTarget = 0; g.hud.msg = null; });
  await pg.evaluate(([n, c]) => { Chat.abrir(true); Rede.entrar(n, 'senha123', true, c); }, [nome, chave]);
  await ate(pg, () => Rede.estado === 'dentro');
  return pg;
}
const dono = await jogador('Dono', 'chave'), renan = await jogador('Renan');
teste('as duas contas entram pela janela do chat', await dono.evaluate(() => Rede.sessao.papel) === 'owner' && await renan.evaluate(() => Rede.sessao.papel) === 'jogador');
teste('o painel do GM só existe para a equipe', await dono.evaluate(() => PainelGM.btn && PainelGM.btn.style.display !== 'none') && await renan.evaluate(() => !PainelGM.btn || PainelGM.btn.style.display === 'none'));
await renan.evaluate(() => { Chat.el.inp.value = 'Olá a todos! 👋'; Chat.enviar(); });
await ate(dono, () => Chat.msgs.global.some((m) => m.texto === 'Olá a todos! 👋'));
teste('a mensagem de um chega ao outro em tempo real', true);
await renan.waitForTimeout(3600);   // (o estado do personagem sobe a cada 3 s)
teste('o servidor conhece o nível e o mapa de cada um', await dono.evaluate(() => Rede.online.some((j) => j.nome === 'Renan' && /Aurora/.test(j.zona))));
const c0 = await renan.evaluate(() => game.stats.soulsBank), n0 = await renan.evaluate(() => game.activeProgress().level);
await dono.evaluate(() => { PainelGM.abrir(true); PainelGM.executar('/dar_money Renan 250'); PainelGM.executar('/level Renan 12'); PainelGM.executar('/dar_item Renan couro 3'); PainelGM.executar('/clima tempestade'); PainelGM.executar('/hora 22'); PainelGM.executar('/evento xp3 30'); PainelGM.executar('/anunciar Bem-vindos ao Eclipse ZERO!'); });
await ate(renan, (c) => game.stats.soulsBank === c + 250, c0);
teste('dar_money: as células aparecem no jogo do alvo', true);
teste('level: o nível do alvo muda de verdade', await renan.evaluate(() => game.activeProgress().level) === 12, `era ${n0}`);
teste('dar_item: o material entra na bolsa do alvo', await renan.evaluate(() => Oficios.mat('couro')) >= 3);
await ate(renan, () => WorldTime.clima() === 'tempestade' && Math.floor(WorldTime.hora()) === 22);
teste('clima e hora do mundo mudam para todos', true);
teste('evento de XP do servidor vale no ganho de experiência', await renan.evaluate(() => Guardiao.xpMult()) === 3);
teste('anúncio do GM aparece no chat de todos', await renan.evaluate(() => Chat.msgs.global.some((m) => m.anuncio && /Bem-vindos/.test(m.texto))));
await renan.evaluate(() => { Rede.comando('/god'); Rede.comando('/dar_money Renan 99999'); });
await renan.waitForTimeout(600);
teste('jogador comum não consegue usar comando de GM', await renan.evaluate((c) => game.stats.soulsBank === c + 250 && !GMFx.god, c0));
await renan.evaluate(() => { GMFx.aplicar = GMFx.aplicar; Rede.sessao.papel = 'owner'; Rede.comando('/anunciar virei dono'); });   // adulterar o cliente não muda o servidor
await renan.waitForTimeout(500);
teste('mudar o papel no navegador não dá poder nenhum', !(await dono.evaluate(() => Chat.msgs.global.some((m) => /virei dono/.test(m.texto)))));
await dono.evaluate(() => { PainelGM.executar('/god'); PainelGM.executar('/noclip'); PainelGM.executar('/spawn_npc zumbi 3'); });
await ate(dono, () => GMFx.god && GMFx.noclip);
teste('god e noclip ligam no jogo do GM', await dono.evaluate(() => { const p = game.player, h = p.hp; game.state = 'playing'; p.invuln = 0; p.takeDamage(50, p.x + 10, p.y); return p.hp === h; }));
await dono.evaluate(() => { PainelGM.cat = 'deus'; PainelGM.atualizar(); game.hud.msg = null; });
await renan.evaluate(() => { Chat.trocar('global'); game.hud.msg = null; });
await dono.waitForTimeout(800);
console.log(`CHAT NO NAVEGADOR: ${ok}/${ok + falhas} ok, ${falhas} falhas`); if (erros.length) console.log('erros de página:', [...new Set(erros)].slice(0, 5));
// capturas (uma página por vez: dois jogos desenhando juntos, sem placa de vídeo, estouram o prazo)
try {
  await dono.screenshot({ path: path.join(saida, 'chat_gm_dono.png'), timeout: 240000 }); await dono.close();
  await renan.screenshot({ path: path.join(saida, 'chat_jogador.png'), timeout: 120000 });
  await renan.setViewportSize({ width: 390, height: 780 }); await renan.waitForTimeout(800); await renan.screenshot({ path: path.join(saida, 'chat_celular.png'), timeout: 120000 });
} catch (e) { console.log('captura não saiu:', e.message.split('\n')[0]); }
await nav.close(); srv.close(); await S.fechar(); fs.rmSync(dados, { recursive: true, force: true });
process.exit(falhas || erros.length ? 1 : 0);
