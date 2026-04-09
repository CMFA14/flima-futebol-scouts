# Cartola Scout Prediction Tool (Vite + React + TS)

Uma ferramenta poderosa para análise de scouts e geração de escalação ideal para o Cartola FC.

## 🚀 Como Rodar o Projeto

Siga os passos abaixo para configurar e executar a aplicação em sua máquina local:

### 1. Pré-requisitos
Certifique-se de ter o **Node.js** instalado (versão 18 ou superior recomendada).
- [Baixar Node.js](https://nodejs.org/)

### 2. Instalação das Dependências
Abra o terminal na pasta do projeto e execute o comando:
```bash
npm install
```

### 3. Execução
Para iniciar o servidor de desenvolvimento, utilize o comando:
```bash
npm run dev
```

### 4. Acesso
Após o comando acima, o terminal exibirá uma URL (geralmente `http://localhost:5173`). Abra este link no seu navegador.

## 🛠️ O que há no projeto?

- **Escalação Ideal**: Algoritmo que projeta pontos com base em médias e dificuldade do confronto (mando de campo e posição do jogador).
- **Top Scouts**: Painel para visualizar os melhores jogadores em scouts específicos (gols, assistências, desarmes, etc.).
- **CORS Proxy**: Utiliza o `corsproxy.io` para buscar dados em tempo real da API oficial do Cartola FC sem problemas de CORS no navegador.

## 📈 Lógica de Projeção (Resumo)
A ferramenta calcula uma "Pontuação Projetada" usando:
- **Média do Jogador**: Base para a projeção.
- **Peso de Scouts**: Bônus para jogadores com alta frequência de scouts importantes (G, A, DS).
- **Multiplicador de Partida**: Bônus para mandantes e defensores com maior probabilidade de SG (Saldo de Gol).
- **Somente Prováveis**: Filtra automaticamente apenas jogadores com status "Provável".

---
*Desenvolvido para auxiliar cartoleiros na tomada de decisão estratégica.*
