'use strict';
// ECLIPSE ZERO · Criação de personagem: classes, opções de aparência e perfis locais (Perfis)
// ---------------------------------------------------------------------------
// O jogador cria o PRÓPRIO protagonista (nome, aparência e uma das cinco classes) e joga com ele
// no mundo aberto. Cada classe luta sobre uma das bases de combate que o jogo já tem (kit, golpes,
// combos, árvores de habilidade, armas e supremas de verdade), com atributos e equipamento inicial
// próprios — não é só uma aparência:
//   Guerreiro       → base Drakos (machado/martelo, escudo, investida, zona de impacto, bloqueio)
//   Mago            → base Sera   (bastão neural e drone, campo de força, pulso, cura)
//   Assassino       → base Orion  (lâminas duplas/pistola, furtividade, ataque pelas costas, críticos)
//   Patrulheiro     → base Lyra   (arco de fóton, armadilhas, flechas especiais, foco)
//   Guardião Arcano → base Kael   (Tempestade Nula, a lâmina encantada; teleporte, explosão, eclipse)
// Os cinco heróis da história continuam iguais (o personagem criado é mais um no elenco).
//
// PERFIS (preparo para um MMO no futuro, sem rede nesta versão): uma conta local com id próprio,
// vários personagens por conta, cada um com id único, e o salvamento do mundo de cada personagem
// separado (World.chave). Perfis é só dados — a tela (js/criacao/tela.js) e o jogo leem e gravam
// por aqui, então trocar o armazenamento local por um servidor mexe só neste arquivo.
// O que é salvo é validado ao carregar (classe, nome, cada campo da aparência); um arquivo
// corrompido volta à cópia de reserva e, sem ela, os personagens válidos que sobrarem.
// ---------------------------------------------------------------------------
const PERS_CLASSES = {
  guerreiro: {
    nome: 'Guerreiro', base: 'drakos', cor: '#E0553A', icone: 'sword',
    papel: 'Combate corpo a corpo, defesa e força bruta',
    desc: 'Machados, martelos e armaduras pesadas. Golpes pesados que quebram a guarda, escudo, investida e contra-ataque depois do bloqueio.',
    stats: { hp: 150, energy: 90, speed: 210, radius: 16 },
    bonus: { armor: 0.06, guardBreak: 0.15 },
    atrib: { Força: 9, Agilidade: 4, Intelecto: 2, Vitalidade: 9, Precisão: 5 },
    rating: { vida: 0.95, energia: 0.55, ataque: 0.78, defesa: 0.92, velocidade: 0.42 },
    pecas: [['peitoral', 'placas'], ['ombroE', 'placas'], ['ombroD', 'placas'], ['botas', 'couro']],
    roupas: ['Gibão de couro', 'Túnica de batalha', 'Cota reforçada'], cores: [5, 1],
    falas: ['Com esse peso todo, dá para abrir caminho até numa parede.', 'Braço forte é bem-vindo. A Legião não costuma recuar sozinha.', 'Cuidado com o chão da praça: da última vez que alguém com essa armadura caiu, rachou.'],
  },
  mago: {
    nome: 'Mago', base: 'sera', cor: '#8A6CFF', icone: 'orb',
    papel: 'Magia ofensiva, controle e barreiras',
    desc: 'Cajado neural e drone arcano. Projéteis mágicos, pulsos que explodem, campo de força que protege e cura. Muita energia, pouca vida.',
    stats: { hp: 90, energy: 135, speed: 228, radius: 13 },
    bonus: { cdr: 0.08, power: 0.1 },
    atrib: { Força: 2, Agilidade: 4, Intelecto: 10, Vitalidade: 4, Precisão: 7 },
    rating: { vida: 0.48, energia: 0.98, ataque: 0.62, defesa: 0.4, velocidade: 0.68 },
    pecas: [['capa', 'viajante'], ['botas', 'viajante'], ['acessorio', 'cristal']],
    roupas: ['Túnica arcana', 'Manto do erudito', 'Veste de campanha'], cores: [3, 6],
    falas: ['Dá para ouvir o zumbido desse bastão daqui. Os sensores também ouvem.', 'Magia na rede… Meu avô dizia que era lenda. Meu avô dizia muita coisa.', 'Se esse drone fizer café, eu pago bem.'],
  },
  assassino: {
    nome: 'Assassino', base: 'orion', cor: '#B44CFF', icone: 'dagger',
    papel: 'Velocidade, furtividade e golpes críticos',
    desc: 'Lâminas duplas e pistola oculta. Esquivas rápidas, ataques pelas costas com dano dobrado, furtividade e emboscada.',
    stats: { hp: 82, energy: 100, speed: 268, radius: 13 },
    bonus: { crit: 0.06 },
    atrib: { Força: 4, Agilidade: 10, Intelecto: 3, Vitalidade: 3, Precisão: 9 },
    rating: { vida: 0.42, energia: 0.7, ataque: 0.94, defesa: 0.3, velocidade: 0.98 },
    pecas: [['capacete', 'couro'], ['luvas', 'couro'], ['botas', 'couro']],
    roupas: ['Gibão sombrio', 'Couraça de couro', 'Traje de infiltração'], cores: [0, 4],
    falas: ['Nem ouvi chegar. Isso é bom ou ruim para mim?', 'Lâminas limpas. Ou você é muito bom, ou ainda não começou.', 'Fica onde eu possa ver, tá? Força do hábito.'],
  },
  patrulheiro: {
    nome: 'Patrulheiro', base: 'lyra', cor: '#4CC96B', icone: 'bow',
    papel: 'Combate à distância, armadilhas e exploração',
    desc: 'Arco de fóton e equipamento leve. Disparos carregados e especiais, armadilhas, marcação de alvos e foco de batalha.',
    stats: { hp: 92, energy: 110, speed: 250, radius: 13 },
    bonus: { crit: 0.04, magnet: 40 },
    atrib: { Força: 4, Agilidade: 8, Intelecto: 4, Vitalidade: 5, Precisão: 10 },
    rating: { vida: 0.5, energia: 0.78, ataque: 0.84, defesa: 0.38, velocidade: 0.86 },
    pecas: [['capa', 'viajante'], ['calcas', 'couro'], ['botas', 'couro']],
    roupas: ['Gibão de caça', 'Túnica do batedor', 'Couraça de trilha'], cores: [2, 7],
    falas: ['Gente de trilha, né? Então já sabe onde ficam as passagens boas.', 'Esse arco já viu muito mato. Dá para ver pelo cheiro de chuva.', 'Se achar ervas no caminho, a curandeira paga.'],
  },
  guardiao: {
    nome: 'Guardião Arcano', base: 'kael', cor: '#3AA6FF', icone: 'rune',
    papel: 'Combate híbrido: lâmina encantada, proteção e magia',
    desc: 'A Tempestade Nula, lâmina de energia encantada, e armadura intermediária. Golpes rúnicos, teleporte, explosão arcana e o Eclipse Absoluto.',
    stats: { hp: 115, energy: 115, speed: 232, radius: 14 },
    bonus: { armor: 0.03, power: 0.06 },
    atrib: { Força: 7, Agilidade: 6, Intelecto: 7, Vitalidade: 7, Precisão: 6 },
    rating: { vida: 0.68, energia: 0.75, ataque: 0.8, defesa: 0.62, velocidade: 0.76 },
    pecas: [['peitoral', 'couro'], ['ombroE', 'cristal'], ['ombroD', 'cristal'], ['capa', 'viajante']],
    roupas: ['Gibão rúnico', 'Túnica do guardião', 'Couraça arcana'], cores: [1, 3],
    falas: ['Essas runas na lâmina… Fazia anos que não aparecia um Guardião Arcano por aqui.', 'Espada e magia na mesma mão. A Resistência precisava disso.', 'Dizem que os Guardiões protegiam a cidade antes da rede. Vai ver voltaram.'],
  },
};
const PERS_ORDEM = ['guerreiro', 'mago', 'assassino', 'patrulheiro', 'guardiao'];

