'use strict';
// ECLIPSE ZERO · Armaduras GLB: catálogo central, conjuntos e o equipamento inicial
// ---------------------------------------------------------------------------
// Os modelos vêm de assets/Criar_Personagem/ (os caminhos reais estão no catálogo da criação,
// js/assets/criacao/catalogo.js, gerado por tools/importar_criacao.py a partir dos arquivos):
//   Armaduras_Inicial_Level_1/ → o conjunto do Iniciado, nível 1, de todas as classes: capuz,
//     gibão (peitoral leve), couraça (peitoral pesado com ombreiras), luvas, calças, botas e capa.
//     Todo personagem criado começa com as sete peças na mochila (uma vez só, sem repetir) e com
//     seis vestidas (o peitoral escolhido na criação).
//   Armaduras_Level_30/<classe>/ → um conjunto de nível 30 por classe (peitoral com ombreiras,
//     capa, luvas, capuz, calças, botas e amuleto). Nunca vêm de graça: caem dos chefes e elites
//     das zonas de nível 25+ e a Armaria vende peças da classe a partir do nível 30.
//   Armaduras_Level_50/75/100/<classe>/ → os conjuntos de nível 50, 75 e 100 de cada classe, feitos
//     no Blender a partir das imagens da pasta (tools/blender/asset_armadura_<classe>_n<nível>.py):
//     peitoral, ombreiras (duas peças: esquerda e direita), capa, capuz, luvas, calça, botas e
//     amuleto. Caem nas zonas da faixa de nível (45+, 70+ e 95+) e a Armaria vende as da faixa.
// Cada definição tem os campos pedidos: itemLevel, rarity (a de referência; cada peça ganha a
// própria ao surgir), requiredLevel, allowedClasses, equipmentSlot, baseStats, bonusStats (o que a
// raridade sorteia), modelPath (o GLB), iconPath (a miniatura), description, sellValue e setId.
// Raridades: só as quatro do Arsenal (Comum/branco, Incomum/verde, Raro/azul, Lendário/dourado);
// a raridade não depende do nível. Os atributos valem só no mundo aberto (Arsenal.apply).
// ---------------------------------------------------------------------------
const ARM_CLASSES = ['guerreiro', 'mago', 'assassino', 'patrulheiro', 'guardiao'];
// Conjuntos: bônus com 2 e 4 peças e com o conjunto completo (cada faixa conta uma vez)
const ARM_CONJUNTOS = {
  iniciado: { nome: 'Conjunto do Iniciado', completo: 6, bonus: [[2, { vida: 10 }], [4, { defesa: 0.015, energia: 5 }], [6, { veloc: 0.02, dano: 0.03 }]] },
  guerreiro30: { nome: 'Conjunto do Guerreiro', classe: 'guerreiro', completo: 7, bonus: [[2, { vida: 40 }], [4, { defesa: 0.04, dano: 0.04 }], [7, { dano: 0.08, vida: 60 }]] },
  mago30: { nome: 'Conjunto do Mago', classe: 'mago', completo: 7, bonus: [[2, { energia: 20 }], [4, { recarga: 0.05, dano: 0.04 }], [7, { dano: 0.1, recarga: 0.05 }]] },
  assassino30: { nome: 'Conjunto do Assassino', classe: 'assassino', completo: 7, bonus: [[2, { critico: 0.03 }], [4, { veloc: 0.03, dano: 0.04 }], [7, { critico: 0.06, dano: 0.06 }]] },
  patrulheiro30: { nome: 'Conjunto do Patrulheiro', classe: 'patrulheiro', completo: 7, bonus: [[2, { veloc: 0.03 }], [4, { critico: 0.03, dano: 0.04 }], [7, { dano: 0.08, veloc: 0.03 }]] },
  guardiao30: { nome: 'Conjunto do Guardião Arcano', classe: 'guardiao', completo: 7, bonus: [[2, { defesa: 0.03 }], [4, { energia: 14, vida: 30 }], [7, { defesa: 0.05, recarga: 0.05 }]] },
};
// Atributos que a raridade sorteia, pelo tema do conjunto
const ARM_TEMAS = {
  iniciado: ['vida', 'defesa', 'energia', 'veloc'],
  guerreiro30: ['vida', 'defesa', 'dano', 'critico'], mago30: ['energia', 'recarga', 'dano', 'critico'],
  assassino30: ['critico', 'dano', 'veloc', 'energia'], patrulheiro30: ['veloc', 'critico', 'dano', 'vida'],
  guardiao30: ['defesa', 'energia', 'vida', 'recarga'],
};
// Faixas de nível dos conjuntos de classe e a força de cada uma (atributos de base e bônus)
const ARM_FAIXAS = [30, 50, 75, 100];
const ARM_FORCA = { 1: 1, 30: 2.05, 50: 2.7, 75: 3.5, 100: 4.4 };
// Os conjuntos de nível 50, 75 e 100: o tema da classe, nove peças (as ombreiras contam duas) e
// os bônus do conjunto de nível 30 na força da faixa
for (const lv of [50, 75, 100]) {
  for (const c of ARM_CLASSES) {
    const b30 = ARM_CONJUNTOS[c + '30'], k = ARM_FORCA[lv] / ARM_FORCA[30];
    const esc = (b) => { const o = {}; for (const q in b) o[q] = WORLD_ATRIB[q] && WORLD_ATRIB[q].pct ? +(b[q] * k).toFixed(3) : Math.round(b[q] * k); return o; };
    ARM_CONJUNTOS[c + lv] = { nome: `${b30.nome} · nível ${lv}`, classe: c, completo: 9, bonus: [[2, esc(b30.bonus[0][1])], [5, esc(b30.bonus[1][1])], [9, esc(b30.bonus[2][1])]] };
    ARM_TEMAS[c + lv] = ARM_TEMAS[c + '30'];
  }
}
// Família do Arsenal de cada peça: tecido (clima), resistências e o visual procedural nos heróis
// que não usam as peças GLB (Kael, aliados e o estilo Estilizado)
const ARM_FAMILIA = {
  ini_capuz: 'viajante', ini_peitoral: 'couro', ini_armadura: 'placas', ini_luvas: 'couro', ini_calca: 'viajante', ini_botas: 'couro', ini_capa: 'viajante',
  guerreiro: 'placas', mago: 'cristal', assassino: 'couro', patrulheiro: 'couro', guardiao: 'cristal',
};
const ARM_DESC = {
  capacete: 'Capuz que protege a cabeça e a nuca', peitoral: 'Peça do tronco, a que mais protege', luvas: 'Luvas para punhos e mãos',
  calcas: 'Calças reforçadas nas coxas e nos joelhos', botas: 'Botas para terreno de ruína', capa: 'Capa contra vento, chuva e poeira', acessorio: 'Amuleto de cristal usado no peito',
  ombroE: 'Ombreira do ombro esquerdo', ombroD: 'Ombreira do ombro direito',
};

