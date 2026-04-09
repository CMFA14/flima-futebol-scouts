import { X } from 'lucide-react';
import { Player, Club, Position, PlayerMatchHistory, CartolaMatches } from '../types';

interface Props {
  player: Player;
  clubes: Record<string, Club>;
  posicoes: Record<string, Position>;
  matches?: CartolaMatches;
  history?: PlayerMatchHistory[];
  onClose: () => void;
}

const STATUS_LABELS: Record<number, { label: string }> = {
  7: { label: 'Provável' },
  2: { label: 'Dúvida' },
  3: { label: 'Suspenso' },
  5: { label: 'Contundido' },
  6: { label: 'Nulo' },
};

const scoutLabels: Record<string, string> = {
  G: 'Gols', A: 'Assistências', FT: 'Fin. na Trave', FD: 'Fin. Defendida',
  FF: 'Fin. para Fora', FS: 'Faltas Sofridas', PS: 'Pên. Sofrido',
  DP: 'Def. Pênalti', SG: 'Sem Gol Sofrido', DE: 'Defesas',
  DS: 'Desarmes', PP: 'Pên. Perdido', FC: 'Faltas Cometidas',
  CR: 'Cartão Vermelho', CA: 'Cartão Amarelo', GS: 'Gols Sofridos',
  GC: 'Gol Contra', PC: 'Pên. Cometido', I: 'Impedimentos', V: 'Vitórias',
};

