import test from 'node:test';
import assert from 'node:assert/strict';
import { PARAMETROS_PADRAO as PD, FOGUETES_PRONTOS } from '../js/configuracao.js';
import { Jogo, TELAS } from '../js/jogo.js';
import { Simulacao } from '../js/simulacao.js';
import { dadosDosGraficos } from '../js/graficos.js';
import { ESTADOS_PERSONAGEM, personagemAtiva, definirPersonagemAtiva, registrarPersonagem, removerPersonagem, quadroDaPersonagem,
  estadoDaPersonagem, validarPersonagem, GALINHA } from '../js/personagens.js';

const novo = (o = {}) => new Jogo({ atrasoResultado: 0.5, ...o });
/** Avança o relógio do jogo em quadros de 1/60 s até o voo terminar (limite de segurança). */
function voarAteOFim(j, max = 20000) { for (let i = 0; i < max && j.fase !== 'encerrada'; i++) j.tick(1 / 60); return j; }

test('1. inicialização: tela inicial, simulação pronta, missão padrão e personagem em idle', () => {
  const j = novo();
  assert.equal(j.tela, 'inicio'); assert.equal(j.fase, 'pronta'); assert.equal(j.sim.t, 0); assert.equal(j.missaoId, 'troposfera');
  assert.equal(j.resultado, null); assert.equal(j.estadoPersonagem(), 'idle'); assert.equal(personagemAtiva().id, 'galinha');
  assert.deepEqual(j.params, PD);
});

test('2. transição entre telas e validação do nome da tela', () => {
  const j = novo();
  for (const t of ['como-funciona', 'sobre', 'inicio', 'simulador']) { j.irPara(t); assert.equal(j.tela, t); }
  assert.throws(() => j.irPara('inexistente')); assert.equal(TELAS.length, 6);
  assert.equal(j.estadoPersonagem(), 'preparing');
});

test('3. preparação da missão lunar: foguete pronto aplicado e possibilidade calculada', () => {
  const j = novo(); j.irPara('simulador');
  assert.equal(j.escolherMissao('lua'), true);
  assert.equal(j.avaliacao.possibilidade, 'impossivel');           // foguete padrão não chega à Lua
  assert.equal(j.usarFoguete('lunar').ok, true);
  assert.deepEqual(j.params, FOGUETES_PRONTOS.lunar.parametros); assert.equal(j.avaliacao.estado, 'preparacao'); assert.equal(j.avaliacao.possibilidade, 'possivel');
  assert.equal(j.escolherMissao('nao-existe'), false);
});

test('aplicar configurações inválidas é recusado e não altera a simulação', () => {
  const j = novo(); const sim = j.sim;
  const r = j.aplicarConfiguracoes({ ...PD, massaEstrutural: -5, empuxo: NaN });
  assert.equal(r.ok, false); assert.ok(r.erros.length >= 2); assert.equal(j.sim, sim); assert.deepEqual(j.params, PD);
  assert.equal(j.lancar({ ...PD, tempoMaximo: 0 }), false); assert.equal(j.fase, 'pronta');
});

test('4. lançamento: o tempo simulado avança com o relógio × fator e a personagem decola', () => {
  const j = novo(); assert.equal(j.lancar(), true); assert.equal(j.fase, 'voando');
  j.tick(0.1); assert.ok(Math.abs(j.sim.t - 0.1 * j.fator) < 0.011, `t = ${j.sim.t}`);
  assert.ok(j.sim.h > 0); assert.equal(j.estadoPersonagem(), 'launching'); assert.equal(j.lancar(), false);
});

test('5. pausa congela a simulação e continuar retoma', () => {
  const j = novo(); j.lancar(); j.tick(0.1);
  assert.equal(j.pausar(), true); const t = j.sim.t, h = j.sim.h; j.tick(0.2);
  assert.equal(j.sim.t, t); assert.equal(j.sim.h, h); assert.equal(j.fase, 'pausada');
  assert.equal(j.continuar(), true); j.tick(0.1); assert.ok(j.sim.t > t);
  j.irPara('inicio'); assert.equal(j.fase, 'pausada');   // sair da tela do simulador pausa o voo
});

