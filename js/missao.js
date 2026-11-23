// ============================================================================
// missao.js — CAMADA DE MISSÃO (progressão de jogo), separada do motor físico.
//
// MISSÃO LUNAR — MODELO DIDÁTICO SIMPLIFICADO
// O motor da Missão Penosa é VERTICAL (1D): não calcula órbitas, nem a gravidade da Lua, nem a
// transferência Terra–Lua. Por isso este módulo NÃO simula a viagem: ele apenas LÊ os resultados
// reais do motor e decide se o lançamento teria energia para alcançar a distância da Lua.
//
//   Energia mecânica específica:  ε = ½v² − μ/(R+h)          (fisica.js)
//   Sem empuxo e sem arrasto ε é constante; o movimento radial alcança o raio r se ε ≥ −μ/r.
//   Critério lunar:  ε ≥ −μ/r_Lua + margem,  medida acima de 100 km (arrasto desprezível).
//
// Nada aqui altera a simulação. A animação nunca decide o resultado: só `avaliarMissao` decide,
// e ela depende exclusivamente de números calculados pelo motor.
// ============================================================================
import { MU_TERRA, RAIO_TERRA, LINHA_KARMAN, DISTANCIA_TERRA_LUA, G0 } from './configuracao.js';
import { energiaParaAlcancar } from './fisica.js';

/** Limites adotados e por quê (também documentados no README). */
export const LIMITES_MISSAO = Object.freeze({
  /** Motores químicos (H₂/O₂) chegam a ≈ 4,4–4,5 km/s. Acima de 5 km/s a "vitória" viria de um motor impossível. */
  velocidadeExaustaoMax: 5000,
  /** Razão m₀/m_seca de um estágio único real fica abaixo de ≈ 20; 25 já é generoso. */
  razaoMassasMax: 25,
  /** Aceleração estrutural máxima (m/s², ≈ 100 g): com T/m_seca maior o foguete "esmagaria" qualquer estrutura. */
  aceleracaoEstruturalMax: 1000,
  /** Margem de 0,5 % de μ/R (≈ 0,3 MJ/kg ≈ 28 m/s a 11 km/s) que cobre o arrasto residual acima de 100 km. */
  margemEnergia: 0.005 * MU_TERRA / RAIO_TERRA,
  /** A energia só vale acima da Linha de Kármán, onde a atmosfera exponencial já é desprezível. */
  alturaMinimaEnergia: LINHA_KARMAN,
});

/** Altitude (acima da superfície) correspondente à distância Terra–Lua centro a centro. */
export const ALTITUDE_LUA = DISTANCIA_TERRA_LUA - RAIO_TERRA;

/** Missões do jogo (a sexta é a conquista especial). `alvo` em metros de altitude máxima. */
export const MISSOES = Object.freeze([
  { id: 'troposfera', nome: 'Troposfera', faixa: '0 – 12 km', tipo: 'altitude', alvo: 12000, icone: 'troposfera', objetivo: 'Atingir o topo da troposfera (12 km).', dica: 'Basta o empuxo vencer o peso: confira a aceleração inicial.' },
  { id: 'estratosfera', nome: 'Estratosfera', faixa: '12 – 50 km', tipo: 'altitude', alvo: 50000, icone: 'estratosfera', objetivo: 'Atingir o topo da estratosfera (50 km).', dica: 'O combustível precisa durar para o foguete continuar subindo.' },
  { id: 'mesosfera', nome: 'Mesosfera', faixa: '50 – 85 km', tipo: 'altitude', alvo: 85000, icone: 'mesosfera', objetivo: 'Atingir o topo da mesosfera (85 km).', dica: 'Mais velocidade na queima rende mais altitude depois que o motor apaga.' },
  { id: 'termosfera', nome: 'Termosfera', faixa: '85 – 600 km', tipo: 'altitude', alvo: 600000, icone: 'termosfera', objetivo: 'Atingir o topo da termosfera (600 km).', dica: 'Precisa de bem mais velocidade: aumente o combustível ou o empuxo.' },
  { id: 'exosfera', nome: 'Exosfera', faixa: '600+ km', tipo: 'altitude', alvo: 2000000, icone: 'exosfera', objetivo: 'Alcançar 2.000 km de altitude, no limite do espaço próximo.', dica: 'Use o “Foguete reforçado” como ponto de partida.' },
  { id: 'lua', nome: 'Lua', faixa: '384.400 km', tipo: 'lunar', alvo: ALTITUDE_LUA, icone: 'lua', especial: true,
    objetivo: 'Ter energia suficiente para alcançar a distância da Lua (modelo didático).', dica: 'Razão de massas alta e motor de 4,5 km/s: veja o “Foguete lunar”.' },
]);

