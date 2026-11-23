// ============================================================================
// jogo.js — CONTROLADOR DO JOGO (sem DOM): telas, missão escolhida, simulação, pausa, resultado.
// interface.js apenas liga botões e canvas a este objeto; toda a lógica de "o que acontece quando"
// está aqui e é testada em Node. O tempo simulado avança em passos de 0,1 s e a missão é avaliada
// a cada passo: quem decide a vitória é `avaliarMissao` (dados do motor), nunca a animação.
// ============================================================================
import { PARAMETROS_PADRAO, FOGUETES_PRONTOS, validarParametros } from './configuracao.js';
import { Simulacao } from './simulacao.js';
import { MISSOES, obterMissao, avaliarMissao, dadosDaSimulacao, resumoLunar, analisarFoguete } from './missao.js';
import { personagemAtiva, estadoDaPersonagem, falaDaPersonagem } from './personagens.js';

export const TELAS = Object.freeze(['inicio', 'como-funciona', 'sobre', 'simulador', 'vitoria', 'derrota']);
export const FATORES_VELOCIDADE = Object.freeze([1, 5, 10, 25, 60]);

export class Jogo {
  /**
   * @param {{atrasoResultado?:number, passoAvaliacao?:number, armazenamento?:{ler:()=>string[], gravar:(ids:string[])=>void}}} opcoes
   *  atrasoResultado: segundos REAIS entre o fim do voo e a tela de resultado (a animação mostra o desfecho antes).
   */
  constructor({ atrasoResultado = 1.8, passoAvaliacao = 0.1, armazenamento = null } = {}) {
    this.atrasoResultado = atrasoResultado; this.passoAvaliacao = passoAvaliacao; this.armazenamento = armazenamento;
    this.tela = 'inicio';
    this.missaoId = MISSOES[0].id;
    this.params = { ...PARAMETROS_PADRAO };
    this.fator = 10;
    this.erros = [];
    this.concluidas = new Set(this._lerConcluidas());
    this._novaSimulacao();
  }

  get missao() { return obterMissao(this.missaoId); }
  get missaoLunar() { return this.missao.tipo === 'lunar'; }
  get voando() { return this.fase === 'voando' || this.fase === 'pausada'; }

  _lerConcluidas() { try { return (this.armazenamento?.ler() ?? []).filter((id) => obterMissao(id)); } catch { return []; } }
  _gravarConcluidas() { try { this.armazenamento?.gravar([...this.concluidas]); } catch { /* armazenamento indisponível: o jogo segue sem persistir */ } }

  _novaSimulacao() {
    this.sim = new Simulacao(this.params);
    this.fase = 'pronta'; this.resultado = null; this.tempoDesdeFim = 0; this.progressoMax = 0;
    this.avaliacao = avaliarMissao(this.missao, dadosDaSimulacao(this.sim));
    this.analise = analisarFoguete(this.params);
  }

  // ----------------------------------------------------------------- navegação
  irPara(tela) {
    if (!TELAS.includes(tela)) throw new Error(`Tela desconhecida: ${tela}`);
    if (tela !== 'simulador' && this.fase === 'voando') this.fase = 'pausada';   // sair da tela pausa o voo
    this.tela = tela; return this;
  }
  voltarAoInicio() { return this.irPara('inicio'); }

  /** Depois do resultado: volta ao simulador com a mesma configuração, pronta para nova tentativa. */
  novaMissao() { this._novaSimulacao(); this.erros = []; return this.irPara('simulador'); }

  // ----------------------------------------------------------------- preparação
  escolherMissao(id) {
    if (!obterMissao(id) || this.voando) return false;
    this.missaoId = id; this._novaSimulacao(); return true;
  }

  /** Valida e aplica os parâmetros (cria uma simulação nova e pronta). Retorna { ok, erros }. */
  aplicarConfiguracoes(params) {
    if (this.voando) return { ok: false, erros: ['Reinicie a simulação antes de alterar o foguete.'] };
    const v = validarParametros(params);
    this.erros = v.erros;
    if (!v.ok) return v;
    this.params = { ...params }; this._novaSimulacao();
    return { ok: true, erros: [] };
  }

  usarFoguete(id) {
    const pronto = FOGUETES_PRONTOS[id];
    if (!pronto) throw new Error(`Foguete desconhecido: ${id}`);
    return this.aplicarConfiguracoes({ ...pronto.parametros });
  }

