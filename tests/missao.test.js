import test from 'node:test';
import assert from 'node:assert/strict';
import { PARAMETROS_PADRAO as PD, FOGUETES_PRONTOS, MU_TERRA, RAIO_TERRA, DISTANCIA_TERRA_LUA, LINHA_KARMAN } from '../js/configuracao.js';
import { Simulacao } from '../js/simulacao.js';
import { energiaMecanicaEspecifica, energiaParaAlcancar, calcularGravidade } from '../js/fisica.js';
import { MISSOES, LIMITES_MISSAO, obterMissao, avaliarMissao, dadosDaSimulacao, analisarFoguete, limiteSuperiorDeEnergia,
  estimarTransitoLunar, energiaNecessariaLua, resumoLunar } from '../js/missao.js';

const LUA = obterMissao('lua');
const REFORCADO = FOGUETES_PRONTOS.reforcado.parametros, LUNAR = FOGUETES_PRONTOS.lunar.parametros;

/** Voa como o jogo: avalia a cada 0,1 s simulado e encerra assim que a missão é cumprida. */
function voar(params, missao = LUA, { parar = true } = {}) {
  const sim = new Simulacao(params);
  let av = avaliarMissao(missao, dadosDaSimulacao(sim));
  while (sim.status !== 'encerrada') {
    sim.avancar(0.1);
    av = avaliarMissao(missao, dadosDaSimulacao(sim));
    if (parar && av.vitoria) { sim.encerrar('missao-cumprida', 'Missão cumprida'); av = avaliarMissao(missao, dadosDaSimulacao(sim)); }
  }
  return { sim, av };
}
const ids = (lista) => lista.map((c) => c.id);

// ---------------------------------------------------------------- 14/15/16/17: os três cenários da missão lunar
test('14/15. cenário 1 — foguete insuficiente (padrão) não cumpre a missão lunar', () => {
  const { sim, av } = voar(PD);
  assert.equal(av.vitoria, false); assert.equal(av.estado, 'falha'); assert.equal(av.possibilidade, 'impossivel');
  assert.ok(ids(av.naoAtendidas).includes('energia')); assert.ok(sim.hMax > LINHA_KARMAN, 'chegou ao espaço, mas sem energia lunar');
  assert.ok(av.fracaoEnergia < 0.1, `fração = ${av.fracaoEnergia}`); assert.ok(av.progresso >= 65 && av.progresso < 85);
  assert.match(av.resumo, /energia necessária/);
});

test('15. foguete com empuxo menor que o peso é abortado e a missão falha logo no início', () => {
  const { sim, av } = voar({ ...PD, empuxo: 5000 });
  assert.equal(sim.codigo, 'abortado'); assert.equal(av.vitoria, false); assert.equal(av.estado, 'falha');
  assert.ok(ids(av.naoAtendidas).includes('gravidade')); assert.equal(av.progresso, 0); assert.equal(av.etapa.id, 'preparacao');
});

test('16. cenário 2 — foguete intermediário progride (chega ao espaço) mas não completa a missão', () => {
  const { sim, av } = voar(REFORCADO);
  assert.equal(av.vitoria, false); assert.equal(av.estado, 'falha');
  assert.ok(sim.hMax > 1e6, 'passa de 1.000 km');
  assert.ok(av.fracaoEnergia > 0.2 && av.fracaoEnergia < 0.9, `fração = ${av.fracaoEnergia}`);
  assert.ok(av.progresso > 65 && av.progresso < 85, `progresso = ${av.progresso}`);
  assert.ok(ids(av.atendidas).includes('atmosfera') && ids(av.atendidas).includes('gravidade'));
  // sobe até o apogeu (≈ 2.900 km) e volta a descer: falta energia e a subida deixa de ser contínua
  assert.deepEqual(ids(av.naoAtendidas), ['continuidade', 'energia']); assert.ok(sim.jaDesceu);
});

