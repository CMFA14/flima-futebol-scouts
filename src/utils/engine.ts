import { Player, Match, Club, FBrefClubStats, PlayerMatchHistory } from '../types';
import fbrefDataRaw from '../data/fbref_data.json';

const fbrefData = fbrefDataRaw as Record<string, FBrefClubStats>;

export interface ProjectedPlayer extends Player {
  projectedPoints: number;
  matchMultiplier: number;
}

// Evaluate match advantage using all available FBref data dimensions
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

  const club = clubes[String(clubId)];
  const opponentClub = clubes[String(opponentId)];
  if (!club || !opponentClub) return isHome ? 1.05 : 0.95;

  const myStats = fbrefData[club.abreviacao];
  const opponentStats = fbrefData[opponentClub.abreviacao];

  // --- Home/Away advantage using actual home/away splits ---
  let multiplier = 1.0;
  if (myStats?.home_away) {
    const ha = myStats.home_away;
    const hpa = ha.home_points_avg || 0;
    const apa = ha.away_points_avg || 0;
    const hg = ha.home_games || 0;
    const ag = ha.away_games || 0;
    if (isHome && hpa > 0) {
      const overallAvg = (hpa + apa) > 0 && (hg + ag) > 0
        ? (hpa * hg + apa * ag) / (hg + ag)
        : 1.5;
      multiplier = 1 + (hpa - overallAvg) * 0.04;
    } else if (!isHome && apa > 0) {
      const overallAvg = (hpa + apa) > 0 && (hg + ag) > 0
        ? (hpa * hg + apa * ag) / (hg + ag)
        : 1.5;
      multiplier = 1 + (apa - overallAvg) * 0.04;
    } else {
      multiplier = isHome ? 1.05 : 0.95;
    }
  } else {
    multiplier = isHome ? 1.05 : 0.95;
  }

  // --- Team form bonus (last 5 results) ---
  if (myStats?.overall?.last_5) {
    const last5 = myStats.overall.last_5 as string;
    const wins = (last5.match(/W/g) || []).length;
    const losses = (last5.match(/L/g) || []).length;
    multiplier += (wins - losses) * 0.015; // +/- up to 7.5%
  }

  // --- Clean sheet potential for home defenders ---
  if (isHome && [1, 2, 3].includes(p.posicao_id)) {
    const csPct = myStats?.keepers?.for?.gk_clean_sheets_pct || 0;
    multiplier += Math.min(csPct / 100 * 0.08, 0.08); // Up to 8% boost based on CS%
  }

  if (!myStats || !opponentStats) return multiplier;

  const games = myStats.overall?.games || 10;
  const oppGames = opponentStats.overall?.games || 10;

  // 1. Goalkeepers (GOL)
  if (p.posicao_id === 1) {
    const oppSoT = opponentStats.shooting?.for?.shots_on_target || 40;
    const oppSoTPer90 = oppSoT / oppGames;
    const avgSoTPer90 = 4.2;
    // More opponent shots = more saves opportunities
    multiplier += (oppSoTPer90 - avgSoTPer90) * 0.02;
    // Bonus if opponent has low conversion rate
    const oppConversion = opponentStats.shooting?.for?.goals_per_shot_on_target || 0.3;
    if (oppConversion < 0.28) multiplier += 0.03; // Opponent wastes chances
    // Clean sheet probability from our keeper stats
    const csPct = myStats.keepers?.for?.gk_clean_sheets_pct || 0;
    multiplier += csPct / 100 * 0.05;
  }

  // 2. Defenders/Fullbacks (LAT/ZAG)
  if (p.posicao_id === 2 || p.posicao_id === 3) {
    const myInt = (myStats.misc?.for?.interceptions || 60) / games;
    const myTackles = (myStats.misc?.for?.tackles_won || 80) / games;
    const avgInt = 6.5;
    const avgTackles = 9;
    multiplier += (myInt - avgInt) * 0.008;
    multiplier += (myTackles - avgTackles) * 0.005;

    // Opponent attack weakness = SG opportunity
    const oppGoalsPer90 = opponentStats.standard?.for?.goals_per90 || 1.2;
    if (oppGoalsPer90 < 1.0) multiplier += 0.06;
    else if (oppGoalsPer90 < 0.8) multiplier += 0.10;

    // Fullbacks: crosses bonus
    if (p.posicao_id === 2) {
      const myCrosses = (myStats.misc?.for?.crosses || 100) / games;
      if (myCrosses > 12) multiplier += 0.04;
    }
  }

  // 3. Midfielders (MEI)
  if (p.posicao_id === 4) {
    // Opponent fouls = FS opportunities
    const oppFouls = (opponentStats.misc?.for?.fouls || 130) / oppGames;
    const avgFouls = 14;
    multiplier += (oppFouls - avgFouls) * 0.005;

    // Team possession advantage = more time on ball = more scouts
    const myPossession = myStats.possession?.for?.possession || myStats.standard?.for?.possession || 50;
    multiplier += (myPossession - 50) * 0.003;

    // Opponent vulnerability (how many tackles they concede)
    const oppTacklesConceded = (opponentStats.misc?.against?.tackles_won || 80) / oppGames;
    if (oppTacklesConceded > 10) multiplier += 0.04;
  }

  // 4. Forwards (ATA)
  if (p.posicao_id === 5) {
    // My team's shots on target per 90
    const mySoT = (myStats.shooting?.for?.shots_on_target || 40) / games;
    const avgSoT = 4.2;
    multiplier += (mySoT - avgSoT) * 0.015;

    // Opponent defensive weakness
    const oppIntPer90 = (opponentStats.misc?.for?.interceptions || 60) / oppGames;
    const avgOppInt = 6.5;
    multiplier -= (oppIntPer90 - avgOppInt) * 0.006;

    // Opponent keeper weakness
    const oppGkSavePct = opponentStats.keepers?.for?.gk_save_pct || 70;
    if (oppGkSavePct < 65) multiplier += 0.06;
    else if (oppGkSavePct < 70) multiplier += 0.03;

    // Opponent concedes many goals
    const oppGA = opponentStats.keepers?.for?.gk_goals_against_per90 || 1.2;
    if (oppGA > 1.5) multiplier += 0.08;
    else if (oppGA > 1.3) multiplier += 0.04;

    // Opponent shooting.against = how many shots opponents put on them (their defense is porous)
    const oppShotsAgainst = (opponentStats.shooting?.against?.shots_on_target || 40) / oppGames;
    if (oppShotsAgainst > 4.5) multiplier += 0.03;
  }

  // Clamp multiplier to reasonable bounds
  return Math.max(0.80, Math.min(1.30, multiplier));
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
        const recent = playerHist.slice(0, 5); // Use last 5 games for better sample
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

        // Consistência: jogadores com baixa variância são mais confiáveis
        if (recent.length >= 3) {
          const variance = recent.reduce((acc, h) => acc + Math.pow(h.pontos - avgRecent, 2), 0) / recent.length;
          const stdDev = Math.sqrt(variance);
          // Alta variância (> 5pts) = imprevisível, leve penalidade
          if (stdDev > 5) formMultiplier -= 0.05;
          // Baixa variância (< 2pts) = consistente, leve bônus
          else if (stdDev < 2 && avgRecent > 3) formMultiplier += 0.05;
        }

        // Tendência ascendente/descendente (últimos 3 vs anteriores)
        if (recent.length >= 4) {
          const last2Avg = (recent[0].pontos + recent[1].pontos) / 2;
          const prev2Avg = (recent[2].pontos + recent[3].pontos) / 2;
          if (last2Avg > prev2Avg + 2) formMultiplier += 0.05; // Tendência de subida
          else if (last2Avg < prev2Avg - 2) formMultiplier -= 0.05; // Tendência de queda
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