// ------------------------------------------------------------ catálogo central (caminhos reais)
const ARMADURAS_GLB = (function () {
  const out = {};
  if (typeof CRIA_CATALOGO === 'undefined') return out;
  for (const c of CRIA_CATALOGO) {
    if (c.tipo !== 'peca') continue;
    const cls = c.classe || null, lv = c.nivel || 1, set = cls ? `${cls}${lv}` : 'iniciado', V = ARS_VAGAS[c.vaga];
    if (!V || !ARM_CONJUNTOS[set]) continue;
    // atributos de base: os pesos da vaga (defesa, vida) na força do nível; o peitoral pesado
    // protege mais e pesa; o amuleto dá o atributo do tema
    const tk = ARM_FORCA[lv] || 1, nk = 1 + lv * 0.01, base = {};
    if (V.def) base.defesa = +(V.def * tk * nk * (c.ombros ? 1.35 : 1)).toFixed(4);
    if (V.vida) base.vida = Math.round(V.vida * tk * nk * (c.ombros ? 1.25 : 1));
    if (c.ombros) base.veloc = -0.01;
    if (c.vaga === 'botas') base.veloc = +(0.01 * (lv >= 30 ? 1.5 : 1)).toFixed(3);
    if (c.vaga === 'acessorio') { const k = ARM_TEMAS[set][0]; base[k] = +(WORLD_ATRIB[k].base * 2.2 * tk).toFixed(4); }
    const fam = ARM_FAMILIA[c.id] || ARM_FAMILIA[cls] || 'viajante';
    const nomeC = cls ? { guerreiro: 'Guerreiro', mago: 'Mago', assassino: 'Assassino', patrulheiro: 'Patrulheiro', guardiao: 'Guardião Arcano' }[cls] : null;
    out[c.id] = {
      id: c.id, nome: c.nome, setId: set, fam,
      itemLevel: lv, rarity: 'comum', requiredLevel: lv, allowedClasses: cls ? [cls] : ARM_CLASSES.slice(),
      equipmentSlot: c.vaga, baseStats: base, bonusStats: ARM_TEMAS[set],
      modelPath: c.arq, iconPath: c.mini, convertido: !!c.convertido, ombros: !!c.ombros,
      description: cls ? `${ARM_DESC[c.vaga]}. Parte do conjunto de nível ${lv} da classe ${nomeC}${c.blender ? ' (modelada no Blender)' : ''}.` : `${ARM_DESC[c.vaga]}. Equipamento inicial de quem chega ao mundo aberto.`,
      sellValue: Math.round((cls ? 90 * (ARM_FORCA[lv] / 2.05) : 8) * Math.max(0.5, V.peso || 0.3)),
    };
  }
  return out;
})();
// O conjunto inicial: o peitoral vestido é um dos dois (gibão leve ou couraça pesada)
const ARM_INICIAL = ['ini_capuz', 'ini_peitoral', 'ini_armadura', 'ini_luvas', 'ini_calca', 'ini_botas', 'ini_capa'];
const ARM_PEITORAL_PADRAO = { guerreiro: 'ini_armadura', guardiao: 'ini_armadura' };   // os outros: o gibão

