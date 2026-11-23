// ============================================================================
// interface.js — liga o DOM ao controlador `Jogo` (jogo.js). Aqui só existe apresentação:
// botões, formulário, telemetria, canvas e telas. As regras do jogo ficam em jogo.js/missao.js.
// ============================================================================
import { PARAMETROS_PADRAO, validarParametros, REGIOES, PROJETO } from './configuracao.js';
import { Jogo } from './jogo.js';
import { MISSOES } from './missao.js';
import { personagemAtiva, quadroDaPersonagem } from './personagens.js';
import { GraficoLinha, dadosDosGraficos } from './graficos.js';
import { Renderizador, desenharQuadro } from './renderizacao.js';
import { desenharCenaInicio, desenharCenaLunar } from './cenas.js';
import { exemplosDidaticos } from './didatica.js';

const $ = (id) => document.getElementById(id);
const n = (x, d = 1) => Number(x).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const alt = (h) => (Math.abs(h) >= 1e6 ? `${n(h / 1000, 0)} km` : Math.abs(h) >= 10000 ? `${n(h / 1000, 2)} km` : `${n(h, 1)} m`);
const sinal = (x, u, d = 2) => (x > 1e-9 ? `▲ +${n(x, d)} ${u}` : x < -1e-9 ? `▼ −${n(-x, d)} ${u}` : `■ ${n(0, d)} ${u}`); // símbolo + sinal, não só cor
const CAMPOS_NUM = ['massaEstrutural', 'massaCombustivel', 'empuxo', 'consumo', 'tempoMaximo', 'velocidadeInicial'];
const ROTULOS = { massaEstrutural: 'Massa estrutural', massaCombustivel: 'Massa de combustível', empuxo: 'Empuxo', consumo: 'Consumo', tempoMaximo: 'Tempo máximo', velocidadeInicial: 'Velocidade inicial' };
const lerArmazem = (k, padrao) => { try { const v = localStorage.getItem(k); return v === null ? padrao : JSON.parse(v); } catch { return padrao; } };
const gravarArmazem = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento: segue sem persistir */ } };

const jogo = new Jogo({ armazenamento: { ler: () => lerArmazem('missaopenosa.concluidas', []), gravar: (ids) => gravarArmazem('missaopenosa.concluidas', ids) } });
const render = new Renderizador($('palco'));
const ctxInicio = $('cenaInicio').getContext('2d'), ctxLua = $('cenaLua').getContext('2d');
const graficos = [
  new GraficoLinha($('gAlt'), { titulo: 'Altitude × tempo', rotuloY: 'altitude', autoKm: true, marcarMaximo: 'h', series: [{ campo: 'h', cor: '#F6D36A', rotulo: 'h(t)' }] }),
  new GraficoLinha($('gVel'), { titulo: 'Velocidade × tempo', rotuloY: 'velocidade', unidade: 'm/s', series: [{ campo: 'v', cor: '#43B8D0', rotulo: 'v (integração)' }, { campo: 'vDer', cor: '#F39A32', rotulo: 'dh/dt', tracejado: true }] }),
  new GraficoLinha($('gAce'), { titulo: 'Aceleração × tempo', rotuloY: 'aceleração', unidade: 'm/s²', series: [{ campo: 'a', cor: '#A9CB83', rotulo: 'a (Newton)' }, { campo: 'aDer', cor: '#F39A32', rotulo: 'dv/dt', tracejado: true }] }),
];
let reduzir = lerArmazem('missaopenosa.reduzir', null) ?? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
let telaMostrada = null, entradaTela = 0, simVista = null, alertasMostrados = 0, ultimaAtual = 0, ultimoGraf = 0, ultimoTick = 0, ultimaDidatica = 0;

// ------------------------------------------------------------------ formulário
function preencher(p) { CAMPOS_NUM.forEach((c) => ($(c).value = p[c])); }
function ler() {
  const p = {}; CAMPOS_NUM.forEach((c) => (p[c] = $(c).value.trim() === '' ? NaN : Number($(c).value)));
  p.areaFrontal = 1.2; p.coefArrasto = 0.5; p.modeloGravidade = 'variavel'; p.arrastoAtivo = true; return p;
}
function validarFormulario() {
  const p = ler(), v = validarParametros(p);
  $('erros').innerHTML = v.erros.map((e) => `<li>${e}</li>`).join('');
  CAMPOS_NUM.forEach((c) => { const ruim = v.erros.some((e) => e.startsWith(ROTULOS[c])); ruim ? $(c).setAttribute('aria-invalid', 'true') : $(c).removeAttribute('aria-invalid'); });
  if (v.ok) {
    $('analise').innerHTML = '<b>Parâmetros fixos:</b> G₀ = 9,80665 m/s², ρ₀ = 1,225 kg/m³, área = 1,2 m² e Cd = 0,5 em todas as missões. O foco didático é acompanhar posição, velocidade e aceleração por meio das derivadas.';
  } else $('analise').textContent = '';
  return v.ok ? p : null;
}

