// ============================================================================
// sprites.js — arte em pixels da Missão Penosa (dados puros, sem DOM).
// Os sprites são GRADES DE TEXTO: cada letra é uma cor da PALETA, '.' é transparente.
// São montados por código (formas + carimbos) e ganham CONTORNO AUTOMÁTICO, o que mantém todos
// os personagens e objetos com o mesmo estilo. O mesmo dado é usado pelo Canvas do jogo e pelo
// gerador de PNGs (ferramentas/gerar-assets.mjs).
// ============================================================================

/** Paleta do projeto (as 10 cores oficiais + tons de sombra/brilho derivados). */
export const PALETA = Object.freeze({
  K: '#241a3a',  // contorno
  N: '#142D59',  // azul-marinho
  B: '#1765B5',  // azul profundo
  T: '#43B8D0',  // azul-celeste
  V: '#478D45',  // verde
  v: '#A9CB83',  // verde-claro
  Y: '#F6D36A',  // amarelo
  O: '#F39A32',  // laranja
  R: '#E94B43',  // vermelho
  D: '#A82F34',  // vermelho escuro (sombra)
  Q: '#FF8C7A',  // vermelho claro (brilho)
  M: '#74351F',  // marrom
  m: '#A8723F',  // marrom claro
  C: '#FFF4DB',  // creme
  W: '#FFFFFF',  // branco
  G: '#DCE3F2',  // sombra clara (traje)
  H: '#AEB9D8',  // sombra média (traje)
  S: '#C2C9DE',  // prata
  Z: '#6B7090',  // cinza escuro
  E: '#1B1530',  // olho
  P: '#FF9AA8',  // bochecha
  L: '#D6F4FF',  // vidro claro
  A: '#7FD0F5',  // vidro médio
  F: '#FFD24A',  // chama amarela
  U: '#FF6B3D',  // chama laranja
});

// ---------------------------------------------------------------------------
// Pequena biblioteca de grades
// ---------------------------------------------------------------------------
export const criarGrade = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const pixel = (g, x, y, c) => { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c; };
const retangulo = (g, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pixel(g, x + i, y + j, c); };
const elipse = (g, cx, cy, rx, ry, cor) => {
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1) pixel(g, x, y, typeof cor === 'function' ? cor(x, y) : cor);
  }
};
/** Carimba um mapa (array de strings) na grade; '.' não apaga o que já existe. */
const carimbar = (g, mapa, x0, y0) => mapa.forEach((linha, j) => [...linha].forEach((c, i) => { if (c !== '.') pixel(g, x0 + i, y0 + j, c); }));
/** Contorno automático: pinta com `cor` todo pixel vazio que toca (em 4 direções) um pixel preenchido. */
function contornar(g, cor = 'K') {
  const h = g.length, w = g[0].length, saida = g.map((l) => l.slice());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y][x] !== '.') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? '.') !== '.')) saida[y][x] = cor;
  }
  return saida;
}
/** Traço grosso (quadrados de lado `e` ao longo do segmento) — usado nos braços. */
const traco = (g, x0, y0, x1, y1, e, cor) => { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) * 2 + 1; for (let i = 0; i <= n; i++) { const t = i / n; retangulo(g, Math.round(x0 + (x1 - x0) * t - e / 2), Math.round(y0 + (y1 - y0) * t - e / 2), e, e, cor); } };
const emTexto = (g) => g.map((l) => l.join(''));
const espelhar = (mapa) => mapa.map((l) => [...l].reverse().join(''));

// ---------------------------------------------------------------------------
// GALINHA (mascote pixel art): cabeça de perfil (16 × 16), capacete de vidro só na cabeça e
// corpo de galinha de verdade — barriga redonda, asas, cauda de penas e pés de 3 dedos.
// Os únicos acessórios espaciais são o capacete, um colete azul e uma mochilinha.
// ---------------------------------------------------------------------------
const CRISTA = ['..RR.RR...', '.RRRRRRR..', '.RRRRRRRR.', '..RRRRRR..'];
const OLHO = { aberto: ['EE', 'WE', 'EE'], largo: ['EEE', 'EWE', 'EEE'], fechado: ['..', '..', 'EE'], feliz: ['.E.', 'E.E'], triste: ['EE', 'WE', 'E.'], olhandoCima: ['EE', 'EW', 'EE'] };
const BICO = { fechado: ['YYY.', 'YYYY', 'OOO.'], sorriso: ['YYY.', 'YYYY', 'OOO.'], aberto: ['YYY.', 'YYYY', 'DDD.', 'OOOO', '.OO.'] };

