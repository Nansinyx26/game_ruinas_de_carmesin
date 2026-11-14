// ECLIPSE ZERO · Onde o servidor de chat guarda os dados (arquivos JSON ou MongoDB)
// ---------------------------------------------------------------------------
// Os dois armazéns têm a mesma forma:
//   carregar(nome, padrao) → o objeto salvo (lido UMA vez, na partida do servidor)
//   gravar(nome, () => obj) → grava logo depois, juntando várias mudanças seguidas
//   anexar(nome, obj)       → acrescenta uma linha a um registro (log_gm, denúncias)
//   ultimos(nome, n)        → as n últimas linhas de um registro (as que este processo já conhece)
//   fechar()                → grava o que estiver pendente e encerra
// O estado do jogo (contas, sessões, histórico, mundo) fica todo na memória do servidor; o armazém só
// guarda e devolve. Com MONGODB_URI definida, os dados vão para o MongoDB (coleção "estado", um
// documento por arquivo, e as coleções de registro "log_gm" e "denuncias"); sem ela, para a pasta de
// dados em JSON, como antes. A URI só é lida do ambiente do servidor: nunca do navegador, nunca do
// repositório, e nunca aparece nas mensagens (os erros mostram só o tipo do problema).
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';

const ATRASO = 150;                       // ms para juntar mudanças antes de gravar
const MEMORIA_REG = 50;                   // linhas de cada registro mantidas na memória
const semExt = (nome) => nome.replace(/\.jsonl?$/, '');

// ------------------------------------------------------------ arquivos JSON
export function armazemArquivos(DADOS) {
  fs.mkdirSync(DADOS, { recursive: true });
  const pend = new Map();
  const escrever = (nome, obj) => { const f = path.join(DADOS, nome); try { fs.writeFileSync(f + '.tmp', JSON.stringify(obj)); fs.renameSync(f + '.tmp', f); } catch (e) { console.error('gravar', nome, e.message); } };
  return {
    tipo: 'arquivos',
    carregar(nome, padrao) { try { return JSON.parse(fs.readFileSync(path.join(DADOS, nome), 'utf8')); } catch { return padrao; } },
    gravar(nome, v) {
      if (pend.has(nome)) return;
      pend.set(nome, { v, t: setTimeout(() => { pend.delete(nome); escrever(nome, v()); }, ATRASO) });
    },
    anexar(nome, obj) { try { fs.appendFileSync(path.join(DADOS, nome), JSON.stringify(obj) + '\n'); } catch (e) { console.error('anexar', nome, e.message); } },
    ultimos(nome, n) {
      try { return fs.readFileSync(path.join(DADOS, nome), 'utf8').trim().split('\n').filter(Boolean).slice(-n).map((l) => JSON.parse(l)); } catch { return []; }
    },
    async fechar() { for (const [nome, p] of pend) { clearTimeout(p.t); escrever(nome, p.v()); } pend.clear(); },
  };
}

// ------------------------------------------------------------ MongoDB
// db: um banco do driver oficial (client.db(...)) ou qualquer objeto com a mesma forma (os testes usam um falso).
// O conteúdo vai como texto JSON no campo "json": os nomes das contas viram chaves e podem ter qualquer
// caractere, e o documento fica igual ao arquivo de antes (fácil de exportar e voltar para os arquivos).
export async function armazemMongo(db, op = {}) {
  const estado = db.collection('estado');
  const cache = new Map(), regs = new Map(), pend = new Map(), voando = new Set();
  for (const d of await estado.find({}).toArray()) { try { cache.set(d._id, JSON.parse(d.json)); } catch { /* documento estragado: começa do padrão */ } }
  for (const nome of op.registros || ['log_gm.jsonl', 'denuncias.jsonl']) {
    const L = await db.collection(semExt(nome)).find({}).sort({ _id: -1 }).limit(MEMORIA_REG).toArray();
    regs.set(nome, L.reverse().map((d) => { const o = { ...d }; delete o._id; return o; }));
  }
  const falha = (o, e) => console.error(`MongoDB: falha ao ${o} (${(e && (e.codeName || e.name)) || 'erro'})`);
  const escrever = (nome, obj) => {
    const p = estado.replaceOne({ _id: nome }, { _id: nome, json: JSON.stringify(obj), quando: new Date() }, { upsert: true }).catch((e) => falha('gravar ' + nome, e));
    voando.add(p); p.finally(() => voando.delete(p));
    return p;
  };
  return {
    tipo: 'mongodb',
    carregar(nome, padrao) { return cache.has(nome) ? cache.get(nome) : padrao; },
    gravar(nome, v) {
      if (pend.has(nome)) return;
      pend.set(nome, { v, t: setTimeout(() => { pend.delete(nome); escrever(nome, v()); }, ATRASO) });
    },
    anexar(nome, obj) {
      const L = regs.get(nome) || []; L.push(obj); if (L.length > MEMORIA_REG) L.shift(); regs.set(nome, L);
      const p = db.collection(semExt(nome)).insertOne({ ...obj }).catch((e) => falha('registrar ' + nome, e));
      voando.add(p); p.finally(() => voando.delete(p));
    },
    ultimos(nome, n) { return (regs.get(nome) || []).slice(-n); },
    async fechar() {
      for (const [nome, p] of pend) { clearTimeout(p.t); escrever(nome, p.v()); }
      pend.clear();
      await Promise.allSettled([...voando]);
      if (op.aoFechar) await op.aoFechar();
    },
  };
}

// Liga ao MongoDB pela URI (só do ambiente). Banco: EZ_MONGO_BANCO ou o da própria URI ou "eclipse_zero".
export async function conectarMongo(uri, banco) {
  const { MongoClient } = await import('mongodb');
  const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, appName: 'eclipse-zero-chat' });
  try { await cliente.connect(); } catch (e) { throw new Error(`não foi possível ligar ao MongoDB (${e.codeName || e.name || 'erro'})`); }
  const db = cliente.db(banco || undefined);
  const nomeDb = db.databaseName && db.databaseName !== 'test' ? db.databaseName : 'eclipse_zero';
  const final = nomeDb === db.databaseName ? db : cliente.db(nomeDb);
  return armazemMongo(final, { aoFechar: () => cliente.close() });
}

// O armazém que o servidor usa: o passado em op.armazem (testes), o MongoDB se houver URI, ou os arquivos.
export async function abrirArmazem(op, DADOS) {
  if (op.armazem) return op.armazem;
  const uri = op.mongoUri ?? process.env.MONGODB_URI;
  if (uri) return conectarMongo(uri, op.mongoBanco ?? process.env.EZ_MONGO_BANCO);
  return armazemArquivos(DADOS);
}
