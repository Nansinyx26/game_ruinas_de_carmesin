'use strict';
// ECLIPSE ZERO · Camada comum de animação dos personagens (Animacao)
// ---------------------------------------------------------------------------
// Somada DEPOIS da pose de cada modelo (js/models/*.js, o personagem criado, os moradores) e ANTES
// da transição entre poses do motor (R3D.misturar), nos ossos que todos têm com o mesmo nome
// ('head', 'torso'). Não troca nenhuma pose — cada personagem continua com a coreografia, as
// proporções e o jeito de andar dele; só acrescenta, com molas amortecidas por entidade:
//   - OLHAR: a cabeça (e um pouco o tronco) vira para o que importa — o alvo travado na mira, o
//     inimigo acordado mais perto à frente, quem conversa com ele (o herói, para os moradores) —
//     com limite de giro, sem tremer, e cede durante golpes, esquivas e especiais.
//   - FALA: enquanto o texto da conversa aparece (a voz sintetizada fala junto), a cabeça acompanha
//     as sílabas com pequenos acenos e o tronco respira mais fundo.
//   - PESO: na arrancada o tronco vai para a frente; na parada, volta e passa um pouco (mola) antes
//     de assentar — paradas progressivas, sem corte seco.
// Personalidade: cada herói tem a sua intensidade (Drakos, soldado pesado, mexe pouco a cabeça e
// assenta devagar; Lyra e Sera, mais vivas; Orion, contido e atento).
// ---------------------------------------------------------------------------
const Animacao = (function () {
  const PERFIL = {
    kael: { olhar: 1, peso: 1, fala: 1 },
    lyra: { olhar: 1.15, peso: 0.9, fala: 1.2 },
    sera: { olhar: 1.1, peso: 0.85, fala: 1.15 },
    drakos: { olhar: 0.7, peso: 1.35, fala: 0.75 },
    orion: { olhar: 1.2, peso: 0.8, fala: 0.7 },
    _: { olhar: 0.9, peso: 0.9, fala: 1 },
  };
  const AQUI = { olhar: 0, fala: 0, peso: 0 };   // (contadores para os testes)
  const angulo = (a) => { a %= Math.PI * 2; if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; return a; };
  const mola = (s, k, alvo, dt, w, z) => { const v = s['v' + k] || 0, x = s[k] || 0; const a = w * w * (alvo - x) - 2 * z * w * v; s['v' + k] = v + a * dt; s[k] = x + s['v' + k] * dt; };
  function perfil(e) { const id = e.def && (e.def.base || e.def.id) || e.heroBase || ''; return PERFIL[id] || PERFIL._; }

  // O que a entidade quer olhar: [x, y] no mundo, ou null
  function alvoDe(e) {
    if (typeof game === 'undefined') return null;
    const g = game, p = g.player;
    if (e === p) {
      if (typeof Mira !== 'undefined' && Mira.alvo && Mira.alvo.alive !== false) return [Mira.alvo.x, Mira.alvo.y];
      if (typeof Dialogo !== 'undefined' && Dialogo.aberto && Dialogo.npc) return [Dialogo.npc.x, Dialogo.npc.y];
      let best = null, bd = 380 * 380;
      for (const q of g.enemies) {
        if (!q.alive || q.dormant || q.state === 'dying') continue;
        const d = (q.x - e.x) ** 2 + (q.y - e.y) ** 2;
        if (d < bd) { bd = d; best = q; }
      }
      return best ? [best.x, best.y] : null;
    }
    // moradores: olham o herói quando ele chega perto ou conversa com eles
    if (p && (e.talkT > 0 || (typeof Dialogo !== 'undefined' && Dialogo.npc === e) || (e.state !== 'npc_dormir' && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 170 * 170))) return [p.x, p.y];
    // inimigos acordados: o herói
    if (e.alive && !e.dormant && p && e.state !== 'dying') return [p.x, p.y];
    return null;
  }
  function falando(e) {
    if (typeof Dialogo === 'undefined' || !Dialogo.aberto) return false;
    const fala = Dialogo.vis < (Dialogo.texto || '').length;
    return fala && (Dialogo.npc === e);
  }

  function aplicar(m, e, o) {
    if (!m || !e || typeof e !== 'object' || e.vitrine || typeof e.state !== 'string') return;
    // (o tronco não é mexido: os braços dos modelos saem dos ombros calculados com ele; a inclinação
    // do peso vai no corpo inteiro, a partir dos pés)
    const N = m.nodes, head = N.head, corpo = N.body;
    if (!head) return;
    const st = e.state;
    if (st === 'dead' || st === 'dying' || st === 'npc_dormir' || st === 'montado' && !head) return;
    const agora = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
    const S = e._anim || (e._anim = { t: agora, vel: 0 });
    const dt = Math.min(0.05, Math.max(0, agora - S.t)); S.t = agora;
    if (dt <= 0) return;
    const P = perfil(e);
    // ---- olhar
    const ocupado = st === 'attack' || st === 'dash' || st === 'special' || st === 'charge' || st === 'plunge' || st === 'hurt' || st === 'stun';
    const T = alvoDe(e);
    let yaw = 0, pit = 0;
    if (T) {
      const f = typeof e.viewFacing === 'number' ? e.viewFacing : e.facing || 0;
      const rel = angulo(Math.atan2(T[1] - e.y, T[0] - e.x) - f);
      if (Math.abs(rel) < 2.2) {
        const lim = 1.0 * P.olhar;
        yaw = Math.max(-lim, Math.min(lim, rel)) * (ocupado ? 0.25 : 1);
        const d = Math.hypot(T[0] - e.x, T[1] - e.y);
        pit = d < 70 ? 0.08 : 0;   // bem perto: baixa um pouco o olhar
      }
    }
    mola(S, 'y', yaw, dt, 7, 0.9); mola(S, 'p', pit, dt, 7, 0.9);
    // ---- fala: acenos que seguem as sílabas do texto
    let aceno = 0;
    if (falando(e)) {
      const sil = Math.sin(agora * 11.5) * 0.5 + Math.sin(agora * 7.3 + 1.1) * 0.5;
      aceno = Math.max(0, sil) * 0.06 * P.fala;
      AQUI.fala++;
    }
    mola(S, 'f', aceno, dt, 16, 0.6);
    // ---- peso: aceleração para a frente e a parada que assenta
    const vel = Math.hypot(e.vx || 0, e.vy || 0), acel = (vel - S.vel) / dt; S.vel = vel;
    const alvoLean = ocupado ? 0 : Math.max(-0.16, Math.min(0.12, acel * 0.00042 * P.peso));
    mola(S, 'l', alvoLean, dt, 9 / Math.sqrt(P.peso), 0.38);
    // ---- aplica (somado à pose do modelo)
    if (Math.abs(S.y) > 0.001 || Math.abs(S.p) > 0.001 || Math.abs(S.f) > 0.001) {
      head.r[2] += S.y * 0.75;
      head.r[1] += S.p + S.f;   // (pitch positivo: a cabeça baixa)
      AQUI.olhar++;
    }
    if (corpo && Math.abs(S.l) > 0.001 && !e.montado && !e.air) { corpo.r[1] += S.l * 0.6; AQUI.peso++; }
  }
  return { PERFIL, aplicar, alvoDe, AQUI };
})();
