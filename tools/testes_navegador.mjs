// ECLIPSE ZERO · Roda a suíte do jogo (index.html?testes=1) num Chromium sem janela
// ---------------------------------------------------------------------------
// Sobe um servidor estático da pasta do projeto (os testes conferem os .glb por http), abre o
// jogo com ?testes=1, espera window.__testes e imprime o resultado. Sai com código 1 se algum
// teste falhar, se a página lançar exceção ou se o resultado não vier a tempo. O WebGL do
// motor roda no SwiftShader (software), como num servidor sem placa de vídeo.
// Uso (na pasta do projeto, com o Playwright instalado: npm install --no-save playwright):
//   node tools/testes_navegador.mjs [--imagem testes.png] [--espera 600]
// CHROMIUM=/caminho/do/chrome usa outro executável do Chromium.
// É o que o workflow .github/workflows/testes.yml roda a cada push.
// ---------------------------------------------------------------------------
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (nome, padrao) => { const i = process.argv.indexOf(nome); return i > 0 ? process.argv[i + 1] : padrao; };
const imagem = arg('--imagem', null), espera = +arg('--espera', 600);
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };

// Servidor estático só de leitura, preso à pasta do projeto
const servidor = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); res.end(); return; }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(raiz, p);
  if (!f.startsWith(raiz + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Content-Length': fs.statSync(f).size });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(f).pipe(res);
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${servidor.address().port}/index.html?testes=1`;

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 720 } });
const excecoes = [];
pagina.on('pageerror', (e) => excecoes.push(`${e.message} ${(e.stack || '').split('\n')[1] || ''}`.trim()));
pagina.on('console', (m) => { if (m.type() === 'error') console.log(`[console] ${m.text()}`); });

let r = null, codigo = 0;
try {
  await pagina.goto(url);
  const t0 = Date.now();
  while (!r && Date.now() - t0 < espera * 1000) {
    await pagina.waitForTimeout(1000);
    r = await pagina.evaluate(() => window.__testes || null);
  }
  if (!r) { console.log(`Sem resultado da suíte em ${espera} s`); codigo = 1; }
  else {
    console.log(`TESTES: ${r.ok}/${r.total} ok, ${r.falhas} falhas`);
    for (const t of r.lista) if (!t.ok) console.log(`  FALHOU ${t.nome}${t.info ? ` — ${t.info}` : ''}`);
    if (r.falhas || !r.total) codigo = 1;
  }
  if (excecoes.length) { console.log(`Exceções na página (${excecoes.length}):\n  ${[...new Set(excecoes)].join('\n  ')}`); codigo = 1; }
  if (imagem) await pagina.screenshot({ path: imagem });
} catch (e) {
  console.log(`Erro ao rodar a suíte: ${e.message}`); codigo = 1;
} finally {
  await navegador.close();
  servidor.close();
}
process.exit(codigo);