/** Cabeça de galinha voltada para a direita. */
function montarCabeca({ olhos = 'aberto', sobrancelha = 'nenhuma', bico = 'fechado', lagrima = false, suor = false } = {}) {
  const g = criarGrade(16, 16);
  elipse(g, 6.5, 9.6, 6.5, 6.0, (x, y) => (y >= 14 || x <= 1 ? 'C' : 'W'));
  carimbar(g, CRISTA, 2, 0);
  carimbar(g, BICO[bico], 12, bico === 'aberto' ? 7 : 8);
  pixel(g, 11, bico === 'aberto' ? 12 : 11, 'R'); pixel(g, 11, bico === 'aberto' ? 13 : 12, 'R'); pixel(g, 12, bico === 'aberto' ? 13 : 12, 'D');   // barbela
  if (bico === 'sorriso') pixel(g, 11, 10, 'E');
  retangulo(g, 5, 10, 2, 2, 'P');                                                                                                          // bochecha rosada
  carimbar(g, OLHO[olhos], 8, olhos === 'feliz' ? 7 : 6);
  const brow = { decidida: [[7, 4], [8, 4], [9, 5], [10, 5]], preocupada: [[7, 5], [8, 5], [9, 4], [10, 3]], triste: [[7, 5], [8, 4], [9, 4], [10, 3]] }[sobrancelha] ?? [];
  brow.forEach(([x, y]) => pixel(g, x, y, 'E'));
  if (lagrima) { pixel(g, 9, 9, 'A'); pixel(g, 9, 10, 'L'); }
  if (suor) { pixel(g, 1, 5, 'A'); pixel(g, 1, 6, 'L'); pixel(g, 0, 7, 'A'); }
  return emTexto(g);
}

export const CABECAS = Object.freeze({
  idle: montarCabeca({}),
  idlePiscando: montarCabeca({ olhos: 'fechado' }),
  preparing: montarCabeca({ olhos: 'olhandoCima', sobrancelha: 'decidida', bico: 'sorriso' }),
  launching: montarCabeca({ olhos: 'largo', sobrancelha: 'decidida', bico: 'aberto' }),
  flying: montarCabeca({ olhos: 'aberto', bico: 'sorriso' }),
  concerned: montarCabeca({ olhos: 'largo', sobrancelha: 'preocupada', bico: 'aberto', suor: true }),
  failed: montarCabeca({ olhos: 'triste', sobrancelha: 'triste', lagrima: true }),
  celebrating: montarCabeca({ olhos: 'feliz', bico: 'aberto' }),
  moon: montarCabeca({ olhos: 'feliz', bico: 'aberto' }),
});

/** Capacete de vidro (20 × 20) ao redor da cabeça — a cabeça de galinha continua visível por dentro. */
function comCapacete(cabeca) {
  const g = criarGrade(20, 20);
  elipse(g, 9.5, 10.5, 9.5, 9.5, 'A');
  elipse(g, 9.5, 10.5, 8.1, 8.1, '.');
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) if (g[y][x] === 'A' && (x + y) % 2 === 0) g[y][x] = 'S';
  carimbar(g, cabeca, 2, 2);
  carimbar(g, ['.LLL', 'L...', 'L'], 3, 3); retangulo(g, 16, 14, 1, 2, 'L');
  return emTexto(g);
}