// Opções da aparência (todas desenhadas de verdade pelo modelo, js/criacao/modelo.js)
const PERS_PELES = ['#f2d0b6', '#e8b896', '#d29f7a', '#b98563', '#9a6a4c', '#7b5139', '#5a3a29', '#3e281c'];
const PERS_CABELOS = [['Preto', '#141216'], ['Castanho', '#4a2e1c'], ['Ruivo', '#8a3a1a'], ['Loiro', '#c9a35e'], ['Grisalho', '#8a8a90'], ['Branco', '#e4e4ea'], ['Azul', '#2a4a9a'], ['Carmesim', '#8a1a2a']];
const PERS_OLHOS = [['Castanhos', '#4a2c18', 0], ['Verdes', '#2e6a3a', 0], ['Azuis', '#2f5aa8', 0], ['Cinzentos', '#6a7480', 0], ['Âmbar', '#b07a1e', 0], ['Arcanos', '#7ad0ff', 1]];
const PERS_CORES = [['Ônix', '#1c1b20'], ['Aço', '#4a5260'], ['Floresta', '#2c4a2e'], ['Índigo', '#2e2a5a'], ['Vinho', '#5a1e26'], ['Couro', '#5c3e26'], ['Areia', '#8a7452'], ['Musgo', '#4a5232']];
// Estilo Realista: as peças GLB da criação (js/criacao/montagem.js; nomes do catálogo); Estilizado:
// o modelo paramétrico, com os campos de forma, rosto, cabelo, barba, marcas e roupa abaixo
const PERS_GLB = {
  corpoG: ['Masculino', 'Feminino'],
  rostoG: ['Rosto 1', 'Rosto 2', 'Rosto 3', 'Rosto 4', 'Rosto 5', 'Rosto 6', 'Rosto 7', 'Rosto 8'],
  cabeloG: ['Sem cabelo', 'Cabelo 1', 'Cabelo 2', 'Cabelo 3', 'Cabelo 4', 'Cabelo 5', 'Cabelo 6', 'Cabelo 7', 'Cabelo 8'],
  barbaG: ['Sem barba', 'Cacheada', 'Curta', 'Longa', 'Média', 'Viking'],
};
const PERS_APAR = {
  estilo: { nome: 'Estilo do modelo', ops: ['Realista', 'Estilizado'] },
  corpoG: { nome: 'Corpo', ops: PERS_GLB.corpoG, glb: true },
  rostoG: { nome: 'Rosto', ops: PERS_GLB.rostoG, glb: true },
  cabeloG: { nome: 'Cabelo', ops: PERS_GLB.cabeloG, glb: true },
  barbaG: { nome: 'Barba', ops: PERS_GLB.barbaG, glb: true },
  corpo: { nome: 'Tipo de corpo', ops: ['Esguio', 'Atlético', 'Robusto', 'Curvilíneo'] },
  altura: { nome: 'Altura', ops: ['Baixa', 'Mediana baixa', 'Mediana', 'Alta', 'Muito alta'] },
  pele: { nome: 'Tom de pele', ops: PERS_PELES.map((c, i) => `Tom ${i + 1}`), cores: PERS_PELES },
  rosto: { nome: 'Formato do rosto', ops: ['Oval', 'Anguloso', 'Redondo', 'Longo'] },
  olhos: { nome: 'Olhos', ops: PERS_OLHOS.map((o) => o[0]), cores: PERS_OLHOS.map((o) => o[1]) },
  sobrancelhas: { nome: 'Sobrancelhas', ops: ['Finas', 'Grossas', 'Arqueadas', 'Sem'] },
  cabelo: { nome: 'Cabelo', ops: ['Raspado', 'Curto', 'Topete', 'Longo', 'Rabo de cavalo', 'Moicano', 'Tranças', 'Coque'] },
  corCabelo: { nome: 'Cor do cabelo', ops: PERS_CABELOS.map((c) => c[0]), cores: PERS_CABELOS.map((c) => c[1]) },
  barba: { nome: 'Barba e bigode', ops: ['Sem', 'Por fazer', 'Cavanhaque', 'Bigode', 'Cheia'] },
  marcas: { nome: 'Marcas', ops: ['Sem', 'Cicatriz no olho', 'Cicatriz na face', 'Tatuagem tribal', 'Runas acesas', 'Pintura de guerra'] },
  roupa: { nome: 'Roupa inicial', ops: null },   // por classe (PERS_CLASSES[c].roupas)
  corRoupa: { nome: 'Cor da roupa', ops: PERS_CORES.map((c) => c[0]), cores: PERS_CORES.map((c) => c[1]) },
  corDetalhe: { nome: 'Cor dos detalhes', ops: PERS_CORES.map((c) => c[0]), cores: PERS_CORES.map((c) => c[1]) },
};
const PERS_CAMPOS = Object.keys(PERS_APAR);
// Aparência inicial de uma classe (o jogador muda tudo na tela)
function persAparenciaPadrao(classe = 'guerreiro') {
  const C = PERS_CLASSES[classe] || PERS_CLASSES.guerreiro;
  return { estilo: 0, corpoG: 0, rostoG: { guerreiro: 0, mago: 2, assassino: 3, patrulheiro: 1, guardiao: 2 }[classe] || 0, cabeloG: classe === 'mago' ? 8 : classe === 'assassino' ? 2 : 1, barbaG: classe === 'guerreiro' ? 2 : 0,
    corpo: classe === 'guerreiro' ? 2 : classe === 'assassino' ? 0 : 1, altura: 2, pele: 2, rosto: 0, olhos: classe === 'mago' || classe === 'guardiao' ? 5 : 0, sobrancelhas: 1, cabelo: 1, corCabelo: 1, barba: classe === 'guerreiro' ? 4 : 0, marcas: 0, roupa: 0, corRoupa: C.cores[0], corDetalhe: C.cores[1] };
}
// Personagem salvo antes das peças GLB: as escolhas do modelo paramétrico viram as mais parecidas
// (corpo curvilíneo → feminino; o penteado e a barba pelo formato)
function persMigrarGLB(A) {
  const fem = A.corpo === 3, rosto = Number.isInteger(A.rosto) ? A.rosto % 4 : 0;
  return {
    estilo: 0, corpoG: fem ? 1 : 0, rostoG: (fem ? 4 : 0) + rosto,
    cabeloG: [0, 1, 2, 8, 6, 4, 5, 6][A.cabelo] !== undefined ? [0, 1, 2, 8, 6, 4, 5, 6][A.cabelo] : 1,
    barbaG: [0, 2, 4, 2, 3][A.barba] || 0,
  };
}
// Peitoral do conjunto inicial escolhido na criação (gibão leve ou couraça pesada; null = o da classe)
function persPeitoral(v) { return v === 'ini_peitoral' || v === 'ini_armadura' ? v : null; }
// Número de opções de um campo (a roupa depende da classe)
function persNumOps(campo, classe) { return campo === 'roupa' ? (PERS_CLASSES[classe] || PERS_CLASSES.guerreiro).roupas.length : PERS_APAR[campo].ops.length; }

