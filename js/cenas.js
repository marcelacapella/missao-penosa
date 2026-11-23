// ============================================================================
// cenas.js — cenas ilustradas fora do voo: TELA INICIAL (plataforma ao entardecer) e
// SUPERFÍCIE LUNAR (tela de vitória). Apenas apresentação: nenhuma regra do jogo vive aqui.
// Canvas lógico 320 × 180, ampliado sem suavização.
// ============================================================================
import { FOGUETE, bitmapDoSprite } from './sprites.js';
import { quadroDaPersonagem } from './personagens.js';
import { desenharQuadro, misturar, rnd } from './renderizacao.js';

export const CENA_L = 320, CENA_A = 180;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const disco = (ctx, cx, cy, r, c) => { for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); rect(ctx, cx - w, cy + dy, 2 * w + 1, 1, typeof c === 'function' ? c(dy) : c); } };
const ESTRELAS = Array.from({ length: 70 }, (_, i) => ({ x: Math.floor(rnd(i + 1) * CENA_L), y: Math.floor(rnd(i + 200) * 110), f: rnd(i + 5) }));
function estrelas(ctx, agora, anim, ate = 110) {
  for (const s of ESTRELAS) if (s.y < ate) rect(ctx, s.x, s.y, 1 + (s.f > .8), 1 + (s.f > .8), anim && Math.floor(agora / 350 + s.f * 11) % 4 === 0 ? '#8fb2ff' : '#fff6c8');
}
const cratera = (ctx, x, y, w, c1, c2) => { rect(ctx, x, y, w, 2, c1); rect(ctx, x + 1, y + 2, w - 2, 1, c2); };

/** Tela inicial: céu ao entardecer, Lua, montanhas, pinheiros, torre, foguete na plataforma e a galinha. */
export function desenharCenaInicio(ctx, agora, personagem, reduzir = false, estado = 'idle') {
  ctx.imageSmoothingEnabled = false;
  const cores = ['#142D59', '#1a3a78', '#1765B5', '#4a5aa8', '#8a5fa0', '#d9708a', '#F39A32', '#F6D36A'];
  for (let y = 0; y < 120; y += 4) rect(ctx, 0, y, CENA_L, 4, cores[Math.min(cores.length - 1, Math.floor(y / 120 * cores.length))]);
  estrelas(ctx, agora, !reduzir, 80);
  disco(ctx, 262, 34, 15, '#f4efd9'); cratera(ctx, 255, 28, 5, '#cfc8ad', '#cfc8ad'); cratera(ctx, 266, 38, 6, '#cfc8ad', '#cfc8ad'); cratera(ctx, 258, 41, 3, '#cfc8ad', '#cfc8ad');
  for (let x = 0; x < CENA_L; x++) { const y = 106 - Math.abs(Math.sin(x * 0.021 + 1)) * 32 - Math.abs(Math.sin(x * 0.07)) * 6; rect(ctx, x, y, 1, 80, misturar('#5a5ca8', '#7b6aa8', (x % 40) / 80)); if (y < 80) rect(ctx, x, y, 1, 2, '#ffffff'); }
  for (let x = 0; x < CENA_L; x++) { const y = 124 - Math.abs(Math.sin(x * 0.034 + 2)) * 14; rect(ctx, x, y, 1, 70, '#3d7d3b'); rect(ctx, x, y, 1, 2, '#A9CB83'); }
  rect(ctx, 0, 140, CENA_L, 40, '#478D45'); rect(ctx, 0, 140, CENA_L, 3, '#A9CB83');
  for (const x of [8, 30, 54, 270, 292, 308]) { rect(ctx, x + 6, 124, 4, 16, '#74351F'); rect(ctx, x, 110, 16, 10, '#2f6d32'); rect(ctx, x + 2, 102, 12, 10, '#3d8a3a'); rect(ctx, x + 5, 95, 6, 9, '#478D45'); }
  rect(ctx, 92, 78, 5, 64, '#74351F'); rect(ctx, 102, 78, 5, 64, '#74351F'); for (let y = 86; y < 140; y += 10) rect(ctx, 92, y, 15, 3, '#A8723F'); // torre
  rect(ctx, 107, 98, 36, 4, '#A8723F'); rect(ctx, 80, 62, 14, 10, '#FFF4DB'); rect(ctx, 80, 62, 2, 20, '#74351F'); rect(ctx, 85, 64, 4, 4, '#E94B43'); rect(ctx, 86, 67, 3, 2, '#F6D36A'); // bandeira
  rect(ctx, 150, 138, 130, 5, '#74351F'); rect(ctx, 150, 138, 130, 1, '#A8723F');                                                             // plataforma
  const ondular = reduzir ? 0 : Math.floor(Math.sin(agora / 500) * 1.2);
  ctx.drawImage(bitmapDoSprite(FOGUETE), 212, 138 - 74 + ondular * 0);
  for (let i = 0; i < 3; i++) { const t = ((agora / 1500 + i / 3) % 1); if (!reduzir) rect(ctx, 220 + i * 8 + Math.sin(t * 6 + i) * 3, 140 - t * 22, 5, 3, `rgba(255,255,255,${(1 - t) * 0.7})`); }
  const corpo = quadroDaPersonagem(personagem, estado, 'corpo', agora);
  desenharQuadro(ctx, corpo, 156, 137 - 38 + (reduzir ? 0 : Math.floor(agora / 600) % 2 * 0), null, null);
  for (const [x, c] of [[12, '#E94B43'], [40, '#F6D36A'], [70, '#FF9AA8'], [250, '#F6D36A'], [300, '#E94B43'], [120, '#FFFFFF'], [200, '#FF9AA8']]) { rect(ctx, x, 152 + (x % 7), 1, 5, '#A9CB83'); rect(ctx, x - 1, 150 + (x % 7), 3, 3, c); }
}