/** Corpo de galinha (30 × 38) de perfil. pose: 'parado' | 'respirando' | 'asasAlto' | 'asaAcenando' | 'triste' */
function montarCorpo(cabeca, pose = 'parado') {
  const g = criarGrade(30, 38), dy = pose === 'respirando' ? 1 : pose === 'triste' ? 2 : 0, tri = pose === 'triste' ? 1 : 0;
  elipse(g, 3.5, 21 + tri, 3, 6, 'G'); elipse(g, 5.5, 20 + tri, 2.6, 6, 'W'); elipse(g, 2.2, 17 + tri, 2, 4, 'W'); pixel(g, 2, 14 + tri, 'B'); pixel(g, 1, 15 + tri, 'B');   // cauda de penas
  retangulo(g, 6, 21 + tri, 4, 8, 'Z'); retangulo(g, 6, 21 + tri, 1, 8, 'S');                                                                                         // mochilinha
  for (const x of [11, 18]) { retangulo(g, x, 32, 2, 3, 'O'); retangulo(g, x, 35, 5, 1, 'O'); pixel(g, x + 1, 36, 'O'); pixel(g, x + 3, 36, 'O'); pixel(g, x + 5, 36, 'O'); }   // pés de 3 dedos
  elipse(g, 14.5, 25.5 + tri, 9.5, 7.5, (x, y) => (y >= 30 || x <= 9 ? 'G' : 'W'));                                                                                    // corpo gordinho
  elipse(g, 19, 28 + tri, 4, 3.5, 'C');                                                                                                                                 // barriga
  for (let i = 0; i < 9; i++) retangulo(g, 11 + Math.round(i * 0.9), 20 + tri + i, 2, 1, 'B');                                                                         // faixa do colete
  carimbar(g, ['.R.', 'RYR'], 19, 22 + tri);                                                                                                                            // emblema
  const asa = (cx, cy, rx, ry) => { elipse(g, cx, cy, rx, ry, 'H'); elipse(g, cx, cy, rx - 1, ry - 1, 'G'); };
  if (pose === 'asasAlto') { asa(4, 13, 3, 7); asa(27, 15, 2.6, 7); }
  else if (pose === 'asaAcenando') { asa(14, 27, 5.5, 4); asa(27, 15, 2.6, 7); }
  else if (pose === 'triste') asa(13, 29 + tri, 5.5, 4);
  else { asa(13.5, 27 + tri, 5.5, 4); for (const x of [11, 14, 17]) pixel(g, x, 28 + tri, 'H'); }
  retangulo(g, 12, 18, 12, 2, 'B');                                                                                                                                      // gola
  carimbar(g, cabeca, 8, dy);
  return emTexto(contornar(g));
}

function cap(k) { return comCapacete(CABECAS[k]); }
export const CORPOS = Object.freeze({
  idle: [montarCorpo(cap('idle'), 'parado'), montarCorpo(cap('idle'), 'respirando')],
  idlePiscando: [montarCorpo(cap('idlePiscando'), 'parado')],
  preparing: [montarCorpo(cap('preparing'), 'parado'), montarCorpo(cap('preparing'), 'respirando')],
  launching: [montarCorpo(cap('launching'), 'parado')],
  flying: [montarCorpo(cap('flying'), 'parado'), montarCorpo(cap('flying'), 'respirando')],
  concerned: [montarCorpo(cap('concerned'), 'parado'), montarCorpo(cap('concerned'), 'respirando')],
  failed: [montarCorpo(cap('failed'), 'triste')],
  celebrating: [montarCorpo(cap('celebrating'), 'asasAlto'), montarCorpo(cap('celebrating'), 'asaAcenando')],
  moon: [montarCorpo(cap('moon'), 'asasAlto'), montarCorpo(cap('moon'), 'asaAcenando')],
});
export const RETRATOS = Object.freeze(Object.fromEntries(Object.keys(CABECAS).map((k) => [k, emTexto(contornar(comCapacete(CABECAS[k]).map((l) => [...l])))])));

// ---------------------------------------------------------------------------
// FOGUETE (36 × 78): corpo branco, nariz e aletas vermelhos, janela redonda onde aparece a cabeça
// ---------------------------------------------------------------------------
export const FOGUETE_L = 36, FOGUETE_A = 78;
export const JANELA = Object.freeze({ cx: 17.5, cy: 33.5, raioInterno: 8.4, x: 10, y: 26 }); // (x,y) = canto da cabeça 16 × 16

