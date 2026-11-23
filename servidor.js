// Servidor estático mínimo (sem dependências): necessário porque módulos ES não carregam via file://.
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join, normalize } from 'node:path'; import { fileURLToPath } from 'node:url';
const raiz = fileURLToPath(new URL('.', import.meta.url)), porta = process.env.PORT || 8000;
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };
http.createServer(async (req, res) => {
  let rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  if (rel === '/' || rel === '\\') rel = '/index.html';
  try { const dados = await readFile(join(raiz, rel)); res.writeHead(200, { 'Content-Type': tipos[extname(rel)] || 'application/octet-stream' }); res.end(dados); }
  catch { res.writeHead(404); res.end('Não encontrado'); }
}).listen(porta, () => console.log(`Missão Penosa em http://localhost:${porta}`));
