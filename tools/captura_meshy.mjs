// ECLIPSE ZERO · Capturas do lote de teste do Meshy (docs/topologia/LOTE_MESHY.md): a pilha de caixotes,
// a variação da espada do Kael e um personagem criado com o Cabelo 1, renderizados pelo motor do jogo.
// Uso (na pasta do projeto, com o Playwright): node tools/captura_meshy.mjs saida.png
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const saida = process.argv[2] || 'captura_meshy.png';
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(raiz, p);
  if (!f.startsWith(raiz + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const nav = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await nav.newPage({ viewport: { width: 1280, height: 720 } });
pg.on('pageerror', (e) => console.log('erro na página:', e.message));
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html`);
await pg.waitForFunction(() => typeof game !== 'undefined' && typeof R3D !== 'undefined' && R3D.active, null, { timeout: 120000 });
const fotos = await pg.evaluate(async () => {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const carregar = (ids) => new Promise((res) => { let n = ids.length; for (const id of ids) Criacao3D.carregar(id, () => { if (--n === 0) res(); }); setTimeout(res, 30000); });
  const o = (yaw) => ({ yaw, scale: 1, lift: 0, roll: 0, pitch: 0, flash: 0, emi: 1, holo: false, ghost: null, tint: null });
  const tira = async (model, yaw, esc) => { for (let i = 0; i < 100; i++) { const f = R3D.foto(model, o(yaw), esc); if (f) return f.canvas.toDataURL(); await espera(20); } return null; };
  const out = {};
  Cenario.preparar && Cenario.preparar();
  out.caixotes = await tira(game.model3('cen_caixotes'), 0.6, 3);
  // personagem criado com o Cabelo 1 (o remesh do Meshy)
  const r = Perfis.criar('Teste Meshy', 'guerreiro', Object.assign(persAparenciaPadrao('guerreiro'), { corpoG: 0, rostoG: 0, cabeloG: 1, barbaG: 0 }), null, {});
  const def = CHARACTERS_BY_ID[r.perfil.id];
  await carregar(['corpo_m', 'rosto_1', 'cabelo_1']);
  MODELS3D[def.model].model = null;
  const M = game.model3(def.model);
  for (let i = 0; i < 100 && !Criacao3D.pintado(M); i++) await espera(50);
  out.cabeloId = M && M.cria && M.cria.ids.cabelo;
  out.heroi = await tira(M, 0.5, 4);
  out.heroiCostas = await tira(M, 0.5 + Math.PI, 4);
  Perfis.apagar && Perfis.apagar(r.perfil.id);
  return out;
});
console.log('cabelo montado:', fotos.cabeloId);
// junta as fotos lado a lado
const html = `<body style="margin:0;background:#2a2d33;display:flex;gap:16px;align-items:flex-end;padding:16px;font:14px sans-serif;color:#ddd">` +
  ['caixotes', 'heroi', 'heroiCostas'].map((k) => fotos[k] ? `<figure style="margin:0;text-align:center"><img src="${fotos[k]}" style="max-height:640px"><figcaption>${k}</figcaption></figure>` : `<p>${k}: sem foto</p>`).join('') + '</body>';
const p2 = await nav.newPage({ viewport: { width: 1400, height: 720 }, deviceScaleFactor: 2 });
await p2.setContent(html);
await p2.screenshot({ path: saida, fullPage: true });
await nav.close(); srv.close();
console.log('gravado', saida);
