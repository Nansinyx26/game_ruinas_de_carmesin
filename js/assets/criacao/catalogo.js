'use strict';
// ECLIPSE ZERO · catálogo das peças da criação de personagem (tools/importar_criacao.py)
// Cada peça: id, tipo (corpo, rosto, cabelo, barba, peca), nome, vaga, classe e nível (armaduras),
// o GLB de origem (arq), a miniatura (mini) e o arquivo convertido (js, carregado sob demanda).
// Não edite à mão: rode o conversor de novo.
const CRIA_CATALOGO = [
 {
  "id": "corpo_m",
  "tipo": "corpo",
  "nome": "Masculino",
  "arq": "assets/Criar_Personagem/Corpo_Masculino/Corpo_Masculino.glb",
  "mini": "assets/Criar_Personagem/Corpo_Masculino/Corpor_Mascuilino.png",
  "js": "js/assets/criacao/corpo_m.js",
  "convertido": true
 },
 {
  "id": "corpo_f",
  "tipo": "corpo",
  "nome": "Feminino",
  "arq": "assets/Criar_Personagem/Corpo_Feminino/Corpo_Feminino.glb",
  "mini": "assets/Criar_Personagem/Corpo_Feminino/Corpo_Feminino.png",
  "js": "js/assets/criacao/corpo_f.js",
  "convertido": true
 },
 {
  "id": "rosto_1",
  "tipo": "rosto",
  "nome": "Rosto 1",
  "arq": "assets/Criar_Personagem/Rosto/Rosto_1.glb",
  "mini": "assets/Criar_Personagem/Rosto/rosto_1.png",
  "js": "js/assets/criacao/rosto_1.js",
  "convertido": true
 },
 {
  "id": "rosto_2",
  "tipo": "rosto",
  "nome": "Rosto 2",
  "arq": "assets/Criar_Personagem/Rosto/rosto_2.glb",
  "mini": "assets/Criar_Personagem/Rosto/rosto_2.png",
  "js": "js/assets/criacao/rosto_2.js",
  "convertido": true
 },
 {
  "id": "rosto_3",
  "tipo": "rosto",
  "nome": "Rosto 3",
  "arq": "assets/Criar_Personagem/Rosto/rosto_3.glb",
  "mini": "assets/Criar_Personagem/Rosto/rosto_3.png",
  "js": "js/assets/criacao/rosto_3.js",
  "convertido": true
 },
 {
  "id": "rosto_4",
  "tipo": "rosto",
  "nome": "Rosto 4",
  "arq": "assets/Criar_Personagem/Rosto/rosto_4.glb",
  "mini": "assets/Criar_Personagem/Rosto/rosto_4.png",
  "js": "js/assets/criacao/rosto_4.js",
  "convertido": true
 },
 {
  "id": "rosto_5",
  "tipo": "rosto",
  "nome": "Rosto 5",
  "arq": "assets/Criar_Personagem/Rosto/rosto_5.glb",
  "mini": "assets/Criar_Personagem/Rosto/rosto_5.png",
  "js": "js/assets/criacao/rosto_5.js",
  "convertido": true
 },
 {
  "id": "rosto_6",
  "tipo": "rosto",
  "nome": "Rosto 6",
  "arq": "assets/Criar_Personagem/Rosto/rosto_6.glb",
  "mini": "assets/Criar_Personagem/Rosto/rosto_6.png",
  "js": "js/assets/criacao/rosto_6.js",
  "convertido": true
 },
 {
  "id": "rosto_7",
  "tipo": "rosto",
  "nome": "Rosto 7",
  "arq": "assets/Criar_Personagem/Rosto/rosto_7.glb",
  "mini": "assets/Criar_Personagem/Rosto/rosto_7.png",
  "js": "js/assets/criacao/rosto_7.js",
  "convertido": true
 },
 {
  "id": "rosto_8",
  "tipo": "rosto",
  "nome": "Rosto 8",
  "arq": "assets/Criar_Personagem/Rosto/rosto_8.glb",
  "mini": "assets/Criar_Personagem/Rosto/rosto_8.png",
  "js": "js/assets/criacao/rosto_8.js",
  "convertido": true
 },
 {
  "id": "cabelo_1",
  "tipo": "cabelo",
  "nome": "Cabelo 1",
  "arq": "assets/Criar_Personagem/Cabelo/cabelo_1.glb",
  "mini": "assets/Criar_Personagem/Cabelo/cabelo_1.png",
  "js": "js/assets/criacao/cabelo_1.js",
  "convertido": true
 },
 {
  "id": "cabelo_2",
  "tipo": "cabelo",
  "nome": "Cabelo 2",
  "arq": "assets/Criar_Personagem/Cabelo/Cabelo_2.glb",
  "mini": "assets/Criar_Personagem/Cabelo/cabelo_2.png",
  "js": "js/assets/criacao/cabelo_2.js",
  "convertido": true
 },
 {
  "id": "cabelo_3",
  "tipo": "cabelo",
  "nome": "Cabelo 3",
  "arq": "assets/Criar_Personagem/Cabelo/Cabelo_3.glb",
  "mini": "assets/Criar_Personagem/Cabelo/Cabelo_3.png",
  "js": "js/assets/criacao/cabelo_3.js",
  "convertido": true
 },
 {
  "id": "cabelo_4",
  "tipo": "cabelo",
  "nome": "Cabelo 4",
  "arq": "assets/Criar_Personagem/Cabelo/Cabelo_4.glb",
  "mini": "assets/Criar_Personagem/Cabelo/Cabelo_4.png",
  "js": "js/assets/criacao/cabelo_4.js",
  "convertido": true
 },
 {
  "id": "cabelo_5",
  "tipo": "cabelo",
  "nome": "Cabelo 5",
  "arq": "assets/Criar_Personagem/Cabelo/Cabelo_5.glb",
  "mini": "assets/Criar_Personagem/Cabelo/cabelo_5.png",
  "js": "js/assets/criacao/cabelo_5.js",
  "convertido": true
 },
 {
  "id": "cabelo_6",
  "tipo": "cabelo",
  "nome": "Cabelo 6",
  "arq": "assets/Criar_Personagem/Cabelo/Cabelo_6.glb",
  "mini": "assets/Criar_Personagem/Cabelo/cabelo_6.png",
  "js": "js/assets/criacao/cabelo_6.js",
  "convertido": true
 },
 {
  "id": "cabelo_7",
  "tipo": "cabelo",
  "nome": "Cabelo 7",
  "arq": "assets/Criar_Personagem/Cabelo/cabelo_7.glb",
  "mini": "assets/Criar_Personagem/Cabelo/cabelo_7.png",
  "js": "js/assets/criacao/cabelo_7.js",
  "convertido": true
 },
 {
  "id": "cabelo_8",
  "tipo": "cabelo",
  "nome": "Cabelo 8",
  "arq": "assets/Criar_Personagem/Cabelo/Cabelo_8.glb",
  "mini": "assets/Criar_Personagem/Cabelo/cabelo_8.png",
  "js": "js/assets/criacao/cabelo_8.js",
  "convertido": true
 },
 {
  "id": "barba_cacheada",
  "tipo": "barba",
  "nome": "Barba Cacheada",
  "arq": "assets/Criar_Personagem/Barbas/Barba_Cacheada.glb",
  "mini": "assets/Criar_Personagem/Barbas/Barba_Cacheada.png",
  "js": "js/assets/criacao/barba_cacheada.js",
  "convertido": true
 },
 {
  "id": "barba_curta",
  "tipo": "barba",
  "nome": "Barba Curta",
  "arq": "assets/Criar_Personagem/Barbas/Barba_Curta.glb",
  "mini": "assets/Criar_Personagem/Barbas/Barba_Curta.png",
  "js": "js/assets/criacao/barba_curta.js",
  "convertido": true
 },
 {
  "id": "barba_longa",
  "tipo": "barba",
  "nome": "Barba Longa",
  "arq": "assets/Criar_Personagem/Barbas/Barba_Longa.glb",
  "mini": "assets/Criar_Personagem/Barbas/Barba_Longa.png",
  "js": "js/assets/criacao/barba_longa.js",
  "convertido": true
 },
 {
  "id": "barba_media",
  "tipo": "barba",
  "nome": "Barba Média",
  "arq": "assets/Criar_Personagem/Barbas/Barba_Média.glb",
  "mini": "assets/Criar_Personagem/Barbas/Barba_Média.png",
  "js": "js/assets/criacao/barba_media.js",
  "convertido": true
 },
 {
  "id": "barba_viking",
  "tipo": "barba",
  "nome": "Barba Viking",
  "arq": "assets/Criar_Personagem/Barbas/Barba_Viking.glb",
  "mini": "assets/Criar_Personagem/Barbas/Barba_Viking.png",
  "js": "js/assets/criacao/barba_viking.js",
  "convertido": true
 },
 {
  "id": "ini_capuz",
  "tipo": "peca",
  "nome": "Capuz do Iniciado",
  "arq": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/Capuz_level_1.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/Capuz_level_1.png",
  "js": "js/assets/criacao/ini_capuz.js",
  "vaga": "capacete",
  "nivel": 1,
  "convertido": true
 },
 {
  "id": "ini_peitoral",
  "tipo": "peca",
  "nome": "Gibão do Iniciado",
  "arq": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/Peitoral_leve_level_1.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/Peitoral_leve_level_1.png",
  "js": "js/assets/criacao/ini_peitoral.js",
  "vaga": "peitoral",
  "nivel": 1,
  "convertido": true
 },
 {
  "id": "ini_armadura",
  "tipo": "peca",
  "nome": "Couraça do Iniciado",
  "arq": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/madura_pesada_level1.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/madura_pesada_level1.png",
  "js": "js/assets/criacao/ini_armadura.js",
  "vaga": "peitoral",
  "nivel": 1,
  "ombros": true,
  "convertido": true
 },
 {
  "id": "ini_luvas",
  "tipo": "peca",
  "nome": "Luvas do Iniciado",
  "arq": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/Luvas_level_1.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/Luvas_level_1.png",
  "js": "js/assets/criacao/ini_luvas.js",
  "vaga": "luvas",
  "nivel": 1,
  "esconde": [
   "maos"
  ],
  "convertido": true
 },
 {
  "id": "ini_calca",
  "tipo": "peca",
  "nome": "Calças do Iniciado",
  "arq": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/Calça_level_1.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/Calça_level_1.png",
  "js": "js/assets/criacao/ini_calca.js",
  "vaga": "calcas",
  "nivel": 1,
  "esconde": [
   "pernas"
  ],
  "convertido": true
 },
 {
  "id": "ini_botas",
  "tipo": "peca",
  "nome": "Botas do Iniciado",
  "arq": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/Bota_level_1.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/Bota_level_1.png",
  "js": "js/assets/criacao/ini_botas.js",
  "vaga": "botas",
  "nivel": 1,
  "esconde": [
   "pes"
  ],
  "convertido": true
 },
 {
  "id": "ini_capa",
  "tipo": "peca",
  "nome": "Capa do Iniciado",
  "arq": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/Capa_level_1.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Inicial_Level_1/Capa_level_1.png",
  "js": "js/assets/criacao/ini_capa.js",
  "vaga": "capa",
  "nivel": 1,
  "convertido": true
 },
 {
  "id": "n30_assassino_peitoral",
  "tipo": "peca",
  "nome": "Peitoral e Ombreiras de Couro do Assassino",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Amardura_Assasino.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Amardura_Assasino.png",
  "js": "js/assets/criacao/n30_assassino_peitoral.js",
  "vaga": "peitoral",
  "classe": "assassino",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_assassino_capa",
  "tipo": "peca",
  "nome": "Capa do Assassino",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/capa_assasino.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/capa_Assasino.png",
  "js": "js/assets/criacao/n30_assassino_capa.js",
  "vaga": "capa",
  "classe": "assassino",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_assassino_luvas",
  "tipo": "peca",
  "nome": "Luvas de Couro do Assassino",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Luvas_Assasino.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Luvas_Assasino.png",
  "js": "js/assets/criacao/n30_assassino_luvas.js",
  "vaga": "luvas",
  "classe": "assassino",
  "nivel": 30,
  "esconde": [
   "maos"
  ],
  "convertido": true
 },
 {
  "id": "n30_assassino_capacete",
  "tipo": "peca",
  "nome": "Capuz do Assassino",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Capuz_Assasino.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Capuz_Assasino.png",
  "js": "js/assets/criacao/n30_assassino_capacete.js",
  "vaga": "capacete",
  "classe": "assassino",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_assassino_calcas",
  "tipo": "peca",
  "nome": "Calças de Couro do Assassino",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/calça_Assasino.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/calça_Assasino.png",
  "js": "js/assets/criacao/n30_assassino_calcas.js",
  "vaga": "calcas",
  "classe": "assassino",
  "nivel": 30,
  "esconde": [
   "pernas"
  ],
  "convertido": true
 },
 {
  "id": "n30_assassino_botas",
  "tipo": "peca",
  "nome": "Botas de Couro do Assassino",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Botas_Assasino.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Botas_Assasino.png",
  "js": "js/assets/criacao/n30_assassino_botas.js",
  "vaga": "botas",
  "classe": "assassino",
  "nivel": 30,
  "esconde": [
   "pes"
  ],
  "convertido": true
 },
 {
  "id": "n30_assassino_acessorio",
  "tipo": "peca",
  "nome": "Amuleto de Cristal do Assassino",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/amuleto_Assasino.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/amuleto_Assasino.png",
  "js": "js/assets/criacao/n30_assassino_acessorio.js",
  "vaga": "acessorio",
  "classe": "assassino",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_guerreiro_peitoral",
  "tipo": "peca",
  "nome": "Peitoral e Ombreiras de Placas do Guerreiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Peitoral_Guerreiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Peitoral_Guerreiro.png",
  "js": "js/assets/criacao/n30_guerreiro_peitoral.js",
  "vaga": "peitoral",
  "classe": "guerreiro",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_guerreiro_capa",
  "tipo": "peca",
  "nome": "Capa do Guerreiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/capa_Guerreiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/capa_Guerreiro.png",
  "js": "js/assets/criacao/n30_guerreiro_capa.js",
  "vaga": "capa",
  "classe": "guerreiro",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_guerreiro_luvas",
  "tipo": "peca",
  "nome": "Luvas de Couro do Guerreiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Luva_Guerreiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Luva_Guerreiro.png",
  "js": "js/assets/criacao/n30_guerreiro_luvas.js",
  "vaga": "luvas",
  "classe": "guerreiro",
  "nivel": 30,
  "esconde": [
   "maos"
  ],
  "convertido": true
 },
 {
  "id": "n30_guerreiro_capacete",
  "tipo": "peca",
  "nome": "Capuz do Guerreiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/capuz_Guerreiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/capuz_Guerreiro.png",
  "js": "js/assets/criacao/n30_guerreiro_capacete.js",
  "vaga": "capacete",
  "classe": "guerreiro",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_guerreiro_calcas",
  "tipo": "peca",
  "nome": "Calças de Couro do Guerreiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/calça_Guerreiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/calça_Guerreiro.png",
  "js": "js/assets/criacao/n30_guerreiro_calcas.js",
  "vaga": "calcas",
  "classe": "guerreiro",
  "nivel": 30,
  "esconde": [
   "pernas"
  ],
  "convertido": true
 },
 {
  "id": "n30_guerreiro_botas",
  "tipo": "peca",
  "nome": "Botas de Couro do Guerreiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Botas_Guerreiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Botas_Guerreiro.png",
  "js": "js/assets/criacao/n30_guerreiro_botas.js",
  "vaga": "botas",
  "classe": "guerreiro",
  "nivel": 30,
  "esconde": [
   "pes"
  ],
  "convertido": true
 },
 {
  "id": "n30_guerreiro_acessorio",
  "tipo": "peca",
  "nome": "Amuleto de Cristal do Guerreiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Amuleto_Guerreiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Amuleto_Guerreiro.png",
  "js": "js/assets/criacao/n30_guerreiro_acessorio.js",
  "vaga": "acessorio",
  "classe": "guerreiro",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_mago_peitoral",
  "tipo": "peca",
  "nome": "Peitoral e Ombreiras de Tecido e Cristal do Mago",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Peitoral_Mago.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Peitoral_Mago.png",
  "js": "js/assets/criacao/n30_mago_peitoral.js",
  "vaga": "peitoral",
  "classe": "mago",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_mago_capa",
  "tipo": "peca",
  "nome": "Capa do Mago",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/capa_Mago.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/capa_Mago.png",
  "js": "js/assets/criacao/n30_mago_capa.js",
  "vaga": "capa",
  "classe": "mago",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_mago_luvas",
  "tipo": "peca",
  "nome": "Luvas de Tecido do Mago",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Luvas_Mago.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Luvas_Mago.png",
  "js": "js/assets/criacao/n30_mago_luvas.js",
  "vaga": "luvas",
  "classe": "mago",
  "nivel": 30,
  "esconde": [
   "maos"
  ],
  "convertido": true
 },
 {
  "id": "n30_mago_capacete",
  "tipo": "peca",
  "nome": "Capuz do Mago",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/capuz_Mago.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/capuz_Mago.png",
  "js": "js/assets/criacao/n30_mago_capacete.js",
  "vaga": "capacete",
  "classe": "mago",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_mago_calcas",
  "tipo": "peca",
  "nome": "Calças de Tecido do Mago",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/calça_Mago.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/calça_Mago.png",
  "js": "js/assets/criacao/n30_mago_calcas.js",
  "vaga": "calcas",
  "classe": "mago",
  "nivel": 30,
  "esconde": [
   "pernas"
  ],
  "convertido": true
 },
 {
  "id": "n30_mago_botas",
  "tipo": "peca",
  "nome": "Botas de Couro do Mago",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/bota_Mago.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/bota_Mago.png",
  "js": "js/assets/criacao/n30_mago_botas.js",
  "vaga": "botas",
  "classe": "mago",
  "nivel": 30,
  "esconde": [
   "pes"
  ],
  "convertido": true
 },
 {
  "id": "n30_mago_acessorio",
  "tipo": "peca",
  "nome": "Amuleto de Cristal do Mago",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/amuleto_Mago.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/amuleto_Mago.png",
  "js": "js/assets/criacao/n30_mago_acessorio.js",
  "vaga": "acessorio",
  "classe": "mago",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_patrulheiro_peitoral",
  "tipo": "peca",
  "nome": "Peitoral e Ombreiras de Couro do Patrulheiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/Armadura_Patrulheiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/Armadura_Patrulheiro.png",
  "js": "js/assets/criacao/n30_patrulheiro_peitoral.js",
  "vaga": "peitoral",
  "classe": "patrulheiro",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_patrulheiro_capa",
  "tipo": "peca",
  "nome": "Capa do Patrulheiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/capa_patrulheiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/capa_patrulheiro.png",
  "js": "js/assets/criacao/n30_patrulheiro_capa.js",
  "vaga": "capa",
  "classe": "patrulheiro",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_patrulheiro_luvas",
  "tipo": "peca",
  "nome": "Luvas de Couro do Patrulheiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/luvas_patrulheiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/luvas_patrulheiro.png",
  "js": "js/assets/criacao/n30_patrulheiro_luvas.js",
  "vaga": "luvas",
  "classe": "patrulheiro",
  "nivel": 30,
  "esconde": [
   "maos"
  ],
  "convertido": true
 },
 {
  "id": "n30_patrulheiro_capacete",
  "tipo": "peca",
  "nome": "Capuz do Patrulheiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/capuz_patrulheiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/capuz_patrulheiro.png",
  "js": "js/assets/criacao/n30_patrulheiro_capacete.js",
  "vaga": "capacete",
  "classe": "patrulheiro",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_patrulheiro_calcas",
  "tipo": "peca",
  "nome": "Calças de Couro do Patrulheiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/calça_patrulheiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/calça_patrulheiro.png",
  "js": "js/assets/criacao/n30_patrulheiro_calcas.js",
  "vaga": "calcas",
  "classe": "patrulheiro",
  "nivel": 30,
  "esconde": [
   "pernas"
  ],
  "convertido": true
 },
 {
  "id": "n30_patrulheiro_botas",
  "tipo": "peca",
  "nome": "Botas de Couro do Patrulheiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/bota_patrulheiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/bota_patrulheiro.png",
  "js": "js/assets/criacao/n30_patrulheiro_botas.js",
  "vaga": "botas",
  "classe": "patrulheiro",
  "nivel": 30,
  "esconde": [
   "pes"
  ],
  "convertido": true
 },
 {
  "id": "n30_patrulheiro_acessorio",
  "tipo": "peca",
  "nome": "Amuleto de Cristal do Patrulheiro",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/amulerto_patrulheiro.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/amulerto_patrulheiro.png",
  "js": "js/assets/criacao/n30_patrulheiro_acessorio.js",
  "vaga": "acessorio",
  "classe": "patrulheiro",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_guardiao_peitoral",
  "tipo": "peca",
  "nome": "Peitoral do Guardião Arcano",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/Peitoral_Guardião_Arcano.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/Peitoral_Guardião_Arcano.png",
  "js": "js/assets/criacao/n30_guardiao_peitoral.js",
  "vaga": "peitoral",
  "classe": "guardiao",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_guardiao_capa",
  "tipo": "peca",
  "nome": "Capa do Guardião Arcano",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/capa_Guardião_Arcano.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/capa_Guardião_Arcano.png",
  "js": "js/assets/criacao/n30_guardiao_capa.js",
  "vaga": "capa",
  "classe": "guardiao",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_guardiao_luvas",
  "tipo": "peca",
  "nome": "Luvas do Guardião Arcano",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/Luvas_Guardião_Arcano.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/Luvas_Guardião_Arcano.png",
  "js": "js/assets/criacao/n30_guardiao_luvas.js",
  "vaga": "luvas",
  "classe": "guardiao",
  "nivel": 30,
  "esconde": [
   "maos"
  ],
  "convertido": true
 },
 {
  "id": "n30_guardiao_capacete",
  "tipo": "peca",
  "nome": "Capuz do Guardião Arcano",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/capuz_Guardião_Arcano.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/capuz_Guardião_Arcano.png",
  "js": "js/assets/criacao/n30_guardiao_capacete.js",
  "vaga": "capacete",
  "classe": "guardiao",
  "nivel": 30,
  "convertido": true
 },
 {
  "id": "n30_guardiao_calcas",
  "tipo": "peca",
  "nome": "Calças do Guardião Arcano",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/calça_Guardião_Arcano.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/calça_Guardião_Arcano.png",
  "js": "js/assets/criacao/n30_guardiao_calcas.js",
  "vaga": "calcas",
  "classe": "guardiao",
  "nivel": 30,
  "esconde": [
   "pernas"
  ],
  "convertido": true
 },
 {
  "id": "n30_guardiao_botas",
  "tipo": "peca",
  "nome": "Botas do Guardião Arcano",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/botas_Guardião_Arcano.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/botas_Guardião_Arcano.png",
  "js": "js/assets/criacao/n30_guardiao_botas.js",
  "vaga": "botas",
  "classe": "guardiao",
  "nivel": 30,
  "esconde": [
   "pes"
  ],
  "convertido": true
 },
 {
  "id": "n30_guardiao_acessorio",
  "tipo": "peca",
  "nome": "Amuleto do Guardião Arcano",
  "arq": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/amuleto_Guardião_Arcano.glb",
  "mini": "assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/amuleto_Guardião_Arcano.png",
  "js": "js/assets/criacao/n30_guardiao_acessorio.js",
  "vaga": "acessorio",
  "classe": "guardiao",
  "nivel": 30,
  "convertido": true
 }
];
