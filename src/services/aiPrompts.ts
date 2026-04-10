import { CartolaData, CartolaMatches } from '../types';
import fbrefDataRaw from '../data/fbref_data.json';
import leagueTableRaw from '../data/league_table.json';

export interface AILineupResponse {
  formacao: string;
  titulares: number[];
  reservas: number[];
  capitao: number;
}

export const getLineupPrompt = (data: CartolaData, matches: CartolaMatches, budget: number): string => {
  // Only send probable players to save context and prevent AI from hallucinating doubtful players
  const probables = data.atletas.filter((p) => p.status_id === 7).map((p) => ({
    id: p.atleta_id,
    nome: p.apelido,
    posicao: data.posicoes[p.posicao_id]?.abreviacao,
    posicao_id: p.posicao_id,
    clube: data.clubes[p.clube_id]?.abreviacao,
    preco: p.preco_num,
    media: p.media_num,
  }));

  const matchesData = matches.partidas.map((m) => {
    const casa = data.clubes[m.clube_casa_id]?.abreviacao;
    const fora = data.clubes[m.clube_visitante_id]?.abreviacao;
    return `${casa} x ${fora}`;
  });

  return `
Você é um analista de dados de Elite especialista em Cartola FC e futebol avançado.
Sua missão é montar a melhor escalação possível para a rodada atual.

DADOS DA RODADA:
Partidas: ${JSON.stringify(matchesData)}

Orçamento máximo para o time principal: C$ ${budget}

Estatísticas Avançadas FBref:
${JSON.stringify(fbrefDataRaw)}

Lista de Jogadores Prováveis:
${JSON.stringify(probables)}

REGRAS OBRIGATÓRIAS:
1. O custo total do seu time TITULAR não pode ultrapassar o Orçamento Máximo estabelecido (C$ ${budget}). É IMPRESCINDÍVEL respeitar esse limite matemático.
2. Analise os confrontos da rodada e as estatísticas do FBref para encontrar os "Matchups" (Duelos) perfeitos. Ex: Escale goleiros de times grandes contra ataques de baixa conversão, defensores e volantes de times desarmadores jogando em casa, e atacantes explosivos contra defesas mais frágeis.
3. Você DEVE escolher OBRIGATORIAMENTE um dos seguintes esquemas táticos precisos: "4-3-3", "4-4-2", "3-5-2", "3-4-3", "5-3-2".
4. O time titular precisa ter 11 jogadores e EXATAMENTE 1 TÉCNICO (posicao_id: 6, posicao: TEC), respeitando as quantidades perfeitas do esquema escolhido. (Exemplo num 4-3-3: 1 GOL, 2 LAT, 2 ZAG, 3 MEI, 3 ATA, 1 TEC).
5. O capitão DEVE ser o atleta de linha titular com maior potencial de mitar. A pontuação dele dobra. Ele não pode ser goleiro nem técnico.
6. Escolha 1 reserva para cada posição que o seu esquema possui (exemplo: 1 GOL, 1 LAT, 1 ZAG, 1 MEI, 1 ATA). Os reservas custam menos que o titular mais barato focado em cada posição correspondente.

FORMATO DE RESPOSTA (DE SUMA IMPORTÂNCIA):
Retorne EXCLUSIVAMENTE um único bloco JSON, sem blocos de markdown em volta, sem formatações explicativas. Só as chaves do objeto JSON, estritamente válido:

{
  "formacao": "Abreviação da formatação como string. Ex: 4-3-3",
  "titulares": [Lista com exatamente 12 IDs numéricos representando a escalação titular incluindo o TEC],
  "reservas": [Lista de IDs numéricos. No máximo 5, um de cada posição para os reservas],
  "capitao": ID numérico de sua melhor aposta entre os titulares
}
  `.trim();
};

export interface BettingTip {
  jogo: string;
  dica: string;
  justificativa: string;
  confianca: number;
}

export interface BettingTipsResponse {
  arriscadas: BettingTip[];
  normais: BettingTip[];
  faceis: BettingTip[];
}

export const getBettingTipsPrompt = (data: CartolaData, matches: CartolaMatches): string => {
  const matchesData = matches.partidas
    .filter((m) => m.valida)
    .map((m) => {
      const home = data.clubes[String(m.clube_casa_id)];
      const away = data.clubes[String(m.clube_visitante_id)];
      return {
        jogo: `${home?.abreviacao ?? m.clube_casa_id} x ${away?.abreviacao ?? m.clube_visitante_id}`,
        casa: home?.abreviacao,
        visitante: away?.abreviacao,
        data: m.partida_data,
        local: m.local,
      };
    });

  return `
Você é um analista de apostas esportivas especialista em futebol brasileiro (Campeonato Brasileiro Série A).
Sua tarefa é analisar as partidas da rodada ${matches.rodada} e gerar dicas de apostas categorizadas em 3 níveis de risco.

DADOS DA RODADA:
Partidas: ${JSON.stringify(matchesData)}

Tabela de Classificação:
${JSON.stringify(leagueTableRaw)}

Estatísticas Avançadas FBref (ataque, defesa, etc.):
- [Estatísticas por clube: Finalizações, Gols Marcados/Sofridos, Desarmes, Interceptações]

Análise Sugerida:
- Analise cada confronto usando os dados de classificação (posição, pontos, gols pró/contra, vitórias/empates/derrotas) e as estatísticas FBref (finalizações ao gol, interceptações, desarmes).
- Para cada dica, explique de forma clara e objetiva o raciocínio baseado nos dados.
- Gere dicas reais de apostas como: "Vitória do mandante", "Empate", "Ambos marcam", "Mais de 2.5 gols", "Menos de 2.5 gols", "Vitória do visitante", "Handicap", "Clean Sheet", "Goleada", etc.
- Distribua as dicas nos 3 níveis abaixo:

1. **faceis** (confiança 70-90%): Apostas com alta probabilidade baseada em dados sólidos. Times claramente superiores, defesas muito fortes, padrões consistentes.
2. **normais** (confiança 50-69%): Apostas razoáveis com dados que sugerem uma tendência, mas com alguma incerteza.
3. **arriscadas** (confiança 30-49%): Apostas de alto risco/alta recompensa. Resultados surpreendentes ou mercados voláteis justificados por algum dado específico.

- Gere pelo menos 2 dicas por nível (total de 6 a 9 dicas).
- O campo "confianca" deve ser um número inteiro de 0 a 100.

FORMATO DE RESPOSTA (EXCLUSIVAMENTE JSON VÁLIDO, SEM MARKDOWN):
{
  "faceis": [
    {
      "jogo": "ABR x XYZ",
      "dica": "Tipo de aposta",
      "justificativa": "Explicação baseada nos dados",
      "confianca": 80
    }
  ],
  "normais": [...],
  "arriscadas": [...]
}
`.trim();
};
