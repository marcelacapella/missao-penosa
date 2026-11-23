// ============================================================================
// didatica.js — fundamentação matemática das três grandezas centrais do jogo.
// Os exemplos usam somente valores reais da simulação atual.
// ============================================================================
const n = (x, d = 2) => Number(x).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Retorna explicações de posição, velocidade e aceleração com os dados de `sim`. */
export function exemplosDidaticos(sim) {
  const u = sim.ultimoPasso;
  const voou = Boolean(u);
  const t0 = sim.t;
  const h0 = sim.h;
  const v0 = sim.vDer ?? sim.v;
  const tangente = `h(t) ≈ ${n(h0, 2)} + ${n(v0, 2)} · (t − ${n(t0, 2)})`;

  return [
    {
      titulo: '1. Posição: onde o foguete está?',
      formula: 'h(t) = altitude em função do tempo',
      texto: `A posição vertical do foguete é sua altitude. Neste instante, h(${n(sim.t, 2)}) = ${n(sim.h, 2)} m. O primeiro gráfico mostra como essa posição muda durante o voo.`,
    },
    {
      titulo: '2. Velocidade: primeira derivada',
      formula: 'v(t) = h′(t) ≈ [h(t) − h(t − Δt)] / Δt',
      texto: voou
        ? `A altitude mudou de ${n(u.hAnt, 4)} m para ${n(u.hAtual, 4)} m em Δt = ${n(u.dt, 2)} s. Assim, v ≈ (${n(u.hAtual, 4)} − ${n(u.hAnt, 4)}) / ${n(u.dt, 2)} = ${n(sim.vDer, 3)} m/s. A derivada da posição indica quantos metros a altitude varia por segundo.`
        : 'A velocidade é a taxa de variação da altitude. Lance o foguete para ver a primeira derivada calculada com os dados reais do movimento.',
    },
    {
      titulo: '3. Aceleração: segunda derivada',
      formula: 'a(t) = v′(t) = h″(t) ≈ [v(t) − v(t − Δt)] / Δt',
      texto: voou
        ? `A velocidade mudou de ${n(u.vAnt, 4)} m/s para ${n(u.vAtual, 4)} m/s em Δt = ${n(u.dt, 2)} s. Portanto, a ≈ (${n(u.vAtual, 4)} − ${n(u.vAnt, 4)}) / ${n(u.dt, 2)} = ${n(sim.aDer, 3)} m/s². A aceleração é a derivada da velocidade, ou a segunda derivada da altitude.`
        : 'A aceleração mede como a velocidade muda a cada segundo. É a segunda derivada da altitude.',
    },
    {
      titulo: '4. Reta tangente: inclinação instantânea',
      formula: 'h(t) ≈ h(t₀) + h′(t₀) · (t − t₀)',
      texto: `A inclinação da reta tangente ao gráfico da altitude é a velocidade naquele instante. Usando os valores atuais, a aproximação local é: ${tangente}. Quanto maior o módulo da velocidade, mais inclinada é a reta.`,
    },
  ];
}
