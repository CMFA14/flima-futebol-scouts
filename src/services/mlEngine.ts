import { CartolaData, CartolaMatches } from '../types';
import fbrefDataRaw from '../data/fbref_data.json';


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
  PROJECTIONS: 'cartola_ml_projections_',
  EVALUATIONS: 'cartola_ml_evaluations_'
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
    let expected = p.media_num;

    // Fator Mando de Campo
    if (matchData.isHome) {
      expected *= weights.homeAdvantage;
    } else {
      expected *= (2 - weights.homeAdvantage); // Pondera reversamente (se adv = 1.15, desvantagem = 0.85)
    }

    // Pega as stats do FBref (se existirem) para afinar
    const homeClubAbrv = data.clubes[p.clube_id]?.abreviacao;
    const oppClubAbrv = data.clubes[matchData.opponentId]?.abreviacao;
    
    // @ts-ignore
    const oppFbref = fbrefDataRaw[oppClubAbrv];
    // @ts-ignore
    const myFbref = fbrefDataRaw[homeClubAbrv];

    if (oppFbref && weights.defenseForm) {
      // Se for atacante (5) ou meia (4), sofre mais com defesa forte do adversário
      if (p.posicao_id === 5 || p.posicao_id === 4) {
        // Quantidade de interceptações (escala 0.8 a 1.2)
        const oppDefStr = (oppFbref.defesa.interceptacoes / 50); 
        expected *= (1 - (oppDefStr - 1) * 0.1 * weights.defenseForm); 
      }
    }

    if (myFbref && weights.attackForm) {
      // Se for zagueiro (3) ou goleiro (1), ganha se o time adversário ataca pouco (Finalizações no Alvo)
      if (p.posicao_id === 1 || p.posicao_id === 3 || p.posicao_id === 2) {
         if (oppFbref) {
            const oppAtkThreat = (oppFbref.ataque.finalizacoes_alvo / 20);
            expected *= (1 - (oppAtkThreat - 1) * 0.15 * weights.defenseForm);
         }
      }
    }

    // Aplica o Peso Dinâmico Aprendido da Posição
    const posMultiplier = weights.positionMultipliers[p.posicao_id] || 1.0;
    expected *= posMultiplier;

    // Limites de segurança da projeção
    if (expected < 0) expected = Math.max(p.media_num * 0.5, 0.5); // Não projeta números absurdos negativos
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

  // Segunda Passada: Calcula os técnicos baseados na média dos jogadores projetados daquele time
  probables.filter((p) => p.posicao_id === 6).forEach((coach) => {
    const teamProjections = projections.filter(p => p.clube_id === coach.clube_id);
    let expected = 0;
    
    if (teamProjections.length > 0) {
       const sum = teamProjections.reduce((acc, p) => acc + p.expected_points, 0);
       expected = sum / teamProjections.length; // Cartola: média do que o time fizer em campo
    } else {
       expected = coach.media_num; // Fallback se não tivermos ninguém projetado (?)
    }

    const posMultiplier = weights.positionMultipliers[coach.posicao_id] || 1.0;
    expected *= posMultiplier;

    if (expected < 0) expected = Math.max(coach.media_num * 0.5, 0.5);
    if (expected > 20) expected = 20;

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

  // Salva no LocalStorage
  localStorage.setItem(`${STORAGE_KEYS.PROJECTIONS}${matches.rodada}`, JSON.stringify(projections));
  return projections;
};

// Audita a rodada: compara o "Projetado" salvo localmente com o "Real" batido na API
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
    // Se o atleta jogou
    const realPtsData = Object.values(pontuados).find(p => p.apelido === proj.apelido && p.clube_id === proj.clube_id) || pontuados[proj.atleta_id];
    
    if (realPtsData && realPtsData.entrou_em_campo) {
      const realPoints = typeof realPtsData.pontuacao === 'number' ? realPtsData.pontuacao : parseFloat(realPtsData.pontuacao) || 0;
      const error = proj.expected_points - realPoints; // Positivo = Superestimou, Negativo = Subestimou
      const absError = Math.abs(error);
      
      totalError += absError;
      count++;
      
      details.push({
        atleta_id: proj.atleta_id,
        apelido: proj.apelido,
        expected: proj.expected_points,
        actual: realPoints,
        error: Math.round(error * 100) / 100
      });

      if (errorsByPos[proj.posicao_id]) {
        errorsByPos[proj.posicao_id].sum += error; // Erro direcional
        errorsByPos[proj.posicao_id].count++;
      }
    }
  });

  if (count === 0) return null;

  const mae = Math.round((totalError / count) * 100) / 100;
  const adjustments: string[] = [];

  // --- CALIBRATION LOGIC (Atualização de Pesos) ---
  const currentWeights = getWeights();
  const LEARNING_RATE = 0.02; // Velocidade de mudança por rodada

  Object.entries(errorsByPos).forEach(([posId, stats]) => {
    if (stats.count > 5) {
      const avgError = stats.sum / stats.count;
      // Se avgError > 0 -> Superestimamos a posição (esperava 8 fez 3). Precisamos DIMINUIR o peso da posição.
      // Se avgError < 0 -> Subestimamos a posição. Precisamos AUMENTAR o peso.
      
      // Ajuste suave proporcial ao erro (clamp max 10%)
      let adjustmentDelta = (avgError * -1) * LEARNING_RATE; 
      if (adjustmentDelta > 0.1) adjustmentDelta = 0.1;
      if (adjustmentDelta < -0.1) adjustmentDelta = -0.1;

      if (Math.abs(avgError) > 1.5) { // Só ajusta se errar por mais de 1.5 pontos em média
        const posName = data.posicoes[posId]?.nome || 'Posição';
        currentWeights.positionMultipliers[Number(posId)] += adjustmentDelta;
        
        adjustments.push(
          avgError > 0 
           ? `Superestimamos ${posName} em média ${avgError.toFixed(1)}pts. Reduzindo multiplicador em ${(Math.abs(adjustmentDelta)*100).toFixed(1)}%.`
           : `Subestimamos ${posName} em média ${Math.abs(avgError).toFixed(1)}pts. Aumentando multiplicador em ${(Math.abs(adjustmentDelta)*100).toFixed(1)}%.`
        );
      }
    }
  });

  // Salva os novos pesos "Aprendidos" se houve mudança
  if (adjustments.length > 0) {
    saveWeights(currentWeights);
  } else {
    adjustments.push("O modelo acertou muito próximo da realidade nesta rodada. Nenhum macro-ajuste necessário.");
  }

  const evaluation: MLEvaluation = {
    rodada,
    mae,
    details: details.sort((a,b) => Math.abs(b.error) - Math.abs(a.error)),
    adjustments
  };

  localStorage.setItem(`${STORAGE_KEYS.EVALUATIONS}${rodada}`, JSON.stringify(evaluation));
  
  return evaluation;
};