// ------------------------------------------------------------------ montagem estática
$('listaMissoes').innerHTML = MISSOES.map((m) => `<li><button type="button" class="missao${m.especial ? ' especial' : ''}" role="radio" aria-checked="false" data-missao="${m.id}">
  <img class="px" src="assets/backgrounds/camada-${m.icone}.png" alt="" width="36" height="36"><span><b>${m.nome}</b><small>${m.faixa}${m.especial ? ' · especial' : ''}</small></span><span class="ok" aria-hidden="true"></span></button></li>`).join('');
$('camadas').innerHTML = REGIOES.map((r, i) => `<li class="camada" data-camada="${r.nome}"><img class="px" src="assets/backgrounds/camada-${r.nome.toLowerCase()}.png" alt="" width="30" height="30"><span>${r.nome}<small>${i === 0 ? '0' : n(REGIOES[i - 1].ate / 1000, 0)}${r.ate === Infinity ? '+ km' : ` – ${n(r.ate / 1000, 0)} km`}</small></span></li>`).join('');
const LINHAS = [
  ['Tempo', (s) => `${n(s.t, 1)} s`], ['Altitude', (s) => alt(s.h)], ['Distância vertical percorrida', (s) => alt(s.distancia)],
  ['Altitude máxima', (s) => alt(s.hMax)], ['Velocidade vertical', (s) => sinal(s.v, 'm/s')], ['Velocidade máxima', (s) => `${n(s.vMax, 2)} m/s`],
  ['Aceleração vertical', (s) => sinal(s.forcas.aceleracao, 'm/s²')], ['Massa atual', (s) => `${n(s.forcas.massa, 1)} kg`],
  ['Combustível restante', (s) => `${n(s.combustivel, 1)} kg`], ['Empuxo do motor', (s) => `${n(s.forcas.empuxo, 0)} N`],
  ['Gravidade local', (s) => `${n(s.forcas.gravidade, 3)} m/s²`], ['Região atmosférica', (s) => s.regiao],
];
$('telemetria').innerHTML = LINHAS.map(([r], i) => `<dt>${r}</dt><dd id="t${i}">—</dd>`).join('');
$('fichaProjeto').innerHTML = [['Projeto', PROJETO.titulo], ['Disciplina', PROJETO.disciplina], ['Instituição', PROJETO.instituicao], ['Professor', PROJETO.professor], ['Objetivo', PROJETO.objetivo]].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
$('listaIntegrantes').innerHTML = PROJETO.integrantes.map((nome) => `<li>${nome}</li>`).join('');

// ------------------------------------------------------------------ pintura de personagem
function pintar(canvas, quadro) {
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, canvas.width, canvas.height);
  desenharQuadro(c, quadro, 0, 0, quadro.tipo === 'imagem' ? canvas.width : null, quadro.tipo === 'imagem' ? canvas.height : null);
}
const retratoAtual = (parte, estado, agora) => quadroDaPersonagem(personagemAtiva(), estado, parte, agora);

// ------------------------------------------------------------------ didática
function renderDidatica(destino, sim) {
  const abertos = new Set([...destino.querySelectorAll('details[open] summary')].map((s) => s.textContent));
  destino.innerHTML = exemplosDidaticos(sim).map((e) => `<details${abertos.has(e.titulo) ? ' open' : ''}><summary>${e.titulo}</summary>${e.formula ? `<pre>${e.formula}</pre>` : ''}<p>${e.texto}</p></details>`).join('');
}

