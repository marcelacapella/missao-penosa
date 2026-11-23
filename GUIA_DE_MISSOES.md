# Guia de Missões — MISSÃO PENOSA 🐔🚀

Este guia apresenta as missões disponíveis no jogo, suas configurações e os resultados obtidos nos testes do simulador.

## 1. Missões e configurações

| Missão | Objetivo | Foguete | Estrutura (kg) | Combustível (kg) | Empuxo (N) | Consumo (kg/s) |
|---|---|---|---:|---:|---:|---:|
| Troposfera | 12 km | Padrão | 500 | 900 | 30.000 | 8 |
| Estratosfera | 50 km | Padrão | 500 | 900 | 30.000 | 8 |
| Mesosfera | 85 km | Padrão | 500 | 900 | 30.000 | 8 |
| Termosfera | 600 km | Ajustado | 500 | 1.500 | 40.000 | 10 |
| Exosfera | 2.000 km | Ajustado | 500 | 3.000 | 60.000 | 15 |
| Lua | Energia suficiente para alcançar 384.400 km | Lunar | 500 | 9.500 | 450.000 | 100 |

## 2. Resultados dos testes

Todas as configurações apresentadas conseguiram cumprir o objetivo de suas respectivas missões.

| Missão | Tempo até a vitória | Altitude atingida | Velocidade máxima |
|---|---:|---:|---:|
| Troposfera | 55,2 s | 12,0 km | 386 m/s |
| Estratosfera | 105,6 s | 50,0 km | 1.398 m/s |
| Mesosfera | 127,4 s | 85,1 km | 1.708 m/s |
| Termosfera | 323,1 s | 600,1 km | 3.387 m/s |
| Exosfera | 645,4 s | 2.000,1 km | 5.490 m/s |
| Lua | 93,3 s | 275,4 km | 10.937 m/s |

## 3. Observações importantes

- **Foguete Padrão:** é suficiente para as missões Troposfera, Estratosfera e Mesosfera.
- **Foguete Reforçado:** alcança altitudes maiores, mas não possui energia suficiente para completar a missão lunar.
- **Foguete Lunar:** possui uma configuração especial para cumprir os critérios da missão da Lua.
- **Tempo de queima:** corresponde ao tempo necessário para consumir todo o combustível.
- **Missão lunar:** utiliza um modelo matemático simplificado, baseado na energia do foguete. O jogo não simula uma viagem real até a Lua; apenas verifica se a energia é suficiente para alcançar a distância considerada.

## 4. Como os resultados foram verificados

Os resultados foram obtidos por meio do simulador, utilizando o comando:

```bash
node ferramentas/verificar-missoes.mjs
```

Esse teste executa as missões e verifica se cada foguete consegue atingir seu objetivo.