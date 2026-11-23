// ============================================================================
// personagens.js — PERSONAGENS CONFIGURÁVEIS.
// A simulação e a missão não sabem quem é a personagem: o jogo só pergunta "em que ESTADO ela está?"
// (estadoDaPersonagem) e "qual QUADRO desenhar?" (quadroDaPersonagem). Para trocar a galinha pelas
// apresentadoras basta registrar outra definição (registrarPersonagem) e ativá-la; nada mais muda.
//
// Uma definição precisa de: id, nome e `cabeca` com os 8 estados. `corpo` e `retrato` são opcionais.
// Cada quadro pode ser uma GRADE DE PIXELS (array de strings), uma lista de grades (animação)
// ou uma IMAGEM ({ imagem: 'caminho.png' }) — por exemplo, a foto/avatar de uma apresentadora.
// ============================================================================
import { PALETA, CABECAS, CORPOS, RETRATOS } from './sprites.js';

export const ESTADOS_PERSONAGEM = Object.freeze(['idle', 'preparing', 'launching', 'flying', 'concerned', 'failed', 'celebrating', 'moon']);
/** Partes que o jogo sabe desenhar: cabeça (janela do foguete), retrato (painel) e corpo inteiro (telas). */
export const PARTES = Object.freeze(['cabeca', 'retrato', 'corpo']);

const FALAS_PADRAO = Object.freeze({
  idle: 'Grandes destinos começam com bons cálculos!',
  preparing: 'Confira o foguete: o empuxo precisa vencer o peso!',
  launching: 'Três, dois, um… decolar!',
  flying: 'Estamos subindo! Veja a altitude crescer.',
  concerned: 'Eita… o combustível está acabando!',
  failed: 'Não foi dessa vez… vamos ajustar os cálculos!',
  celebrating: 'Conseguimos! Missão cumprida!',
  moon: 'CONSEGUIMOS! CHEGAMOS À LUA!',
});

/** Valida uma definição. Retorna { ok, erros[] }. */
export function validarPersonagem(def) {
  const erros = [];
  if (!def || typeof def !== 'object') return { ok: false, erros: ['Definição de personagem ausente.'] };
  if (!def.id || typeof def.id !== 'string') erros.push('A personagem precisa de um "id" (texto).');
  if (!def.nome || typeof def.nome !== 'string') erros.push('A personagem precisa de um "nome" (texto).');
  const ehGrade = (q) => Array.isArray(q) && q.length > 0 && q.every((l) => typeof l === 'string');
  const ehImagem = (q) => Boolean(q) && typeof q === 'object' && !Array.isArray(q) && typeof q.imagem === 'string' && q.imagem.length > 0;
  const ehQuadro = (q) => ehGrade(q) || ehImagem(q);
  const valido = (q) => ehQuadro(q) || (Array.isArray(q) && q.length > 0 && q.every(ehQuadro)); // quadro único ou lista (animação)
  for (const estado of ESTADOS_PERSONAGEM) if (!valido(def.cabeca?.[estado])) erros.push(`Falta o quadro "cabeca.${estado}".`);
  for (const parte of ['retrato', 'corpo']) if (def[parte]) for (const estado of Object.keys(def[parte])) if (estado !== 'piscando' && !ESTADOS_PERSONAGEM.includes(estado)) erros.push(`Estado desconhecido em "${parte}": ${estado}.`);
  return { ok: erros.length === 0, erros };
}

/** Cria (e congela) uma personagem a partir da definição, preenchendo o que for opcional. */
export function criarPersonagem(def) {
  const v = validarPersonagem(def);
  if (!v.ok) throw new Error('Personagem inválida: ' + v.erros.join(' '));
  return Object.freeze({
    apelido: def.nome, descricao: '', paleta: PALETA, retrato: {}, corpo: {}, imagens: {}, ...def,
    falas: { ...FALAS_PADRAO, ...(def.falas ?? {}) },
  });
}