// ------------------------------------------------------------------ simulador
function botoes() {
  const j = jogo, voando = j.voando;
  $('btnLancar').disabled = voando; $('btnAplicar').disabled = voando; $('btnPausar').disabled = j.fase !== 'voando'; $('btnContinuar').disabled = j.fase !== 'pausada';
  $('btnAbortar').disabled = !voando; $('btnPadrao').disabled = voando;
  $('form').querySelectorAll('input,select').forEach((el) => { if (el.id !== 'fator' && el.id !== 'chkReduzir') el.disabled = voando; });
  document.querySelectorAll('[data-foguete]').forEach((b) => (b.disabled = voando));
  document.querySelectorAll('.missao').forEach((b) => { b.disabled = voando; b.setAttribute('aria-checked', String(b.dataset.missao === j.missaoId)); b.querySelector('.ok').textContent = j.concluidas.has(b.dataset.missao) ? '✓' : ''; });
  const s = j.sim;
  $('estado').textContent = j.fase === 'encerrada' ? `Encerrada — ${s.relatorio?.estadoFinal ?? ''}` : j.fase === 'pausada' ? 'Pausada' : j.fase === 'pronta' ? 'Pronta' : s.v > 0 ? 'Em voo — subindo' : s.v < 0 ? 'Em voo — descendo' : 'Em voo — velocidade zero';
}

function atualizarSimulador(agora, forcarGraficos = false) {
  const s = jogo.sim, av = jogo.avaliacao;
  if (simVista !== s) { simVista = s; alertasMostrados = 0; $('alertas').innerHTML = ''; forcarGraficos = true; }
  LINHAS.forEach(([, f], i) => ($(`t${i}`).textContent = f(s)));
  const ini = s.params.massaCombustivel || 1, pc = Math.max(0, Math.min(100, 100 * s.combustivel / ini));
  $('iAlt').textContent = alt(s.h); $('iVel').textContent = `${n(s.v, 1)} m/s`; $('iAce').textContent = `${n(s.forcas.aceleracao, 2)} m/s²`; $('iCom').textContent = `${n(pc, 0)} %`;
  $('barraCombI').style.width = `${pc}%`; $('barraCombI').classList.toggle('baixo', pc <= 20); $('barraComb').setAttribute('aria-valuenow', String(Math.round(pc)));
  const prog = Math.min(100, jogo.progressoMax);
  $('barraMissaoI').style.width = `${prog}%`; $('barraMissao').setAttribute('aria-valuenow', String(Math.round(prog))); $('progressoPct').textContent = `${n(prog, 0)}%`;
  $('etapaNome').textContent = av.vitoria ? 'Conquista' : av.etapa.nome;
  $('possibilidade').textContent = av.possibilidade === 'sucesso' ? '★ Missão cumprida!' : av.possibilidade === 'possivel' ? 'Possibilidade de sucesso: em aberto.' : `Possibilidade de sucesso: impossível — ${av.motivoPossibilidade}`;
  $('objetivoMissao').textContent = `Objetivo: ${jogo.missao.objetivo}`;
  $('condicoes').innerHTML = av.condicoes.map((c) => `<li class="${c.atendida ? 'ok' : ''}"><b>${c.atendida ? '✓' : '✗'} ${c.titulo}</b><small>${c.requisito} — agora: ${c.atual}</small></li>`).join('');
  document.querySelectorAll('.camada').forEach((li) => li.classList.toggle('atual', li.dataset.camada === s.regiao));
  const dica = jogo.fase === 'pronta' ? 'Ajuste os parâmetros e clique em “Lançar foguete”.' : s.v > 0 && s.forcas.aceleracao < 0 ? 'Aceleração negativa com velocidade positiva: o foguete ainda SOBE, mas está desacelerando.' : s.v < 0 ? 'Velocidade negativa: o foguete está descendo.' : s.v > 0 ? 'Aceleração positiva: a velocidade está aumentando.' : '';
  $('dica').textContent = dica;
  const estado = jogo.estadoPersonagem(); $('fala').textContent = jogo.falaPersonagem(); pintar($('retrato'), retratoAtual('retrato', estado, agora));
  const box = $('alertas');
  for (; alertasMostrados < s.eventos.length; alertasMostrados++) {
    const e = s.eventos[alertasMostrados], d = document.createElement('div');
    d.className = `alerta ${e.nivel}`; d.textContent = `${e.nivel === 'erro' ? '✖' : e.nivel === 'aviso' ? '⚠' : 'ℹ'} t = ${n(e.t, 1)} s — ${e.texto}`;
    box.prepend(d); while (box.children.length > 5) box.lastChild.remove();
  }
  const u = s.ultimoPasso;
  $('lab').textContent = !u ? 'Lance um foguete para ver as derivadas calculadas com os dados do último passo.' :
`Δt = ${u.dt} s  (passo matemático da integração)

1ª derivada — velocidade
  h(n−1) = ${n(u.hAnt, 4)} m    h(n) = ${n(u.hAtual, 4)} m
  v ≈ [h(n) − h(n−1)] / Δt = ${n(s.vDer, 4)} m/s
  v pela integração         = ${n(s.v, 4)} m/s

2ª derivada — aceleração
  v(n−1) = ${n(u.vAnt, 4)} m/s   v(n) = ${n(u.vAtual, 4)} m/s
  a ≈ [v(n) − v(n−1)] / Δt = ${n(s.aDer, 4)} m/s²
  a pela 2ª lei de Newton   = ${n(s.aceleracaoAplicada, 4)} m/s²

A aceleração mostrada corresponde às forças aplicadas no início deste intervalo Δt.

Reta tangente à altitude no instante atual:
  h(t) ≈ ${n(s.h, 4)} + ${n(s.vDer, 4)} · (t − ${n(s.t, 4)})
  A inclinação da reta é a velocidade instantânea.`;
  if (forcarGraficos || agora - ultimoGraf > 250) { ultimoGraf = agora; graficos.forEach((g) => g.atualizar(s.historico)); }
  if (forcarGraficos || agora - ultimaDidatica > 1500) { ultimaDidatica = agora; renderDidatica($('aprendaSim'), s); }
  botoes();
}

