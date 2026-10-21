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
    newWeapon: 'NOVA ARMA DESBLOQUEADA',
    abilities: 'HABILIDADES',
    armors: 'ARMADURAS',
    weapons: 'ARMAS E EQUIPAMENTOS',
    everyone: 'Todos',
    // Árvores de habilidades (js/screens.js): árvores de outros personagens só para consulta
    skillsReadOnly: 'SÓ CONSULTA',
    skillsMain: 'HABILIDADE PRINCIPAL',
    skillsLocked: 'Disponível quando {name} entrar no grupo',
    skillsSoonDetail: '{name} já está no grupo. As habilidades chegam numa próxima atualização.',
    skillsSoonDeny: '{name} ainda está em desenvolvimento: árvores só para consulta',
    skillsInactive: 'Escolha {name} para aprender estas habilidades',
    skillsInactiveDetail: 'Só o personagem ativo aprende habilidades.',
    // Condições de desbloqueio
    unlockAlways: 'Disponível desde o início',
    unlockLevel: 'Alcançar Nível {n}',
    unlockChapter: 'Conclua o Capítulo {n}',
    unlockQuest: 'Conclua a missão "{name}"',
    unlockBoss: 'Derrote {name}',
    unlockFlag: '{name}',
    // Tela de personagens (js/rosterscreen.js)
    selectTitle: 'SELEÇÃO DE PERSONAGEM',
    rosterTitle: 'PERSONAGENS',
    tabCharacters: 'PERSONAGENS',
    tabArmors: 'ARMADURAS',
    tabWeapons: 'ARMAS',
    confirm: 'CONFIRMAR',
    back: 'VOLTAR',
    choose: 'ESCOLHER',
    changeTab: 'ABA',
    equip: 'EQUIPAR',
    equipped: 'EQUIPADA',
    ultimate: 'SUPREMA',
    statHp: 'VIDA', statEnergy: 'ENERGIA', statAttack: 'ATAQUE', statDefense: 'DEFESA', statSpeed: 'VELOCIDADE',
    combatLocked: 'Indisponível durante o combate',
    swapReady: 'Setor liberado: troca de personagem disponível',
    swapCombat: 'Em combate: a troca de personagem exige o setor liberado',
    switched: '{name} entra em campo',
    alreadyActive: '{name} já está em campo',
    lockedMsg: '{name}: personagem bloqueado. {cond}',
    comingSoonMsg: '{name} ainda está em desenvolvimento (EM BREVE)',
    soonNote: 'Em desenvolvimento: ainda não selecionável',
    lockedNote: 'Kael ainda não encontrou este aliado na jornada.',
    lockedF: 'BLOQUEADA',
    preview: 'PRÉVIA',
    modsTitle: 'MODIFICADORES',
    statsTitle: 'ATRIBUTOS',
    character: 'PERSONAGEM',
    newGameHint: 'Só Kael desperta no início; os aliados chegam pela história.',
    charLockedArmor: 'Libere {name} para trocar a armadura',
    armorLockedMsg: 'Armadura bloqueada. {cond}',
    armorEquippedMsg: 'Armadura equipada: {armor} · {name}',
    armorAlready: 'Esta armadura já está equipada',
    armorWornBy: 'Equipada em {name}',
    armorFree: 'Liberada: confirme para equipar',
    armorsOf: 'ARMADURAS · {name}',
    armorOf: 'ARMADURA DE {name}',
    armorShared: 'COMPARTILHADA POR TODOS',
    armorPreviewNote: 'Prévia: a troca visual e os modificadores das armaduras entram numa próxima atualização.',
    noMods: 'Sem modificadores (visual original)',
    modHp: '{v} de vida', modEnergy: '{v} de energia', modArmor: '{v}% de defesa', modSpeed: '{v}% de velocidade',
    modDmg: '{v}% de dano', modCrit: '{v}% de chance de crítico', modCdr: '{v}% no tempo de recarga',
    weaponsTitle: 'ARMAS E EQUIPAMENTOS',
    weaponOf: 'EQUIPAMENTO DE {name}',
    weaponShared: 'EQUIPAMENTO COMPARTILHADO',
    weaponInUse: 'Em uso',
    weaponsFixed: 'Nesta versão cada personagem usa as próprias armas.',
    weaponEquippedMsg: 'Arma equipada: {weapon} · {name}',
    weaponAlready: 'Esta arma já está equipada',
    charLockedWeapon: 'Libere {name} para equipar esta arma',
    weaponLockedMsg: 'Arma bloqueada. {cond}',
    newWeapon: 'Nova arma desbloqueada',
    wDmg: 'Dano {v}', wRange: 'Alcance {v}', wRadius: 'Raio {v}', wDps: '{v} de dano por segundo', wHits: '{v} golpes', wDuration: '{v} s de duração',
    abilityCost: '{v} de energia', abilityCd: 'recarga {v} s',
    typeMelee: 'Corpo a corpo', typeProjectile: 'Projétil', typeAoe: 'Área', typeBuff: 'Fortalecimento', typeSummon: 'Invocação',
    typeTrap: 'Armadilha', typeMobility: 'Mobilidade', typeShield: 'Defesa', typeStealth: 'Furtividade',
    // Console de desenvolvimento (js/devtools.js): só aparece em modo dev
    devTitle: 'CONSOLE DE DESENVOLVIMENTO',
    devHelp: 'Comandos: unlock_all · lock_all · unlock <id> · set_char <id> · inspect · help. Ids: {ids}',
    devUnlockAll: 'Tudo liberado: {n} personagens e {a} armaduras',
    devLockAll: 'Elenco bloqueado: só {name} e as armaduras iniciais',
    devUnlocked: 'Liberado: {name}',
    devUnlockedSoon: 'Liberado: {name} (EM BREVE)',
    devAlready: 'Sem mudança: {name} já estava entre os liberados',
    devRowUnlockAll: 'Libera todos os personagens e armaduras',
    devRowLockAll: 'Volta ao elenco inicial',
    devRowUnlock: 'Libera um personagem',
    devRowSetChar: 'Põe o personagem em campo',
    devRowHelp: 'Lista os comandos',
    devRowInspect: 'Inspetor 3D: vistas do modelo, ossos e arte',
    devInspect: 'Inspetor 3D aberto (Esc fecha)',
    devUnknown: 'Id desconhecido: "{id}". Use: {ids}',
    devUnknownCmd: 'Comando desconhecido: "{cmd}". Digite help',
    devNeedId: 'Informe um id: {cmd} <id> ({ids})',
    devLockedHint: '{msg} (use unlock {id})',
    devHints: '↑↓ comando · ←→ id · Enter executa · digite um comando · ` ou Esc fecha',
    devState: 'Ativo: {active} · Liberados: {list}',
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