test('6. reinício zera tempo, altitude e histórico e permite novo lançamento', () => {
  const j = novo(); j.lancar(); j.tick(0.2); assert.ok(j.sim.historico.length > 1);
  j.reiniciar(); assert.equal(j.sim.t, 0); assert.equal(j.sim.h, 0); assert.equal(j.sim.historico.length, 1); assert.equal(j.fase, 'pronta'); assert.equal(j.resultado, null);
  assert.equal(j.lancar(), true);
});

test('7/8/9. fluxo completo: derivadas, combustível consumido e altitude máxima batem com o motor', () => {
  const j = novo(); j.escolherMissao('termosfera'); j.lancar(); voarAteOFim(j);
  const s = j.sim, ref = new Simulacao(PD).executarAteOFim();
  assert.equal(j.resultado, 'derrota');                                                    // 214 km < 600 km
  assert.ok(Math.abs(s.hMax - ref.hMax) < 1e-6, 'a altitude máxima não depende da forma de avançar o tempo');
  assert.ok(Math.abs(s.consumido - PD.massaCombustivel) < 1e-6);                            // 10: consumo de combustível
  assert.ok(s.historico.slice(1).every((r) => Math.abs(r.aDer - r.a) < 1e-6));             // aceleração derivada coincide com a aplicada no intervalo
  assert.equal(Math.max(...s.historico.map((r) => r.h)), s.hMax);                           // 12: altitude máxima
});

test('11/12. falha por falta de empuxo e encerramento por tempo máximo', () => {
  let j = novo(); j.lancar({ ...PD, empuxo: 5000 }); j.tick(0.1);
  assert.equal(j.sim.codigo, 'abortado'); assert.equal(j.resultado, 'derrota');
  j = novo(); j.escolherMissao('lua'); j.lancar({ ...PD, tempoMaximo: 20 }); voarAteOFim(j);
  assert.equal(j.sim.codigo, 'tempo-maximo'); assert.equal(j.resultado, 'derrota');
});

test('13. gráficos recebem o histórico real da simulação', () => {
  const j = novo(); j.lancar(); for (let i = 0; i < 120; i++) j.tick(1 / 60);
  const d = dadosDosGraficos(j.sim.historico), hist = j.sim.historico;
  assert.equal(d.altitude.length, hist.length); assert.equal(d.altitude.at(-1).y, hist.at(-1).h);
  assert.equal(d.velocidade.at(-1).y, hist.at(-1).v); assert.equal(d.aceleracao.at(-1).y, hist.at(-1).a);
  assert.ok(d.velocidadeDerivada.length > 0 && d.aceleracaoDerivada.length > 0);
});

test('19. vitória em missão de altitude: encerra o voo, registra conclusão e vai à tela de vitória', () => {
  const salvo = []; const j = novo({ armazenamento: { ler: () => [], gravar: (ids) => salvo.push(ids) } });
  j.escolherMissao('estratosfera'); j.lancar(); voarAteOFim(j);
  assert.equal(j.resultado, 'vitoria'); assert.equal(j.sim.codigo, 'missao-cumprida'); assert.ok(j.sim.hMax >= 50000 && j.sim.hMax < 60000, 'encerra ao atingir o alvo');
  assert.equal(j.tela, 'simulador'); for (let i = 0; i < 60; i++) j.tick(1 / 60);
  assert.equal(j.tela, 'vitoria'); assert.equal(j.estadoPersonagem(), 'celebrating'); assert.deepEqual(salvo.at(-1), ['estratosfera']); assert.ok(j.concluidas.has('estratosfera'));
});

test('14/17/18. missão lunar bem-sucedida: vitória, relatório e personagem na Lua', () => {
  const j = novo(); j.escolherMissao('lua'); j.usarFoguete('lunar'); j.lancar(); voarAteOFim(j);
  assert.equal(j.resultado, 'vitoria'); assert.equal(j.avaliacao.progresso, 100); assert.equal(j.avaliacao.naoAtendidas.length, 0);
  j.mostrarResultado(); assert.equal(j.tela, 'vitoria'); assert.equal(j.estadoPersonagem(), 'moon');
  const r = j.relatorio(); assert.ok(r.lunar && r.lunar.tempo > 0 && r.altitudeMaxima >= 1e5 && r.combustivelConsumido > 0 && r.tempoVoo > 0);
});

