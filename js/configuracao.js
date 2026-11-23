// ============================================================================
// configuracao.js — constantes físicas, parâmetros padrão e validação
// ============================================================================

export const G0 = 9.80665;            // gravidade ao nível do mar (m/s²)
export const RAIO_TERRA = 6371000;    // raio médio da Terra (m)
export const RHO0 = 1.225;            // densidade do ar ao nível do mar (kg/m³)
export const ESCALA_ALTURA = 8500;    // altura de escala da atmosfera (m)
export const PASSO_INTEGRACAO = 0.01; // Δt matemático (s), independente dos quadros da tela
export const MU_TERRA = G0 * RAIO_TERRA ** 2; // GM da Terra (m³/s²): g(h) = μ/(R+h)² reproduz G0 em h = 0
export const LINHA_KARMAN = 100000;           // limite convencional do espaço (m)
export const DISTANCIA_TERRA_LUA = 384400000; // distância média centro a centro (m) — usada só na missão lunar didática

/** Valores iniciais de exemplo: o lançamento atravessa várias camadas da atmosfera. */
export const PARAMETROS_PADRAO = Object.freeze({
  massaEstrutural: 500,      // kg
  massaCombustivel: 900,     // kg
  empuxo: 30000,             // N
  consumo: 8,                // kg/s
  tempoMaximo: 1200,         // s
  areaFrontal: 1.2,          // m²
  coefArrasto: 0.5,          // adimensional
  velocidadeInicial: 0,      // m/s
  modeloGravidade: 'variavel', // modelo gravitacional com constantes fixas em todas as missões
  arrastoAtivo: true, // modelo de arrasto fixo; área e coeficiente não são editáveis
});

/**
 * Foguetes prontos para demonstração (todos usam os MESMOS campos do formulário).
 * Servem de ponto de partida; o jogador pode editar qualquer valor.
 */
export const FOGUETES_PRONTOS = Object.freeze({
  padrao: { nome: 'Foguete padrão', descricao: 'O foguete original da Missão Penosa: atravessa várias camadas, mas não chega ao espaço profundo.', parametros: PARAMETROS_PADRAO },
  reforcado: {
    nome: 'Foguete reforçado', descricao: 'Mais combustível e empuxo: chega a milhares de km, mas ainda com menos de 1/3 da energia lunar.',
    parametros: Object.freeze({ ...PARAMETROS_PADRAO, massaCombustivel: 3000, empuxo: 80000, consumo: 20, tempoMaximo: 1800 }),
  },
  lunar: {
    nome: 'Foguete lunar', descricao: 'Razão de massas ≈ 19 e velocidade de exaustão de 4,5 km/s (limite dos motores químicos): energia suficiente para a distância da Lua.',
    parametros: Object.freeze({ ...PARAMETROS_PADRAO, massaEstrutural: 500, massaCombustivel: 9500, empuxo: 450000, consumo: 100, tempoMaximo: 600 }),
  },
});

/** Referências didáticas (limites aproximados em metros). */
export const REGIOES = [
  { nome: 'Troposfera', ate: 12000 },
  { nome: 'Estratosfera', ate: 50000 },
  { nome: 'Mesosfera', ate: 85000 },
  { nome: 'Termosfera', ate: 600000 },
  { nome: 'Exosfera', ate: Infinity },
];

export function regiaoAtmosferica(h) {
  return REGIOES.find((r) => h < r.ate).nome;
}

/** Valida todos os campos. Retorna { ok, erros[] } com mensagens em português. */
export function validarParametros(p) {
  const erros = [];
  const num = (campo, rotulo, min, max, { minInclusivo = true } = {}) => {
    const v = p?.[campo];
    if (typeof v !== 'number' || !Number.isFinite(v)) { erros.push(`${rotulo}: informe um número válido.`); return; }
    if (minInclusivo ? v < min : v <= min) erros.push(`${rotulo}: deve ser ${minInclusivo ? 'maior ou igual a' : 'maior que'} ${min}.`);
    else if (v > max) erros.push(`${rotulo}: deve ser no máximo ${max}.`);
  };
  num('massaEstrutural', 'Massa estrutural (kg)', 0, 1e7, { minInclusivo: false });
  num('massaCombustivel', 'Massa de combustível (kg)', 0, 1e7);
  num('empuxo', 'Empuxo (N)', 0, 1e9);
  num('consumo', 'Consumo (kg/s)', 0, 1e5);
  num('tempoMaximo', 'Tempo máximo (s)', 0, 7200, { minInclusivo: false });
  num('areaFrontal', 'Área frontal (m²)', 0, 1e3, { minInclusivo: false });
  num('coefArrasto', 'Coeficiente de arrasto', 0, 10);
  num('velocidadeInicial', 'Velocidade inicial (m/s)', -1e4, 1e4);
  if (!['variavel', 'constante'].includes(p?.modeloGravidade)) erros.push('Modelo de gravidade inválido.');
  if (typeof p?.arrastoAtivo !== 'boolean') erros.push('Opção de resistência do ar inválida.');
  return { ok: erros.length === 0, erros };
}

export const PROJETO = Object.freeze({
  titulo: 'MISSÃO PENOSA — Simulador de Lançamento Espacial',
  disciplina: 'Cálculo Diferencial e Integral I',
  instituicao: 'Instituto Federal Sul-rio-grandense (IFSul) - Câmpus Passo Fundo',
  professor: 'Denilson José Seidel',
  integrantes: Object.freeze(['Djovana', 'Julia', 'Marcela', 'Rafaela']),
  objetivo: 'Mostrar, com um simulador de lançamento vertical, que a velocidade é a primeira derivada da altitude e a aceleração é a segunda derivada, usando gráficos e valores instantâneos.',
});

/**
 * CONFIGURAÇÃO DE REFERÊNCIA de cada missão (verificada em tests/missao.test.js e em
 * ferramentas/verificar-missoes.mjs; valores e resultados em GUIA_DE_MISSOES.md).
 */
export const CONFIGURACOES_DE_REFERENCIA = Object.freeze({
  troposfera: PARAMETROS_PADRAO,
  estratosfera: PARAMETROS_PADRAO,
  mesosfera: PARAMETROS_PADRAO,
  termosfera: Object.freeze({ ...PARAMETROS_PADRAO, massaEstrutural: 500, massaCombustivel: 1500, empuxo: 40000, consumo: 10, tempoMaximo: 1200 }),
  exosfera: Object.freeze({ ...PARAMETROS_PADRAO, massaEstrutural: 500, massaCombustivel: 3000, empuxo: 60000, consumo: 15, tempoMaximo: 1800 }),
  lua: FOGUETES_PRONTOS.lunar.parametros,
});
