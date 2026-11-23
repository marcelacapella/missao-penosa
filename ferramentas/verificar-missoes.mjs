// Roda cada missão com a sua configuração de referência pelo fluxo real do jogo (Jogo.tick) e imprime
// os resultados em Markdown. Uso: node ferramentas/verificar-missoes.mjs
import { CONFIGURACOES_DE_REFERENCIA as REF } from '../js/configuracao.js';
import { MISSOES } from '../js/missao.js';
import { Jogo } from '../js/jogo.js';
import { Simulacao } from '../js/simulacao.js';

const n = (x, d = 0) => Number(x).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
for (const m of MISSOES) {
  const p = REF[m.id], j = new Jogo({ atrasoResultado: 0 });
  j.escolherMissao(m.id); j.lancar(p);
  while (j.fase !== 'encerrada') j.tick(1 / 60);
  const s = j.sim, livre = new Simulacao(p).executarAteOFim();
  let queima = null; const t = new Simulacao(p); while (t.passo()) if (t.combustivel <= 0) { queima = t.t; break; }
  const r = j.relatorio();
  console.log(`| ${m.nome} | ${j.resultado} | ${n(s.t, 1)} s | ${n(s.hMax / 1000, 1)} km | ${n(s.vMax, 0)} m/s | ${n(queima ?? NaN, 1)} s | ${n(livre.hMax / 1000, 1)} km | ${n(livre.vMax, 0)} m/s | ${n(livre.aceleracaoMaxima, 0)} m/s² | ${r.lunar ? n(r.lunar.tempo / 3600, 1) + ' h' : '—'} |`);
}