function montarFoguete() {
  const g = criarGrade(FOGUETE_L, FOGUETE_A), c = 17.5;
  const bw = 10.5;                                                          // meia-largura do corpo
  // nariz (ogiva)
  for (let y = 0; y < 20; y++) {
    const t = (19.5 - y) / 20, hw = bw * Math.sqrt(Math.max(0, 1 - t * t));
    for (let x = 0; x < FOGUETE_L; x++) if (Math.abs(x - c) <= hw) pixel(g, x, y, x < c - bw * 0.45 ? 'Q' : x > c + bw * 0.4 ? 'D' : 'R');
  }
  // corpo
  for (let y = 20; y < 60; y++) for (let x = 0; x < FOGUETE_L; x++) if (Math.abs(x - c) <= bw) pixel(g, x, y, x < c - bw * 0.55 ? 'W' : x > c + bw * 0.62 ? 'H' : x > c + bw * 0.2 ? 'G' : 'W');
  retangulo(g, 7, 20, 22, 2, 'D'); retangulo(g, 7, 22, 22, 1, 'R');          // faixa entre nariz e corpo
  retangulo(g, 7, 52, 22, 3, 'R'); retangulo(g, 7, 55, 22, 1, 'D'); retangulo(g, 25, 52, 4, 3, 'D'); // faixa vermelha inferior
  for (const y of [42, 46]) { pixel(g, 9, y, 'H'); pixel(g, 26, y, 'Z'); }   // rebites
  // janela
  elipse(g, 17.5, 33.5, 9.8, 9.8, 'N'); elipse(g, 17.5, 33.5, 8.8, 8.8, 'B');
  elipse(g, 17.5, 33.5, 8.4, 8.4, (x, y) => (y < 31 ? 'L' : 'A'));
  // saia do motor e bocal
  retangulo(g, 7, 60, 22, 2, 'H'); retangulo(g, 9, 62, 18, 5, 'S'); retangulo(g, 20, 62, 7, 5, 'Z'); retangulo(g, 9, 62, 3, 5, 'W');
  retangulo(g, 11, 67, 14, 4, 'Z'); retangulo(g, 11, 67, 5, 4, 'H'); retangulo(g, 9, 71, 18, 2, 'N');
  // aletas (esquerda clara, direita escura): largura cresce e depois afina até a ponta
  const larg = (i) => (i < 14 ? Math.min(7, 1 + Math.floor(i * 0.5)) : Math.max(1, 7 - Math.floor((i - 13) * 0.75)));
  for (let i = 0; i < 24; i++) {
    const xe = i < 14 ? 7 : 9, w = larg(i);
    retangulo(g, xe - w, 48 + i, w, 1, i < 5 ? 'Q' : 'R'); retangulo(g, 36 - xe, 48 + i, w, 1, 'D');
  }
  return emTexto(contornar(g));
}
export const FOGUETE = montarFoguete();

