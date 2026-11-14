// ECLIPSE ZERO · Extrai as falas dos moradores do jogo para a dublagem (ferramenta de desenvolvimento)
// ---------------------------------------------------------------------------
// Abre o jogo num Chromium sem tela e grava em tools/dublagem/falas.json tudo o que cada morador
// diz na conversa (cumprimentos, respostas dos assuntos e rumores) e o que o herói pergunta, como está
// no jogo de verdade.
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
const pg = await nav.newPage(); await pg.goto(`http://127.0.0.1:${srv.address().port}/jogar.html`); await pg.waitForTimeout(2500);
const d = await pg.evaluate(() => {
// Outras falas fixas do morador na conversa (o jogo acha a gravação pelo parágrafo do texto mostrado):
// a resposta de "Quem é você?", o começo e o fim das missões que ele dá e as respostas dos serviços
const regionais = {};
for (const R of WORLD_REGIONS) {
  const z = WORLD_ZONES[R.hub], n = z && (z.npcs || []).find((q) => q.quest), P = n && WORLD_POVO.find((q) => q.chave === `${z.id}:${n.name}`);
  if (P) regionais[P.id] = (WORLD_QUESTS[R.id] || []).flatMap((q) => [q.ini, q.fim]).concat(['Quando quiser. O trabalho não vai a lugar nenhum.']);
}
const SERV = { curandeiro: 'Pronto. Inteiro de novo. Tente voltar assim da próxima vez.', treinador: 'Bom. Suou, aprendeu. Volte amanhã.' };
const extras = (P) => {
  const L = [];
  if (P.id && !P.chave) L.push(`${P.nome}. ${P.papel}. ${P.personalidade}`);
  for (const q of WORLD_AVENTURAS) if (q.doador === P.id) { L.push(q.ini, q.fim); if (q.escolha) for (const op of q.escolha.opcoes) L.push(op.fim); }
  L.push(...(regionais[P.id] || []));
  for (const s of P.servicos || []) if (SERV[s]) L.push(SERV[s]);
  return [...new Set(L.filter((t) => typeof t === 'string' && t.trim()))];
};
return ({
  povo: WORLD_POVO.map((P) => ({ id: P.id, nome: P.nome || P.chave, zona: P.zona, papel: P.papel, pers: P.personalidade, ola: P.ola || [], temas: (P.temas || []).map((t) => t[1]), rumores: (P.rumores || []).map((r) => (r && r.txt) || r), extras: extras(P) })),
  // o que o herói pergunta na conversa (os assuntos e as opções fixas de todo morador): a voz do herói
  perguntas: [...new Set(['Quem é você?', 'Alguma novidade? Ouviu algum rumor?', 'Até logo.'].concat(WORLD_POVO.flatMap((P) => (P.temas || []).map((t) => t[0]))).filter((q) => typeof q === 'string' && q))],
});
});
fs.writeFileSync(saida, JSON.stringify(d, null, 1) + '\n'); await nav.close(); srv.close();
console.log(`${d.povo.length} moradores, ${d.povo.reduce((n, P) => n + P.ola.length + P.temas.length + P.rumores.length + P.extras.length, 0)} falas → ${path.relative(raiz, saida)}`);