export default function PlayerModal({ player, clubes, posicoes, matches, history, onClose }: Props) {
  const club = clubes[String(player.clube_id)];
  const pos = posicoes[String(player.posicao_id)];
  const statusInfo = STATUS_LABELS[player.status_id];

  let matchInfo = null;
  if (matches && matches.partidas) {
    const match = matches.partidas.find(p => p.clube_casa_id === player.clube_id || p.clube_visitante_id === player.clube_id);
    if (match) {
      const isHome = match.clube_casa_id === player.clube_id;
      const opponentId = isHome ? match.clube_visitante_id : match.clube_casa_id;
      const opponentClub = clubes[String(opponentId)];
      if (opponentClub) {
        matchInfo = {
          opponent: opponentClub,
          isHome
        };
      }
    }
  }

  const scoutEntries = Object.entries(player.scout || {}).filter(([, v]) => v && (v as number) > 0);
  const chartHistory = history ? [...history].reverse() : [];
  const maxAbsPoints = chartHistory.length > 0 ? Math.max(...chartHistory.map(h => Math.abs(h.pontos)), 10) : 10;
  
  // Theme map
  const colorMap = 'bg-orange-600';
  const borderColorMap = 'border-orange-500';
  const textColorMap = 'text-orange-400';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pt-10 pb-10"
      onClick={onClose}
    >
      <div
        className={`bg-gray-900 border ${borderColorMap} border-opacity-50 rounded-2xl shadow-2xl w-full max-w-3xl overflow-y-auto max-h-[92vh] animate-in fade-in zoom-in duration-200 scrollbar-hide`}
        onClick={e => e.stopPropagation()}
      >
        {/* Card header */}
        <div className={`${colorMap} p-5 relative`}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={player.foto ? player.foto.replace('FORMATO', '140x140') : 'https://s2-cartola.glbimg.com/aA-HwH-zL-_0R1894u1k3wD8FDU=/140x140/smart/filters:strip_icc()/https://s2.glbimg.com/OqD0yBlyf-rR_TfM-tW7Q5Y3JtU=/https://s3.amazonaws.com/escudos.cartolafc.globo.com/default-player.png'}
                alt={player.apelido}
                className="w-20 h-20 rounded-full object-cover border-4 border-white/30"
              />
              {club?.escudos?.['60x60'] && (
                <img src={club.escudos['60x60']} alt={club.nome} className="w-7 h-7 absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow-sm" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{player.apelido}</h2>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className="text-white/80 text-sm font-semibold">{pos?.nome || `Posição ${player.posicao_id}`}</span>
                {club && <span className="text-white/60 text-sm">· {club.nome}</span>}
                {statusInfo && <span className="text-white/90 text-sm font-bold bg-black/20 px-1.5 rounded-sm">· {statusInfo.label}</span>}
              </div>
              {matchInfo && (
                <div className="mt-2 inline-flex items-center gap-2 bg-black/30 rounded-full pl-1 pr-3 py-1 shadow-inner border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-gray-400 pl-2">Próximo Jogo:</span>
                  <img src={matchInfo.opponent.escudos?.['60x60'] || ''} className="w-5 h-5 bg-white rounded-full p-0.5" alt={matchInfo.opponent.nome} />
                  <span className="text-sm font-bold text-white tracking-tight">
                    vs {matchInfo.opponent.nome} <span className="text-xs font-medium text-gray-400">({matchInfo.isHome ? 'CASA' : 'FORA'})</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-5 space-y-5">
          {/* Main stat highlight */}
          <div className={`flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3 border ${borderColorMap} border-opacity-40`}>
            <div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Última Pontuação</div>
              <div className={`text-3xl font-black ${player.pontos_num < 0 ? 'text-red-400' : textColorMap}`}>{player.pontos_num.toFixed(1)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-0.5">Média / Jogo</div>
              <div className="text-lg font-bold text-gray-200">{player.media_num.toFixed(2)}</div>
            </div>
          </div>

          {/* General stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Jogos', value: player.jogos_num, highlight: false },
              { label: 'Mínimo para Valorizar', value: player.minimo_para_valorizar !== undefined && player.minimo_para_valorizar !== null ? `${player.minimo_para_valorizar > 0 ? '+' : ''}${player.minimo_para_valorizar.toFixed(2)} pts` : '-', highlight: true },
              { label: 'Variação', value: `C$ ${player.variacao_num > 0 ? '+' : ''}${player.variacao_num.toFixed(2)}`, highlight: true },
              { label: 'Preço', value: `C$ ${player.preco_num.toFixed(2)}`, highlight: false },
            ].map(s => (
              <div key={s.label} className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
                <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                <div className={`text-sm font-bold ${s.highlight ? (String(s.value).includes('-') ? 'text-red-400' : (s.value === '-' ? 'text-gray-400' : 'text-green-400')) : 'text-white'}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Player Match History */}
          {history && history.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Desempenho Recente</h4>
              
              {/* Bar Chart */}
              <div className="flex items-end justify-between bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 h-32 relative">
                {/* Zero line */}
                <div className="absolute left-0 right-0 border-b border-gray-700 top-1/2 -mt-px z-0"></div>
                
                {chartHistory.map((h, i) => {
                  const isNegative = h.pontos < 0;
                  // Percentage relative to the max height (which is half the container, around 40px)
                  const heightPercent = Math.min((Math.abs(h.pontos) / maxAbsPoints) * 100, 100);
                  const barColor = isNegative ? 'bg-red-500' : (h.pontos > 5 ? 'bg-green-500' : 'bg-gray-400');
                  
                  return (
                    <div key={i} className="flex flex-col items-center justify-center relative flex-1 z-10 w-full group">
                      {/* Label above/below */}
                      <span className={`text-[10px] font-bold absolute ${isNegative ? 'top-[-20px]' : 'bottom-[-20px]'} ${isNegative ? 'text-red-400' : 'text-gray-300'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        {h.pontos.toFixed(1)}
                      </span>
                      
                      {/* Bar positioning */}
                      <div className="h-[40px] w-full flex justify-center items-end border-b-2 border-transparent">
                        {!isNegative && (
                          <div className={`w-3 sm:w-5 rounded-t-sm ${barColor} shadow-[0_0_8px_rgba(34,197,94,0.3)] transition-all duration-500`} style={{ height: `${heightPercent}%`, minHeight: '3px' }}></div>
                        )}
                      </div>
                      <div className="h-[40px] w-full flex justify-center items-start border-t-2 border-gray-700/50">
                        {isNegative && (
                          <div className={`w-3 sm:w-5 rounded-b-sm ${barColor} shadow-[0_0_8px_rgba(239,68,68,0.3)] transition-all duration-500`} style={{ height: `${heightPercent}%`, minHeight: '3px' }}></div>
                        )}
                      </div>
                      
                      {/* X-axis Label */}
                      <span className="text-[9px] text-gray-500 mt-1 uppercase font-bold">R{h.rodada}</span>
                    </div>
                  );
                })}
              </div>

              {/* Historic Details List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                {history.map((h, i) => {
                  const s = h.scout || {};
                  const matchScouts = Object.entries(s).filter(([, v]) => v && (v as number) > 0);
                  const isGood = h.pontos > 5;
                  const histOpponent = h.opponent_id ? clubes[String(h.opponent_id)] : null;
                  
                  return (
                    <div key={i} className="flex flex-col bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 bg-gray-900 rounded-md text-gray-300">R.{h.rodada}</span>
                          
                          {histOpponent && (
                            <div className="flex items-center gap-1.5 opacity-80">
                              <span className="text-[10px] text-gray-500 uppercase font-semibold text-center w-4 mt-px">vs</span>
                              <img src={histOpponent.escudos?.['60x60']} alt={histOpponent.nome} className="w-4 h-4 bg-white/10 rounded-full" />
                              <span className="text-[10px] text-gray-400 max-w-20 truncate">{histOpponent.nome}</span>
                              <span className="text-[9px] text-gray-600 font-bold ml-1">({h.isHome ? 'C' : 'F'})</span>
                            </div>
                          )}
                        </div>
                        <span className={`text-sm font-black ${h.pontos < 0 ? 'text-red-400' : isGood ? 'text-green-400' : 'text-gray-200'}`}>
                          {h.pontos > 0 ? '+' : ''}{h.pontos.toFixed(1)} pts
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {matchScouts.length > 0 ? (
                          matchScouts.map(([key, val]) => (
                            <span key={key} className="text-[10px] sm:text-xs bg-gray-900/50 text-gray-300 border border-gray-700/50 px-2 py-1 rounded w-fit font-medium">
                              <strong className={`${key.includes('G') || key.includes('A') ? 'text-green-400' : (key.includes('C') || key.includes('P') ? 'text-red-400' : 'text-white')} font-bold text-sm`}>{String(val)}</strong> {scoutLabels[key] || key}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 italic bg-gray-900/30 px-2 py-1 rounded w-full">Atuação Discreta (Sem ações computadas)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All scouts (Yearly Total) */}
          {scoutEntries.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Histórico de Scouts</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {scoutEntries.map(([key, val]) => (
                  <div key={key} className="flex flex-col items-center justify-center bg-gray-800 rounded-lg px-2 py-2 border border-gray-700 shadow-sm">
                    <span className="text-[10px] sm:text-xs text-gray-400 text-center font-medium">{scoutLabels[key] || key}</span>
                    <span className="text-md font-black text-white">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
