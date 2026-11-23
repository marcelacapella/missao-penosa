import test from 'node:test';
import assert from 'node:assert/strict';
import { PARAMETROS_PADRAO as PD, G0 } from '../js/configuracao.js';
import { calcularForcas, calcularArrasto, calcularGravidade, calcularDensidadeAtmosferica, atualizarMassa } from '../js/fisica.js';
import { Simulacao } from '../js/simulacao.js';
const P = (o = {}) => ({ ...PD, ...o });
const DT = 0.01;

test('1. empuxo menor que o peso: aceleração inicial não positiva e lançamento abortado', () => {
  const p = P({ empuxo: 5000 });
  assert.ok(calcularForcas(0, 0, p.massaCombustivel, p, DT).aceleracao <= 0);
  const s = new Simulacao(p).executarAteOFim();
  assert.equal(s.codigo, 'abortado'); assert.equal(s.hMax, 0); assert.match(s.motivo, /empuxo/i);
});

test('2. empuxo suficiente: aceleração inicial positiva e o foguete sobe', () => {
  const f = calcularForcas(0, 0, PD.massaCombustivel, PD, DT);
  assert.ok(f.aceleracao > 0);
  assert.ok(new Simulacao(PD).executarAteOFim().hMax > 1000);
});

test('3. quando o combustível acaba, o empuxo é zero (e a massa vira a estrutural)', () => {
  const s = new Simulacao(PD).executarAteOFim();
  const i = s.historico.findIndex((r) => r.combustivel === 0);
  assert.ok(i > 0);
  s.historico.slice(i).forEach((r) => { assert.equal(r.empuxo, 0); assert.equal(r.massa, PD.massaEstrutural); });
  assert.ok(s.eventos.some((e) => e.tipo === 'combustivel'));
});

test('4. a massa total nunca fica abaixo da massa estrutural', () => {
  const s = new Simulacao(PD).executarAteOFim();
  s.historico.forEach((r) => assert.ok(r.massa >= PD.massaEstrutural));
  const m = atualizarMassa(100, 0.001, 50, DT); // tenta consumir 0,5 kg com 0,001 kg disponível
  assert.equal(m.combustivel, 0); assert.equal(m.massa, 100); assert.ok(m.queimado <= 0.001 + 1e-12);
});

test('5. pode subir com aceleração negativa enquanto a velocidade é positiva', () => {
  const s = new Simulacao(PD).executarAteOFim();
  assert.ok(s.historico.some((r) => r.v > 0 && r.a < 0));
});

test('11. sem resistência do ar, a contribuição do arrasto é nula', () => {
  assert.equal(calcularArrasto(1.2, 0.5, 1, 300, false), 0);
  assert.equal(calcularForcas(1000, 300, 100, P({ arrastoAtivo: false }), DT).arrasto, 0);
  assert.ok(calcularForcas(1000, 300, 100, P(), DT).arrasto > 0);   // subindo: sinal convencionado positivo p/ v>0 → subtrai em a
  assert.ok(calcularArrasto(1.2, 0.5, 1, -300, true) < 0);          // descendo: força de sinal oposto
});

test('arrasto: ρ(h) decresce e tende a zero; g(h) decresce', () => {
  assert.ok(calcularDensidadeAtmosferica(0) > calcularDensidadeAtmosferica(10000));
  assert.ok(calcularDensidadeAtmosferica(500000) < 1e-20);
  assert.ok(calcularGravidade(400000) < G0); assert.equal(calcularGravidade(400000, 'constante'), G0);
});

test('13. massa e combustível fisicamente coerentes (conservação do combustível)', () => {
  const s = new Simulacao(PD).executarAteOFim();
  s.historico.forEach((r) => assert.ok(Math.abs(r.massa - (PD.massaEstrutural + r.combustivel)) < 1e-9 && r.combustivel >= 0));
  assert.ok(Math.abs(s.consumido - PD.massaCombustivel) < 1e-6);
  const decresce = s.historico.every((r, i, a) => i === 0 || r.combustivel <= a[i - 1].combustivel);
  assert.ok(decresce);
});

test('consumo zero com combustível: empuxo constante, combustível não diminui (modelo documentado)', () => {
  const s = new Simulacao(P({ consumo: 0, tempoMaximo: 20 })).executarAteOFim();
  assert.equal(s.combustivel, PD.massaCombustivel); assert.ok(s.forcas.empuxo > 0);
});
