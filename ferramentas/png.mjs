// Codificador PNG mínimo (RGBA 8 bits) usando apenas o módulo `zlib` do Node.
import { deflateSync } from 'node:zlib';

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = TABELA_CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function bloco(tipo, dados) {
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(dados.length); crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([len, corpo, crc]);
}

/** Codifica { largura, altura, rgba } em PNG, ampliando cada pixel `escala` vezes (sem suavização). */
export function codificarPNG({ largura, altura, rgba }, escala = 1) {
  const W = largura * escala, H = altura * escala, linhas = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    const o = y * (W * 4 + 1); linhas[o] = 0;
    for (let x = 0; x < W; x++) {
      const s = ((Math.floor(y / escala)) * largura + Math.floor(x / escala)) * 4, d = o + 1 + x * 4;
      linhas[d] = rgba[s]; linhas[d + 1] = rgba[s + 1]; linhas[d + 2] = rgba[s + 2]; linhas[d + 3] = rgba[s + 3];
    }
  }
  const cab = Buffer.alloc(13); cab.writeUInt32BE(W, 0); cab.writeUInt32BE(H, 4); cab[8] = 8; cab[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', cab), bloco('IDAT', deflateSync(linhas, { level: 9 })), bloco('IEND', Buffer.alloc(0))]);
}

/** Junta vários sprites { rgba, largura, altura } numa folha com fundo, alinhados em linhas. */
export function folha(itens, { colunas = 6, margem = 4, fundo = [255, 244, 219, 255], escalaMax = 1 } = {}) {
  const linhasDeItens = []; for (let i = 0; i < itens.length; i += colunas) linhasDeItens.push(itens.slice(i, i + colunas));
  const largLinha = linhasDeItens.map((l) => l.reduce((s, it) => s + it.largura + margem, margem));
  const W = Math.max(...largLinha), alturas = linhasDeItens.map((l) => Math.max(...l.map((it) => it.altura)) + margem), H = alturas.reduce((a, b) => a + b, margem);
  const rgba = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < W * H; i++) rgba.set(fundo, i * 4);
  let y0 = margem;
  linhasDeItens.forEach((l, li) => {
    let x0 = margem;
    for (const it of l) {
      for (let y = 0; y < it.altura; y++) for (let x = 0; x < it.largura; x++) {
        const s = (y * it.largura + x) * 4; if (it.rgba[s + 3] === 0) continue;
        rgba.set(it.rgba.subarray(s, s + 4), ((y0 + y) * W + x0 + x) * 4);
      }
      x0 += it.largura + margem;
    }
    y0 += alturas[li];
  });
  void escalaMax;
  return { largura: W, altura: H, rgba };
}
