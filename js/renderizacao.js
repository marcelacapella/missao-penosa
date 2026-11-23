// ============================================================================
// renderizacao.js — cenário de voo e foguete em pixel art (Canvas 192×256, ampliado sem suavização).
// A posição visual é FUNÇÃO da altitude calculada (escala visual logarítmica, câmera que segue).
// A renderização apenas apresenta o estado da simulação; não altera nenhum valor matemático e
// roda num laço próprio (requestAnimationFrame), independente do passo Δt da simulação.
// ============================================================================
import { FOGUETE, FOGUETE_L, FOGUETE_A, JANELA, CABECAS, PALETA, bitmapDoSprite } from './sprites.js';
import { quadroDaPersonagem } from './personagens.js';

export const LARG = 192, ALT = 256, BASE_Y = 226, ALVO_Y = 172;

/** Escala visual NÃO linear: pixels ≈ 28·ln(1 + h/200). Apenas apresentação — não é escala real. */
export const escalaVisual = (h) => (h <= 0 ? 0 : 28 * Math.log(1 + h / 200));
export const alturaDeEscala = (px) => (px <= 0 ? 0 : 200 * (Math.exp(px / 28) - 1));
export const cameraY = (h) => Math.max(0, escalaVisual(h) - (BASE_Y - 4 - ALVO_Y));
/** Y da base do foguete na tela para uma altitude h. */
export const yBaseFoguete = (h) => BASE_Y - 4 - (escalaVisual(h) - cameraY(h));

/** Foguete + galinha (expressão padrão) como uma única grade — o jogo troca só a cabeça conforme o estado. */
export const SPRITE = (() => {
  const g = FOGUETE.map((l) => [...l]);
  CABECAS.idle.forEach((linha, j) => [...linha].forEach((c, i) => { if (c !== '.') g[JANELA.y + j][JANELA.x + i] = c; }));
  return g.map((l) => l.join(''));
})();
export const SPRITE_L = FOGUETE_L, SPRITE_A = FOGUETE_A;

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const misturar = (a, b, t) => { const A = hex(a), B = hex(b), k = Math.max(0, Math.min(1, t)); return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * k).toString(16).padStart(2, '0')).join(''); };
const CEU = [[0, '#7fd0ff'], [3000, '#5ab6f5'], [12000, '#2f7fd6'], [50000, '#1b4a9c'], [85000, '#13296b'], [200000, '#0a1646'], [600000, '#050a24']];
export function corDoCeu(h) {
  for (let i = 1; i < CEU.length; i++) if (h <= CEU[i][0]) return misturar(CEU[i - 1][1], CEU[i][1], (h - CEU[i - 1][0]) / (CEU[i][0] - CEU[i - 1][0]));
  return CEU[CEU.length - 1][1];
}
export const rnd = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------------------
// Desenho de quadros de personagem (pixel ou imagem) — usado também pelas outras telas
// ---------------------------------------------------------------------------
const imagens = new Map();
function imagemCarregada(src) {
  if (!imagens.has(src)) { const im = new Image(); im.src = src; imagens.set(src, im); }
  const im = imagens.get(src); return im.complete && im.naturalWidth ? im : null;
}
/** Desenha um quadro { tipo:'pixel'|'imagem' } em (x, y) com largura/altura finais opcionais. */
export function desenharQuadro(ctx, quadro, x, y, larg = null, alt = null) {
  const fonte = quadro.tipo === 'imagem' ? imagemCarregada(quadro.src) : bitmapDoSprite(quadro.grade, quadro.paleta);
  if (!fonte) return;
  const w = larg ?? (fonte.naturalWidth || fonte.width), h = alt ?? (fonte.naturalHeight || fonte.height);
  ctx.drawImage(fonte, Math.round(x), Math.round(y), w, h);
}

const ESTRELAS = Array.from({ length: 90 }, (_, i) => ({ x: Math.floor(rnd(i) * LARG), w: 60 + rnd(i + 99) * 260, f: rnd(i + 7) }));
const NUVENS = Array.from({ length: 10 }, (_, i) => ({ x: rnd(i + 3) * 240, w: 22 + rnd(i + 20) * 54, l: 18 + rnd(i + 40) * 16, v: 2 + rnd(i + 60) * 3 }));