  // ----------------------------------------------------------------- controle do voo
  /** Lança o foguete. Se `params` for informado, aplica-os antes (botão LANÇAR FOGUETE). */
  lancar(params = null) {
    if (this.voando) return false;
    if (params) { const r = this.aplicarConfiguracoes(params); if (!r.ok) return false; }
    else if (this.fase !== 'pronta') this._novaSimulacao();
    this.tela = 'simulador'; this.fase = 'voando'; return true;
  }
  pausar() { if (this.fase !== 'voando') return false; this.fase = 'pausada'; return true; }
  continuar() { if (this.fase !== 'pausada') return false; this.fase = 'voando'; return true; }
  reiniciar() { this._novaSimulacao(); this.erros = []; this.tela = 'simulador'; return this; }
  /** Encerra o voo por decisão do jogador (a missão é avaliada com o que já foi calculado). */
  abortar() {
    if (!this.voando) return false;
    this.sim.encerrar('missao-encerrada', 'Voo encerrado pelo jogador.');
    this._finalizar(); return true;
  }
  definirFator(fator) { this.fator = FATORES_VELOCIDADE.includes(fator) ? fator : this.fator; return this.fator; }

  // ----------------------------------------------------------------- laço de tempo
  _avaliar() {
    const av = avaliarMissao(this.missao, dadosDaSimulacao(this.sim));
    this.avaliacao = av; this.progressoMax = Math.max(this.progressoMax, av.progresso);
    if (av.vitoria && this.sim.status !== 'encerrada') this.sim.encerrar('missao-cumprida', `Missão cumprida: ${this.missao.objetivo}`);
  }

  _finalizar() {
    this._avaliar();
    this.resultado = this.avaliacao.vitoria ? 'vitoria' : 'derrota';
    this.fase = 'encerrada'; this.tempoDesdeFim = 0;
    if (this.resultado === 'vitoria') { this.progressoMax = 100; this.concluidas.add(this.missaoId); this._gravarConcluidas(); }
  }

  /**
   * Avança o jogo `dtReal` segundos de relógio. O tempo SIMULADO avançado é dtReal × fator, em passos
   * de `passoAvaliacao`; a missão é avaliada em cada passo. Depois do fim do voo, conta o atraso e
   * troca para a tela de resultado.
   */
  tick(dtReal) {
    if (this.fase === 'encerrada') {
      if (this.tela === 'simulador' && this.resultado) {
        this.tempoDesdeFim += dtReal;
        if (this.tempoDesdeFim >= this.atrasoResultado) this.mostrarResultado();
      }
      return;
    }
    if (this.fase !== 'voando') return;
    let restante = Math.max(0, Math.min(dtReal, 0.25)) * this.fator;
    while (restante > 1e-9 && this.sim.status !== 'encerrada') {
      const passo = Math.min(restante, this.passoAvaliacao);
      this.sim.avancar(passo); restante -= passo; this._avaliar();
    }
    if (this.sim.status === 'encerrada') this._finalizar();
  }

  /** Vai para a tela de vitória ou de derrota (chamado após o atraso, ou à força nos testes). */
  mostrarResultado() {
    if (!this.resultado) return false;
    this.tela = this.resultado === 'vitoria' ? 'vitoria' : 'derrota'; return true;
  }

  // ----------------------------------------------------------------- consultas
  estadoPersonagem() {
    const s = this.sim, ini = this.params.massaCombustivel;
    return estadoDaPersonagem({ tela: this.tela, fase: this.fase, resultado: this.resultado, missaoLunar: this.missaoLunar,
      sim: { h: s.h, v: s.v, empuxo: s.forcas.empuxo, combustivelFracao: ini > 0 ? s.combustivel / ini : 0 } });
  }
  falaPersonagem() { return falaDaPersonagem(personagemAtiva(), this.estadoPersonagem()); }

  /** Números do relatório final (todos vindos do motor). */
  relatorio() {
    const s = this.sim, d = dadosDaSimulacao(s);
    return {
      missao: this.missao, resultado: this.resultado, avaliacao: this.avaliacao,
      altitudeMaxima: s.hMax, velocidadeMaxima: s.vMax, aceleracaoInicial: s.aceleracaoInicial, aceleracaoMaxima: s.aceleracaoMaxima,
      tempoVoo: s.t, combustivelConsumido: s.consumido, combustivelRestante: s.combustivel, estadoFinal: s.relatorio?.estadoFinal ?? null, motivo: s.motivo,
      lunar: this.missaoLunar && this.resultado === 'vitoria' ? resumoLunar(d) : null,
    };
  }
}