/**
 * Superfície lunar (vitória). `tempo` = segundos desde o início da cena.
 * 0–1,2 s: foguete pousado; 1,2–2,4 s: a galinha sai e caminha; depois comemora com saltos (gravidade baixa),
 * bandeira fincada e partículas coloridas.
 */
export function desenharCenaLunar(ctx, agora, tempo, personagem, reduzir = false) {
  ctx.imageSmoothingEnabled = false;
  rect(ctx, 0, 0, CENA_L, CENA_A, '#070b24'); for (let y = 0; y < 120; y += 6) rect(ctx, 0, y, CENA_L, 6, misturar('#070b24', '#142D59', y / 140));
  estrelas(ctx, agora, !reduzir, 120);
  // Terra ao fundo
  disco(ctx, 238, 52, 30, (dy) => (dy < -26 ? '#43B8D0' : '#1765B5')); disco(ctx, 238, 52, 28, '#1765B5');
  for (const [x, y, w, h] of [[218, 40, 14, 8], [232, 50, 18, 7], [226, 60, 10, 6], [248, 38, 8, 5], [244, 62, 10, 5]]) rect(ctx, x, y, w, h, '#478D45');
  for (const [x, y, w] of [[214, 34, 12], [240, 44, 14], [228, 70, 14], [252, 54, 8]]) rect(ctx, x, y, w, 2, '#ffffff');
  disco(ctx, 238, 52, 28, (dy) => `rgba(20,45,89,${Math.max(0, (dy + 28) / 90)})`);
  // solo lunar
  for (let x = 0; x < CENA_L; x++) { const y = 118 - Math.abs(Math.sin(x * 0.03)) * 12; rect(ctx, x, y, 1, 70, '#8a8aa0'); rect(ctx, x, y, 1, 2, '#b8bfd8'); }
  rect(ctx, 0, 132, CENA_L, 48, '#aeb2c6'); rect(ctx, 0, 132, CENA_L, 2, '#d8dcec');
  for (const [x, y, w] of [[20, 146, 22], [78, 160, 30], [150, 150, 18], [236, 158, 34], [290, 142, 20], [190, 168, 24]]) { cratera(ctx, x, y, w, '#8a8fa8', '#c8cce0'); }
  const chao = 148;
  ctx.drawImage(bitmapDoSprite(FOGUETE), 64, chao - 74);
  // bandeira
  if (tempo > 2.6) { rect(ctx, 168, chao - 34, 2, 36, '#e8e8f0'); rect(ctx, 170, chao - 34, 16, 10, '#FFF4DB'); rect(ctx, 174, chao - 32, 5, 4, '#E94B43'); rect(ctx, 175, chao - 29, 4, 2, '#F6D36A'); }
  // galinha: sai da escotilha, caminha e comemora
  const estado = tempo < 1.2 ? 'launching' : tempo < 2.4 ? 'flying' : 'moon';
  if (tempo >= 1.2) {
    const andar = Math.min(1, (tempo - 1.2) / 1.2), x = 94 + andar * 42;
    const pulo = tempo > 2.4 && !reduzir ? Math.abs(Math.sin((tempo - 2.4) * 3.2)) * 16 : 0;
    desenharQuadro(ctx, quadroDaPersonagem(personagem, estado === 'launching' ? 'flying' : estado, 'corpo', agora), x, chao - 38 - pulo);
    rect(ctx, x + 6, chao + 1, 18, 2, 'rgba(0,0,0,0.25)');
  }
  if (!reduzir && tempo > 2.4) for (let i = 0; i < 36; i++) { // confete / estrelas
    const t = (agora / 2600 + rnd(i + 3)) % 1, x = rnd(i + 40) * CENA_L + Math.sin(agora / 600 + i) * 6, y = t * (chao + 10) - 6;
    rect(ctx, x, y, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2, ['#F6D36A', '#E94B43', '#43B8D0', '#FFFFFF', '#F39A32'][i % 5]);
  }
}