// ------------------------------------------------------------------ resultados
const linhasRel = (r) => [['Altitude máxima', alt(r.altitudeMaxima)], ['Velocidade máxima', `${n(r.velocidadeMaxima, 1)} m/s`],
  ['Aceleração inicial / máxima', `${n(r.aceleracaoInicial, 2)} / ${n(r.aceleracaoMaxima, 1)} m/s²`], ['Tempo de voo', `${n(r.tempoVoo, 1)} s`],
  ['Combustível consumido', `${n(r.combustivelConsumido, 1)} kg (${n(100 * r.combustivelConsumido / (jogo.params.massaCombustivel || 1), 0)} %)`], ['Estado final', r.estadoFinal ?? '—']];
const dl = (linhas) => linhas.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
const itensCond = (lista) => lista.map((c) => `<li class="${c.atendida ? 'ok' : ''}"><b>${c.atendida ? '✓' : '✗'} ${c.titulo}</b><small>${c.requisito} — ${c.atual}</small></li>`).join('');

function preencherVitoria() {
  const lunar = jogo.missaoLunar;
  $('tVit').textContent = lunar ? 'CONSEGUIMOS! CHEGAMOS À LUA!' : `MISSÃO CONCLUÍDA: ${jogo.missao.nome.toUpperCase()}!`;
}
function preencherDerrota() {
  const av = jogo.avaliacao, abortou = jogo.sim.codigo === 'abortado';
  $('tDer').textContent = abortou ? 'LANÇAMENTO ABORTADO!' : 'MISSÃO NÃO CONCLUÍDA';
  $('resumoDer').textContent = av.resumo;
  pintar($('retratoDerrota'), quadroDaPersonagem(personagemAtiva(), 'failed', 'corpo', 0));
}
function abrirRelatorio() {
  const r = jogo.relatorio();
  $('corpoRelatorio').innerHTML = `<h3>${r.missao.nome} — ${r.resultado === 'vitoria' ? 'missão cumprida' : 'missão não concluída'}</h3><dl class="relatorio">${dl(linhasRel(r))}</dl>
    <h3>Condições</h3><ul class="condicoes">${itensCond(r.avaliacao.condicoes)}</ul><p>${r.avaliacao.resumo}</p>`;
  $('dlgRelatorio').showModal();
}

// ------------------------------------------------------------------ telas
const NOMES_TELA = ['inicio', 'como-funciona', 'sobre', 'simulador', 'vitoria', 'derrota'];
function sincronizarTela(agora) {
  if (telaMostrada === jogo.tela) return;
  telaMostrada = jogo.tela; entradaTela = agora;
  NOMES_TELA.forEach((t) => ($(`tela-${t}`).hidden = t !== jogo.tela));
  if (jogo.tela === 'como-funciona') { renderDidatica($('aprendaLista'), jogo.sim); $('falaAprenda').textContent = personagemAtiva().falas.idle; pintar($('retratoAprenda'), retratoAtual('retrato', 'idle', 0)); }
  if (jogo.tela === 'simulador') { preencher(jogo.params); validarFormulario(); atualizarSimulador(agora, true); }
  if (jogo.tela === 'vitoria') preencherVitoria();
  if (jogo.tela === 'derrota') preencherDerrota();
  window.scrollTo(0, 0);
}
function definirReduzir(v) { reduzir = v; render.reduzirAnimacoes = v; document.body.dataset.reduzir = String(v); $('chkReduzir').checked = v; $('chkReduzirInicio').checked = v; gravarArmazem('missaopenosa.reduzir', v); }

