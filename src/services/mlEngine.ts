import { CartolaData, CartolaMatches, FBrefClubStats } from '../types';
import fbrefDataRaw from '../data/fbref_data.json';

const fbrefData = fbrefDataRaw as Record<string, FBrefClubStats>;

export interface MLWeights {
  homeAdvantage: number;
  positionMultipliers: Record<number, number>;
  defenseForm: number; // Peso da defesa adversária
  attackForm: number; // Peso do ataque do time
}

export interface PlayerProjection {
  atleta_id: number;
  apelido: string;
  posicao_id: number;
  clube_id: number;
  foto: string;
  media_base: number;
  expected_points: number;
  rodada: number;
}

export interface MLEvaluation {
  rodada: number;
  mae: number; // Mean Absolute Error
  details: {
    atleta_id: number;
    apelido: string;
    expected: number;
    actual: number;
    error: number;
  }[];
  adjustments: string[];
}

const STORAGE_KEYS = {
  WEIGHTS: 'cartola_ml_weights',
  PROJECTIONS: 'cartola_ml_projections_v2_',
  EVALUATIONS: 'cartola_ml_evaluations_v2_'
};

const DEFAULT_WEIGHTS: MLWeights = {
  homeAdvantage: 1.15,
  positionMultipliers: {
    1: 1.0, // GOL
    2: 1.0, // LAT
    3: 1.0, // ZAG
    4: 1.0, // MEI
    5: 1.0, // ATA
    6: 1.0, // TEC
  },
  defenseForm: 1.0,
  attackForm: 1.0
};

// Helper: load weights
export const getWeights = (): MLWeights => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WEIGHTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error loading ML weights", e);
  }
  return DEFAULT_WEIGHTS;
};

// Helper: save weights
export const saveWeights = (weights: MLWeights) => {
  localStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(weights));
};

export const getProjections = (rodada: number): PlayerProjection[] | null => {
  const raw = localStorage.getItem(`${STORAGE_KEYS.PROJECTIONS}${rodada}`);
  if (raw) return JSON.parse(raw);
  return null;
};

export const getEvaluation = (rodada: number): MLEvaluation | null => {
  const raw = localStorage.getItem(`${STORAGE_KEYS.EVALUATIONS}${rodada}`);
  if (raw) return JSON.parse(raw);
  return null;
};

