import test from 'node:test';
import assert from 'node:assert/strict';
import { PARAMETROS_PADRAO as PD, validarParametros } from '../js/configuracao.js';
import { Simulacao } from '../js/simulacao.js';
import { prepararSerie, ticksBonitos } from '../js/graficos.js';
import { escalaVisual, yBaseFoguete, SPRITE, SPRITE_L } from '../js/renderizacao.js';

const LIVRE = { ...PD, empuxo: 0, massaCombustivel: 0, arrastoAtivo: false, modeloGravidade: 'constante', velocidadeInicial: 100, tempoMaximo: 60 };

test('6. ponto mais alto identificado (lançamento vertical: h_max = v0²/2g)', () => {
  const s = new Simulacao(LIVRE).executarAteOFim();
  assert.ok(Math.abs(s.hMax - 100 ** 2 / (2 * 9.80665)) < 1, `hMax=${s.hMax}`);
  const ev = s.eventos.find((e) => e.tipo === 'apogeu');
  assert.ok(ev && Math.abs(ev.t - 100 / 9.80665) < 0.05);
  assert.equal(s.codigo, 'retorno-superficie');
  assert.ok(s.historico.every((r) => r.h <= s.hMax + 1e-9));
});

test('9. respeita o tempo máximo e termina por condição válida', () => {
  const s = new Simulacao({ ...PD, tempoMaximo: 5 }).executarAteOFim();
  assert.equal(s.codigo, 'tempo-maximo'); assert.ok(Math.abs(s.t - 5) < 1e-6); assert.equal(s.status, 'encerrada');
  assert.ok(new Simulacao(PD).executarAteOFim().relatorio.tempoTotal <= PD.tempoMaximo + 1e-6);
});

test('combustível acaba com o foguete subindo: a simulação continua até outra condição', () => {
  const s = new Simulacao(PD).executarAteOFim();
  const iFim = s.historico.findIndex((r) => r.combustivel === 0);
  assert.ok(s.historico[iFim].v > 0 && s.t > s.historico[iFim].t + 50);
  assert.equal(s.codigo, 'retorno-superficie');
});

test('10. os gráficos recebem os valores reais do histórico', () => {
  const s = new Simulacao(PD).executarAteOFim();
  const serie = prepararSerie(s.historico, 'h', 100000);
  assert.equal(serie.length, s.historico.length);
  serie.forEach((p, i) => { assert.equal(p.x, s.historico[i].t); assert.equal(p.y, s.historico[i].h); });
  assert.ok(prepararSerie(s.historico, 'v', 50).length <= 51);
  assert.ok(ticksBonitos(0, 97, 5).length >= 3);
});

test('12. reiniciar zera tempo, altitude e histórico', () => {
  const s = new Simulacao(PD); s.avancar(30);
  assert.ok(s.t > 0 && s.historico.length > 1);
  s.reiniciar();
  assert.equal(s.t, 0); assert.equal(s.h, 0); assert.equal(s.historico.length, 1); assert.equal(s.distancia, 0); assert.equal(s.status, 'pronta'); assert.equal(s.eventos.length, 0);
});

test('14. velocidade inicial configurada é respeitada', () => {
  const s = new Simulacao({ ...PD, velocidadeInicial: 37.5 });
  assert.equal(s.v, 37.5); assert.equal(s.historico[0].v, 37.5);
});

test('15. valores inválidos não iniciam simulação', () => {
  for (const ruim of [{ massaEstrutural: -1 }, { massaEstrutural: 0 }, { massaCombustivel: -5 }, { empuxo: -1 }, { consumo: -1 }, { empuxo: NaN }, { areaFrontal: Infinity }, { tempoMaximo: 0 }, { coefArrasto: -0.1 }]) {
    assert.equal(validarParametros({ ...PD, ...ruim }).ok, false, JSON.stringify(ruim));
    assert.throws(() => new Simulacao({ ...PD, ...ruim }));
  }
  assert.equal(validarParametros({ ...PD, empuxo: 0 }).ok, true);      // sem propulsão é permitido
  assert.equal(validarParametros({ ...PD, consumo: 0 }).ok, true);
});

test('retorno à superfície e descida são detectados; empuxo zero é permitido com v0 > 0', () => {
  const s = new Simulacao({ ...PD, empuxo: 0, velocidadeInicial: 50, tempoMaximo: 100 }).executarAteOFim();
  assert.equal(s.codigo, 'retorno-superficie'); assert.ok(s.eventos.some((e) => e.tipo === 'descida'));
});

test('renderização: posição visual é função crescente da altitude calculada; sprite consistente', () => {
  let ant = -1; for (const h of [0, 10, 100, 1e3, 1e4, 1e5]) { assert.ok(escalaVisual(h) > ant); ant = escalaVisual(h); }
  assert.ok(yBaseFoguete(100) < yBaseFoguete(0));
  assert.ok(SPRITE.every((l) => l.length === SPRITE_L));
  assert.ok(SPRITE.join('').includes('E') && SPRITE.join('').includes('Y')); // olhos e bico da galinha dentro da cabine
});