test('17. cenário 3 — foguete adequado satisfaz TODAS as condições e a vitória é real', () => {
  const { sim, av } = voar(LUNAR);
  assert.equal(av.vitoria, true); assert.equal(av.estado, 'sucesso'); assert.equal(av.progresso, 100); assert.equal(av.naoAtendidas.length, 0);
  assert.equal(sim.codigo, 'missao-cumprida'); assert.ok(sim.h >= LINHA_KARMAN, 'só vale acima de 100 km');
  assert.ok(sim.energiaMaximaEspaco >= energiaNecessariaLua());
  // Verificação independente: com a MESMA física, o foguete nunca mais desce (energia ≥ −μ/r_Lua > −μ/r para r < r_Lua)
  const longo = new Simulacao({ ...LUNAR, tempoMaximo: 7200 }); let desceu = false;
  while (longo.passo()) if (longo.v < 0) { desceu = true; break; }
  assert.equal(desceu, false); assert.equal(longo.codigo, 'tempo-maximo'); assert.ok(longo.h > 5e6);
});

// ---------------------------------------------------------------- vitória artificial não é possível
test('valores absurdos ou modelos simplificados NÃO geram vitória lunar artificial', () => {
  const casos = {
    'motor impossível (T/ṁ = 1e5 m/s)': { ...LUNAR, consumo: 4.5, empuxo: 450000, massaCombustivel: 1000 },
    'consumo zero (motor eterno)': { ...LUNAR, consumo: 0 },
    'tanque quase só combustível': { ...LUNAR, massaEstrutural: 10, massaCombustivel: 9990, empuxo: 20000, consumo: 4.4 },
    'empuxo gigante': { ...LUNAR, empuxo: 4.5e8, consumo: 1e5 },
    'velocidade inicial de 10 km/s (largada "lançada")': { ...LUNAR, velocidadeInicial: 10000 },
    'sem resistência do ar': { ...LUNAR, arrastoAtivo: false },
    'gravidade constante': { ...LUNAR, modeloGravidade: 'constante' },
  };
  for (const [nome, p] of Object.entries(casos)) {
    const { av } = voar(p, LUA, { parar: true });
    assert.equal(av.vitoria, false, nome);
  }
  // os limites que bloqueiam cada caso aparecem como condições não atendidas
  assert.ok(ids(voar(casos['motor impossível (T/ṁ = 1e5 m/s)']).av.naoAtendidas).includes('motor'));
  assert.ok(ids(voar(casos['tanque quase só combustível']).av.naoAtendidas).includes('massas'));
  assert.ok(ids(voar(casos['empuxo gigante']).av.naoAtendidas).includes('estrutura'));
  assert.ok(ids(voar(casos['sem resistência do ar']).av.naoAtendidas).includes('modelo'));
  assert.ok(ids(voar(casos['velocidade inicial de 10 km/s (largada "lançada")']).av.naoAtendidas).includes('modelo'));
});

test('a energia só conta acima de 100 km: nenhuma vitória lunar abaixo da Linha de Kármán', () => {
  const sim = new Simulacao(LUNAR);
  while (sim.status !== 'encerrada' && sim.h < LINHA_KARMAN) {
    sim.avancar(0.1);
    const av = avaliarMissao(LUA, dadosDaSimulacao(sim));
    if (sim.h < LINHA_KARMAN) assert.equal(av.vitoria, false);
  }
});