// ---------------------------------------------------------------------------
// Atributos da classe no jogador (Player.recalc): os bônus de verdade
// ---------------------------------------------------------------------------
const PersClasse = {
  aplicar(classe, S) {
    const B = PERS_CLASSES[classe] && PERS_CLASSES[classe].bonus;
    if (!B) return;
    if (B.armor) S.armor += B.armor;
    if (B.guardBreak) S.guardBreak += B.guardBreak;
    if (B.crit) S.crit += B.crit;
    if (B.power) S.power += B.power;
    if (B.cdr) S.cdr = Math.max(0.3, S.cdr - B.cdr);
    if (B.magnet) S.magnet += B.magnet;
  },
  // Os moradores reconhecem o personagem criado (js/mundo/povo.js, Povo.conversar): pelo nome no
  // primeiro encontro e, às vezes, um comentário sobre a classe depois
  saudacao(primeira) {
    const d = game.player && game.player.def, C = d && d.criado && PERS_CLASSES[d.classe];
    if (!C) return '';
    if (primeira) return `Você deve ser ${d.name}. ${pick(C.falas)}`;
    return Math.random() < 0.25 ? pick(C.falas) : '';
  },
  // Linhas dos números reais da classe (tela de criação)
  linhas(classe) {
    const C = PERS_CLASSES[classe], B = C.bonus, out = [`Vida ${C.stats.hp}`, `Energia ${C.stats.energy}`, `Velocidade ${C.stats.speed}`];
    if (B.armor) out.push(`+${Math.round(B.armor * 100)}% defesa`);
    if (B.guardBreak) out.push(`+${Math.round(B.guardBreak * 100)}% quebra de guarda`);
    if (B.crit) out.push(`+${Math.round(B.crit * 100)}% crítico`);
    if (B.power) out.push(`+${Math.round(B.power * 100)}% poder das habilidades`);
    if (B.cdr) out.push(`−${Math.round(B.cdr * 100)}% recarga`);
    if (B.magnet) out.push('alcance maior para coletar');
    return out;
  },
};

