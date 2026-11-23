// ============================================================================
// simulacao.js — controle do tempo simulado, histórico e condições de parada
// O passo matemático (Δt) é fixo e NÃO depende da taxa de quadros da animação.
// ============================================================================
import { PASSO_INTEGRACAO, LINHA_KARMAN, validarParametros, regiaoAtmosferica } from './configuracao.js';
import { calcularForcas, atualizarEstadoFoguete, energiaMecanicaEspecifica } from './fisica.js';
import { calcularVelocidadePorDerivada, calcularAceleracaoPorDerivada } from './derivadas.js';

/** Retorna { codigo, motivo } se a simulação deve parar; senão null. */
export function detectarCondicaoDeParada(e, p) {
  const f = e.forcas;
  if (![e.h, e.v, f.aceleracao, f.massa].every(Number.isFinite) || f.massa < p.massaEstrutural - 1e-9) {
    return { codigo: 'falha-numerica', motivo: 'Falha numérica: valores não finitos ou estado inválido.' };
  }
  if (e.passos === 0) {
    if (e.h <= 0 && e.v < 0) return { codigo: 'retorno-superficie', motivo: 'Velocidade inicial descendente na superfície.' };
    if (e.h <= 0 && e.v <= 0 && f.aceleracao <= 0) {
      return { codigo: 'abortado', motivo: `Lançamento abortado: empuxo (${f.empuxo.toFixed(0)} N) não supera o peso (${f.peso.toFixed(0)} N); a aceleração inicial seria ${f.aceleracao.toFixed(2)} m/s².` };
    }
    return null;
  }
  if (e.h <= 0 && e.v < 0) return { codigo: 'retorno-superficie', motivo: 'O foguete retornou à superfície com movimento descendente.' };
  if (e.t >= p.tempoMaximo - 1e-9) return { codigo: 'tempo-maximo', motivo: 'Tempo máximo de simulação atingido.' };
  return null;
}

export class Simulacao {
  constructor(params, opcoes = {}) {
    const val = validarParametros(params);
    if (!val.ok) throw new Error('Parâmetros inválidos: ' + val.erros.join(' '));
    this.params = { ...params };
    this.dt = opcoes.dt ?? PASSO_INTEGRACAO;
    this.intervaloRegistro = opcoes.intervaloRegistro ?? 10; // grava 1 de cada N passos
    this.reiniciar();
  }

  /** Zera tempo, altitude, distância e histórico; reaplica os parâmetros atuais. */
  reiniciar() {
    const p = this.params;
    Object.assign(this, {
      t: 0, passos: 0, h: 0, v: p.velocidadeInicial, combustivel: p.massaCombustivel,
      hMax: 0, tHMax: 0, vMax: p.velocidadeInicial, distancia: 0, consumido: 0,
      status: 'pronta', codigo: null, motivo: null, relatorio: null,
      eventos: [], historico: [], ultimoPasso: null, vDer: null, aDer: null,
      _apogeu: false, _descida: false, _esgotado: false, _decolou: false,
    });
    this.forcas = calcularForcas(this.h, this.v, this.combustivel, p, this.dt);
    this.aceleracaoAplicada = this.forcas.aceleracao;
    // estatísticas usadas pela camada de missão (apenas leitura; não interferem na física)
    this.aceleracaoInicial = this.forcas.aceleracao; this.aceleracaoMaxima = this.forcas.aceleracao;
    this.energia = energiaMecanicaEspecifica(this.h, this.v); this.energiaMaxima = this.energia;
    this.energiaMaximaEspaco = this.h >= LINHA_KARMAN ? this.energia : -Infinity; // só conta acima da atmosfera densa
    this._registrar();
  }

  get regiao() { return regiaoAtmosferica(this.h); }
  /** true se o foguete já teve velocidade vertical negativa (descida) em algum instante. */
  get jaDesceu() { return this._descida; }

  _evento(tipo, nivel, texto) { this.eventos.push({ t: this.t, tipo, nivel, texto }); }

  _registrar() {
    const f = this.forcas;
    this.historico.push({
      t: this.t, h: this.h, v: this.v, a: this.aceleracaoAplicada, vDer: this.vDer, aDer: this.aDer,
      massa: f.massa, combustivel: this.combustivel, empuxo: f.empuxo, arrasto: f.arrasto,
      gravidade: f.gravidade, rho: f.rho,
    });
  }