// ---------------------------------------------------------------- progresso: regras documentadas, sem cronômetro
test('18. progresso é função dos dados do motor (etapas 0/10/25/45/65/85/100)', () => {
  const base = { params: LUNAR, status: 'executando', codigo: null, t: 0, h: 0, v: 0, hMax: 0, vMax: 0, combustivel: 9500, consumido: 0, massa: 10000, empuxo: 1, aceleracao: 1,
    aceleracaoInicial: 4, aceleracaoMaxima: 4, energia: -MU_TERRA / RAIO_TERRA, energiaMaximaEspaco: -Infinity, jaDesceu: false };
  const eSolo = energiaParaAlcancar(0), eReq = energiaNecessariaLua();
  const com = (o) => avaliarMissao(LUA, { ...base, ...o });
  assert.equal(com({}).progresso, 0); assert.equal(com({}).etapa.nome, 'Preparação');
  assert.equal(com({ hMax: 1 }).progresso, 10); assert.equal(com({ hMax: 1 }).etapa.id, 'decolagem');
  assert.equal(com({ hMax: 12000 }).progresso, 25); assert.equal(com({ hMax: 12000 }).etapa.id, 'atmosfera');
  assert.equal(com({ hMax: 50000 }).progresso, 45); assert.equal(com({ hMax: 50000 }).etapa.id, 'alta-altitude');
  assert.equal(com({ hMax: LINHA_KARMAN }).progresso, 65); assert.equal(com({ hMax: LINHA_KARMAN }).etapa.id, 'espaco');
  const aprox = com({ hMax: 2e5, h: 2e5, energiaMaximaEspaco: eSolo + 0.9 * (eReq - eSolo) });
  assert.ok(Math.abs(aprox.progresso - 85) < 1e-6); assert.equal(aprox.etapa.id, 'aproximacao');
  const quase = com({ hMax: 2e5, h: 2e5, energiaMaximaEspaco: eSolo + 0.999 * (eReq - eSolo) });
  assert.ok(quase.progresso > 85 && quase.progresso < 100 && !quase.vitoria, 'sem todas as condições nunca chega a 100');
  // monotonicidade em hMax e independência do tempo t
  let ant = -1; for (const hMax of [0, 1, 5000, 12000, 30000, 50000, 80000, 1e5]) { const p = com({ hMax }).progresso; assert.ok(p >= ant); ant = p; }
  assert.deepEqual(com({ hMax: 30000, t: 5 }), com({ hMax: 30000, t: 5000 }));
});

test('avaliarMissao é pura: não altera os dados e devolve o mesmo resultado para a mesma entrada', () => {
  const sim = new Simulacao(LUNAR); sim.avancar(20);
  const d = dadosDaSimulacao(sim), copia = structuredClone(d);
  const a = avaliarMissao(LUA, d), b = avaliarMissao(LUA, d);
  assert.deepEqual(a, b); assert.deepEqual(d, copia);
  assert.ok(['progresso', 'etapa', 'estado', 'condicoes', 'atendidas', 'naoAtendidas', 'possibilidade'].every((k) => k in a));
});

// ---------------------------------------------------------------- possibilidade de sucesso (limite superior)
test('possibilidade de sucesso: foguete padrão impossível, foguete lunar possível, antes mesmo de lançar', () => {
  assert.equal(avaliarMissao(LUA, dadosDaSimulacao(new Simulacao(PD))).possibilidade, 'impossivel');
  assert.equal(avaliarMissao(LUA, dadosDaSimulacao(new Simulacao(REFORCADO))).possibilidade, 'impossivel');
  assert.equal(avaliarMissao(LUA, dadosDaSimulacao(new Simulacao(LUNAR))).possibilidade, 'possivel');
  assert.equal(avaliarMissao(obterMissao('troposfera'), dadosDaSimulacao(new Simulacao(PD))).possibilidade, 'possivel');
});

test('limiteSuperiorDeEnergia é de fato um limite superior da energia real atingida', () => {
  for (const p of [PD, REFORCADO, LUNAR, { ...PD, massaCombustivel: 4000, empuxo: 90000, consumo: 25, tempoMaximo: 900 }, { ...PD, arrastoAtivo: false }]) {
    const sim = new Simulacao(p), e0 = sim.energia;
    const sup = limiteSuperiorDeEnergia(e0, sim.v, sim.combustivel, p.massaEstrutural, p.empuxo, p.consumo);
    sim.executarAteOFim();
    assert.ok(sim.energiaMaxima <= sup + 1, `real ${sim.energiaMaxima} > limite ${sup}`);
  }
});

// ---------------------------------------------------------------- missões de altitude (progressão)
test('missões de altitude: o foguete padrão cumpre as três primeiras e não a termosfera; o reforçado cumpre todas', () => {
  const r = (p, id) => voar(p, obterMissao(id)).av;
  for (const id of ['troposfera', 'estratosfera', 'mesosfera']) assert.equal(r(PD, id).vitoria, true, id);
  const t = r(PD, 'termosfera'); assert.equal(t.vitoria, false); assert.equal(t.estado, 'falha'); assert.ok(ids(t.naoAtendidas).includes('altitude'));
  for (const id of ['termosfera', 'exosfera']) assert.equal(r(REFORCADO, id).vitoria, true, id);
  assert.equal(MISSOES.length, 6); assert.equal(MISSOES.at(-1).id, 'lua');
});