// ------------------------------------------------------------ Arsenal: peças do catálogo
Object.assign(Arsenal, {
  cat(it) { return (it && it.cat && ARMADURAS_GLB[it.cat]) || null; },
  // Peça nova de uma definição do catálogo, na raridade r (0 a 3): base da definição + os
  // atributos sorteados pela raridade (um por grau acima de Comum)
  gerarCat(id, r = 0, rnd = Math.random) {
    const D = ARMADURAS_GLB[id];
    if (!D) return null;
    r = clamp(r | 0, 0, ARS_RARIDADES.length - 1);
    const R = ARS_RARIDADES[r], bonus = {}, pool = D.bonusStats.slice(), lk = 1 + D.itemLevel / 30;
    for (let i = 0; i < r && pool.length; i++) {
      const k = pool.splice(Math.floor(rnd() * pool.length), 1)[0], A = WORLD_ATRIB[k];
      const v = A.base * (0.6 + 0.35 * R.k) * lk;
      bonus[k] = A.pct ? +v.toFixed(4) : Math.round(v);
    }
    const st = Object.assign({}, D.baseStats);
    for (const k in bonus) st[k] = (st[k] || 0) + bonus[k];
    const F = ARS_FAMILIAS[D.fam], res = {};
    for (const k in F.res) res[k] = F.res[k] * (ARS_VAGAS[D.equipmentSlot].area * 3 + (D.equipmentSlot === 'acessorio' ? 0.4 : 0));
    return { id: 0, peca: 1, slot: D.equipmentSlot, fam: D.fam, r, lv: D.itemLevel, st, res, ap: 0, cat: id, base: Object.assign({}, D.baseStats), bonus };
  },
  // Classe do herói (personagem criado) ou null (Kael e os aliados da história)
  classeDe(h) { const d = typeof CHARACTERS_BY_ID !== 'undefined' && CHARACTERS_BY_ID[h]; return (d && d.classe) || null; },
  // Pode vestir? Nível exigido e classe permitida ('' = pode)
  podeUsar(it, h = this.heroi()) {
    const D = this.cat(it);
    if (game.activeProgress().level < this.req(it)) return `Requer nível ${this.req(it)}.`;
    if (D && D.allowedClasses.length < ARM_CLASSES.length) {
      const c = this.classeDe(h);
      if (!c || !D.allowedClasses.includes(c)) return `Só para a classe ${D.allowedClasses.map((k) => (typeof PERS_CLASSES !== 'undefined' && PERS_CLASSES[k] ? PERS_CLASSES[k].nome : k)).join(', ')}.`;
    }
    return '';
  },
  // Peças vestidas de cada conjunto (vagas diferentes) e as faixas de bônus alcançadas
  conjuntos(h = this.heroi(), V = this.vestidos(h)) {
    const out = {};
    for (const s in V) { const D = this.cat(V[s]); if (D) (out[D.setId] || (out[D.setId] = new Set())).add(s); }
    const res = [];
    for (const id in out) {
      const C = ARM_CONJUNTOS[id], n = out[id].size;
      if (C) res.push({ id, nome: C.nome, n, completo: C.completo, ativos: C.bonus.filter(([k]) => n >= k), proximo: C.bonus.find(([k]) => n < k) || null });
    }
    return res;
  },
  // Bônus dos conjuntos (Arsenal.apply): cada faixa entra uma vez
  aplicarConjuntos(S, h, V) {
    for (const c of this.conjuntos(h, V)) for (const [, b] of c.ativos) for (const k in b) WORLD_ATRIB[k].apply(S, b[k]);
  },
  // Conjunto do Iniciado: as sete peças entram na mochila uma vez só (sem repetir as que já
  // existem, na mochila ou no armazém); 'vestir' veste seis (o peitoral escolhido)
  inicial(h, vestir = false, peitoral = null) {
    const S = this.S, ja = new Set(S.itens.concat(S.armazem.itens).map((q) => q.cat).filter(Boolean));
    if (!S.inicialGLB) {
      for (const id of ARM_INICIAL) if (!ja.has(id) && ARMADURAS_GLB[id]) this.guardar(this.gerarCat(id, 0), true);
      S.inicialGLB = true;
    }
    if (!vestir) return;
    const c = this.classeDe(h), pe = peitoral === 'ini_peitoral' || peitoral === 'ini_armadura' ? peitoral : ARM_PEITORAL_PADRAO[c] || 'ini_peitoral';
    for (const id of ARM_INICIAL) {
      if ((id === 'ini_peitoral' || id === 'ini_armadura') && id !== pe) continue;
      const it = S.itens.find((q) => q.cat === id);
      if (it) (S.vest[h] || (S.vest[h] = {}))[it.slot] = it.id;
    }
    this.refazer();
  },
  // Faixa do conjunto de classe para um nível (de zona ou do herói, com 'folga' níveis antes): 30,
  // 50, 75 ou 100, ou 0 abaixo de todas
  faixaClasse(lv, folga = 5) { let f = 0; for (const k of ARM_FAIXAS) if (lv + folga >= k) f = k; return f; },
  // Peças do conjunto de uma faixa (só as que existem convertidas)
  pecasClasse(c, faixa) { return Object.keys(ARMADURAS_GLB).filter((k) => ARMADURAS_GLB[k].setId === `${c}${faixa}` && ARMADURAS_GLB[k].convertido); },
  // Peças de classe: um dos chefes das zonas 25+ sempre larga uma (para a classe do personagem
  // criado), as elites às vezes; o conjunto é o da faixa da zona (nível 30 nas zonas 25+, 50 nas
  // 45+, 75 nas 70+, 100 nas 95+); a raridade é sorteada
  onKillClasse(e, z) {
    const c = this.classeDe(this.heroi());
    if (!c || !z || z.lv < 25) return;
    const ids = this.pecasClasse(c, this.faixaClasse(z.lv));
    if (!ids.length) return;
    if (e.worldBoss) this.guardar(this.gerarCat(pick(ids), this.rolar(1, 0.4)));
    else if (e.elite && Math.random() < 0.05) this.guardar(this.gerarCat(pick(ids), this.rolar(0, 0.2)));
  },
});
