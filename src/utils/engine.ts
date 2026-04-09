import { Player, Match, Club, FBrefClubStats, PlayerMatchHistory } from '../types';
import fbrefDataRaw from '../data/fbref_data.json';

const fbrefData = fbrefDataRaw as Record<string, FBrefClubStats>;

export interface ProjectedPlayer extends Player {
  projectedPoints: number;
  matchMultiplier: number;
}

// Simple logic to evaluate match advantage using FBref stats
const getMatchMultiplier = (
  p: Player,
  matches: Match[],
  clubes: Record<string, Club>
) => {
  const clubId = p.clube_id;
  const match = matches.find((m) => m.clube_casa_id === clubId || m.clube_visitante_id === clubId);
  if (!match) return 1.0;

  const isHome = match.clube_casa_id === clubId;
  const opponentId = isHome ? match.clube_visitante_id : match.clube_casa_id;
  
  let multiplier = isHome ? 1.05 : 0.95;

  const club = clubes[String(clubId)];
  const opponentClub = clubes[String(opponentId)];
  
  if (!club || !opponentClub) return multiplier;

  const myStats = fbrefData[club.abreviacao];
  const opponentStats = fbrefData[opponentClub.abreviacao];

  if (isHome && [1, 2, 3].includes(p.posicao_id)) {
    multiplier += 0.05; // Home defenders have higher chance of SG
  }

  if (isHome && [4, 5].includes(p.posicao_id)) {
    multiplier += 0.05; // Attackers get a boost for home games too
  }

  if (myStats && opponentStats) {
    // 1. Goalkeepers (1): Opponent Shots on Target (SoT)
    if (p.posicao_id === 1) {
      const avgShots = 4.5;
      const opponentShots = opponentStats.ataque?.finalizacoes_alvo || avgShots;
      // High opponent shots = more saves = higher multiplier
      multiplier += (opponentShots - avgShots) * 0.02; 
    }

    // 2. Defenders/Fullbacks (2, 3): Opponent Possession Losses & Fouls Committed
    if (p.posicao_id === 2 || p.posicao_id === 3) {
      const avgInt = 40;
      const myInt = myStats.defesa?.interceptacoes || avgInt;
      // If my team intercepts a lot, boost defender slightly
      multiplier += (myInt - avgInt) * 0.002;
    }

    // 3. Midfielders (4): Opponent Fouls Committed
    if (p.posicao_id === 4) {
      const avgFouls = 70;
      const opponentFouls = opponentStats.indisciplina?.faltas_cometidas || avgFouls;
      // Opponent commits many fouls -> midfielders suffer fouls -> more points
      multiplier += (opponentFouls - avgFouls) * 0.002;
    }

    // 4. Forwards (5): My Shots on Target VS Opponent Blocks/Interceptions
    if (p.posicao_id === 5) {
      const avgMyShots = 4.5;
      const myShots = myStats.ataque?.finalizacoes_alvo || avgMyShots;
      multiplier += (myShots - avgMyShots) * 0.02;

      const avgOppInt = 40;
      const oppInt = opponentStats.defesa?.interceptacoes || avgOppInt;
      // If opponent intercepts a lot, it's harder for our attackers
      multiplier -= (oppInt - avgOppInt) * 0.002;
    }
  }

  return multiplier;
};

export const calculateProjections = (
  players: Player[],
  matches: Match[],
  clubes: Record<string, Club>,
  history: Record<number, PlayerMatchHistory[]>
): ProjectedPlayer[] => {
  return players
    .filter((p) => p.status_id === 7) // Only probable
    .map((p) => {
      let basePoints = p.media_num !== 0 ? p.media_num : 2.0;
      
      // -- NEW: FORM MULTIPLIER (Histórico) --
      let formMultiplier = 1.0;
      const playerHist = history ? history[p.atleta_id] : null;
      
      if (playerHist && playerHist.length > 0) {
        const recent = playerHist.slice(0, 3);
        const sumPoints = recent.reduce((acc, h) => acc + h.pontos, 0);
        const avgRecent = sumPoints / recent.length;
        
        // Se a média recente for muito maior que a média do campeonato, ele ganha boost
        if (avgRecent > basePoints + 2) {
           formMultiplier += 0.15; // Está voando
        } else if (avgRecent < basePoints - 2) {
           formMultiplier -= 0.10; // Está em má fase
        }
        
        // Peso para pontuações negativas ou zeradas recentes
        if (sumPoints < 2) {
           formMultiplier -= 0.10;
        }

        // Misturamos a basePoints com a fase recente
        basePoints = (basePoints * 0.4) + (avgRecent * 0.6);
      }

      // -- NEW: FINANCIAL BONUS --
      // Bônus sutil se o mínimo para valorizar for muito amigável (garante que no mínimo ele vai te dar cartoletas)
      let financeBoost = 0;
      if (p.minimo_para_valorizar !== undefined && p.minimo_para_valorizar !== null) {
        if (p.minimo_para_valorizar <= 0) {
           financeBoost = 0.5; // Fácil valorizar
        } else if (p.minimo_para_valorizar > 8) {
           financeBoost = -0.5; // Difícil valorizar, risco maior
        }
      }

      const matchMultiplier = getMatchMultiplier(p, matches, clubes);
      let projected = (basePoints * matchMultiplier * formMultiplier) + financeBoost;

      return {
        ...p,
        projectedPoints: Math.max(0, projected),
        matchMultiplier: parseFloat((matchMultiplier * formMultiplier).toFixed(2)),
      };
    })
    .sort((a, b) => b.projectedPoints - a.projectedPoints);
};

