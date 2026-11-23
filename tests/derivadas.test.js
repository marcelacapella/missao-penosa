import test from 'node:test';
import assert from 'node:assert/strict';
import { PARAMETROS_PADRAO as PD } from '../js/configuracao.js';
import { Simulacao } from '../js/simulacao.js';
import { calcularVelocidadePorDerivada, calcularAceleracaoPorDerivada, derivarSerie, derivarCampoDoHistorico } from '../js/derivadas.js';

test('fórmulas básicas: (atual − anterior)/Δt', () => {
  assert.equal(calcularVelocidadePorDerivada(5, 4, 0.5), 2);
  assert.equal(calcularAceleracaoPorDerivada(3, 5, 0.5), -4);
});

test('derivarSerie: h = t² → h′ = 2t exato nos pontos interiores (diferença central)', () => {
  const t = [0, 1, 2, 3, 4], y = t.map((x) => x * x), d = derivarSerie(y, t);
  [1, 2, 3].forEach((i) => assert.equal(d[i], 2 * t[i]));
});

// Teste 7: a velocidade estimada derivando a altitude é coerente com o histórico (v integrada)
test('7. velocidade por derivada da altitude é coerente com a velocidade do histórico', () => {
  const s = new Simulacao(PD).executarAteOFim();
  const vd = derivarCampoDoHistorico(s.historico, 'h');
  let soma = 0;
  // O último ponto é o impacto no solo: h é truncada em 0 (descontinuidade), então a derivada ali não vale.
  const n = s.historico.length - 2; // a diferença central do penúltimo ponto também usa o impacto
  s.historico.slice(0, n).forEach((r, i) => { const e = Math.abs(vd[i] - r.v); soma += e; assert.ok(e < 2, `erro ${e} em t=${r.t}`); });
  assert.ok(soma / n < 0.1); // viés esperado ≈ |a|·Δt/2 da diferença central sobre o Euler semi-implícito
  assert.ok(s.historico.slice(1, -1).every((r) => Math.abs(r.vDer - r.v) < 1e-6)); // dh/dt coincide com v; o último ponto é o impacto no solo
});

// Teste 8: a aceleração estimada derivando a velocidade é coerente com o histórico
test('8. aceleração por derivada da velocidade é coerente com a aceleração do modelo', () => {
  const s = new Simulacao({ ...PD, empuxo: 0, massaCombustivel: 0, arrastoAtivo: false, modeloGravidade: 'constante', velocidadeInicial: 50 }).executarAteOFim();
  s.historico.slice(1).forEach((r) => assert.ok(Math.abs(r.aDer - r.a) < 1e-6));
  const c = new Simulacao(PD).executarAteOFim();
  c.historico.slice(1).forEach((r) => assert.ok(Math.abs(r.aDer - r.a) < 1e-6));
  const ad = derivarCampoDoHistorico(c.historico, 'v');
  const ruins = c.historico.filter((r, i) => Math.abs(ad[i] - r.a) > 1).length; // só perto de descontinuidades
  assert.ok(ruins <= 6, `${ruins} pontos fora da tolerância`);
});
