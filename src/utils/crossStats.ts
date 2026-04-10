import { Player, Match, Club, FBrefClubStats, PlayerMatchHistory } from '../types';
import fbrefDataRaw from '../data/fbref_data.json';

const fbrefData = fbrefDataRaw as unknown as Record<string, FBrefClubStats>;

export interface GoldenTip {
  player: Player;
  club: Club;
  opponent: Club;
  type: 'LADRAO_BOLA' | 'PAREDAO' | 'AVENIDA' | 'CACA_FALTAS' | 'HOT_SHOOTER' | 'PITBULL' | 'SG_HUNTER' | 'GARCOM' | 'CARRASCO_PENALTI' | 'CROSS_KING';
  description: string;
  score: number; // Used for sorting relevance
}

export const generateGoldenTips = (
  players: Player[],
  matches: Match[],
  clubes: Record<string, Club>,
  history: Record<number, PlayerMatchHistory[]>
): GoldenTip[] => {
  const tips: GoldenTip[] = [];

  // Considerar apenas jogadores prováveis (status = 7)
  const probablePlayers = players.filter((p) => p.status_id === 7);

  probablePlayers.forEach((p) => {
    const club = clubes[String(p.clube_id)];
    if (!club) return;
    
    // Identifica se o jogador joga na rodada e quem é o adversário
    const match = matches.find(
      (m) => m.clube_casa_id === p.clube_id || m.clube_visitante_id === p.clube_id
    );
    if (!match || !match.valida) return;

    const opponentId = match.clube_casa_id === p.clube_id ? match.clube_visitante_id : match.clube_casa_id;
    const opponentClub = clubes[String(opponentId)];
    if (!opponentClub) return;

    const oppFbref = fbrefData[opponentClub.abreviacao];
    if (!oppFbref) return;

    // Cálculo da quantidade de jogos (evita divisão por zero)
    const games = p.jogos_num > 0 ? p.jogos_num : 1;

    // 1. Zagueiros/Laterais/Meias com muitos desarmes contra times que perdem muita posse/sofrem desarmes
    const dsMedia = (p.scout?.DS || 0) / games;
    if ((p.posicao_id === 2 || p.posicao_id === 3 || p.posicao_id === 4) && dsMedia >= 1.5) {
      const oppDispossessed = oppFbref.misc?.against?.tackles_won || 0;
      if (oppDispossessed > 95) {
        tips.push({
          player: p,
          club,
          opponent: opponentClub,
          type: 'LADRAO_BOLA',
          description: `Média de ${dsMedia.toFixed(1)} desarmes/jogo enfrentando o ${opponentClub.nome} que cede a bola com muita frequência (${oppDispossessed} roubadas totais na liga).`,
          score: dsMedia * oppDispossessed
        });
      }
    }

    // 2. Goleiros com boas defesas contra times que chutam demais (Chuva de Defesas)
    if (p.posicao_id === 1) {
      const defesasMedia = (p.scout?.DE || 0) / games;
      const oppShotsOnTarget = oppFbref.shooting?.for?.shots_on_target || 0;
      if (defesasMedia >= 2.0 && oppShotsOnTarget > 42) {
        tips.push({
          player: p,
          club,
          opponent: opponentClub,
          type: 'PAREDAO',
          description: `Goleiro exigido (${defesasMedia.toFixed(1)} Defesas/jogo) pega o ${opponentClub.nome}, um dos times que mais finaliza no alvo (${oppShotsOnTarget} vezes). Excelente para bônus de DD.`,
          score: defesasMedia * oppShotsOnTarget
        });
      }
    }

    // 3. Atacantes matadores contra piores defesas
    if (p.posicao_id === 5) {
      const gAMedia = ((p.scout?.G || 0) + (p.scout?.A || 0)) / games;
      const oppGoalsAgainst = oppFbref.standard?.for?.goals_against || 0;
      if (gAMedia >= 0.25 && oppGoalsAgainst > 14) {
        tips.push({
          player: p,
          club,
          opponent: opponentClub,
          type: 'AVENIDA',
          description: `Atacante perigoso no Cartola (G/A de ${gAMedia.toFixed(2)}) contra o ${opponentClub.nome} com defesa super vazada (${oppGoalsAgainst} gols sofridos).`,
          score: (gAMedia + 1) * oppGoalsAgainst * 10 
        });
      }
    }

    // 4. Meias que sofrem muitas faltas e adversários que batem muito
    if (p.posicao_id === 4 || p.posicao_id === 5) { // Meia ou Atacante caça-falta
      const fsMedia = (p.scout?.FS || 0) / games;
      const oppFouls = oppFbref.misc?.for?.fouls || 0;
      if (fsMedia >= 1.5 && oppFouls > 135) {
        tips.push({
          player: p,
          club,
          opponent: opponentClub,
          type: 'CACA_FALTAS',
          description: `Extremamente caçado (${fsMedia.toFixed(1)} FS/jogo), enfrenta o ${opponentClub.nome} que é dos mais ríspidos (${oppFouls} faltas cometidas). Multiplicador de pontos passivos!`,
          score: fsMedia * (oppFouls || 100)
        });
      }
    }

    // 5. SG HUNTER: Defensores/Goleiros com alto SG contra times que fazem poucos gols
    if ([1, 2, 3].includes(p.posicao_id)) {
      const sgMedia = (p.scout?.SG || 0) / games;
      const oppGoalsPer90 = oppFbref.standard?.for?.goals_per90 || 1.2;
      const oppGames = oppFbref.overall?.games || 10;
      const oppGoalsTotal = oppFbref.standard?.for?.goals || (oppGoalsPer90 * oppGames);
      if (sgMedia >= 0.2 && oppGoalsPer90 < 1.0) {
        tips.push({
          player: p,
          club,
          opponent: opponentClub,
          type: 'SG_HUNTER',
          description: `Acumula ${(p.scout?.SG || 0)} SG em ${games} jogos contra o ${opponentClub.nome} que marca apenas ${oppGoalsPer90.toFixed(1)} gols/jogo (${Math.round(oppGoalsTotal)} total). Alta chance de manter o zero!`,
          score: sgMedia * (2 - oppGoalsPer90) * 150
        });
      }
    }

    // 6. GARÇOM: Meias/Atacantes com muitas assistências contra defesas porosas
    if ([4, 5].includes(p.posicao_id)) {
      const aMedia = (p.scout?.A || 0) / games;
      const oppGAPer90 = oppFbref.keepers?.for?.gk_goals_against_per90 || 1.2;
      if (aMedia >= 0.2 && oppGAPer90 > 1.3) {
        tips.push({
          player: p,
          club,
          opponent: opponentClub,
          type: 'GARCOM',
          description: `Garçom de luxo! ${(p.scout?.A || 0)} assistências em ${games} jogos (${aMedia.toFixed(2)}/jogo). O ${opponentClub.nome} leva ${oppGAPer90.toFixed(1)} gols/jogo — muitas chances de participação!`,
          score: aMedia * oppGAPer90 * 100
        });
      }
    }

    // 7. CARRASCO_PENALTI: Jogadores que sofrem/convertem pênaltis contra times que cometem muitos
    if ([4, 5].includes(p.posicao_id)) {
      const psMedia = (p.scout?.PS || 0) / games;
      const oppPensConceded = oppFbref.misc?.for?.pens_conceded || 0;
      if ((psMedia >= 0.1 || (p.scout?.PS || 0) >= 1) && oppPensConceded >= 2) {
        tips.push({
          player: p,
          club,
          opponent: opponentClub,
          type: 'CARRASCO_PENALTI',
          description: `Já sofreu ${(p.scout?.PS || 0)} pênalti(s) na temporada! O ${opponentClub.nome} já cedeu ${oppPensConceded} pênaltis — combinação explosiva para pontos extras!`,
          score: (psMedia + 0.5) * (oppPensConceded + 1) * 50
        });
      }
    }

    // 8. CROSS KING: Laterais de times que cruzam muito contra defesas vulneráveis no alto
    if (p.posicao_id === 2) {
      const myClubFbref = fbrefData[club.abreviacao];
      if (myClubFbref) {
        const myGames = myClubFbref.overall?.games || 10;
        const crossesPerGame = (myClubFbref.misc?.for?.crosses || 0) / myGames;
        const oppGA = oppFbref.keepers?.for?.gk_goals_against_per90 || 1.2;
        const aMedia = (p.scout?.A || 0) / games;
        if (crossesPerGame > 13 && oppGA > 1.2 && aMedia >= 0.1) {
          tips.push({
            player: p,
            club,
            opponent: opponentClub,
            type: 'CROSS_KING',
            description: `Time cruza ${crossesPerGame.toFixed(0)} vezes/jogo e lateral já tem ${(p.scout?.A || 0)} assistência(s). Contra o ${opponentClub.nome} (${oppGA.toFixed(1)} gols sofridos/jogo), pode ser decisivo!`,
            score: crossesPerGame * (aMedia + 0.3) * oppGA * 30
          });
        }
      }
    }

    // --- REGRAS NOVAS BASEADAS EM FORM/HISTÓRICO RECENTE ---
    const playerHist = history ? history[p.atleta_id] : null;
    if (playerHist && playerHist.length >= 2) {
      // Analisar apenas os últimos 3 jogos disponiveis
      const recent = playerHist.slice(0, 3);
      
      // HOT_SHOOTER: Finalizações no alvo/fora/trave > 2 por jogo recente
      if (p.posicao_id === 4 || p.posicao_id === 5) {
        let matchesWithHighShots = 0;
        let totalShots = 0;
        recent.forEach(h => {
          const shots = (h.scout?.FF || 0) + (h.scout?.FD || 0) + (h.scout?.FT || 0) + (h.scout?.G || 0);
          totalShots += shots;
          if (shots >= 2) matchesWithHighShots++;
        });

        const oppGoalsAgainst = oppFbref.standard?.for?.goals_against || 0;
        if (matchesWithHighShots >= 2 && oppGoalsAgainst > 12) {
          tips.push({
            player: p,
            club,
            opponent: opponentClub,
            type: 'HOT_SHOOTER',
            description: `Sequência "Em Chamas" 🔥! Chutou ${totalShots} vezes nas últimas partidas. Pega agora a defesa fraca do ${opponentClub.nome}.`,
            score: (totalShots * 15) + (oppGoalsAgainst)
          });
        }
      }

      // PITBULL: Desarmes muito constantes nos ultimos jogos (e.g. 3+ por jogo)
      if (p.posicao_id === 2 || p.posicao_id === 3 || p.posicao_id === 4) {
        let totalDs = 0;
        let matchesWithHighDs = 0;
        recent.forEach(h => {
          const ds = h.scout?.DS || 0;
          totalDs += ds;
          if (ds >= 3) matchesWithHighDs++;
        });

        const oppDispossessed = oppFbref.misc?.against?.tackles_won || 0;
        if (matchesWithHighDs >= 2 && oppDispossessed > 90) {
           tips.push({
             player: p,
             club,
             opponent: opponentClub,
             type: 'PITBULL',
             description: `Fase "Cachorro Louco" 🐕! Foram ${totalDs} desarmes rasgando nos últimos jogos. Ganhando SG ou não, a pontuação base é garantida!`,
             score: (totalDs * 20)
           });
        }
      }
    }
  });

  // Retorna os melhores pontuados primeiro
  return tips.sort((a, b) => b.score - a.score);
};