// ---------------------------------------------------------------------------
// ÍCONES (hand-made) e MINIATURAS DAS CAMADAS
// ---------------------------------------------------------------------------
export const ICONES = Object.freeze({
  estrela: [
    '.......KK.......', '......KYYK......', '......KYYK......', '.....KYYYYK.....', 'KKKKKYYYYYKKKKK', 'KYYYYYYYYYYYYYK', '.KYYYYOYYOYYYK.', '..KYYYYYYYYYK..',
    '...KYYYYYYYK...', '...KYYYOYYYK...', '..KYYYYKYYYYK..', '..KYYYK.KYYYK..', '.KYYYK...KYYYK.', '.KYYK.....KYYK.', '..KK.......KK..',
  ].map((l) => l.padEnd(15, '.').slice(0, 15)),
  planeta: [
    '.....KKKKKK.....', '...KKTTTTTTKK...', '..KTTTTTTTTTTK..', '.KTTTTTTTTBBTTK.', 'KKKYYYYYYYYYYYKK', 'KYYYKTTTTTTTBBYK', '.KKKTTTTTTTTBBKK', 'KTTTTTTTTTTBBBBK',
    'KTTTTTTTTTBBBBBK', '.KTTTTTTTBBBBBK.', '..KKBBBBBBBBKK..', '.YYYKKKKKKKKYYY.', 'KYYYYYYYYYYYYYYK', '.KKKKKKKKKKKKKK.',
  ].map((l) => l.padEnd(16, '.').slice(0, 16)),
  medalha: [
    '....KKKKKKKK....', '...KMMMMMMMMK...', '..KMmmmmmmmmMK..', '.KMmMMMMMMMMmMK.', 'KMmMMMMYYMMMMmMK', 'KMmMMMYYYYMMMmMK', 'KMmMYYYYYYYYMmMK', 'KMmMMYYYYYYMMmMK',
    'KMmMMMYYYYMMMmMK', 'KMmMMYYMMYYMMmMK', '.KMmMMMMMMMMmMK.', '..KMmmmmmmmmMK..', '...KMMMMMMMMK...', '....KKKKKKKK....',
  ],
  altitude: [
    '......KK........', '.....KWWK.......', '....KWWTTK......', '...KWTTTTTK.....', '..KTTTTTTTTK.KK.', '.KTTTBTTTTTKKTTK', 'KTTTBBBTTTTTTTTK', 'KBBBBBBBBBBBBBBK', 'KKKKKKKKKKKKKKKK',
  ],
  velocidade: [
    '....KKKKKKKK....', '..KKTTTTTTTTKK..', '.KTTTTTTTTTTTTK.', 'KTTTTTTTTTTTRTTK', 'KTTTTTTTTTTRRTTK', 'KTTYTTTTTRRTTTYK', 'KTTTTTTTRRTTTTTK', 'KTTTTTTNNTTTTTTK',
    'KTTTTTTNNNTTTTTK', '.KTTTTTTNTTTTTK.', '..KKTTTTTTTTKK..', '....KKKKKKKK....',
  ],
  aceleracao: [
    '.......KK.......', '......KOOK......', '.....KOOOOK.....', '....KOOOOOOK....', '...KOOOOOOOOK...', '..KKKKOOOOKKKK..', '.....KOOOOK.....', '.....KOOOOK.....', '.....KYYYYK.....', '......KYYK......', '.......KK.......',
  ],
  combustivel: [
    '...KKKKKKK......', '..KRRRRRRRKK....', '..KRRRRRRRKRK...', '.KKKKKKKKKKKRK..', 'KRRRRRRRRRRRRK..', 'KRQQRRRRRRDRRK..', 'KRQRRYYYRRRDRK..', 'KRRRRYYYRRRDRK..', 'KRRRRRYRRRRDRK..', 'KRRRRRRRRRRDRK..', 'KDDDDDDDDDDDDK..', '.KKKKKKKKKKKK...',
  ],
  tempo: [
    '....KKKKKKK.....', '..KKWWWWWWWKK...', '.KWWWWNWWWWWWK..', 'KWWWWWWNWWWWWWK.', 'KWWWWWWNWWWWWWK.', 'KWWWWWWNNNWWWWK.', 'KWWWWWWWWWWWWWK.', '.KWWWWWWWWWWWK..', '..KKWWWWWWWKK...', '....KKKKKKK.....',
  ],
  derivada: [
    '................', '..........KKKK..', '.......KKKYYYYK.', '.....KKYYYYKKKK.', '...KKYYYKK......', '..KYYYK.........', '.KYYYK..........', '.KYYK...........', 'KKYYK...........', 'KYYYK...........', '................',
  ],
  lua: [
    '....KKKKKKKK....', '..KKCCCCCCCCKK..', '.KCCCCCCCCCCCCK.', 'KCCSSSCCCCCCCCCK', 'KCCSSSCCCCCSSCCK', 'KCCCSCCCCCSSSCCK', 'KCCCCCCCCCCSCCCK', 'KCCCCCSSSCCCCCCK',
    'KCCCCSSSSSCCCCCK', 'KCSSCCCSSSCCCSCK', '.KCSSCCCCCCCSSK.', '..KKCCCCCCCCKK..', '....KKKKKKKK....',
  ],
});