// Gera as projeções matemáticas para a rodada atual
export const generateProjections = (
  data: CartolaData,
  matches: CartolaMatches
): PlayerProjection[] => {
  const weights = getWeights();
  const validMatches = matches.partidas.filter((m) => m.valida);
  const projections: PlayerProjection[] = [];

  // Cria um index rápido de oponentes
  const opponentMap: Record<number, { isHome: boolean; opponentId: number }> = {};
  validMatches.forEach(m => {
    opponentMap[m.clube_casa_id] = { isHome: true, opponentId: m.clube_visitante_id };
    opponentMap[m.clube_visitante_id] = { isHome: false, opponentId: m.clube_casa_id };
  });

  // Filtramos jogadores prováveis (status 7) e dúvidas (status 2)
  const probables = data.atletas.filter((p) => (p.status_id === 7 || p.status_id === 2) && p.jogos_num > 0);

  probables.forEach((p) => {
    // Ignora técnicos na primeira passada, pois eles dependem da projeção dos outros jogadores
    if (p.posicao_id === 6) return;

    const matchData = opponentMap[p.clube_id];
    if (!matchData) return; // Não tem partida válida

    // Começamos o cálculo pela média base do jogador
    let expected = (p as any).media_base_scout || p.media_num;

    // --- Fator Mando de Campo (usando home/away splits reais do FBref) ---
    const myClubAbrv = data.clubes[p.clube_id]?.abreviacao;
    const oppClubAbrv = data.clubes[matchData.opponentId]?.abreviacao;
    const myFbref = fbrefData[myClubAbrv];
    const oppFbref = fbrefData[oppClubAbrv];

    if (myFbref?.home_away) {
      const ha = myFbref.home_away;
      const hg = ha.home_games || 0;
      const ag = ha.away_games || 0;
      const hp = ha.home_points || 0;
      const ap = ha.away_points || 0;
      const totalGames = hg + ag;
      if (totalGames > 0) {
        const overallPtsAvg = (hp + ap) / totalGames;
        const relevantPtsAvg = matchData.isHome ? (ha.home_points_avg || 0) : (ha.away_points_avg || 0);
        const homeAwayFactor = overallPtsAvg > 0 ? relevantPtsAvg / overallPtsAvg : 1;
        expected *= Math.max(0.85, Math.min(1.20, homeAwayFactor));
      } else {
        expected *= matchData.isHome ? weights.homeAdvantage : (2 - weights.homeAdvantage);
      }
    } else {
      expected *= matchData.isHome ? weights.homeAdvantage : (2 - weights.homeAdvantage);
    }

    // --- Fator Momento do Time (last_5 + points_avg) ---
    if (myFbref?.overall?.last_5) {
      const last5 = myFbref.overall.last_5 as string;
      const wins = (last5.match(/W/g) || []).length;
      const losses = (last5.match(/L/g) || []).length;
      expected *= 1 + (wins - losses) * 0.02; // até ±10%
    }

    if (oppFbref && myFbref) {
      const myGames = myFbref.overall?.games || 10;
      const oppGames = oppFbref.overall?.games || 10;

      // --- LÓGICA DE MATCHUP AVANÇADA ---

      // 1. Goleiros (GOL)
      if (p.posicao_id === 1) {
        const oppSoT = (oppFbref.shooting?.for?.shots_on_target || 40) / oppGames;
        const mySavePct = (myFbref.keepers?.for?.gk_save_pct || 70) / 100;
        // Mais chutes adversários = mais oportunidades de defesa (DE)
        const savePotential = (oppSoT / 4.2) * mySavePct;
        expected *= (1 + (savePotential - 1) * 0.15);

        // Bonus clean sheet: se adversário faz poucos gols
        const oppGoalsPer90 = oppFbref.standard?.for?.goals_per90 || 1.2;
        const myCSPct = (myFbref.keepers?.for?.gk_clean_sheets_pct || 20) / 100;
        if (oppGoalsPer90 < 1.0) expected *= 1 + myCSPct * 0.15; // SG provável

        // Adversário tem baixa conversão de finalizações
        const oppConversion = oppFbref.shooting?.for?.goals_per_shot_on_target || 0.3;
        if (oppConversion < 0.25) expected *= 1.05;
      }

      // 2. Defensores (ZAG/LAT)
      if (p.posicao_id === 2 || p.posicao_id === 3) {
        // Desarmes: adversário perde muita posse
        const oppTacklesConceded = (oppFbref.misc?.against?.tackles_won || 80) / oppGames;
        const myTackles = (myFbref.misc?.for?.tackles_won || 80) / myGames;
        if (oppTacklesConceded > 9.5) expected *= 1.06;
        if (myTackles > 9.5) expected *= 1.04;

        // Interceptações do meu time
        const myInt = (myFbref.misc?.for?.interceptions || 60) / myGames;
        if (myInt > 7) expected *= 1.04;

        // SG opportunity: adversário faz poucos gols
        const oppGoalsPer90 = oppFbref.standard?.for?.goals_per90 || 1.2;
        if (oppGoalsPer90 < 1.0) expected *= 1.08;
        else if (oppGoalsPer90 < 1.2) expected *= 1.04;

        // Clean sheet % do meu time
        const myCSPct = myFbref.keepers?.for?.gk_clean_sheets_pct || 20;
        expected *= 1 + (myCSPct - 20) / 100 * 0.08;

        // Laterais: cruzamentos = mais chances de assistências
        if (p.posicao_id === 2) {
          const myCrosses = (myFbref.misc?.for?.crosses || 100) / myGames;
          if (myCrosses > 12) expected *= 1.04;
        }
      }

      // 3. Meias (MEI)
      if (p.posicao_id === 4) {
        // Adversário comete muitas faltas (FS points)
        const oppFouls = (oppFbref.misc?.for?.fouls || 130) / oppGames;
        if (oppFouls > 15) expected *= 1.08;
        else if (oppFouls > 13) expected *= 1.04;

        // Adversário perde muita posse (DS opportunities)
        const oppTacklesConceded = (oppFbref.misc?.against?.tackles_won || 80) / oppGames;
        if (oppTacklesConceded > 9.5) expected *= 1.06;

        // Posse de bola do meu time = mais tempo de jogo efetivo
        const myPossession = myFbref.possession?.for?.possession || myFbref.standard?.for?.possession || 50;
        expected *= 1 + (myPossession - 50) * 0.003;

        // Assistências: meu time finaliza muito = meias criam
        const mySoT = (myFbref.shooting?.for?.shots_on_target || 40) / myGames;
        if (mySoT > 4.5) expected *= 1.03;
      }

      // 4. Atacantes (ATA)
      if (p.posicao_id === 5) {
        // Acurácia de finalização do meu time × fraqueza do goleiro adversário
        const myShotAcc = (myFbref.shooting?.for?.shots_on_target_pct || 33) / 100;
        const oppGkSavePct = (oppFbref.keepers?.for?.gk_save_pct || 70) / 100;
        const goalProbability = myShotAcc * (1.5 - oppGkSavePct);
        expected *= (1 + goalProbability * 0.3);

        // Adversário sofre muitos gols
        const oppGAPer90 = oppFbref.keepers?.for?.gk_goals_against_per90 || 1.2;
        if (oppGAPer90 > 1.5) expected *= 1.12;
        else if (oppGAPer90 > 1.3) expected *= 1.06;

        // Adversário toma muitos chutes (defesa porosa)
        const oppShotsAgainst = (oppFbref.shooting?.against?.shots_on_target || 40) / oppGames;
        if (oppShotsAgainst > 4.5) expected *= 1.04;

        // Adversário tem poucos desarmes (facilidade de progressão)
        const oppTackles = (oppFbref.misc?.for?.tackles_won || 80) / oppGames;
        if (oppTackles < 7.5) expected *= 1.04;

        // Cruzamentos do meu time → gols de cabeça
        const myCrosses = (myFbref.misc?.for?.crosses || 100) / myGames;
        if (myCrosses > 14) expected *= 1.03;
      }
    }

    // --- Consistência do jogador (penaliza alta variância) ---
    const games = p.jogos_num > 0 ? p.jogos_num : 1;
    if (p.scout) {
      // Jogadores com muitos GS (gol sofrido) ou CV (cartão vermelho) são mais arriscados
      const gsPerGame = (p.scout.GS || 0) / games;
      const negativesPerGame = ((p.scout.CA || 0) + (p.scout.FC || 0) * 0.5) / games;
      if (gsPerGame > 1.5 && [1, 2, 3].includes(p.posicao_id)) expected *= 0.95;
      if (negativesPerGame > 1.5) expected *= 0.97;
    }

    // Aplica o Peso Dinâmico Aprendido da Posição
    const posMultiplier = weights.positionMultipliers[p.posicao_id] || 1.0;
    expected *= posMultiplier;

    // Limites de segurança
    if (expected < 0) expected = 0.5;
    if (expected > 20) expected = 20;

    projections.push({
      atleta_id: p.atleta_id,
      apelido: p.apelido,
      posicao_id: p.posicao_id,
      clube_id: p.clube_id,
      foto: p.foto,
      media_base: p.media_num,
      rodada: matches.rodada,
      expected_points: Math.round(expected * 100) / 100
    });
  });

  // Calcula técnicos
  probables.filter((p) => p.posicao_id === 6).forEach((coach) => {
    const teamProjections = projections.filter(t => t.clube_id === coach.clube_id);
    let expected = 0;
    if (teamProjections.length > 0) {
       const sum = teamProjections.reduce((acc, t) => acc + t.expected_points, 0);
       expected = sum / teamProjections.length;
    } else {
       expected = coach.media_num;
    }
    const posMultiplier = weights.positionMultipliers[coach.posicao_id] || 1.0;
    expected *= posMultiplier;

    projections.push({
      atleta_id: coach.atleta_id,
      apelido: coach.apelido,
      posicao_id: coach.posicao_id,
      clube_id: coach.clube_id,
      foto: coach.foto,
      media_base: coach.media_num,
      rodada: matches.rodada,
      expected_points: Math.round(expected * 100) / 100
    });
  });

  localStorage.setItem(`${STORAGE_KEYS.PROJECTIONS}${matches.rodada}`, JSON.stringify(projections));
  return projections;
};