export class Renderizador {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.fumaca = []; this.ultimo = 0; this.reduzirAnimacoes = false; this.chamasTrema = 0;
  }
  r(x, y, w, h, c) { this.ctx.fillStyle = c; this.ctx.fillRect(Math.round(x), Math.round(y), w, h); }

  /** estadoPersonagem: 'idle' | 'launching' | ... (decide a expressão visível na janela do foguete). */
  desenhar(sim, agora, rodando, personagem, estadoPersonagem = 'idle') {
    const h = sim.h, cam = cameraY(h), yG = BASE_Y + cam, dtR = Math.min(0.1, (agora - this.ultimo) / 1000 || 0), anim = !this.reduzirAnimacoes; this.ultimo = agora;
    for (let y = 0; y < ALT; y += 4) this.r(0, y, LARG, 4, corDoCeu(alturaDeEscala(cam + (BASE_Y - y - 2) * 0.3)));
    for (const s of ESTRELAS) {
      const y = BASE_Y - (s.w - cam);
      if (y > 0 && y < ALT && h > 25000 && alturaDeEscala(s.w) > 30000) this.r(s.x, y, 1 + (s.f > 0.85), 1 + (s.f > 0.85), anim && Math.floor(agora / 400 + s.f * 9) % 5 === 0 ? '#8fb2ff' : '#fff6c8');
    }
    this.lua(150, BASE_Y - (232 - cam));
    if (h > 14000) this.limbo(h); else this.nuvens(cam, agora, anim);
    if (yG < ALT + 70) this.base(yG, agora, anim);
    if (rodando && anim && sim.forcas.empuxo > 0 && h < 700) for (let i = 0; i < 2; i++) this.fumaca.push({ x: 96 + (Math.random() - .5) * 18, y: 2, vx: (Math.random() - .5) * 34, vy: 6 + Math.random() * 8, vida: 1 });
    this.fumaca = this.fumaca.filter((p) => p.vida > 0);
    for (const p of this.fumaca) {
      if (rodando) { p.x += p.vx * dtR; p.y += p.vy * dtR * .3; p.vida -= dtR * .5; }
      const s = 4 + (1 - p.vida) * 6; this.r(p.x - s / 2, yG - p.y - s, s, s, p.vida > .5 ? '#ffffff' : '#d5dcee');
    }
    this.foguete(sim, agora, personagem, estadoPersonagem, anim);
  }

  lua(x, y) {
    if (y < -14 || y > ALT + 14) return;
    for (let dy = -9; dy <= 9; dy++) { const w = Math.floor(Math.sqrt(81 - dy * dy)); this.r(x - w, y + dy, 2 * w + 1, 1, '#f4efd9'); }
    this.r(x - 4, y - 3, 4, 3, '#cfc8ad'); this.r(x + 2, y + 3, 4, 4, '#cfc8ad'); this.r(x - 6, y + 4, 3, 3, '#cfc8ad');
  }

  nuvens(cam, agora, anim) {
    for (const n of NUVENS) {
      const y = BASE_Y - (n.l + 8 - cam); if (y < -10 || y > ALT) continue;
      const x = ((n.x + (anim ? agora * 0.001 * n.v : 0)) % (LARG + 100)) - 50;
      this.r(x, y + 4, n.w, 6, '#ffffff'); this.r(x + n.w * .2, y, n.w * .35, 5, '#ffffff'); this.r(x + n.w * .55, y + 1, n.w * .25, 4, '#ffffff'); this.r(x, y + 9, n.w, 2, '#cfe0f7');
    }
  }

  /** Terra vista do alto: horizonte curvo que cresce com a altitude, com brilho atmosférico. */
  limbo(h) {
    const k = Math.min(1, (h - 12000) / 60000) * 0.004, aparece = Math.min(1, (h - 14000) / 6000);
    const topo = ALT - aparece * Math.max(6, 44 - 8 * Math.log(1 + h / 50000));
    const base = misturar('#478D45', '#1765B5', (h - 12000) / 90000);
    for (let x = 0; x < LARG; x++) {
      const y = Math.round(topo + k * (x - 96) ** 2);
      if (y > ALT) continue;
      this.r(x, y - 2, 1, 1, '#d6f4ff'); this.r(x, y - 1, 1, 1, '#43B8D0'); this.r(x, y, 1, ALT - y, base);
      if (((x >> 3) + Math.floor(y / 6)) % 3 === 0) this.r(x, y + 4, 1, 6, misturar(base, '#142D59', .35));
      if (((x >> 2) * 7 + Math.floor(y / 5)) % 11 === 0) this.r(x, y + 12, 3, 2, '#ffffff');
    }
  }

  /** Paisagem ancorada em h = 0: montanhas, colinas, pinheiros, flores, torre com bandeira, plataforma e casinha. */
  base(yG, agora, anim) {
    for (const [cx, w, a] of [[16, 84, 34], [76, 110, 46], [140, 78, 32], [184, 80, 38]]) {
      for (let i = 0; i < a; i++) { const ww = Math.floor(w * i / a); this.r(cx - ww / 2, yG - 14 - a + i, ww, 1, i < 8 ? '#ffffff' : (i % 9 < 4 ? '#6479b4' : '#5a6dab')); }
    }
    this.r(0, yG - 7, LARG, ALT, '#478D45'); this.r(0, yG - 7, LARG, 3, '#A9CB83'); this.r(0, yG + 9, LARG, ALT, '#3d7d3b');
    for (const x of [6, 24, 148, 168, 182]) { // pinheiros
      this.r(x + 4, yG - 16, 3, 10, '#74351F'); this.r(x - 1, yG - 26, 13, 7, '#2f6d32'); this.r(x + 1, yG - 32, 9, 7, '#3d8a3a'); this.r(x + 3, yG - 37, 5, 6, '#478D45'); this.r(x, yG - 24, 3, 2, '#6bb356');
    }
    this.r(40, yG - 52, 4, 46, '#74351F'); this.r(48, yG - 52, 4, 46, '#74351F'); // torre de madeira
    for (let y = yG - 46; y < yG - 6; y += 9) this.r(40, y, 12, 2, '#A8723F');
    this.r(52, yG - 38, 22, 3, '#A8723F'); this.r(36, yG - 60, 11, 8, '#FFF4DB'); this.r(36, yG - 60, 2, 16, '#74351F'); this.r(40, yG - 58, 3, 3, '#E94B43'); this.r(41, yG - 56, 2, 1, '#F6D36A'); // bandeira com galinha
    this.r(58, yG - 4, 76, 4, '#74351F'); this.r(58, yG - 4, 76, 1, '#A8723F'); this.r(62, yG, 4, 6, '#5a2a18'); this.r(124, yG, 4, 6, '#5a2a18'); // plataforma
    this.r(140, yG - 22, 34, 17, '#FFF4DB'); this.r(140, yG - 22, 34, 2, '#e0cfa2');
    for (let i = 0; i < 10; i++) this.r(136 + i, yG - 23 - i, 42 - 2 * i, 1, i % 3 === 2 ? '#C93A34' : '#E94B43');
    this.r(146, yG - 16, 7, 11, '#74351F'); this.r(159, yG - 18, 10, 7, '#8fd3ff'); this.r(159, yG - 18, 10, 1, '#1765B5');
    for (const [x, c] of [[8, '#E94B43'], [30, '#F6D36A'], [56, '#FF9AA8'], [88, '#F6D36A'], [138, '#E94B43'], [172, '#FF9AA8'], [14, '#FFFFFF'], [120, '#F39A32']]) {
      this.r(x, yG + 3, 1, 4, '#A9CB83'); this.r(x - 1 + (anim && Math.floor(agora / 700 + x) % 2), yG + 1, 3, 2, c);
    }
  }

  foguete(sim, agora, personagem, estado, anim) {
    const h = sim.h, f = sim.forcas, x0 = Math.round((LARG - SPRITE_L) / 2);
    const y0 = yBaseFoguete(h) - SPRITE_A + 4;
    const dx = anim && f.empuxo > 0 && h < 3000 ? Math.round(Math.sin(agora * 0.06)) : 0;
    if (f.empuxo > 0 && sim.status !== 'pronta') { // chama: comprimento cresce com a razão empuxo/peso
      const razao = Math.min(2.5, f.empuxo / Math.max(1, f.peso)), len = Math.round(8 + razao * 7 + (anim ? Math.floor(agora / 60) % 3 : 0)), cx = x0 + dx + 18;
      for (let i = 0; i < len; i++) {
        const w = Math.max(2, 12 - Math.floor(i * 12 / len)), yy = y0 + 73 + i;
        this.r(cx - w / 2, yy, w, 1, i < len * .3 ? PALETA.W : i < len * .65 ? PALETA.F : PALETA.U);
      }
    }
    const ctx = this.ctx;
    ctx.drawImage(bitmapDoSprite(FOGUETE), x0 + dx, y0);
    desenharQuadro(ctx, quadroDaPersonagem(personagem, estado, 'cabeca', agora), x0 + dx + JANELA.x, y0 + JANELA.y, 16, 16);
  }
}