// ---------------------------------------------------------------------------
// PERFIS: conta local e personagens (repositório local; a interface é a mesma que um servidor teria)
// ---------------------------------------------------------------------------
const PERFIS_CHAVE = 'eclipse_zero_perfis_v1';
const PERFIS_VERSAO = 1;
const Perfis = {
  dados: null,      // { v, conta: { id, criada }, personagens: [...], ativo }
  aviso: '',        // o que aconteceu ao carregar (arquivo inválido, reserva usada…)
  novoId(prefixo) { return `${prefixo}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e8).toString(36)}`; },
  vazio() { return { v: PERFIS_VERSAO, conta: { id: this.novoId('conta'), criada: Date.now() }, personagens: [], ativo: null }; },
  // Nome: 2 a 16 letras, números, espaço, hífen ou apóstrofo, sem repetir outro personagem da conta
  validarNome(nome, ignorarId = null) {
    const n = String(nome || '').replace(/\s+/g, ' ').trim();
    if (n.length < 2) return { ok: false, nome: n, erro: 'O nome precisa de pelo menos 2 letras.' };
    if (n.length > 16) return { ok: false, nome: n, erro: 'O nome pode ter no máximo 16 caracteres.' };
    if (!/^[\p{L}\p{N}][\p{L}\p{N} '\-]*$/u.test(n)) return { ok: false, nome: n, erro: 'Use só letras, números, espaço, hífen ou apóstrofo.' };
    const D = this.dados || this.carregar();
    if (D.personagens.some((p) => p.id !== ignorarId && p.nome.toLowerCase() === n.toLowerCase())) return { ok: false, nome: n, erro: 'Já existe um personagem com esse nome.' };
    return { ok: true, nome: n, erro: '' };
  },
  // Aparência válida: cada campo dentro das opções (o que faltar ou vier errado volta ao padrão)
  validarAparencia(A, classe) {
    const P = persAparenciaPadrao(classe), out = {};
    if (A && typeof A === 'object' && A.estilo === undefined) A = Object.assign({}, A, persMigrarGLB(A));
    for (const k of PERS_CAMPOS) { const v = A && Number.isInteger(A[k]) ? A[k] : P[k]; out[k] = v >= 0 && v < persNumOps(k, classe) ? v : P[k]; }
    return out;
  },
  validarPersonagem(p) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !/^p_[a-z0-9]+$/.test(p.id) || !PERS_CLASSES[p.classe]) return null;
    const v = this.validarNome(p.nome, p.id);
    const nome = v.ok || /repetido|Já existe/.test(v.erro) ? v.nome : null;
    if (!nome || nome.length < 2 || nome.length > 16) return null;
    return { id: p.id, nome, classe: p.classe, aparencia: this.validarAparencia(p.aparencia, p.classe), opcoes: { ocultarCapacete: !!(p.opcoes && p.opcoes.ocultarCapacete), arma: p.opcoes && typeof p.opcoes.arma === 'string' && WEAPON_DEFS[p.opcoes.arma] ? p.opcoes.arma : null, peitoral: persPeitoral(p.opcoes && p.opcoes.peitoral) },
      criado: +p.criado || Date.now(), atualizado: +p.atualizado || Date.now() };
  },
  validar(D) {
    if (!D || typeof D !== 'object' || !Array.isArray(D.personagens)) return null;
    const out = { v: PERFIS_VERSAO, conta: D.conta && typeof D.conta.id === 'string' ? { id: D.conta.id, criada: +D.conta.criada || Date.now() } : this.vazio().conta, personagens: [], ativo: null };
    this.dados = out;   // (validarNome confere os nomes já aceitos)
    for (const p of D.personagens) { const q = this.validarPersonagem(p); if (q && !out.personagens.some((o) => o.id === q.id)) out.personagens.push(q); }
    out.ativo = out.personagens.some((p) => p.id === D.ativo) ? D.ativo : null;
    return out;
  },
  ler(chave) { try { return JSON.parse(localStorage.getItem(chave) || 'null'); } catch (e) { return undefined; } },
  carregar() {
    const bruto = this.ler(PERFIS_CHAVE);
    let D = bruto === null ? this.vazio() : this.validar(bruto);
    this.aviso = '';
    if (!D) {
      const res = this.ler(PERFIS_CHAVE + '_reserva');
      D = res ? this.validar(res) : null;
      this.aviso = D ? 'Os perfis estavam danificados: a cópia de reserva foi usada.' : 'Os perfis estavam danificados e não havia reserva: começando do zero.';
      if (!D) D = this.vazio();
    }
    this.dados = D;
    for (const p of D.personagens) this.registrar(p);
    return D;
  },
  // Grava (a versão anterior fica como reserva)
  salvar() {
    if (!this.dados) return false;
    try {
      const atual = localStorage.getItem(PERFIS_CHAVE);
      if (atual) localStorage.setItem(PERFIS_CHAVE + '_reserva', atual);
      localStorage.setItem(PERFIS_CHAVE, JSON.stringify(this.dados));
      return true;
    } catch (e) { console.warn('Perfis: não foi possível salvar', e.message); return false; }
  },
  lista() { return (this.dados || this.carregar()).personagens; },
  obter(id) { return this.lista().find((p) => p.id === id) || null; },
  ativo() { const D = this.dados || this.carregar(); return D.ativo ? this.obter(D.ativo) : null; },
  ativar(id) { const D = this.dados || this.carregar(); D.ativo = id && this.obter(id) ? id : null; this.salvar(); },
  // Cria (ou atualiza, com 'id') um personagem; devolve { ok, erro, perfil }
  criar(nome, classe, aparencia, id = null, opcoes = {}) {
    const D = this.dados || this.carregar();
    if (!PERS_CLASSES[classe]) return { ok: false, erro: 'Escolha uma classe.' };
    const v = this.validarNome(nome, id);
    if (!v.ok) return { ok: false, erro: v.erro };
    const agora = Date.now();
    let p = id && this.obter(id);
    const op = { ocultarCapacete: !!opcoes.ocultarCapacete, arma: opcoes.arma && WEAPON_DEFS[opcoes.arma] ? opcoes.arma : null, peitoral: persPeitoral(opcoes.peitoral) };
    if (p) { p.nome = v.nome; p.aparencia = this.validarAparencia(aparencia, p.classe); p.opcoes = op; p.atualizado = agora; }   // a classe não muda depois de criada
    else { p = { id: this.novoId('p'), nome: v.nome, classe, aparencia: this.validarAparencia(aparencia, classe), opcoes: op, criado: agora, atualizado: agora }; D.personagens.push(p); }
    this.registrar(p);
    if (!this.salvar()) return { ok: false, erro: 'Não foi possível salvar no navegador (armazenamento cheio ou bloqueado).', perfil: p };
    return { ok: true, erro: '', perfil: p };
  },
  excluir(id) {
    const D = this.dados || this.carregar();
    D.personagens = D.personagens.filter((p) => p.id !== id);
    if (D.ativo === id) D.ativo = null;
    const def = CHARACTERS_BY_ID[id];
    if (def && def.criado) { delete MODELS3D[def.model]; delete CHARACTERS_BY_ID[id]; delete SKILL_SETS[id]; }
    try { localStorage.removeItem(`${WORLD_SAVE_KEY}:${id}`); localStorage.removeItem(`${WORLD_SAVE_KEY}:${id}_reserva`); } catch (e) {}
    this.salvar();
  },
  // O personagem vira um herói do jogo: ficha (CHARACTERS_BY_ID), árvores da base (progresso
  // próprio), modelo 3D com a aparência (js/criacao/modelo.js)
  registrar(p) {
    const C = PERS_CLASSES[p.classe], B = CHARACTERS_BY_ID[C.base];
    if (!C || !B) return null;
    const def = CHARACTERS_BY_ID[p.id] || (CHARACTERS_BY_ID[p.id] = {});
    Object.assign(def, {
      id: p.id, name: p.nome, title: C.nome, color: C.cor, role: C.papel,
      lore: `${p.nome}, ${C.nome.toLowerCase()} da Resistência. Uma história ainda por escrever nas Ruínas de Carmesin.`,
      stats: Object.assign({}, C.stats), rating: Object.assign({}, C.rating),
      abilities: B.abilities.slice(), armors: B.armors.slice(), weapons: B.weapons.slice(),
      unlock: { type: 'always' }, devStatus: 'ready', model: `criado_${p.id}`, art: null,
      base: C.base, classe: p.classe, criado: true, aparencia: p.aparencia, ver: (def.ver || 0) + 1,
    });
    const set = SKILL_SETS[C.base];
    if (set) SKILL_SETS[p.id] = { trees: set.trees, skills: set.skills, progress: 'party', combo: set.combo };
    if (typeof PersonagemModelo !== 'undefined') PersonagemModelo.registrar(def);
    return def;
  },
};

// ---------------------------------------------------------------------------
// Começo no mundo (World.start, mundo novo do personagem criado): o conjunto do Iniciado (as sete
// peças GLB do nível 1 vão para a mochila do Arsenal e seis já começam vestidas, com o peitoral
// escolhido na criação), a arma escolhida na criação e o
// progresso inicial (2 pontos de habilidade, como os outros heróis)
// ---------------------------------------------------------------------------
const PersCriacao = {
  equiparInicial(perf) {
    const C = PERS_CLASSES[perf.classe];
    if (!C) return;
    if (typeof Arsenal !== 'undefined') {
      Arsenal.inicial(perf.id, true, perf.opcoes && perf.opcoes.peitoral);   // conjunto do Iniciado (js/mundo/armaduras.js)
      if (perf.opcoes && perf.opcoes.ocultarCapacete) Arsenal.S.ocultar.capacete = true;
    }
    if (perf.opcoes && perf.opcoes.arma) RosterManager.equipWeapon(perf.id, perf.opcoes.arma);
    PartyProgress.join(perf.id, 2);
    if (game.player) game.player.recalc(true);
  },
};