export const obterMissao = (id) => MISSOES.find((m) => m.id === id) ?? null;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const lim = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const num = (x, d = 1) => Number(x).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const dist = (m) => (Math.abs(m) >= 1e6 ? `${num(m / 1000, 0)} km` : Math.abs(m) >= 10000 ? `${num(m / 1000, 1)} km` : `${num(m, 0)} m`);

/** Energia específica mínima (J/kg) para o critério lunar, já com a margem de segurança. */
export const energiaNecessariaLua = () => energiaParaAlcancar(ALTITUDE_LUA) + LIMITES_MISSAO.margemEnergia;

/**
 * Análise estática do foguete (só parâmetros): velocidade de exaustão, razão de massas, Δv ideal
 * (equação de Tsiolkovsky) e acelerações teóricas. Serve de painel de projeto e de limite superior.
 */
export function analisarFoguete(p) {
  const mSeca = p.massaEstrutural, mComb = p.massaCombustivel, m0 = mSeca + mComb;
  const ve = p.consumo > 0 ? p.empuxo / p.consumo : Infinity;
  const razao = m0 / mSeca;
  return {
    massaInicial: m0, velocidadeExaustao: ve, razaoMassas: razao,
    deltaVIdeal: mComb > 0 && Number.isFinite(ve) ? ve * Math.log(razao) : (mComb > 0 ? Infinity : 0),
    razaoEmpuxoPeso: p.empuxo / (m0 * G0),
    aceleracaoFinalTeorica: p.empuxo / mSeca,           // empuxo / massa seca (fim da queima, sem gravidade)
    tempoQueima: p.consumo > 0 ? mComb / p.consumo : Infinity,
  };
}

/**
 * Limite SUPERIOR da energia específica que ainda pode ser atingida: dε/dt = v(T−D)/m ≤ v·T/m e
 * v(t) ≤ v + Δv_ideal  ⇒  ε_final ≤ ε + Δv_ideal·(max(v,0) + Δv_ideal). Gravidade e arrasto só pioram.
 * Se mesmo esse limite não basta, o sucesso é IMPOSSÍVEL com o combustível que resta.
 */
export function limiteSuperiorDeEnergia(energiaAtual, v, combustivel, massaEstrutural, empuxo, consumo) {
  if (combustivel <= 0) return energiaAtual;
  if (!(consumo > 0)) return Infinity; // motor sem consumo (comportamento documentado do modelo): sem limite
  const dv = (empuxo / consumo) * Math.log((massaEstrutural + combustivel) / massaEstrutural);
  return energiaAtual + dv * (Math.max(v, 0) + dv);
}

/**
 * Tempo e velocidade de chegada à distância da Lua, pela INTEGRAL DEFINIDA
 *   t = ∫ dr / v(r),   v(r) = √(2(ε + μ/r)),   de r₀ = R+h até r_Lua      (movimento radial sem empuxo)
 * ESTIMATIVA DIDÁTICA: ignora a gravidade da Lua, o movimento da Terra e o arrasto residual.
 * Substituição r = r_L − Δ(1−s)² remove a singularidade da raiz quando ε ≈ −μ/r_L; regra do ponto médio.
 * Retorna null se ε não basta para alcançar a Lua.
 */
export function estimarTransitoLunar(energia, h, n = 4000) {
  const r0 = RAIO_TERRA + h, rL = DISTANCIA_TERRA_LUA;
  if (!(energia + MU_TERRA / rL >= 0) || r0 >= rL) return null;
  const delta = rL - r0;
  let soma = 0;
  for (let k = 0; k < n; k++) {
    const s = (k + 0.5) / n, r = rL - delta * (1 - s) ** 2;
    const v = Math.sqrt(Math.max(0, 2 * (energia + MU_TERRA / r)));
    soma += (2 * delta * (1 - s)) / (v || 1e-9);
  }
  const tempo = soma / n;
  return { tempo, velocidadeChegada: Math.sqrt(Math.max(0, 2 * (energia + MU_TERRA / rL))) };
}

