'use strict';
// ECLIPSE ZERO · Efeitos sonoros gerados na ElevenLabs (tools/sfx/gerar_sfx.py); não edite à mão.
// nome do som do jogo → gravações (uma é sorteada a cada vez) e volume
const SFX_GERADOS = {
 "swing": {
  "src": [
   "assets/sfx/gerados/swing.mp3",
   "assets/sfx/gerados/swing_2.mp3"
  ],
  "vol": 0.8
 },
 "swingHeavy": {
  "src": [
   "assets/sfx/gerados/swingHeavy.mp3",
   "assets/sfx/gerados/swingHeavy_2.mp3"
  ],
  "vol": 0.85
 },
 "thrust": {
  "src": [
   "assets/sfx/gerados/thrust.mp3"
  ],
  "vol": 0.8
 },
 "hit": {
  "src": [
   "assets/sfx/gerados/hit.mp3",
   "assets/sfx/gerados/hit_2.mp3"
  ],
  "vol": 0.85
 },
 "hitHeavy": {
  "src": [
   "assets/sfx/gerados/hitHeavy.mp3"
  ],
  "vol": 0.9
 },
 "crit": {
  "src": [
   "assets/sfx/gerados/crit.mp3"
  ],
  "vol": 0.85
 },
 "stomp": {
  "src": [
   "assets/sfx/gerados/stomp.mp3"
  ],
  "vol": 0.95
 },
 "cristais": {
  "src": [
   "assets/sfx/gerados/cristais.mp3"
  ],
  "vol": 0.9
 },
 "cristaisCarga": {
  "src": [
   "assets/sfx/gerados/cristaisCarga.mp3"
  ],
  "vol": 0.75
 },
 "thunder": {
  "src": [
   "assets/sfx/gerados/thunder.mp3"
  ],
  "vol": 0.8
 },
 "zap": {
  "src": [
   "assets/sfx/gerados/zap.mp3",
   "assets/sfx/gerados/zap_2.mp3"
  ],
  "vol": 0.7
 },
 "dash": {
  "src": [
   "assets/sfx/gerados/dash.mp3"
  ],
  "vol": 0.75
 },
 "deflect": {
  "src": [
   "assets/sfx/gerados/deflect.mp3"
  ],
  "vol": 0.8
 },
 "explosion": {
  "src": [
   "assets/sfx/gerados/explosion.mp3"
  ],
  "vol": 0.9
 },
 "fireball": {
  "src": [
   "assets/sfx/gerados/fireball.mp3"
  ],
  "vol": 0.8
 },
 "special": {
  "src": [
   "assets/sfx/gerados/special.mp3"
  ],
  "vol": 0.95
 },
 "specialCharge": {
  "src": [
   "assets/sfx/gerados/specialCharge.mp3"
  ],
  "vol": 0.75
 },
 "chargeTier": {
  "src": [
   "assets/sfx/gerados/chargeTier.mp3"
  ],
  "vol": 0.7
 },
 "hitMetal": {
  "src": [
   "assets/sfx/gerados/hitMetal.mp3",
   "assets/sfx/gerados/hitMetal_2.mp3"
  ],
  "vol": 0.85
 },
 "hitCarne": {
  "src": [
   "assets/sfx/gerados/hitCarne.mp3",
   "assets/sfx/gerados/hitCarne_2.mp3"
  ],
  "vol": 0.85
 },
 "playerHurt": {
  "src": [
   "assets/sfx/gerados/playerHurt.mp3",
   "assets/sfx/gerados/playerHurt_2.mp3"
  ],
  "vol": 0.8
 },
 "poder_arco_voltaico": {
  "src": [
   "assets/sfx/gerados/poder_arco_voltaico.mp3"
  ],
  "vol": 0.85
 },
 "poder_corrente_relampago": {
  "src": [
   "assets/sfx/gerados/poder_corrente_relampago.mp3"
  ],
  "vol": 0.85
 },
 "poder_campo_magnetico": {
  "src": [
   "assets/sfx/gerados/poder_campo_magnetico.mp3"
  ],
  "vol": 1.0
 },
 "poder_ruptura_plasma": {
  "src": [
   "assets/sfx/gerados/poder_ruptura_plasma.mp3"
  ],
  "vol": 0.85
 },
 "poder_investida_sombria": {
  "src": [
   "assets/sfx/gerados/poder_investida_sombria.mp3"
  ],
  "vol": 0.85
 },
 "poder_salto_dimensional": {
  "src": [
   "assets/sfx/gerados/poder_salto_dimensional.mp3"
  ],
  "vol": 0.85
 },
 "poder_tempestade_laminas": {
  "src": [
   "assets/sfx/gerados/poder_tempestade_laminas.mp3"
  ],
  "vol": 0.85
 },
 "poder_sobrecarga": {
  "src": [
   "assets/sfx/gerados/poder_sobrecarga.mp3"
  ],
  "vol": 0.85
 },
 "poder_escudo_energia": {
  "src": [
   "assets/sfx/gerados/poder_escudo_energia.mp3"
  ],
  "vol": 0.85
 },
 "poder_sincronizacao": {
  "src": [
   "assets/sfx/gerados/poder_sincronizacao.mp3"
  ],
  "vol": 0.85
 },
 "poder_lyra_tiro": {
  "src": [
   "assets/sfx/gerados/poder_lyra_tiro.mp3"
  ],
  "vol": 0.85
 },
 "poder_lyra_armadilha": {
  "src": [
   "assets/sfx/gerados/poder_lyra_armadilha.mp3"
  ],
  "vol": 0.85
 },
 "poder_lyra_flecha": {
  "src": [
   "assets/sfx/gerados/poder_lyra_flecha.mp3"
  ],
  "vol": 0.85
 },
 "poder_lyra_foco": {
  "src": [
   "assets/sfx/gerados/poder_lyra_foco.mp3"
  ],
  "vol": 0.85
 },
 "poder_lyra_rajada": {
  "src": [
   "assets/sfx/gerados/poder_lyra_rajada.mp3"
  ],
  "vol": 0.85
 },
 "poder_lyra_chuva_fotons": {
  "src": [
   "assets/sfx/gerados/poder_lyra_chuva_fotons.mp3"
  ],
  "vol": 0.85
 },
 "poder_drakos_golpe": {
  "src": [
   "assets/sfx/gerados/poder_drakos_golpe.mp3"
  ],
  "vol": 0.85
 },
 "poder_drakos_escudo": {
  "src": [
   "assets/sfx/gerados/poder_drakos_escudo.mp3"
  ],
  "vol": 0.85
 },
 "poder_drakos_investida": {
  "src": [
   "assets/sfx/gerados/poder_drakos_investida.mp3"
  ],
  "vol": 0.85
 },
 "poder_drakos_zona": {
  "src": [
   "assets/sfx/gerados/poder_drakos_zona.mp3"
  ],
  "vol": 0.85
 },
 "poder_drakos_terremoto": {
  "src": [
   "assets/sfx/gerados/poder_drakos_terremoto.mp3"
  ],
  "vol": 0.85
 },
 "poder_sera_drone": {
  "src": [
   "assets/sfx/gerados/poder_sera_drone.mp3"
  ],
  "vol": 0.85
 },
 "poder_sera_campo": {
  "src": [
   "assets/sfx/gerados/poder_sera_campo.mp3"
  ],
  "vol": 0.85
 },
 "poder_sera_hack": {
  "src": [
   "assets/sfx/gerados/poder_sera_hack.mp3"
  ],
  "vol": 0.85
 },
 "poder_sera_cura": {
  "src": [
   "assets/sfx/gerados/poder_sera_cura.mp3"
  ],
  "vol": 0.85
 },
 "poder_orion_furtividade": {
  "src": [
   "assets/sfx/gerados/poder_orion_furtividade.mp3"
  ],
  "vol": 0.85
 },
 "poder_orion_duplo": {
  "src": [
   "assets/sfx/gerados/poder_orion_duplo.mp3"
  ],
  "vol": 0.85
 },
 "poder_orion_lamina": {
  "src": [
   "assets/sfx/gerados/poder_orion_lamina.mp3"
  ],
  "vol": 0.85
 },
 "poder_orion_furia": {
  "src": [
   "assets/sfx/gerados/poder_orion_furia.mp3"
  ],
  "vol": 0.85
 },
 "poder_drakos_muralha": {
  "src": [
   "assets/sfx/gerados/poder_drakos_muralha.mp3"
  ],
  "vol": 0.85
 },
 "poder_drakos_canhao": {
  "src": [
   "assets/sfx/gerados/poder_drakos_canhao.mp3"
  ],
  "vol": 0.85
 },
 "poder_drakos_grito": {
  "src": [
   "assets/sfx/gerados/poder_drakos_grito.mp3"
  ],
  "vol": 0.85
 },
 "poder_sera_sentinela": {
  "src": [
   "assets/sfx/gerados/poder_sera_sentinela.mp3"
  ],
  "vol": 0.85
 },
 "poder_sera_pulso": {
  "src": [
   "assets/sfx/gerados/poder_sera_pulso.mp3"
  ],
  "vol": 0.85
 },
 "poder_sera_apagao": {
  "src": [
   "assets/sfx/gerados/poder_sera_apagao.mp3"
  ],
  "vol": 0.85
 },
 "poder_sera_injecao": {
  "src": [
   "assets/sfx/gerados/poder_sera_injecao.mp3"
  ],
  "vol": 0.85
 },
 "poder_orion_fumaca": {
  "src": [
   "assets/sfx/gerados/poder_orion_fumaca.mp3"
  ],
  "vol": 0.85
 },
 "poder_orion_leque": {
  "src": [
   "assets/sfx/gerados/poder_orion_leque.mp3"
  ],
  "vol": 0.85
 },
 "especial_kael": {
  "src": [
   "assets/sfx/gerados/especial_kael.mp3"
  ],
  "vol": 0.85
 },
 "especial_lyra": {
  "src": [
   "assets/sfx/gerados/especial_lyra.mp3"
  ],
  "vol": 0.85
 },
 "especial_drakos": {
  "src": [
   "assets/sfx/gerados/especial_drakos.mp3"
  ],
  "vol": 0.85
 },
 "especial_sera": {
  "src": [
   "assets/sfx/gerados/especial_sera.mp3"
  ],
  "vol": 0.85
 },
 "especial_orion": {
  "src": [
   "assets/sfx/gerados/especial_orion.mp3"
  ],
  "vol": 0.85
 },
 "arrow": {
  "src": [
   "assets/sfx/gerados/arrow.mp3",
   "assets/sfx/gerados/arrow_2.mp3"
  ],
  "vol": 0.8
 }
};