test('15/16/19. missão lunar insuficiente e intermediária terminam na tela de derrota com explicação', () => {
  for (const id of ['padrao', 'reforcado']) {
    const j = novo(); j.escolherMissao('lua'); j.usarFoguete(id); j.lancar(); voarAteOFim(j);
    assert.equal(j.resultado, 'derrota', id); for (let i = 0; i < 60; i++) j.tick(1 / 60);
    assert.equal(j.tela, 'derrota'); assert.equal(j.estadoPersonagem(), 'failed');
    assert.ok(j.avaliacao.naoAtendidas.some((c) => c.id === 'energia')); assert.ok(j.avaliacao.resumo.length > 10); assert.ok(j.avaliacao.dicas.length > 0);
  }
});

test('abortar encerra o voo como derrota; novaMissao e voltarAoInicio restauram o jogo', () => {
  const j = novo(); j.lancar(); j.tick(0.1); assert.equal(j.abortar(), true);
  assert.equal(j.resultado, 'derrota'); assert.equal(j.sim.codigo, 'missao-encerrada');
  j.mostrarResultado(); assert.equal(j.tela, 'derrota'); j.novaMissao();
  assert.equal(j.tela, 'simulador'); assert.equal(j.fase, 'pronta'); assert.equal(j.resultado, null); j.voltarAoInicio(); assert.equal(j.tela, 'inicio');
});

test('personagem: combustível baixo e descida deixam a galinha preocupada', () => {
  assert.equal(estadoDaPersonagem({ tela: 'simulador', fase: 'voando', sim: { h: 5000, v: 100, empuxo: 1, combustivelFracao: 0.1 } }), 'concerned');
  assert.equal(estadoDaPersonagem({ tela: 'simulador', fase: 'voando', sim: { h: 5000, v: -3, empuxo: 0, combustivelFracao: 0.9 } }), 'concerned');
  assert.equal(estadoDaPersonagem({ tela: 'simulador', fase: 'voando', sim: { h: 50000, v: 900, empuxo: 1, combustivelFracao: 0.9 } }), 'flying');
  const j = novo(); j.lancar(); voarAteOFim(j, 1500); assert.ok(['concerned', 'celebrating', 'launching', 'flying'].includes(j.estadoPersonagem()));
});

test('20. troca de personagem por configuração, sem alterar a lógica da simulação', () => {
  const rosto = ['..XX..', '.XXXX.', '.X..X.', '.XXXX.'], paleta = { ...GALINHA.paleta, X: '#ff00ff' };
  const def = { id: 'apresentadora', nome: 'Apresentadora Teste', paleta, cabeca: Object.fromEntries(ESTADOS_PERSONAGEM.map((e) => [e, e === 'failed' ? { imagem: 'assets/characters/ana-triste.png' } : rosto])) };
  assert.equal(validarPersonagem(def).ok, true);
  assert.equal(validarPersonagem({ id: 'x', nome: 'y', cabeca: { idle: rosto } }).ok, false);          // faltam estados
  registrarPersonagem(def); definirPersonagemAtiva('apresentadora');
  try {
    assert.equal(personagemAtiva().nome, 'Apresentadora Teste');
    assert.deepEqual(quadroDaPersonagem(personagemAtiva(), 'idle', 'cabeca', 0).grade, rosto);
    assert.deepEqual(quadroDaPersonagem(personagemAtiva(), 'failed', 'retrato', 0), { tipo: 'imagem', src: 'assets/characters/ana-triste.png' });
    const a = novo(); a.escolherMissao('lua'); a.usarFoguete('lunar'); a.lancar(); voarAteOFim(a);
    definirPersonagemAtiva('galinha');
    const b = novo(); b.escolherMissao('lua'); b.usarFoguete('lunar'); b.lancar(); voarAteOFim(b);
    assert.equal(a.sim.hMax, b.sim.hMax); assert.equal(a.sim.t, b.sim.t); assert.equal(a.resultado, b.resultado);
  } finally { definirPersonagemAtiva('galinha'); removerPersonagem('apresentadora'); }
  assert.equal(personagemAtiva().id, 'galinha');
  assert.throws(() => definirPersonagemAtiva('apresentadora'));
});