export const FORMATIONS: Record<string, { 1: number; 2: number; 3: number; 4: number; 5: number; 6: number }> = {
  '4-3-3': { 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 1 },
  '4-4-2': { 1: 1, 2: 2, 3: 2, 4: 4, 5: 2, 6: 1 },
  '3-5-2': { 1: 1, 2: 0, 3: 3, 4: 5, 5: 2, 6: 1 },
  '3-4-3': { 1: 1, 2: 0, 3: 3, 4: 4, 5: 3, 6: 1 },
  '5-3-2': { 1: 1, 2: 2, 3: 3, 4: 3, 5: 2, 6: 1 },
};

export const FORMATION_IDS: Record<string, number> = {
  '3-4-3': 1,
  '3-5-2': 2,
  '4-3-3': 3,
  '4-4-2': 4,
  '5-3-2': 6,
};

export interface TeamSelection {
  starters: ProjectedPlayer[];
  reserves: ProjectedPlayer[];
  captain: ProjectedPlayer | null;
}

export const buildBestTeam = (
  projectedPlayers: ProjectedPlayer[],
  formation: string,
  budget: number = 9999
): TeamSelection => {
  const requirements = FORMATIONS[formation];
  if (!requirements) return { starters: [], reserves: [], captain: null };

  const starters: ProjectedPlayer[] = [];
  const reserves: ProjectedPlayer[] = [];

  const limits = { ...requirements };
  
  // To avoid duplicates
  const addedIds = new Set<number>();

  // Pick starters
  [1, 2, 3, 4, 5, 6].forEach((pos) => {
    const required = limits[pos as keyof typeof limits];
    const availablePos = projectedPlayers.filter((p) => p.posicao_id === pos);
    
    for (let i = 0; i < required; i++) {
      if (availablePos[i]) {
        starters.push(availablePos[i]);
        addedIds.add(availablePos[i].atleta_id);
      }
    }
  });

  // Optmization will occur before picking reserves.

  // Optimize for budget if needed
  let totalCost = starters.reduce((acc, p) => acc + p.preco_num, 0);
  let iterations = 0;
  
  while (totalCost > budget && iterations < 50) {
    iterations++;
    let bestSwap = null;
    let minPointsLostPerCartoleta = Infinity;

    for (let i = 0; i < starters.length; i++) {
      const s = starters[i];
      const availableForPos = projectedPlayers.filter(
        p => p.posicao_id === s.posicao_id &&
             !addedIds.has(p.atleta_id) &&
             p.preco_num < s.preco_num
      );

      for (const a of availableForPos) {
        const savings = s.preco_num - a.preco_num;
        if (savings > 0) {
          const pointsLost = s.projectedPoints - a.projectedPoints;
          const score = pointsLost / savings; // Penalize large point loss per cartoleta saved
          if (score < minPointsLostPerCartoleta) {
            minPointsLostPerCartoleta = score;
            bestSwap = { outIndex: i, inPlayer: a, savings };
          }
        }
      }
    }

    if (bestSwap) {
      const s = starters[bestSwap.outIndex];
      addedIds.delete(s.atleta_id);
      addedIds.add(bestSwap.inPlayer.atleta_id);
      starters[bestSwap.outIndex] = bestSwap.inPlayer;
      totalCost -= bestSwap.savings;
    } else {
      break; // Cannot optimize further
    }
  }

  // Get minimum starter cost per position AFTER optimization
  const minStarterCost: Record<number, number> = {};
  starters.forEach(s => {
    if (!minStarterCost[s.posicao_id] || s.preco_num < minStarterCost[s.posicao_id]) {
      minStarterCost[s.posicao_id] = s.preco_num;
    }
  });

  // Pick reserves (1 per position if possible)
  [1, 2, 3, 4, 5].forEach((pos) => {
    // If the formation doesn't use the position (e.g. LAT in 3-5-2), no reserve
    if (limits[pos as keyof typeof limits] === 0) return;

    const maxReserveCost = minStarterCost[pos] || 999;

    const availableReserves = projectedPlayers.filter(
      (p) => p.posicao_id === pos && 
             !addedIds.has(p.atleta_id) &&
             p.preco_num <= maxReserveCost
    );
    
    if (availableReserves[0]) {
      reserves.push(availableReserves[0]);
      addedIds.add(availableReserves[0].atleta_id);
    }
  });

  // Select Captain (highest projected points among starters excluding coach)
  let captain: ProjectedPlayer | null = null;
  starters.forEach((p) => {
    if (p.posicao_id !== 6) {
      if (!captain || p.projectedPoints > captain.projectedPoints) {
        captain = p;
      }
    }
  });

  return { starters, reserves, captain };
};
