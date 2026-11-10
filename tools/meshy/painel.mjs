// ECLIPSE ZERO · Painel do Meshy (administração local das gerações de estruturas)
// ---------------------------------------------------------------------------
// Um servidor só nesta máquina (127.0.0.1), sem bibliotecas: abre no navegador a fila das peças
// (tools/meshy/estruturas_faltantes.json), com a imagem de referência, a prévia do Meshy, o estado
// (na fila / gerada / reduzida e aprovada / no jogo) e o saldo da conta. Gerar gasta créditos: o
// painel mostra a estimativa do próprio CLI e só envia depois de você digitar o total para
// confirmar; uma geração por vez (as outras esperam na fila do painel). Peças novas entram pelo
// formulário (imagem + nome + estilo + tipo).
// A CHAVE NUNCA PASSA PELO NAVEGADOR: quem fala com o Meshy é o meshy-cli desta máquina, com a
// sessão dele (meshy auth login, pelo navegador, ou MESHY_API_KEY no ambiente). O painel chama
// tools/meshy/gerar_estruturas.py, que baixa os GLB para assets/estruturas_ambiente/*/Meshy/.
// Depois: tools/estruturas/processar.sh (redução) e tools/importar_prop.py --grupo estruturas (jogo).
// Uso (na pasta do projeto): node tools/meshy/painel.mjs [porta]   → http://127.0.0.1:8787
// ---------------------------------------------------------------------------
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LISTA = path.join(RAIZ, 'tools', 'meshy', 'estruturas_faltantes.json');
const PROJ = path.join(RAIZ, '.cache_criacao', 'meshy_output');
const PORTA = Number(process.argv[2] || 8787);
const AMB = { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' };
const DEST = { medieval: 'Estruturas_Superficie', cyberpunk: 'Estruturas_Subsolo_tecnologico' };
let job = null; const fila = []; let log = '';

const ler = (f, p) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return p; } };
const cli = (args) => new Promise((ok) => execFile('npm', ['exec', '--yes', '--package=meshy-cli@0.4.0', '--', 'meshy', ...args, '--output-schema', 'v1', '--format', 'json', '--no-update-check'],
  { env: AMB, cwd: RAIZ, timeout: 60000 }, (e, out) => { try { ok(JSON.parse(out)); } catch (x) { ok({ ok: false, error: { message: String(e || x).slice(0, 200) } }); } }));
