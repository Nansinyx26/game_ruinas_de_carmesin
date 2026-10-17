'use strict';
// ECLIPSE ZERO · Textos de interface do sistema de personagens (preparado para tradução)
// ---------------------------------------------------------------------------
// TEXTOS: tudo que o roster mostra na tela passa por t(chave, valores). Para
// traduzir, acrescente outro idioma em UI_TEXT e troque UI_LANG. Nomes, lore e
// descrições dos personagens ficam nos próprios arquivos de dados (js/data/).
// ---------------------------------------------------------------------------
const UI_LANG = 'pt-BR';
const UI_TEXT = {
  'pt-BR': {
    comingSoon: 'EM BREVE',
    inDevelopment: 'Em desenvolvimento',
    locked: 'BLOQUEADO',
    available: 'DISPONÍVEL',
    active: 'ATIVO',
    newAlly: 'NOVO ALIADO DESBLOQUEADO',
    newAllySoon: 'NOVO ALIADO DESBLOQUEADO · EM BREVE',
    allyRejoined: 'ALIADO REENCONTRADO',   // novo ciclo: a história recomeça com o aliado já liberado
    newArmor: 'NOVA ARMADURA DESBLOQUEADA',
    abilities: 'HABILIDADES',
    armors: 'ARMADURAS',
    weapons: 'ARMAS E EQUIPAMENTOS',
    everyone: 'Todos',
    // Condições de desbloqueio
    unlockAlways: 'Disponível desde o início',
    unlockChapter: 'Conclua o Capítulo {n}',
    unlockQuest: 'Conclua a missão "{name}"',
    unlockBoss: 'Derrote {name}',
    unlockFlag: '{name}',
  },
};
// Texto da interface com valores: t('unlockChapter', { n: 2 }) → "Conclua o Capítulo 2"
function t(key, vars) {
  const pack = UI_TEXT[UI_LANG] || UI_TEXT['pt-BR'];
  let s = pack[key] !== undefined ? pack[key] : (UI_TEXT['pt-BR'][key] !== undefined ? UI_TEXT['pt-BR'][key] : key);
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}
// Algarismos romanos dos capítulos (a história usa "CAPÍTULO III")
function romanNumeral(n) {
  const R = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of R) while (n >= v) { s += r; n -= v; }
  return s;
}