export const evaluateRound = (
  rodada: number, 
  pontuados: Record<number, any>, 
  data: CartolaData
): MLEvaluation | null => {
  const projections = getProjections(rodada);
  if (!projections || Object.keys(pontuados).length === 0) return null;

  let totalError = 0;
  let count = 0;
  const details: MLEvaluation['details'] = [];
  const errorsByPos: Record<number, { sum: number, count: number }> = {
    1:{sum:0, count:0}, 2:{sum:0, count:0}, 3:{sum:0, count:0}, 
    4:{sum:0, count:0}, 5:{sum:0, count:0}, 6:{sum:0, count:0}
  };

  projections.forEach(proj => {
    const realPtsData = Object.values(pontuados).find(p => p.apelido === proj.apelido && p.clube_id === proj.clube_id) || pontuados[proj.atleta_id];
    if (realPtsData && realPtsData.entrou_em_campo) {
      const realPoints = typeof realPtsData.pontuacao === 'number' ? realPtsData.pontuacao : parseFloat(realPtsData.pontuacao) || 0;
      const error = proj.expected_points - realPoints;
      totalError += Math.abs(error);
      count++;
      
      details.push({
        atleta_id: proj.atleta_id,
        apelido: proj.apelido,
        expected: proj.expected_points,
        actual: realPoints,
        error: Math.round(error * 100) / 100
      });

      if (errorsByPos[proj.posicao_id]) {
        errorsByPos[proj.posicao_id].sum += error;
        errorsByPos[proj.posicao_id].count++;
      }
    }
  });

  if (count === 0) return null;
  const mae = Math.round((totalError / count) * 100) / 100;
  const adjustments: string[] = [];
  const currentWeights = getWeights();
  const LEARNING_RATE = 0.02;

  Object.entries(errorsByPos).forEach(([posId, stats]) => {
    if (stats.count > 5) {
      const avgError = stats.sum / stats.count;
      let adjustmentDelta = (avgError * -1) * LEARNING_RATE; 
      if (adjustmentDelta > 0.1) adjustmentDelta = 0.1;
      if (adjustmentDelta < -0.1) adjustmentDelta = -0.1;

      if (Math.abs(avgError) > 1.5) {
        currentWeights.positionMultipliers[Number(posId)] += adjustmentDelta;
        adjustments.push(
          avgError > 0 
           ? `Superestimamos ${data.posicoes[posId]?.nome} em média ${avgError.toFixed(1)}pts. Peso reduzido.`
           : `Subestimamos ${data.posicoes[posId]?.nome} em média ${Math.abs(avgError).toFixed(1)}pts. Peso aumentado.`
        );
      }
    }
  });

  if (adjustments.length > 0) saveWeights(currentWeights);
  else adjustments.push("Modelo manteve alta precisão nesta rodada.");

  const evaluation: MLEvaluation = {
    rodada,
    mae,
    details: details.sort((a,b) => Math.abs(b.error) - Math.abs(a.error)),
    adjustments
  };

  localStorage.setItem(`${STORAGE_KEYS.EVALUATIONS}${rodada}`, JSON.stringify(evaluation));
  return evaluation;
};