// ------------------------------------------------------------------ eventos
document.querySelectorAll('[data-ir]').forEach((b) => (b.onclick = () => jogo.irPara(b.dataset.ir)));
$('btnJogar').onclick = () => jogo.irPara('simulador'); $('btnComoFunciona').onclick = () => jogo.irPara('como-funciona'); $('btnSobre').onclick = () => jogo.irPara('sobre');
$('listaMissoes').addEventListener('click', (e) => { const b = e.target.closest('.missao'); if (b && jogo.escolherMissao(b.dataset.missao)) { atualizarSimulador(performance.now(), true); } });
document.querySelectorAll('[data-foguete]').forEach((b) => (b.onclick = () => { jogo.usarFoguete(b.dataset.foguete); preencher(jogo.params); validarFormulario(); atualizarSimulador(performance.now(), true); }));
$('form').addEventListener('input', (e) => { if (e.target.id !== 'fator' && e.target.id !== 'chkReduzir') validarFormulario(); });
$('fator').onchange = () => jogo.definirFator(Number($('fator').value));
$('btnAplicar').onclick = () => { const p = validarFormulario(); if (p) { jogo.aplicarConfiguracoes(p); atualizarSimulador(performance.now(), true); } };
$('btnLancar').onclick = () => { const p = validarFormulario(); if (p && jogo.lancar(p)) atualizarSimulador(performance.now(), true); };
$('btnPausar').onclick = () => { jogo.pausar(); botoes(); }; $('btnContinuar').onclick = () => { jogo.continuar(); botoes(); };
$('btnAbortar').onclick = () => { jogo.abortar(); atualizarSimulador(performance.now(), true); };
$('btnReiniciar').onclick = () => { jogo.reiniciar(); preencher(jogo.params); validarFormulario(); atualizarSimulador(performance.now(), true); };
$('btnPadrao').onclick = () => { jogo.aplicarConfiguracoes({ ...PARAMETROS_PADRAO }); preencher(jogo.params); validarFormulario(); atualizarSimulador(performance.now(), true); };
const novaMissao = () => { jogo.novaMissao(); };
$('btnNovaVit').onclick = novaMissao; $('btnNovaDer').onclick = novaMissao;
$('btnInicioVit').onclick = () => jogo.voltarAoInicio(); $('btnInicioDer').onclick = () => jogo.voltarAoInicio();
$('btnRelVit').onclick = abrirRelatorio; $('btnRelDer').onclick = abrirRelatorio; $('fecharRelatorio').onclick = () => $('dlgRelatorio').close();
$('chkReduzir').onchange = (e) => definirReduzir(e.target.checked); $('chkReduzirInicio').onchange = (e) => definirReduzir(e.target.checked);

// ------------------------------------------------------------------ laço de animação (independente do passo matemático)
function laco(agora) {
  const dt = Math.min(0.1, (agora - ultimoTick) / 1000 || 0); ultimoTick = agora;
  jogo.tick(dt); sincronizarTela(agora);
  const t = jogo.tela;
  if (t === 'inicio') desenharCenaInicio(ctxInicio, agora, personagemAtiva(), reduzir);
  else if (t === 'vitoria') { const seg = (agora - entradaTela) / 1000; jogo.missaoLunar ? desenharCenaLunar(ctxLua, agora, seg, personagemAtiva(), reduzir) : desenharCenaInicio(ctxLua, agora, personagemAtiva(), reduzir, 'celebrating'); }
  else if (t === 'simulador') {
    render.desenhar(jogo.sim, agora, jogo.fase === 'voando', personagemAtiva(), jogo.estadoPersonagem());
    if (agora - ultimaAtual > 100 || jogo.fase === 'encerrada') { ultimaAtual = agora; atualizarSimulador(agora, jogo.fase === 'encerrada' && agora - ultimoGraf > 250); }
  }
  requestAnimationFrame(laco);
}

definirReduzir(reduzir); preencher(jogo.params); validarFormulario();
requestAnimationFrame(laco);
window.__missaopenosa = { jogo, get sim() { return jogo.sim; }, dadosDosGraficos }; // facilita inspeção/depuração no console
