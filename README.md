# MISSÃO PENOSA 🐔🚀

**Simulador de Lançamento Espacial**

Projeto acadêmico desenvolvido para a disciplina de **Cálculo Diferencial e Integral I**. O jogo simula o lançamento de um foguete com uma galinha astronauta, utilizando conceitos de física e cálculo, principalmente derivadas.

## 1. Requisitos

- Node.js 18 ou superior.
- Navegador atualizado.

## 2. Como executar

1. Extraia os arquivos do projeto.
2. Abra a pasta `MISSAO_PENOSA` no terminal.
3. Execute:

```bash
npm start
```

4. Abra o navegador e acesse:

[http://localhost:8000](http://localhost:8000)

## 3. Como jogar

1. Clique em **JOGAR**.
2. Escolha uma missão.
3. Monte seu foguete ou selecione um modelo pronto.
4. Clique em **LANÇAR FOGUETE**.
5. Acompanhe o lançamento, os gráficos e os resultados.

O objetivo é alcançar a altitude definida pela missão ou completar o desafio lunar.

## 4. Organização dos arquivos

Os arquivos do projeto estão organizados principalmente nas seguintes pastas:

| Pasta/Arquivo | Função |
|---|---|
| `assets/` | Imagens, fontes e elementos visuais do jogo. |
| `js/` | Códigos responsáveis pelo funcionamento do jogo. |
| `tests/` | Testes do projeto. |
| `ferramentas/` | Ferramentas auxiliares. |
| `index.html` | Estrutura da página. |
| `styles.css` | Aparência e estilos. |
| `servidor.js` | Servidor para executar o jogo. |

### Principais arquivos JavaScript

- `configuracao.js`: configurações e parâmetros do foguete.
- `derivadas.js`: cálculos da primeira e da segunda derivada.
- `fisica.js`: cálculos de força, gravidade, arrasto e aceleração.
- `simulacao.js`: controla o movimento e registra os dados do foguete.
- `missao.js`: verifica o progresso e as condições das missões.
- `graficos.js`: apresenta os gráficos de altitude, velocidade e aceleração.
- `interface.js`: conecta os códigos à tela do jogo.

## 5. Conceitos matemáticos

O projeto utiliza derivadas para representar o movimento do foguete:

- **Primeira derivada:** representa a velocidade, ou seja, a variação da altitude ao longo do tempo.
- **Segunda derivada:** representa a aceleração, ou seja, a variação da velocidade ao longo do tempo.

O jogo apresenta três gráficos:

- Altitude × tempo.
- Velocidade × tempo.
- Aceleração × tempo.

Os gráficos permitem acompanhar o movimento do foguete e observar como a velocidade e a aceleração variam durante o lançamento.

## 6. Observação sobre a missão lunar

A missão lunar utiliza um modelo matemático simplificado, baseado na energia do foguete. O jogo não simula uma viagem real até a Lua, mas verifica se o foguete possui energia suficiente, de acordo com os critérios definidos no projeto.

## 7. Testes

Para executar os testes do projeto, utilize:

```bash
npm test
```