/** Extrai da simulação os números que a missão precisa (nenhum valor é inventado). */
export function dadosDaSimulacao(sim) {
  return {
    params: sim.params, status: sim.status, codigo: sim.codigo, motivoParada: sim.motivo,
    t: sim.t, h: sim.h, v: sim.v, hMax: sim.hMax, vMax: sim.vMax,
    combustivel: sim.combustivel, consumido: sim.consumido,
    massa: sim.forcas.massa, empuxo: sim.forcas.empuxo, aceleracao: sim.forcas.aceleracao,
    aceleracaoInicial: sim.aceleracaoInicial, aceleracaoMaxima: sim.aceleracaoMaxima,
    energia: sim.energia, energiaMaximaEspaco: sim.energiaMaximaEspaco, jaDesceu: sim.jaDesceu,
  };
}

// ---------------------------------------------------------------------------
// Condições de cada tipo de missão
// ---------------------------------------------------------------------------
const cond = (id, titulo, requisito, atual, atendida, dica) => ({ id, titulo, requisito, atual, atendida: Boolean(atendida), dica });

function condicoesAltitude(m, d) {
  return [
    cond('gravidade', 'Vencer a gravidade', 'empuxo maior que o peso (aceleração inicial > 0)', `${num(d.aceleracaoInicial, 2)} m/s²`, d.aceleracaoInicial > 0,
      'Aumente o empuxo ou reduza a massa até o empuxo superar o peso.'),
    cond('altitude', `Atingir ${dist(m.alvo)}`, `altitude máxima ≥ ${dist(m.alvo)}`, dist(d.hMax), d.hMax >= m.alvo,
      `Faltam ${dist(Math.max(0, m.alvo - d.hMax))}: mais combustível ou empuxo rendem mais altitude.`),
  ];
}

function condicoesLunar(d) {
  const p = d.params, A = analisarFoguete(p), L = LIMITES_MISSAO, eReq = energiaNecessariaLua();
  const eEsp = d.energiaMaximaEspaco, variavel = p.modeloGravidade === 'variavel';
  const fracao = Number.isFinite(eEsp) && variavel ? (eEsp - energiaParaAlcancar(0)) / (eReq - energiaParaAlcancar(0)) : 0;
  return [
    cond('gravidade', 'Vencer a gravidade', 'empuxo maior que o peso (aceleração inicial > 0)', `${num(d.aceleracaoInicial, 2)} m/s²`, d.aceleracaoInicial > 0,
      'Aumente o empuxo ou reduza a massa até o empuxo superar o peso.'),
    cond('atmosfera', 'Atravessar a atmosfera', 'altitude máxima ≥ 100 km (Linha de Kármán)', dist(d.hMax), d.hMax >= LINHA_KARMAN,
      'O foguete precisa passar dos 100 km antes de a energia contar.'),
    cond('continuidade', 'Subida contínua', 'nenhuma descida (v ≥ 0) desde a decolagem', d.jaDesceu ? 'houve descida' : 'sem descidas', d.hMax > 0 && !d.jaDesceu,
      'Se o foguete voltou a descer, faltou energia: aumente combustível ou empuxo.'),
    cond('energia', 'Energia para alcançar a Lua', 'ε ≥ −μ/r_Lua (+ margem), medida acima de 100 km, com g(h) variável',
      variavel ? `${num(100 * Math.max(0, fracao), 1)} % da energia necessária` : 'indefinida (gravidade constante)',
      variavel && Number.isFinite(eEsp) && eEsp >= eReq,
      variavel ? 'É preciso Δv ≈ 12 km/s: combine razão de massas alta com velocidade de exaustão alta (≤ 5 km/s).' : 'O critério de energia exige gravidade variável g(h).'),
    cond('motor', 'Motor químico plausível', `velocidade de exaustão T/ṁ ≤ ${num(L.velocidadeExaustaoMax, 0)} m/s`,
      Number.isFinite(A.velocidadeExaustao) ? `${num(A.velocidadeExaustao, 0)} m/s` : 'consumo zero (infinita)', A.velocidadeExaustao <= L.velocidadeExaustaoMax,
      'Para o mesmo empuxo, gaste mais combustível por segundo (aumente o consumo).'),
    cond('massas', 'Tanques realistas', `razão de massas m₀/m_seca ≤ ${L.razaoMassasMax}`, num(A.razaoMassas, 1), A.razaoMassas <= L.razaoMassasMax,
      'Tanques não podem ser quase só combustível: reduza o combustível ou aumente a massa estrutural.'),
    cond('estrutura', 'Estrutura suportável', `empuxo / massa seca ≤ ${num(L.aceleracaoEstruturalMax, 0)} m/s² (≈ 100 g)`, `${num(A.aceleracaoFinalTeorica, 0)} m/s²`,
      A.aceleracaoFinalTeorica <= L.aceleracaoEstruturalMax, 'Reduza o empuxo ou aumente a massa estrutural.'),
    cond('modelo', 'Modelo físico completo', 'gravidade variável, resistência do ar ligada e partida do repouso (v₀ = 0)',
      `${variavel ? 'g(h) variável' : 'g constante'}, ar ${p.arrastoAtivo ? 'ligado' : 'desligado'}, v₀ = ${num(p.velocidadeInicial, 0)} m/s`,
      variavel && p.arrastoAtivo && p.velocidadeInicial === 0, 'Ligue a gravidade variável e a resistência do ar, e comece com v₀ = 0.'),
  ];
}

