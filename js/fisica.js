// ============================================================================
// fisica.js — modelo físico vertical (1D)
//   a(t) = (T(t) − D(t)) / m(t) − g(h)         (2ª lei de Newton, eixo + para cima)
//   D(t) = ½ ρ(h) Cd A v|v|                    (arrasto com sinal)
//   m(t) = m_estrutura + m_combustível(t),  dm/dt = −ṁ
// Hipóteses: movimento só vertical, foguete pontual, Terra esférica sem rotação,
// ρ(h) exponencial decrescente (simplificado), empuxo constante enquanto há combustível.
// ============================================================================
import { G0, RAIO_TERRA, RHO0, ESCALA_ALTURA, MU_TERRA } from './configuracao.js';

const EPS_COMBUSTIVEL = 1e-9; // abaixo disso o tanque é considerado vazio (evita resíduo de ponto flutuante)

/** g(h): constante (9,80665) ou g0·(R/(R+h))² — lei do inverso do quadrado. */
export function calcularGravidade(h, modelo = 'variavel') {
  if (modelo === 'constante') return G0;
  const r = RAIO_TERRA / (RAIO_TERRA + Math.max(0, h));
  return G0 * r * r;
}

/** ρ(h) = ρ0·exp(−h/H). Decresce com a altitude e tende a 0. Superestima ρ acima de ~80 km. */
export function calcularDensidadeAtmosferica(h) {
  return h <= 0 ? RHO0 : RHO0 * Math.exp(-h / ESCALA_ALTURA);
}

/** D = ½ρ·Cd·A·v|v|. Com sinal: negativa na subida (v>0) e positiva na descida (v<0). */
export function calcularArrasto(rho, cd, area, v, ativo = true) {
  if (!ativo) return 0;
  return 0.5 * rho * cd * area * v * Math.abs(v);
}

/** Fração do passo Δt em que o motor realmente queima (1 = passo inteiro, 0 = tanque vazio). */
export function fracaoDeQueima(combustivel, consumo, dt) {
  if (combustivel <= EPS_COMBUSTIVEL) return 0;
  if (consumo <= 0) return 1; // motor sem consumo: empuxo permanece (comportamento documentado)
  return Math.min(1, combustivel / (consumo * dt));
}

/**
 * Massa variável: dm/dt = −ṁ discretizado como m_{n+1} = m_n − ṁ·Δt,
 * sem nunca consumir mais que o combustível disponível.
 */
export function atualizarMassa(massaEstrutural, combustivel, consumo, dt) {
  const frac = fracaoDeQueima(combustivel, consumo, dt);
  const queimado = consumo > 0 ? consumo * dt * frac : 0;
  let restante = Math.max(0, combustivel - queimado);
  if (restante <= EPS_COMBUSTIVEL) restante = 0;
  return { combustivel: restante, massa: massaEstrutural + restante, queimado };
}

/** 2ª lei de Newton: a = (T − D)/m − g. */
export function aceleracaoNewton(empuxo, arrasto, massa, g) {
  return (empuxo - arrasto) / massa - g;
}

/** Todas as forças e a aceleração para o estado (h, v, combustível). */
export function calcularForcas(h, v, combustivel, p, dt) {
  const massa = p.massaEstrutural + combustivel;
  const fracaoQueima = fracaoDeQueima(combustivel, p.consumo, dt);
  const empuxo = p.empuxo * fracaoQueima; // 0 quando o combustível acaba
  const gravidade = calcularGravidade(h, p.modeloGravidade);
  const rho = calcularDensidadeAtmosferica(h);
  const arrasto = calcularArrasto(rho, p.coefArrasto, p.areaFrontal, v, p.arrastoAtivo);
  const aceleracao = aceleracaoNewton(empuxo, arrasto, massa, gravidade);
  return { empuxo, arrasto, gravidade, rho, massa, peso: massa * gravidade, fracaoQueima, aceleracao };
}

/**
 * Passo de integração: Euler SEMI-IMPLÍCITO (velocidade primeiro, depois posição).
 *   v_{n+1} = v_n + a_n·Δt ;  h_{n+1} = h_n + v_{n+1}·Δt
 * É mais estável que o Euler explícito para movimentos oscilatórios/de queda.
 */
export function atualizarEstadoFoguete(est, forcas, p, dt) {
  const m = atualizarMassa(p.massaEstrutural, est.combustivel, p.consumo, dt);
  const v = est.v + forcas.aceleracao * dt;
  let h = est.h + v * dt;
  let tocouSolo = false;
  if (h <= 0 && v < 0) { h = 0; tocouSolo = true; }
  return { h, v, combustivel: m.combustivel, queimado: m.queimado, tocouSolo };
}

/**
 * Energia mecânica específica (por kg): ε = ½v² − μ/(R+h).  Sem empuxo e sem arrasto ε é CONSTANTE
 * (é o que dá sentido à "energia necessária" da missão lunar). Só faz sentido com g(h) variável.
 * Derivada: dε/dt = v·(T − D)/m  — só empuxo e arrasto mudam a energia; a gravidade apenas a converte
 * entre energia cinética e potencial.
 */
export function energiaMecanicaEspecifica(h, v) {
  return 0.5 * v * v - MU_TERRA / (RAIO_TERRA + Math.max(0, h));
}

/** Energia específica mínima para que o movimento radial (sem empuxo) alcance a altitude `hAlvo`: ε = −μ/(R+hAlvo). */
export function energiaParaAlcancar(hAlvo) {
  return -MU_TERRA / (RAIO_TERRA + hAlvo);
}
