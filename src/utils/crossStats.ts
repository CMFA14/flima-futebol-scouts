import { Player, Match, Club, FBrefClubStats, PlayerMatchHistory } from '../types';
import fbrefDataRaw from '../data/fbref_data.json';

const fbrefData = fbrefDataRaw as unknown as Record<string, FBrefClubStats>;

export interface GoldenTip {
  player: Player;
  club: Club;
  opponent: Club;
  type: 'LADRAO_BOLA' | 'PAREDAO' | 'AVENIDA' | 'CACA_FALTAS' | 'HOT_SHOOTER' | 'PITBULL';
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
      if (oppFbref.posse.desarmes_sofridos > 95) {
        tips.push({
          player: p,
          club,
          opponent: opponentClub,
          type: 'LADRAO_BOLA',
          description: `Média de ${dsMedia.toFixed(1)} desarmes/jogo enfrentando o ${opponentClub.nome} que cede a bola com muita frequência (${oppFbref.posse.desarmes_sofridos} roubadas totais na liga).`,
          score: dsMedia * oppFbref.posse.desarmes_sofridos
        });
      }
    }

    // 2. Goleiros com boas defesas contra times que chutam demais (Chuva de Defesas)
    if (p.posicao_id === 1) {
      const defesasMedia = (p.scout?.DE || 0) / games;
      // Exigir pelo menos 2 defesas por jogo ou um time cruzando mais de 45 bolas no alvo
      if (defesasMedia >= 2.0 && oppFbref.ataque.finalizacoes_alvo > 42) {
        tips.push({
          player: p,
          club,
          opponent: opponentClub,
          type: 'PAREDAO',
          description: `Goleiro exigido (${defesasMedia.toFixed(1)} Defesas/jogo) pega o ${opponentClub.nome}, um dos times que mais finaliza no alvo (${oppFbref.ataque.finalizacoes_alvo} vezes). Excelente para bônus de DD.`,
          score: defesasMedia * oppFbref.ataque.finalizacoes_alvo
        });
      }
    }

    // 3. Atacantes matadores contra piores defesas
    if (p.posicao_id === 5) {
      const gAMedia = ((p.scout?.G || 0) + (p.scout?.A || 0)) / games;
      if (gAMedia >= 0.25 && oppFbref.defesa.gols_sofridos > 14) {
        tips.push({
          player: p,
          club,
          opponent: opponentClub,
          type: 'AVENIDA',
          description: `Atacante perigoso no Cartola (G/A de ${gAMedia.toFixed(2)}) contra o ${opponentClub.nome} com defesa super vazada (${oppFbref.defesa.gols_sofridos} gols sofridos).`,
          score: (gAMedia + 1) * oppFbref.defesa.gols_sofridos * 10 
        });
      }
    }

    // 4. Meias que sofrem muitas faltas e adversários que batem muito
    if (p.posicao_id === 4 || p.posicao_id === 5) { // Meia ou Atacante caça-falta
      const fsMedia = (p.scout?.FS || 0) / games;
      if (fsMedia >= 1.5 && (oppFbref.indisciplina?.faltas_cometidas || 0) > 135) {
        tips.push({
          player: p,
          club,
          opponent: opponentClub,
          type: 'CACA_FALTAS',
          description: `Extremamente caçado (${fsMedia.toFixed(1)} FS/jogo), enfrenta o ${opponentClub.nome} que é dos mais ríspidos (${oppFbref.indisciplina?.faltas_cometidas} faltas cometidas). Multiplicador de pontos passivos!`,
          score: fsMedia * (oppFbref.indisciplina?.faltas_cometidas || 100)
        });
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

        if (matchesWithHighShots >= 2 && oppFbref.defesa.gols_sofridos > 12) {
          tips.push({
            player: p,
            club,
            opponent: opponentClub,
            type: 'HOT_SHOOTER',
            description: `Sequência "Em Chamas" 🔥! Chutou ${totalShots} vezes nas últimas partidas. Pega agora a defesa fraca do ${opponentClub.nome}.`,
            score: (totalShots * 15) + (oppFbref.defesa.gols_sofridos)
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

        if (matchesWithHighDs >= 2 && oppFbref.posse.desarmes_sofridos > 90) {
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