// ---------------------------------------------------------------------------
// Barra de progresso: regras documentadas, SEMPRE em função de números do motor.
// Cada etapa dá `pct` quando sua variável chega a `ate`; entre etapas o valor é interpolado.
// ---------------------------------------------------------------------------
function etapasLunar(d, fracaoEnergia) {
  return [
    { id: 'decolagem', nome: 'Decolagem', pct: 10, valor: d.hMax, inicio: 0, ate: 1 },                       // h > 0
    { id: 'atmosfera', nome: 'Atmosfera', pct: 25, valor: d.hMax, inicio: 1, ate: 12000 },                   // saiu da troposfera
    { id: 'alta-altitude', nome: 'Alta altitude', pct: 45, valor: d.hMax, inicio: 12000, ate: 50000 },       // saiu da estratosfera
    { id: 'espaco', nome: 'Espaço', pct: 65, valor: d.hMax, inicio: 50000, ate: LINHA_KARMAN },              // Linha de Kármán
    { id: 'aproximacao', nome: 'Aproximação lunar', pct: 85, valor: fracaoEnergia, inicio: 0, ate: 0.9 },    // ≥ 90 % da energia
    { id: 'conquista', nome: 'Conquista da Lua', pct: 100, valor: fracaoEnergia, inicio: 0.9, ate: 1 },      // 100 % + todas as condições
  ];
}
function etapasAltitude(m, d) {
  return [
    { id: 'decolagem', nome: 'Decolagem', pct: 10, valor: d.hMax, inicio: 0, ate: 1 },
    { id: 'subida', nome: `Rumo a ${dist(m.alvo)}`, pct: 99, valor: d.hMax, inicio: 1, ate: m.alvo },
    { id: 'conquista', nome: 'Missão concluída', pct: 100, valor: d.hMax, inicio: m.alvo, ate: m.alvo },
  ];
}

function calcularProgresso(etapas, vitoria) {
  let pctAnt = 0, atual = { id: 'preparacao', nome: 'Preparação', pct: 0 }, progresso = 0, achou = false;
  for (const e of etapas) {
    const parcial = e.ate > e.inicio ? lim((e.valor - e.inicio) / (e.ate - e.inicio)) : (e.valor >= e.ate ? 1 : 0);
    if (!achou) progresso = pctAnt + (e.pct - pctAnt) * parcial;
    if (parcial >= 1 && (e.id !== 'conquista' || vitoria)) atual = { id: e.id, nome: e.nome, pct: e.pct };
    else achou = true;
    pctAnt = e.pct;
  }
  if (vitoria) return { progresso: 100, etapa: etapas[etapas.length - 1] };
  return { progresso: Math.min(progresso, 99.9), etapa: atual };
}

/**
 * AVALIA A MISSÃO. Função pura e independente da animação.
 * @param {object} missao  item de MISSOES
 * @param {object} d       resultado de dadosDaSimulacao(sim)
 * @returns {{progresso:number, etapa:object, estado:string, condicoes:object[], atendidas:object[], naoAtendidas:object[],
 *   vitoria:boolean, possibilidade:'sucesso'|'possivel'|'impossivel', motivoPossibilidade:string, resumo:string, dicas:string[]}}
 */
