// Gera os PNGs de assets/ a partir dos MESMOS sprites usados pelo jogo (js/sprites.js).
// Uso: node ferramentas/gerar-assets.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { codificarPNG } from './png.mjs';
import { ICONES, MINIATURAS, FOGUETE, RETRATOS, CORPOS, grade2rgba } from '../js/sprites.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const salvar = (pasta, nome, grade, escala) => { mkdirSync(join(raiz, 'assets', pasta), { recursive: true }); writeFileSync(join(raiz, 'assets', pasta, nome + '.png'), codificarPNG(grade2rgba(grade), escala)); return 1; };
let n = 0;
for (const [k, g] of Object.entries(ICONES)) n += salvar('icons', k, g, 4);
for (const [k, g] of Object.entries(MINIATURAS)) n += salvar('backgrounds', `camada-${k}`, g, 4);
n += salvar('sprites', 'foguete', FOGUETE, 3);
for (const [k, g] of Object.entries(RETRATOS)) n += salvar('characters', `galinha-retrato-${k}`, g, 4);
for (const [k, v] of Object.entries(CORPOS)) n += salvar('characters', `galinha-corpo-${k}`, v[0], 4);
console.log(`${n} imagens geradas em assets/`);
