// ============================================================================
// derivadas.js — DERIVADAS NUMÉRICAS (requisito acadêmico principal)
//   v(t) = dh/dt = h'(t)      a(t) = dv/dt = v'(t) = h''(t)
// Definição: f'(t) = lim_{Δt→0} [f(t) − f(t−Δt)] / Δt. Aqui usamos Δt pequeno e finito,
// então o resultado é uma ESTIMATIVA (erro de discretização), não um valor exato.
// ============================================================================

/** 1ª derivada (diferença regressiva): v ≈ (h_atual − h_anterior) / Δt. */
export function calcularVelocidadePorDerivada(hAtual, hAnterior, dt) {
  return (hAtual - hAnterior) / dt;
}

/** 2ª derivada: a = dv/dt ≈ (v_atual − v_anterior) / Δt, com v obtido da derivada de h. */
export function calcularAceleracaoPorDerivada(vAtual, vAnterior, dt) {
  return (vAtual - vAnterior) / dt;
}

/** Diferença central: f'(t_i) ≈ (f_{i+1} − f_{i−1}) / (t_{i+1} − t_{i−1}). Erro O(Δt²). */
export function derivadaCentral(yAnt, yProx, tAnt, tProx) {
  return (yProx - yAnt) / (tProx - tAnt);
}

/**
 * Deriva uma série inteira y(t): progressiva no 1º ponto, central nos interiores,
 * regressiva no último. Aceita espaçamento não uniforme.
 */
export function derivarSerie(y, t) {
  const n = y.length;
  if (n < 2) return y.map(() => null);
  return y.map((_, i) => {
    if (i === 0) return (y[1] - y[0]) / (t[1] - t[0]);
    if (i === n - 1) return (y[i] - y[i - 1]) / (t[i] - t[i - 1]);
    return derivadaCentral(y[i - 1], y[i + 1], t[i - 1], t[i + 1]);
  });
}

/** Deriva um campo do histórico da simulação em relação ao tempo. */
export function derivarCampoDoHistorico(historico, campo) {
  return derivarSerie(historico.map((r) => r[campo]), historico.map((r) => r.t));
}
