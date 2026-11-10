// ECLIPSE ZERO · Validação do encaixe das barbas e bigodes em todos os rostos (js/criacao/barba_encaixe.js)
// ---------------------------------------------------------------------------
// Monta o personagem (estilo Realista) com cada barba e cada bigode, em cada um dos 8 rostos, nos dois
// corpos, e ainda com os formatos de rosto extremos (fino, largo, queixo saliente, queixo recuado,
// mandíbula larga); lê o relatório do encaixe (C.encaixeBarba: atravessamentos, vãos, olhos, nariz,
// tentativas) e grava docs/barbas_validacao.json e docs/BARBAS_VALIDACAO.md. Uma barba só fica
// aprovada para um rosto quando passa em todos os critérios.
// Uso (na pasta do projeto, com o Playwright): node tools/validar_barbas.mjs
// ---------------------------------------------------------------------------
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let chromium;
try { ({ chromium } = await import('playwright')); } catch (e) { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(raiz, p); if (!f.startsWith(raiz) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await nav.newPage(); pg.setDefaultTimeout(3600000);
const erros = []; pg.on('pageerror', (e) => erros.push(e.message));
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await pg.waitForTimeout(2500);
const t0 = Date.now();
const res = await pg.evaluate(async () => {
  const g = game, esp = (ms) => new Promise((r) => setTimeout(r, ms)); g.slot = 2; g.startRun(); g.saveGame = () => {};
  const FORMAS = { fino: { rLargura: 0, rMandibula: 0 }, largo: { rLargura: 4, rMandibula: 4 }, queixoSaliente: { rQueixo: 4 }, queixoRecuado: { rQueixo: 0 }, bocaLarga: { rBoca: 4, rNariz: 4 } };
  const casos = [];
  const barbas = Criacao3D.BARBAS.map((id, i) => ({ id, ap: { barbaG: i + 1 } })), bigodes = Criacao3D.BIGODES.map((id, i) => ({ id, ap: { barbaG: 0, bigodeG: i + 1 } }));
  for (const b of barbas.concat(bigodes)) for (let corpoG = 0; corpoG < 2; corpoG++) for (let r = 0; r < 8; r++) {
    casos.push({ peca: b.id, corpo: corpoG ? 'corpo_f' : 'corpo_m', rosto: r + 1, forma: 'como veio', ap: Object.assign({ corpoG, rostoG: r }, b.ap) });
    if (corpoG === 0 && r % 2 === 0) for (const [nf, f] of Object.entries(FORMAS)) casos.push({ peca: b.id, corpo: 'corpo_m', rosto: r + 1, forma: nf, ap: Object.assign({ corpoG, rostoG: r }, b.ap, f) });
  }
  const out = [];
  let n = 0;
  for (const C of casos) {
    const def = Perfis.registrar({ id: `p_val_${n++}`, nome: 'Val', classe: 'guerreiro', aparencia: Object.assign(persAparenciaPadrao('guerreiro'), { estilo: 0, cabeloG: 0, barbaG: 0, bigodeG: 0 }, C.ap) });
    for (let i = 0; i < 600 && Criacao3D.preparar(def) !== true; i++) await esp(40);
    MODELS3D[def.model].model = null;
    const M = g.model3(def.model), E = M && M.cria && M.cria.encaixeBarba;
    out.push({ peca: C.peca, corpo: C.corpo, rosto: C.rosto, forma: C.forma, ok: !!(E && E.ok), pen: E ? +E.pen.toFixed(4) : null, vao: E ? +E.vao.toFixed(3) : null, olhos: E ? E.olhos : null, nariz: E ? E.nariz : null, tentativas: E ? E.tentativas : null, ms: E ? Math.round(E.ms) : null });
    MODELS3D[def.model].model = null; delete CHARACTERS_BY_ID[def.id];
  }
  return out;
});
const aprov = res.filter((r) => r.ok).length;
fs.writeFileSync(path.join(raiz, 'docs', 'barbas_validacao.json'), JSON.stringify({ gerado: new Date().toISOString().slice(0, 10), casos: res.length, aprovados: aprov, resultados: res }, null, 0) + '\n');
// resumo por peça
const porPeca = {};
for (const r of res) { const p = porPeca[r.peca] || (porPeca[r.peca] = { n: 0, ok: 0, segunda: 0, penMax: 0, vaoMax: 0, ms: 0 }); p.n++; if (r.ok) p.ok++; if (r.tentativas > 1) p.segunda++; p.penMax = Math.max(p.penMax, r.pen || 0); p.vaoMax = Math.max(p.vaoMax, r.vao || 0); p.ms += r.ms || 0; }
let md = `# Validação do encaixe das barbas e bigodes\n\nGerado por \`tools/validar_barbas.mjs\` (não edite à mão).\n\n` +
  `- **Casos:** ${res.length} (cada barba e cada bigode nos 8 rostos, nos dois corpos, mais 5 formatos de rosto extremos nos rostos 1, 3, 5 e 7 do corpo masculino).\n` +
  `- **Aprovados:** ${aprov} de ${res.length}.\n` +
  `- **Critérios:** menos de 1% dos vértices atravessando a pele, até 2 vértices sobre cada olho e sobre o nariz, e menos de 8% de vãos na face de dentro (barbas em casca).\n\n` +
  `| Peça | Aprovados | Refeitos na 2ª tentativa | Atravessa (pior) | Vãos (pior) | Tempo médio |\n|---|---|---|---|---|---|\n`;
for (const [k, p] of Object.entries(porPeca)) md += `| ${k} | ${p.ok}/${p.n} | ${p.segunda} | ${(p.penMax * 100).toFixed(2)}% | ${(p.vaoMax * 100).toFixed(1)}% | ${Math.round(p.ms / p.n)} ms |\n`;
const rep = res.filter((r) => !r.ok);
if (rep.length) { md += `\n## Reprovados\n\n| Peça | Corpo | Rosto | Formato | Atravessa | Vãos | Olhos | Nariz |\n|---|---|---|---|---|---|---|---|\n`; for (const r of rep) md += `| ${r.peca} | ${r.corpo} | ${r.rosto} | ${r.forma} | ${(r.pen * 100).toFixed(2)}% | ${(r.vao * 100).toFixed(1)}% | ${r.olhos} | ${r.nariz} |\n`; }
fs.writeFileSync(path.join(raiz, 'docs', 'BARBAS_VALIDACAO.md'), md);
console.log(`validação: ${aprov}/${res.length} aprovados em ${Math.round((Date.now() - t0) / 1000)} s; erros da página: ${JSON.stringify(erros.slice(0, 3))}`);
await nav.close(); srv.close();