let custo = null;
async function estado() {
  const L = ler(LISTA, {}), red = Object.fromEntries(ler(path.join(RAIZ, 'assets', 'models', 'estruturas', 'estruturas.json'), []).map((x) => [x.id, x]));
  const idx = fs.existsSync(path.join(RAIZ, 'js', 'assets', 'estruturas', 'indice.js')) ? fs.readFileSync(path.join(RAIZ, 'js', 'assets', 'estruturas', 'indice.js'), 'utf8') : '';
  const pastas = fs.existsSync(PROJ) ? fs.readdirSync(PROJ) : [];
  const pecas = Object.entries(L).map(([id, P]) => {
    const env = ler(path.join(PROJ, id, 'envio.json'), null), glb = path.join(RAIZ, 'assets', 'estruturas_ambiente', DEST[P.estilo], 'Meshy', id + '.glb');
    const pasta = pastas.find((d) => d.includes('_' + id.replace(/_/g, '-') + '_'));
    const st = idx.includes(`"${id}":`) ? 'no jogo' : red[id] ? (red[id].aprovada ? 'reduzida e aprovada' : 'reprovada na redução') : fs.existsSync(glb) ? 'gerada' : env ? 'enviada' : 'na fila';
    return { id, nome: P.nome, estilo: P.estilo, tipo: P.tipo, estado: st, tarefa: env && env.task_id, previa: !!(pasta && fs.existsSync(path.join(PROJ, pasta, 'previa.png'))) };
  });
  const b = await cli(['balance']);
  if (custo === null && pecas.length) { const d = await cli(['make', path.join(RAIZ, L[pecas[0].id].referencia), '--dry-run']); custo = d.result ? d.result.estimated_credits : null; }
  return { saldo: b.result ? b.result.balance : null, erroSaldo: b.ok ? null : (b.error || {}).message, custo, pecas, job: job && { ids: job.ids }, fila: fila.map((f) => f.ids) };
}
function proximo() {
  if (job || !fila.length) return;
  job = fila.shift();
  log += `\n== gerar ${job.ids.join(', ')} (até ${job.max} créditos)\n`;
  const p = spawn('python3', ['-u', 'tools/meshy/gerar_estruturas.py', '--confirmar', '--ids', job.ids.join(','), '--max-creditos', String(job.max)], { cwd: RAIZ, env: AMB });
  p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; });
  p.on('close', (c) => { log += `== fim (${c})\n`; job = null; proximo(); });
}
const corpo = (req) => new Promise((ok) => { let s = ''; req.on('data', (d) => { s += d; if (s.length > 12e6) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(s)); } catch (e) { ok({}); } }); });
const json = (res, o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
const png = (res, f) => { if (!f || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': 'image/png' }); fs.createReadStream(f).pipe(res); };

const srv = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'GET' && u.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(PAGINA); return; }
  if (req.method === 'GET' && u.pathname === '/api/estado') { json(res, await estado()); return; }
  if (req.method === 'GET' && u.pathname === '/api/log') { json(res, { log: log.slice(-6000), job: job && job.ids }); return; }
  const m = u.pathname.match(/^\/(ref|previa)\/([a-z0-9_]+)\.png$/);
  if (req.method === 'GET' && m) {
    const L = ler(LISTA, {});
    if (m[1] === 'ref') { png(res, L[m[2]] && path.join(RAIZ, L[m[2]].referencia)); return; }
    const d = (fs.existsSync(PROJ) ? fs.readdirSync(PROJ) : []).find((x) => x.includes('_' + m[2].replace(/_/g, '-') + '_'));
    png(res, d && path.join(PROJ, d, 'previa.png')); return;
  }
  if (req.method === 'POST' && u.pathname === '/api/gerar') {
    const b = await corpo(req), L = ler(LISTA, {}), ids = (b.ids || []).filter((i) => L[i]);
    const E = await estado(), total = (E.custo || 0) * ids.length;
    if (!ids.length) { json(res, { erro: 'nenhuma peça válida' }, 400); return; }
    if (Number(b.confirmacao) !== total) { json(res, { erro: `confirme digitando o total estimado: ${total} créditos` }, 400); return; }
    if (E.saldo !== null && total > E.saldo) { json(res, { erro: `saldo ${E.saldo} não cobre ${total}` }, 400); return; }
    fila.push({ ids, max: total }); proximo(); json(res, { ok: true, total }); return;
  }
  if (req.method === 'POST' && u.pathname === '/api/novo') {
    const b = await corpo(req), id = String(b.id || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    const mm = String(b.imagem || '').match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (!id || !mm || !['medieval', 'cyberpunk'].includes(b.estilo) || !['estrutura', 'item'].includes(b.tipo)) { json(res, { erro: 'preencha id, nome, estilo, tipo e a imagem (png, jpg ou webp)' }, 400); return; }
    const L = ler(LISTA, {});
    if (L[id]) { json(res, { erro: 'já existe uma peça com esse id' }, 400); return; }
    const ref = path.join('assets', 'referencias', 'estruturas_meshy', `${id}.${mm[1] === 'jpeg' ? 'jpg' : mm[1]}`);
    fs.writeFileSync(path.join(RAIZ, ref), Buffer.from(mm[2], 'base64'));
    L[id] = { nome: String(b.nome || id).slice(0, 80), estilo: b.estilo, tipo: b.tipo, referencia: ref, folha: 'painel' };
    fs.writeFileSync(LISTA, JSON.stringify(L, null, 1)); json(res, { ok: true, id }); return;
  }
  res.writeHead(404); res.end();
});
srv.listen(PORTA, '127.0.0.1', () => console.log(`Painel do Meshy: http://127.0.0.1:${PORTA}  (só nesta máquina; Ctrl+C encerra)`));

const PAGINA = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel do Meshy</title>
<style>:root{--f:#0d1018;--c:#161b27;--t:#e8ecf4;--m:#8f9ab0;--a:#5ad1ff;--r:#ff5c7a}body{margin:0;background:var(--f);color:var(--t);font:14px system-ui,sans-serif}
header{padding:16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #222a3a}h1{font-size:18px;margin:0}.s{color:var(--m)}
main{padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}.p{background:var(--c);border-radius:10px;padding:10px}
.p img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;background:#000}.par{display:grid;grid-template-columns:1fr 1fr;gap:6px}.e{font-size:12px;color:var(--a)}
button,input,select{background:#222a3a;color:var(--t);border:1px solid #33405a;border-radius:6px;padding:6px 10px}button{cursor:pointer}pre{white-space:pre-wrap;background:#000;padding:10px;margin:16px;border-radius:8px;max-height:240px;overflow:auto}
form{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px}.erro{color:var(--r)}</style></head><body>
<header><h1>Painel do Meshy · estruturas</h1><span id="saldo" class="s">saldo…</span><span id="custo" class="s"></span>
<button id="gerar">Gerar selecionadas</button><input id="conf" placeholder="digite o total p/ confirmar" size="22"><span id="msg" class="s"></span></header>
<form id="novo"><b>Nova peça:</b><input name="id" placeholder="id (ex.: torre_relogio)" required><input name="nome" placeholder="nome" required>
<select name="estilo"><option>medieval</option><option>cyberpunk</option></select><select name="tipo"><option>estrutura</option><option>item</option></select>
<input type="file" name="img" accept="image/png,image/jpeg,image/webp" required><button>Incluir</button></form>
<main id="lista"></main><pre id="log"></pre>
<script>
const $=(s)=>document.querySelector(s);let E=null;
async function atual(){E=await (await fetch('/api/estado')).json();$('#saldo').textContent=E.saldo!==null?'saldo: '+E.saldo+' créditos':'saldo indisponível ('+(E.erroSaldo||'sem sessão do CLI')+')';
$('#custo').textContent=E.custo?('≈ '+E.custo+' créditos por peça (estimativa do CLI)'):'';
$('#lista').innerHTML=E.pecas.map(p=>'<div class="p"><label><input type="checkbox" value="'+p.id+'"'+(p.estado==='na fila'?'':' disabled')+'> <b>'+p.nome+'</b></label><div class="s">'+p.id+' · '+p.estilo+' · '+p.tipo+'</div><div class="par"><img src="/ref/'+p.id+'.png" alt="referência"><img src="'+(p.previa?'/previa/'+p.id+'.png':'')+'" alt="prévia"></div><div class="e">'+p.estado+(p.tarefa?' · tarefa '+p.tarefa.slice(0,8):'')+'</div></div>').join('');}
$('#gerar').onclick=async()=>{const ids=[...document.querySelectorAll('#lista input:checked')].map(i=>i.value);if(!ids.length)return;
const total=(E.custo||0)*ids.length;if($('#conf').value!==String(total)){$('#msg').innerHTML='<span class="erro">'+ids.length+' peças ≈ '+total+' créditos: digite '+total+' no campo para confirmar</span>';return;}
const r=await (await fetch('/api/gerar',{method:'POST',body:JSON.stringify({ids,confirmacao:total})})).json();$('#msg').textContent=r.erro||('enviado: '+r.total+' créditos');$('#conf').value='';atual();};
$('#novo').onsubmit=async(ev)=>{ev.preventDefault();const f=new FormData(ev.target),file=f.get('img');const imagem=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(file);});
const r=await (await fetch('/api/novo',{method:'POST',body:JSON.stringify({id:f.get('id'),nome:f.get('nome'),estilo:f.get('estilo'),tipo:f.get('tipo'),imagem})})).json();$('#msg').textContent=r.erro||('incluída: '+r.id);ev.target.reset();atual();};
setInterval(async()=>{const l=await (await fetch('/api/log')).json();$('#log').textContent=l.log||'(sem gerações nesta sessão do painel)';},3000);atual();
</script></body></html>`;