/** A galinha astronauta (personagem padrão da Missão Penosa). */
export const GALINHA = criarPersonagem({
  id: 'galinha', nome: 'Galinha Astronauta', apelido: 'A Pilota',
  descricao: 'Uma galinha determinada, sonhadora e pronta para explorar o universo!',
  cabeca: { idle: CABECAS.idle, piscando: CABECAS.idlePiscando, preparing: CABECAS.preparing, launching: CABECAS.launching, flying: CABECAS.flying, concerned: CABECAS.concerned,
    failed: CABECAS.failed, celebrating: CABECAS.celebrating, moon: CABECAS.moon },
  retrato: { idle: RETRATOS.idle, piscando: RETRATOS.idlePiscando, preparing: RETRATOS.preparing, launching: RETRATOS.launching, flying: RETRATOS.flying, concerned: RETRATOS.concerned,
    failed: RETRATOS.failed, celebrating: RETRATOS.celebrating, moon: RETRATOS.moon },
  corpo: (({ idlePiscando, ...resto }) => ({ ...resto, piscando: idlePiscando }))(CORPOS),
});

// ---------------------------------------------------------------------------
// Registro e personagem ativa
// ---------------------------------------------------------------------------
const registro = new Map([[GALINHA.id, GALINHA]]);
let idAtivo = GALINHA.id;

export const listarPersonagens = () => [...registro.values()];
export const obterPersonagem = (id) => registro.get(id) ?? null;
export function registrarPersonagem(def) { const p = criarPersonagem(def); registro.set(p.id, p); return p; }
export const personagemAtiva = () => registro.get(idAtivo);
export function definirPersonagemAtiva(id) {
  if (!registro.has(id)) throw new Error(`Personagem desconhecida: ${id}`);
  idAtivo = id; return registro.get(id);
}
export function removerPersonagem(id) { if (id !== GALINHA.id) { registro.delete(id); if (idAtivo === id) idAtivo = GALINHA.id; } }

// ---------------------------------------------------------------------------
// Estado da personagem: função PURA do que está acontecendo no jogo
// ---------------------------------------------------------------------------
export const LIMITE_COMBUSTIVEL_BAIXO = 0.2;   // ≤ 20 % do combustível inicial
export const ALTITUDE_DECOLAGEM = 3000;         // m: abaixo disso, com motor ligado, é a "decolagem"

/**
 * @param {{tela:string, fase?:string, resultado?:string|null, missaoLunar?:boolean,
 *          sim?:{h:number, v:number, combustivelFracao:number, empuxo:number}}} ctx
 */
export function estadoDaPersonagem({ tela, fase = 'pronta', resultado = null, missaoLunar = false, sim = null }) {
  if (tela === 'vitoria') return missaoLunar ? 'moon' : 'celebrating';
  if (tela === 'derrota') return 'failed';
  if (tela !== 'simulador') return 'idle';
  if (fase === 'pronta' || !sim) return 'preparing';
  if (fase === 'encerrada') return resultado === 'vitoria' ? 'celebrating' : resultado === 'derrota' ? 'failed' : 'idle';
  if (sim.v < 0 || sim.combustivelFracao <= LIMITE_COMBUSTIVEL_BAIXO) return 'concerned';
  if (sim.empuxo > 0 && sim.h < ALTITUDE_DECOLAGEM) return 'launching';
  return 'flying';
}

const PISCAR = { periodo: 3200, duracao: 160 };

/**
 * Escolhe o quadro a desenhar. Retorna { tipo:'pixel', grade, paleta } ou { tipo:'imagem', src }.
 * Listas de quadros (animação) alternam a cada 450 ms; no estado idle a personagem PISCA se houver
 * o quadro `piscando`. Sem `retrato`/`corpo`, usa a cabeça.
 */
export function quadroDaPersonagem(p, estado, parte = 'cabeca', tempoMs = 0) {
  if (!ESTADOS_PERSONAGEM.includes(estado)) throw new Error(`Estado desconhecido: ${estado}`);
  if (!PARTES.includes(parte)) throw new Error(`Parte desconhecida: ${parte}`);
  const tabela = p[parte] && Object.keys(p[parte]).length ? p[parte] : p.cabeca;
  const piscando = estado === 'idle' && tabela.piscando && (tempoMs % PISCAR.periodo) > PISCAR.periodo - PISCAR.duracao;
  const entrada = (piscando ? tabela.piscando : tabela[estado]) ?? p.cabeca[estado];
  const q = Array.isArray(entrada) && entrada.length && typeof entrada[0] !== 'string' ? entrada[Math.floor(tempoMs / 450) % entrada.length] : entrada;
  return q.imagem ? { tipo: 'imagem', src: q.imagem } : { tipo: 'pixel', grade: q, paleta: p.paleta };
}

export const falaDaPersonagem = (p, estado) => p.falas[estado] ?? FALAS_PADRAO[estado];