export function avaliarMissao(missao, d) {
  const lunar = missao.tipo === 'lunar';
  const condicoes = lunar ? condicoesLunar(d) : condicoesAltitude(missao, d);
  const atendidas = condicoes.filter((c) => c.atendida), naoAtendidas = condicoes.filter((c) => !c.atendida);
  const vitoria = naoAtendidas.length === 0;
  const eReq = energiaNecessariaLua(), eSolo = energiaParaAlcancar(0);
  const fracaoEnergia = lunar && d.params.modeloGravidade === 'variavel' && Number.isFinite(d.energiaMaximaEspaco) ? lim((d.energiaMaximaEspaco - eSolo) / (eReq - eSolo)) : 0;
  const { progresso, etapa } = calcularProgresso(lunar ? etapasLunar(d, fracaoEnergia) : etapasAltitude(missao, d), vitoria);

  const encerrada = d.status === 'encerrada';
  const estado = vitoria ? 'sucesso' : encerrada ? 'falha' : d.status === 'pronta' ? 'preparacao' : 'em-voo';

  // possibilidade de sucesso: usa o limite superior de energia (nunca otimista demais)
  let possibilidade = 'possivel', motivoPossibilidade = 'Ainda há combustível e energia para cumprir a missão.';
  const variavel = d.params.modeloGravidade === 'variavel';
  const nec = lunar ? eReq : (variavel ? energiaParaAlcancar(missao.alvo) : G0 * missao.alvo);
  const energiaConst = variavel ? d.energia : 0.5 * d.v * d.v + G0 * d.h;
  if (vitoria) { possibilidade = 'sucesso'; motivoPossibilidade = 'Todas as condições foram atendidas.'; }
  else if (encerrada) { possibilidade = 'impossivel'; motivoPossibilidade = 'O voo terminou sem cumprir todas as condições.'; }
  else if (lunar && naoAtendidas.some((c) => ['motor', 'massas', 'estrutura', 'modelo'].includes(c.id))) {
    possibilidade = 'impossivel'; motivoPossibilidade = 'Os parâmetros do foguete violam os limites realistas da missão lunar.';
  } else if (lunar && d.jaDesceu) { possibilidade = 'impossivel'; motivoPossibilidade = 'O foguete já desceu: a subida contínua foi interrompida.'; }
  else if (!lunar && d.hMax >= missao.alvo) { possibilidade = 'sucesso'; }
  else if (d.status === 'pronta' && d.aceleracaoInicial <= 0) { possibilidade = 'impossivel'; motivoPossibilidade = 'O empuxo não supera o peso: o foguete não sai do chão.'; }
  else {
    const p = d.params, comb = d.combustivel;
    const eSup = limiteSuperiorDeEnergia(energiaConst, d.v, comb, p.massaEstrutural, p.empuxo, p.consumo);
    if (lunar && !variavel) { possibilidade = 'impossivel'; motivoPossibilidade = 'Com gravidade constante não existe energia de escape bem definida.'; }
    else if (!(eSup >= nec)) {
      possibilidade = 'impossivel';
      motivoPossibilidade = comb > 0 ? 'Mesmo queimando todo o combustível restante com perfeição, a energia não chega ao necessário.' : 'O combustível acabou e a energia atual é insuficiente.';
    }
  }

  const dicas = naoAtendidas.map((c) => c.dica);
  let resumo = '';
  if (vitoria) resumo = lunar ? 'Energia suficiente para alcançar a Lua: todas as condições foram atendidas.' : `Altitude de ${dist(missao.alvo)} alcançada.`;
  else if (encerrada) {
    if (d.codigo === 'abortado') resumo = d.motivoParada;
    else if (lunar && naoAtendidas.some((c) => c.id === 'energia') && variavel) resumo = `O foguete chegou a ${dist(d.hMax)}, mas só reuniu ${num(100 * fracaoEnergia, 1)} % da energia necessária para a distância da Lua.`;
    else resumo = `O voo terminou em ${dist(d.hMax)} de altitude máxima, sem cumprir: ${naoAtendidas.map((c) => c.titulo.toLowerCase()).join('; ')}.`;
  } else resumo = etapa.nome;

  return { missaoId: missao.id, tipo: missao.tipo, progresso, etapa, estado, condicoes, atendidas, naoAtendidas, vitoria, possibilidade, motivoPossibilidade, resumo, dicas, fracaoEnergia };
}

/** Resumo numérico do resultado da missão lunar (para a tela de vitória): tempo de trânsito e chegada. */
export function resumoLunar(d) {
  if (!Number.isFinite(d.energiaMaximaEspaco)) return null;
  const e = d.energiaMaximaEspaco, hInicio = Math.max(d.h, LINHA_KARMAN), t = estimarTransitoLunar(e, hInicio);
  return t ? { ...t, hInicio, energia: e, energiaNecessaria: energiaNecessariaLua() } : null;
}