// ---------------------------------------------------------------- matemática de apoio
test('trânsito lunar: integral definida bate com a solução analítica parabólica e com integração numérica independente', () => {
  const r0 = RAIO_TERRA + 2e5, rL = DISTANCIA_TERRA_LUA;
  const analitico = (2 / 3) * (rL ** 1.5 - r0 ** 1.5) / Math.sqrt(2 * MU_TERRA);   // ε = 0
  const t = estimarTransitoLunar(0, 2e5);
  assert.ok(Math.abs(t.tempo - analitico) / analitico < 1e-4, `${t.tempo} × ${analitico}`);
  // Euler com g(h) do motor, passos de 1 s, ε = 0 em h = 200 km
  let h = 2e5, v = Math.sqrt(2 * MU_TERRA / r0), tt = 0;
  while (RAIO_TERRA + h < rL) { v -= calcularGravidade(h) * 1; h += v * 1; tt += 1; if (tt > 1e7) break; }
  assert.ok(Math.abs(tt - t.tempo) / t.tempo < 0.02, `Euler ${tt} × integral ${t.tempo}`);
  assert.equal(estimarTransitoLunar(-MU_TERRA / rL * 1.5, 2e5), null);                       // energia insuficiente
  const limite = estimarTransitoLunar(-MU_TERRA / rL, 2e5); assert.ok(Number.isFinite(limite.tempo) && limite.velocidadeChegada < 1e-3);
  assert.ok(t.velocidadeChegada > 0 && t.tempo / 3600 > 20, 'chegada com energia parabólica leva dias');
});

test('energia mecânica: constante sem empuxo/arrasto e analisarFoguete bate com Tsiolkovsky', () => {
  const sim = new Simulacao({ ...LUNAR, tempoMaximo: 300 }); let eFimQueima = null, eFim;
  while (sim.passo()) { if (eFimQueima === null && sim.combustivel === 0 && sim.h > 3e5) eFimQueima = sim.energia; }
  eFim = sim.energia;
  assert.ok(eFimQueima !== null && Math.abs(eFim - eFimQueima) / Math.abs(eFim) < 1e-3, `${eFimQueima} → ${eFim}`);
  assert.ok(Math.abs(energiaMecanicaEspecifica(0, 0) + MU_TERRA / RAIO_TERRA) < 1e-6);
  const A = analisarFoguete(LUNAR);
  assert.ok(Math.abs(A.velocidadeExaustao - 4500) < 1e-9 && Math.abs(A.deltaVIdeal - 4500 * Math.log(20)) < 1e-6);
  assert.ok(LIMITES_MISSAO.velocidadeExaustaoMax >= 4500);
});

test('resumoLunar devolve tempo de trânsito e velocidade de chegada apenas quando há energia', () => {
  const { sim } = voar(LUNAR);
  const r = resumoLunar(dadosDaSimulacao(sim));
  assert.ok(r && r.tempo > 3600 * 8 && r.velocidadeChegada >= 0 && r.hInicio >= LINHA_KARMAN);
  assert.equal(resumoLunar(dadosDaSimulacao(voar(PD).sim)), null);
});

test('GUIA_DE_MISSOES: a configuração de referência de cada missão cumpre o objetivo pelo fluxo real do jogo', async () => {
  const { CONFIGURACOES_DE_REFERENCIA: REF } = await import('../js/configuracao.js');
  const { Jogo } = await import('../js/jogo.js');
  for (const m of MISSOES) {
    const j = new Jogo({ atrasoResultado: 0 }); j.escolherMissao(m.id); assert.equal(j.lancar(REF[m.id]), true, m.id);
    while (j.fase !== 'encerrada') j.tick(1 / 60);
    assert.equal(j.resultado, 'vitoria', `${m.id}: ${j.avaliacao.resumo}`);
  }
});
