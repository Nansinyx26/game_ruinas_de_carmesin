// ECLIPSE ZERO · Extrai as falas dos moradores do jogo para a dublagem (ferramenta de desenvolvimento)
// ---------------------------------------------------------------------------
// Abre o jogo num Chromium sem tela e grava em tools/dublagem/falas.json tudo o que cada morador
// diz na conversa (cumprimentos, respostas dos assuntos e rumores), como está no jogo de verdade.
// É a entrada de tools/dublagem/gerar_falas.py.  Uso: node tools/dublagem/extrair_falas.mjs
// ---------------------------------------------------------------------------
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), saida = process.argv[2] || path.join(raiz, 'tools', 'dublagem', 'falas.json');
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(raiz, p);
  if (!f.startsWith(raiz + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { r.writeHead(404); r.end(); return; } r.writeHead(200); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const nav = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await nav.newPage(); await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await pg.waitForTimeout(2500);
const d = await pg.evaluate(() => ({
  povo: WORLD_POVO.map((P) => ({ id: P.id, nome: P.nome || P.chave, zona: P.zona, papel: P.papel, pers: P.personalidade, ola: P.ola || [], temas: (P.temas || []).map((t) => t[1]), rumores: (P.rumores || []).map((r) => (r && r.txt) || r) })),
}));
fs.writeFileSync(saida, JSON.stringify(d, null, 1) + '\n'); await nav.close(); srv.close();
console.log(`${d.povo.length} moradores, ${d.povo.reduce((n, P) => n + P.ola.length + P.temas.length + P.rumores.length, 0)} falas → ${path.relative(raiz, saida)}`);
