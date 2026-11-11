// ECLIPSE ZERO · Captura e sonda das zonas do mundo aberto (ferramenta de desenvolvimento)
// ---------------------------------------------------------------------------
// Serve o repositório, abre o jogo num Chromium sem tela, entra no mundo aberto e, para cada cena
// pedida, carrega a zona, põe o herói (e a câmera) no lugar e grava a captura. Também lista as
// estruturas que a zona pediu e as que de fato foram postas (para achar peça que ficou de fora).
//
// Uso: node tools/captura_zona.mjs <pasta_de_saida> '<json com as cenas>'
//   cena: { nome, zona, estr? (id da estrutura a centralizar), fx?, fy? (fração da sala), dx?, dy?,
//           tp? (3ª pessoa), yaw?, dist?, pitch?, limpo? (céu limpo, 11h), espera? (ms), js? (código
//           a rodar na página antes da captura; o valor devolvido sai no relatório) }
//   sem cenas: só a sonda de todas as zonas com estruturas.
// ---------------------------------------------------------------------------
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const saida = process.argv[2] || path.join(raiz, '.capturas');
const cenas = JSON.parse(process.argv[3] || '[]');
fs.mkdirSync(saida, { recursive: true });

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(raiz, p);
  if (!f.startsWith(raiz + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const nav = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const pg = await nav.newPage({ viewport: { width: 1280, height: 720 } });
const erros = [];
pg.on('pageerror', (e) => erros.push(e.message));
pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erros.push('console: ' + m.text().slice(0, 200)); });
pg.setDefaultTimeout(90000);
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html`);
await pg.waitForTimeout(2500);

const entrar = () => { const g = game; if (!g.world) { g.slot = 2; g.saveGame = () => {}; World.save = () => {}; World.start(); } g.state = 'playing'; };

if (!cenas.length) {
  const zonas = await pg.evaluate(() => Object.keys(Estruturas.ZONAS));
  let fora = 0, postas = 0;
  for (const z of zonas) {
    const r = await pg.evaluate(async ([z, entrar]) => {
      new Function('return ' + entrar)()();
      World.loadZone(z, null);
      await new Promise((ok) => setTimeout(ok, 700));
      const A = Estruturas.atual(), pedidos = (Estruturas.ZONAS[z] || []).map((q) => q[0]);
      return { postas: A ? A.lug.length : 0, fora: pedidos.filter((id) => !A || !A.lug.some((q) => q.id === id)), semModelo: pedidos.filter((id) => !Estruturas.IDX[id]) };
    }, [z, entrar.toString()]);
    postas += r.postas; fora += r.fora.length;
    if (r.fora.length) console.log(z, 'FORA', JSON.stringify(r.fora), r.semModelo.length ? 'sem modelo ' + JSON.stringify(r.semModelo) : '');
  }
  console.log(`sonda: ${zonas.length} zonas, ${postas} estruturas postas, ${fora} de fora`);
}
for (const c of cenas) {
  const info = await pg.evaluate(async ([c, entrar]) => {
    new Function('return ' + entrar)()();
    const g = game;
    World.loadZone(c.zona, null);
    const p = g.player;
    let alvo = null;
    if (c.estr) {
      await new Promise((r) => setTimeout(r, 4000));
      const q = g.npcs.find((n) => n.estrutura === c.estr || n.cenId === c.estr || (n.data && n.data.rar === c.estr)) || {};
      alvo = q.x ? [Math.round(q.x), Math.round(q.y), +(q.facing || 0).toFixed(2), Math.round(g.room.w), Math.round(g.room.h)] : null;
      p.x = (q.x || g.room.w / 2) + (c.dx || 0); p.y = (q.y || g.room.h / 2) + (c.dy || 0);
    } else if (c.fx !== undefined) { p.x = g.room.w * c.fx + (c.dx || 0); p.y = g.room.h * c.fy + (c.dy || 0); }
    if (c.limpo && typeof WorldTime !== 'undefined') {
      WorldTime.clima = () => 'limpo'; const L0 = WORLD_CLIMAS.limpo; WorldTime.C = () => L0;
      if (typeof Clima !== 'undefined' && Clima.neblina) Clima.neblina = () => 0;
      if (WorldTime.S) { WorldTime.S.clima = null; if (WorldTime.S.hora !== undefined) WorldTime.S.hora = c.hora === undefined ? 11 : c.hora; }
    }
    g.fade = g.fadeTarget = 0;
    if (typeof ThirdView !== 'undefined') { ThirdView.set(!!c.tp, true); if (c.tp) { ThirdView.yaw = c.yaw || 0.8; ThirdView.dist = c.dist || 260; ThirdView.pitch = c.pitch || 0.45; } }
    let ret = null;
    if (c.js) ret = await new Function('c', `return (async () => { ${c.js} })()`)(c);
    await new Promise((r) => setTimeout(r, c.espera || 2500));
    g.fade = 0;
    return { alvo, ret };
  }, [c, entrar.toString()]);
  await pg.waitForTimeout(400);
  console.log('cena', c.nome, JSON.stringify(info));
  await pg.screenshot({ path: path.join(saida, c.nome + '.png') });
}
console.log('erros', JSON.stringify(erros.slice(0, 5)));
await nav.close();
srv.close();
