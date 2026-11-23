// ============================================================================
// graficos.js — gráficos de linha em Canvas (sem dependências externas).
// Recebem SEMPRE o histórico real da simulação; nenhuma curva é gerada artificialmente.
// ============================================================================

/** Reduz o histórico a no máximo `maxPontos` pontos {x: t, y: campo}, preservando o último. */
export function prepararSerie(hist, campo, maxPontos = 500, escala = 1) {
  const n = hist.length;
  if (!n) return [];
  const passo = Math.max(1, Math.ceil(n / maxPontos));
  const pts = [];
  for (let i = 0; i < n; i += passo) if (hist[i][campo] != null) pts.push({ x: hist[i].t, y: hist[i][campo] * escala });
  const u = hist[n - 1];
  if (u[campo] != null && pts.length && pts[pts.length - 1].x !== u.t) pts.push({ x: u.t, y: u[campo] * escala });
  return pts;
}

/** Marcas "bonitas" (1, 2, 5 × 10^k) entre min e max. */
export function ticksBonitos(min, max, alvo = 5) {
  const bruto = (max - min) / alvo || 1;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / pot;
  const passo = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pot;
  const ticks = [];
  for (let v = Math.ceil(min / passo) * passo; v <= max + passo * 1e-9; v += passo) ticks.push(Math.abs(v) < passo * 1e-9 ? 0 : v);
  return ticks;
}

const COR = { fundo: '#142D59', grade: '#27498a', eixo: '#43B8D0', texto: '#FFF4DB', zero: '#F6D36A' };
const fmt = (v) => Number(v.toPrecision(4)).toLocaleString('pt-BR');

/** Séries exatamente como o histórico real da simulação (o que os três gráficos desenham). */
export function dadosDosGraficos(hist) {
  return { altitude: prepararSerie(hist, 'h'), velocidade: prepararSerie(hist, 'v'), velocidadeDerivada: prepararSerie(hist, 'vDer'),
    aceleracao: prepararSerie(hist, 'a'), aceleracaoDerivada: prepararSerie(hist, 'aDer') };
}

export class GraficoLinha {
  /** cfg: { titulo, rotuloY, series:[{campo,cor,rotulo,tracejado}], autoKm?:bool, marcarMaximo?:campo } */
  constructor(canvas, cfg) { this.c = canvas; this.ctx = canvas.getContext('2d'); this.cfg = cfg; }

  atualizar(hist) {
    const { ctx, c, cfg } = this, W = c.width, H = c.height, M = { e: 62, d: 14, t: 30, b: 32 };
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COR.fundo; ctx.fillRect(0, 0, W, H);
    ctx.font = '700 16px Nunito, monospace'; ctx.textBaseline = 'middle';
    ctx.fillStyle = COR.texto; ctx.textAlign = 'left';
    ctx.fillText(cfg.titulo, 8, 12);
    if (hist.length < 2) { ctx.textAlign = 'center'; ctx.fillText('Sem dados — inicie um lançamento.', W / 2, H / 2); return; }

    let maxAbs = 0;
    for (const s of cfg.series) for (const r of hist) if (r[s.campo] != null) maxAbs = Math.max(maxAbs, Math.abs(r[s.campo]));
    const div = cfg.autoKm && maxAbs >= 10000 ? 1000 : 1;
    const unidade = cfg.autoKm ? (div === 1000 ? 'km' : 'm') : cfg.unidade;
    const series = cfg.series.map((s) => ({ ...s, pts: prepararSerie(hist, s.campo, 500, 1 / div) }));
    const xs = series.flatMap((s) => s.pts.map((p) => p.x)), ys = series.flatMap((s) => s.pts.map((p) => p.y));
    const xMax = Math.max(...xs) || 1;
    let yMin = Math.min(...ys), yMax = Math.max(...ys);
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const pad = (yMax - yMin) * 0.06; yMin -= pad; yMax += pad;
    const X = (x) => M.e + (x / xMax) * (W - M.e - M.d);
    const Y = (y) => H - M.b - ((y - yMin) / (yMax - yMin)) * (H - M.t - M.b);

    // grade e rótulos dos eixos
    ctx.lineWidth = 1; ctx.textAlign = 'right';
    for (const ty of ticksBonitos(yMin, yMax, 5)) {
      ctx.strokeStyle = ty === 0 ? COR.zero : COR.grade; ctx.beginPath(); ctx.moveTo(M.e, Math.round(Y(ty)) + .5); ctx.lineTo(W - M.d, Math.round(Y(ty)) + .5); ctx.stroke();
      ctx.fillStyle = COR.texto; ctx.fillText(fmt(ty), M.e - 5, Y(ty));
    }
    ctx.textAlign = 'center';
    for (const tx of ticksBonitos(0, xMax, 6)) {
      ctx.strokeStyle = COR.grade; ctx.beginPath(); ctx.moveTo(Math.round(X(tx)) + .5, M.t); ctx.lineTo(Math.round(X(tx)) + .5, H - M.b); ctx.stroke();
      ctx.fillStyle = COR.texto; ctx.fillText(fmt(tx), X(tx), H - M.b + 12);
    }
    ctx.fillText('tempo (s)', (M.e + W - M.d) / 2, H - 8);
    ctx.save(); ctx.translate(11, (M.t + H - M.b) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${cfg.rotuloY} (${unidade})`, 0, 0); ctx.restore();
    ctx.strokeStyle = COR.eixo; ctx.strokeRect(M.e + .5, M.t + .5, W - M.e - M.d, H - M.t - M.b);

    // séries (a tracejada é a estimativa por derivada numérica)
    let lx = W - M.d - 4;
    for (const s of series.slice().reverse()) {
      ctx.strokeStyle = s.cor; ctx.lineWidth = 2; ctx.setLineDash(s.tracejado ? [6, 4] : []);
      ctx.beginPath(); s.pts.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)))); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = s.cor; ctx.textAlign = 'right';
      const rot = (s.tracejado ? '┄ ' : '━ ') + s.rotulo; ctx.fillText(rot, lx, 12); lx -= ctx.measureText(rot).width + 14;
    }
    // marcador do máximo (ex.: altitude máxima e o instante em que ocorreu)
    if (cfg.marcarMaximo) {
      let im = 0; hist.forEach((r, i) => { if (r[cfg.marcarMaximo] > hist[im][cfg.marcarMaximo]) im = i; });
      const px = X(hist[im].t), py = Y(hist[im][cfg.marcarMaximo] / div);
      ctx.fillStyle = COR.zero; ctx.fillRect(px - 4, py - 4, 8, 8);
      ctx.textAlign = px > W * 0.6 ? 'right' : 'left';
      ctx.fillText(`máx ${fmt(hist[im][cfg.marcarMaximo] / div)} ${unidade} em ${fmt(hist[im].t)} s`, px + (px > W * 0.6 ? -8 : 8), py + 14);
    }
  }
}