/** Miniaturas (24 × 24) das camadas da atmosfera, usadas na lista de missões e no painel de camadas. */
function miniatura(topo, base, { estrelas = 0, nuvem = false, planeta = false, lua = false, terra = false } = {}) {
  const g = criarGrade(24, 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) pixel(g, x, y, y < 12 ? topo : base);
  if (estrelas) for (let i = 0; i < estrelas; i++) { const x = Math.floor((Math.sin(i * 91.7) * 0.5 + 0.5) * 22) + 1, y = Math.floor((Math.sin(i * 33.1 + 4) * 0.5 + 0.5) * 20) + 1; pixel(g, x, y, i % 3 ? 'Y' : 'W'); }
  if (nuvem) { retangulo(g, 4, 12, 12, 3, 'W'); retangulo(g, 7, 9, 6, 3, 'W'); retangulo(g, 14, 10, 5, 3, 'W'); retangulo(g, 4, 15, 12, 1, 'G'); }
  if (planeta) elipse(g, 12, 30, 22, 14, 'B');
  if (terra) { elipse(g, 12, 34, 24, 16, 'T'); retangulo(g, 6, 20, 6, 1, 'v'); }
  if (lua) { elipse(g, 12, 12, 8, 8, 'C'); retangulo(g, 9, 9, 3, 2, 'S'); retangulo(g, 14, 13, 3, 3, 'S'); }
  retangulo(g, 0, 0, 24, 1, 'K'); retangulo(g, 0, 23, 24, 1, 'K'); retangulo(g, 0, 0, 1, 24, 'K'); retangulo(g, 23, 0, 1, 24, 'K');
  return emTexto(g);
}
export const MINIATURAS = Object.freeze({
  troposfera: miniatura('A', 'L', { nuvem: true }),
  estratosfera: miniatura('B', 'A', { nuvem: true }),
  mesosfera: miniatura('N', 'B', { estrelas: 3 }),
  termosfera: miniatura('N', 'B', { estrelas: 12 }),
  exosfera: miniatura('K', 'N', { estrelas: 22, planeta: true }),
  lua: miniatura('K', 'N', { estrelas: 12, lua: true, terra: false }),
});

/** Chama do motor: cores por intensidade (usada pelo renderizador). */
export const CORES_CHAMA = Object.freeze({ nucleo: PALETA.W, meio: PALETA.F, borda: PALETA.U });

// ---------------------------------------------------------------------------
// Conversão grade → pixels RGBA (para Canvas ou PNG)
// ---------------------------------------------------------------------------
const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Converte uma grade de texto em { largura, altura, rgba:Uint8ClampedArray }. */
export function grade2rgba(grade, paleta = PALETA) {
  const h = grade.length, w = Math.max(...grade.map((l) => l.length)), rgba = new Uint8ClampedArray(w * h * 4);
  grade.forEach((linha, y) => [...linha].forEach((c, x) => {
    if (c === '.' || c === ' ') return;
    const cor = paleta[c]; if (!cor) throw new Error(`Cor "${c}" ausente da paleta`);
    const [r, g, b] = hexRGB(cor), i = (y * w + x) * 4; rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255;
  }));
  return { largura: w, altura: h, rgba };
}

const cache = new Map();
/** Canvas (offscreen) com o sprite já rasterizado; só no navegador. Chave de cache = a própria grade. */
export function bitmapDoSprite(grade, paleta = PALETA) {
  const chave = grade.join('|') + (paleta === PALETA ? '' : JSON.stringify(paleta));
  if (cache.has(chave)) return cache.get(chave);
  const { largura, altura, rgba } = grade2rgba(grade, paleta), cv = document.createElement('canvas');
  cv.width = largura; cv.height = altura;
  cv.getContext('2d').putImageData(new ImageData(rgba, largura, altura), 0, 0);
  cache.set(chave, cv); return cv;
}