  /** Avança UM passo de Δt. Retorna false se a simulação já terminou. */
  passo() {
    if (this.status === 'encerrada') return false;
    const p = this.params, dt = this.dt;
    if (this.status === 'pronta') {
      this.status = 'executando';
      const parada = detectarCondicaoDeParada(this, p);
      if (parada) { this._encerrar(parada); return false; }
    }

    const hAnt = this.h, vAnt = this.v, combAnt = this.combustivel;

    // A aceleração aplicada neste intervalo é a calculada pelas forças no início do passo.
    const aceleracaoAnterior = this.forcas.aceleracao;

    // 1) integração numérica (Euler semi-implícito) usando a aceleração do modelo físico
    const novo = atualizarEstadoFoguete({ h: hAnt, v: vAnt, combustivel: combAnt }, this.forcas, p, dt);
    this.h = novo.h; this.v = novo.v; this.combustivel = novo.combustivel;
    this.consumido += novo.queimado;
    this.t += dt; this.passos++;
    this.forcas = calcularForcas(this.h, this.v, this.combustivel, p, dt);
    this.aceleracaoAplicada = aceleracaoAnterior;

    // 2) DERIVADAS NUMÉRICAS a partir da altitude e da velocidade (comparadas com o modelo)
    
    this.vDer = calcularVelocidadePorDerivada(this.h, hAnt, dt);              // v ≈ dh/dt
    this.aDer = calcularAceleracaoPorDerivada(this.v, vAnt, dt);              // a ≈ dv/dt

    this.ultimoPasso = { hAnt, hAtual: this.h, vAnt, vAtual: this.v, dt };

    // 3) estatísticas e eventos
    this.distancia += Math.abs(this.h - hAnt);
    if (this.h > this.hMax) { this.hMax = this.h; this.tHMax = this.t; }
    this.vMax = Math.max(this.vMax, this.v);
    this.aceleracaoMaxima = Math.max(this.aceleracaoMaxima, this.forcas.aceleracao);
    this.energia = energiaMecanicaEspecifica(this.h, this.v); this.energiaMaxima = Math.max(this.energiaMaxima, this.energia);
    if (this.h >= LINHA_KARMAN) this.energiaMaximaEspaco = Math.max(this.energiaMaximaEspaco, this.energia);
    if (!this._decolou && this.h > 0) { this._decolou = true; this._evento('decolagem', 'info', 'Decolagem: o foguete saiu da base.'); }
    if (!this._esgotado && combAnt > 0 && this.combustivel === 0 && p.consumo > 0) {
      this._esgotado = true;
      this._evento('combustivel', 'aviso', 'Combustível esgotado: empuxo = 0. Gravidade e arrasto continuam atuando.');
    }
    if (!this._apogeu && vAnt > 0 && this.v <= 0) {
      this._apogeu = true;
      this._evento('apogeu', 'info', `Ponto mais alto atingido: ${this.hMax.toFixed(1)} m em t = ${this.tHMax.toFixed(1)} s.`);
    }
    if (!this._descida && this.v < 0) { this._descida = true; this._evento('descida', 'aviso', 'Foguete em descida: velocidade vertical negativa.'); }

    // 4) condição de parada e histórico
    const parada = detectarCondicaoDeParada(this, p);
    if (parada) { this._encerrar(parada); return false; }
    if (this.passos % this.intervaloRegistro === 0) this._registrar();
    return true;
  }

  /** Avança aproximadamente `tempoSimulado` segundos (limitado por maxPassos por chamada). */
  avancar(tempoSimulado, maxPassos = 20000) {
    let n = Math.min(maxPassos, Math.max(1, Math.round(tempoSimulado / this.dt)));
    while (n-- > 0 && this.passo());
  }

  executarAteOFim(limite = 2e7) {
    let i = 0;
    while (i++ < limite && this.passo());
    return this;
  }

  /**
   * Encerra a simulação por decisão externa (ex.: missão cumprida). Não altera nenhum valor calculado:
   * apenas congela o estado atual e gera o relatório.
   */
  encerrar(codigo, motivo) {
    if (this.status === 'encerrada') return;
    this._encerrar({ codigo, motivo });
  }

  _encerrar(parada) {
    this.status = 'encerrada'; this.codigo = parada.codigo; this.motivo = parada.motivo;
    this._registrar();
    const estadoFinal = { 'abortado': 'Lançamento abortado', 'retorno-superficie': 'Retornou à superfície',
      'tempo-maximo': this.v > 0 ? 'Ainda subindo no fim do tempo' : 'Em descida no fim do tempo', 'falha-numerica': 'Falha numérica',
      'missao-cumprida': 'Missão cumprida', 'missao-encerrada': 'Encerrada pelo jogador' }[parada.codigo];
    this.relatorio = {
      altitudeMaxima: this.hMax, tempoAltitudeMaxima: this.tHMax, tempoTotal: this.t,
      velocidadeMaxima: this.vMax, combustivelConsumido: this.consumido,
      estadoFinal, motivo: parada.motivo,
      aceleracaoInicial: this.aceleracaoInicial, aceleracaoMaxima: this.aceleracaoMaxima, energiaMaxima: this.energiaMaxima,
    };
    this._evento('fim', ['retorno-superficie', 'tempo-maximo', 'missao-cumprida', 'missao-encerrada'].includes(parada.codigo) ? 'info' : 'erro', parada.motivo);
  }
}
