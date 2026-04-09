import { useState } from 'react';
import { CartolaData, CartolaMatches, Player } from '../types';
import { Users, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface Props {
  data: CartolaData;
  matches: CartolaMatches;
  onPlayerClick?: (player: Player) => void;
}

// Position IDs: 1=GK, 2=LAT, 3=ZAG, 4=MID, 5=ATK, 6=COACH
const POS_ORDER = [1, 2, 3, 4, 5, 6];

// status_id 7 = Provável, 2 = Dúvida
const INCLUDED_STATUSES = [7, 2];

interface LineupPlayer extends Player {
  isDuvida: boolean;
}

interface BuiltLineup {
  gk: LineupPlayer[];
  def: LineupPlayer[];
  mid: LineupPlayer[];
  atk: LineupPlayer[];
  coach: LineupPlayer[];
  formation: string;
  all: LineupPlayer[];
}

function buildProbableLineup(clubId: number, data: CartolaData): BuiltLineup {
  const players: LineupPlayer[] = data.atletas
    .filter(
      (p) =>
        p.clube_id === clubId &&
        INCLUDED_STATUSES.includes(p.status_id) &&
        p.jogos_num > 0
    )
    .map((p) => ({ ...p, isDuvida: p.status_id === 2 }));

  const byPos = (posId: number) =>
    players
      .filter((p) => p.posicao_id === posId)
      // Prováveis first, then Dúvida; within each group sort by media desc
      .sort((a, b) => {
        if (a.isDuvida !== b.isDuvida) return a.isDuvida ? 1 : -1;
        return b.media_num - a.media_num;
      });

  const gk = byPos(1).slice(0, 1);
  const latArr = byPos(2);
  const zagArr = byPos(3);
  const mid = byPos(4);
  const atk = byPos(5);
  const coach = byPos(6).slice(0, 1);

  // Assemble defense: 2 LAT + up to 2 ZAG
  let def: LineupPlayer[] = [];
  if (latArr.length >= 2 && zagArr.length >= 2) {
    def = [latArr[0], zagArr[0], zagArr[1], latArr[1]];
  } else if (latArr.length >= 2 && zagArr.length === 1) {
    def = [latArr[0], zagArr[0], latArr[1]];
  } else if (latArr.length >= 1 && zagArr.length >= 2) {
    def = [latArr[0], zagArr[0], zagArr[1]];
  } else {
    def = [...latArr.slice(0, 2), ...zagArr.slice(0, 3)].slice(0, 4);
  }

  const defCount = def.length;
  const midCount = Math.min(mid.length, 4);
  const atkCount = Math.min(atk.length, 3);
  const formation = `${defCount}-${midCount}-${atkCount}`;

  const all = [...gk, ...def, ...mid.slice(0, midCount), ...atk.slice(0, atkCount), ...coach];

  return { gk, def, mid: mid.slice(0, midCount), atk: atk.slice(0, atkCount), coach, formation, all };
}

// Cartola FC point values for base (non-bonus) scouts
const PT = {
  DS: 1.0,  // Desarme
  FS: 0.5,  // Falta sofrida
  DE: 1.0,  // Defesa
  FF: 0.8,  // Finalização pra fora
  FD: 1.2,  // Finalização defendida
  FT: 3.0,  // Finalização na trave
  FC: -0.3, // Falta cometida
  CA: -1.0, // Cartão amarelo
  CV: -3.0, // Cartão vermelho
  I:  -0.1, // Impedimento
};

// Returns base score PER GAME (only consistent/frequent scouts, no G/A/SG/DP)
function calcBaseScore(player: LineupPlayer): number {
  const s = player.scout || {};
  const games = player.jogos_num || 1;
  let pts = 0;

  // Negative scouts apply to everyone
  pts += (s.FC || 0) * PT.FC;
  pts += (s.CA || 0) * PT.CA;
  pts += (s.CV || 0) * PT.CV;
  pts += (s.I  || 0) * PT.I;

  const pos = player.posicao_id;
  if (pos === 1) {
    // GK: basic = defesas
    pts += (s.DE || 0) * PT.DE;
  } else if (pos === 2 || pos === 3) {
    // LAT / ZAG: basic = desarmes + faltas sofridas
    pts += (s.DS || 0) * PT.DS;
    pts += (s.FS || 0) * PT.FS;
  } else if (pos === 4) {
    // MID: basic = desarmes + faltas sofridas + finalizações
    pts += (s.DS || 0) * PT.DS;
    pts += (s.FS || 0) * PT.FS;
    pts += (s.FF || 0) * PT.FF;
    pts += (s.FD || 0) * PT.FD;
    pts += (s.FT || 0) * PT.FT;
  } else if (pos === 5) {
    // ATK: basic = finalizações + faltas sofridas
    pts += (s.FS || 0) * PT.FS;
    pts += (s.FF || 0) * PT.FF;
    pts += (s.FD || 0) * PT.FD;
    pts += (s.FT || 0) * PT.FT;
  }
  // Coach (6): no base scouts to count (V is too rare/bonus)

  return pts / games;
}

// Label of base scouts per position
const BASE_SCOUT_LABEL: Record<number, string> = {
  1: 'DE',
  2: 'DS + FS',
  3: 'DS + FS',
  4: 'DS + FS + Fin.',
  5: 'FS + Fin.',
  6: '—',
};

function PlayerDot({ player, data, onPlayerClick }: { player: LineupPlayer; data: CartolaData; onPlayerClick?: (player: Player) => void }) {
  const [hovered, setHovered] = useState(false);
  const photo = player.foto
    ? player.foto.replace('FORMATO', '140x140')
    : 'https://s2-cartola.glbimg.com/aA-HwH-zL-_0R1894u1k3wD8FDU=/140x140/smart/filters:strip_icc()/https://s2.glbimg.com/OqD0yBlyf-rR_TfM-tW7Q5Y3JtU=/https://s3.amazonaws.com/escudos.cartolafc.globo.com/default-player.png';
  const pos = data.posicoes[player.posicao_id];

  const posColor: Record<number, string> = {
    1: 'bg-yellow-500',
    2: 'bg-blue-500',
    3: 'bg-blue-700',
    4: 'bg-green-500',
    5: 'bg-red-500',
    6: 'bg-gray-600',
  };

  return (
    <div
      className="flex flex-col items-center relative cursor-pointer group"
      style={{ width: 64 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onPlayerClick?.(player)}
    >
      {/* Tooltip */}
      {hovered && (() => {
        const baseScore = calcBaseScore(player);
        const baseLabel = BASE_SCOUT_LABEL[player.posicao_id] || '—';
        return (
        <div className="absolute bottom-full mb-2 z-50 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl p-3 w-52 pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <img src={photo} alt={player.apelido} className="w-9 h-9 rounded-full object-cover bg-gray-700 flex-shrink-0" />
            <div>
              <div className="text-white font-bold text-xs leading-tight">{player.apelido}</div>
              <div className="text-gray-400 text-[10px]">{pos?.nome}</div>
              {player.isDuvida && (
                <div className="text-yellow-400 text-[10px] font-bold">⚠ Dúvida</div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div className="bg-gray-800 rounded p-1 text-center">
              <div className="text-gray-500">Média</div>
              <div className="text-orange-400 font-bold">{player.media_num.toFixed(1)}</div>
            </div>
            <div className="bg-gray-800 rounded p-1 text-center">
              <div className="text-gray-500">Jogos</div>
              <div className="text-white font-bold">{player.jogos_num}</div>
            </div>
            <div className="bg-gray-800 rounded p-1 text-center">
              <div className="text-gray-500">Preço</div>
              <div className="text-green-400 font-bold">C${player.preco_num.toFixed(1)}</div>
            </div>
            <div className="bg-gray-800 rounded p-1 text-center">
              <div className="text-gray-500">Pontos</div>
              <div className="text-white font-bold">{player.pontos_num.toFixed(1)}</div>
            </div>
          </div>
          {/* Base score row */}
          <div className="mt-2 bg-blue-900/40 border border-blue-700/40 rounded-lg p-1.5">
            <div className="text-[9px] text-blue-400 font-semibold uppercase tracking-wider mb-0.5">Média Base ({baseLabel})</div>
            <div className="text-blue-300 font-black text-sm">{baseScore.toFixed(2)} pts/jogo</div>
          </div>
        </div>
        );
      })()}

      <div className="relative">
        {/* Dúvida overlay ring */}
        {player.isDuvida && (
          <div className="absolute inset-0 rounded-full border-2 border-yellow-400 border-dashed z-10 pointer-events-none" />
        )}
        <img
          src={photo}
          alt={player.apelido}
          className={`w-10 h-10 rounded-full object-cover border-2 bg-gray-800 shadow-lg group-hover:scale-110 transition-transform ${
            player.isDuvida ? 'border-yellow-400/60 opacity-80' : 'border-gray-700'
          }`}
        />
        <span
          className={`absolute -bottom-1 -right-1 ${posColor[player.posicao_id] || 'bg-gray-600'} text-white text-[8px] font-black px-1 rounded-sm z-20`}
        >
          {pos?.abreviacao || '?'}
        </span>
        {/* Dúvida badge */}
        {player.isDuvida && (
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center z-20 shadow">
            ?
          </span>
        )}
      </div>
      <div
        className={`mt-1 text-[9px] sm:text-[10px] font-semibold rounded px-1 text-center leading-tight w-full truncate border shadow ${
          player.isDuvida
            ? 'text-yellow-300 bg-yellow-900/40 border-yellow-700/40'
            : 'text-white bg-gray-900/90 border-gray-700/60'
        }`}
      >
        {player.apelido}
      </div>
      {/* Média geral */}
      <div className={`text-[9px] font-bold mt-0.5 ${player.isDuvida ? 'text-yellow-400' : 'text-orange-400'}`}>
        {player.isDuvida ? '? ' : ''}{player.media_num.toFixed(1)}
      </div>
      {/* Base score */}
      {player.posicao_id !== 6 && (
        <div className="text-[8px] text-blue-400 font-semibold">
          B:{calcBaseScore(player).toFixed(1)}
        </div>
      )}
    </div>
  );
}

// Both teams in the same direction: ATK at top, GK at bottom (standard pitch view)
function PitchView({ lineup, data, onPlayerClick }: { lineup: BuiltLineup; data: CartolaData; onPlayerClick?: (player: Player) => void }) {
  // Standard order top→bottom: ATK, MID, DEF, GK
  const rows = [lineup.atk, lineup.mid, lineup.def, lineup.gk];
  const hasCoach = lineup.coach.length > 0;

  return (
    <div className="relative bg-gradient-to-b from-green-800 to-green-900 rounded-xl border border-gray-700 flex-1 min-h-[300px]">
      {/* Field lines */}
      <div className="absolute inset-x-3 inset-y-3 border border-white/20 rounded pointer-events-none" />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-12 border border-white/20 border-t-0 pointer-events-none" />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 h-12 border border-white/20 border-b-0 pointer-events-none" />
      <div className="absolute top-1/2 left-3 right-3 border-t border-white/20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20 pointer-events-none" />

      {/* Formation label */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white/50 text-[10px] font-bold tracking-widest z-10">
        {lineup.formation}
      </div>

      {/* Player rows */}
      <div className="absolute inset-0 flex flex-col justify-evenly py-5 px-2 z-10">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1 sm:gap-2">
            {row.map((p) => (
              <PlayerDot key={p.atleta_id} player={p} data={data} onPlayerClick={onPlayerClick} />
            ))}
            {row.length === 0 && (
              <span className="text-white/20 text-xs italic self-center">—</span>
            )}
          </div>
        ))}
      </div>

      {/* Coach */}
      {hasCoach && (
        <div className="absolute bottom-2 right-2 z-20 opacity-80">
          <div className="text-[8px] text-white/60 font-bold uppercase text-center mb-0.5">Técnico</div>
          <PlayerDot player={lineup.coach[0]} data={data} onPlayerClick={onPlayerClick} />
        </div>
      )}
    </div>
  );
}

function PlayerListView({ lineup, data, onPlayerClick }: { lineup: BuiltLineup; data: CartolaData; onPlayerClick?: (player: Player) => void }) {
  const posLabels: Record<number, string> = {
    1: 'Goleiro', 2: 'Lateral', 3: 'Zagueiro', 4: 'Meia', 5: 'Atacante', 6: 'Técnico',
  };
  const posColor: Record<number, string> = {
    1: 'bg-yellow-500/20 text-yellow-300 border-yellow-600/30',
    2: 'bg-blue-500/20 text-blue-300 border-blue-600/30',
    3: 'bg-blue-700/20 text-blue-200 border-blue-700/30',
    4: 'bg-green-500/20 text-green-300 border-green-600/30',
    5: 'bg-red-500/20 text-red-300 border-red-600/30',
    6: 'bg-gray-500/20 text-gray-300 border-gray-600/30',
  };

  return (
    <div className="space-y-1.5 mt-3">
      {POS_ORDER.map((posId) => {
        const players = lineup.all.filter((p) => p.posicao_id === posId);
        if (!players.length) return null;
        return (
          <div key={posId}>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">{posLabels[posId]}</div>
            {players.map((p) => {
              const photo = p.foto ? p.foto.replace('FORMATO', '45x45') : '';
              return (
                <div
                  key={p.atleta_id}
                  onClick={() => onPlayerClick?.(p)}
                  className={`flex items-center gap-2 py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                    p.isDuvida ? 'bg-yellow-900/20 hover:bg-yellow-900/30' : 'hover:bg-gray-700/50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img src={photo} alt={p.apelido} className="w-7 h-7 rounded-full object-cover bg-gray-700" />
                    {p.isDuvida && (
                      <span className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-gray-900 text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">?</span>
                    )}
                  </div>
                  <span className={`text-xs font-medium flex-1 truncate ${p.isDuvida ? 'text-yellow-300' : 'text-gray-200'}`}>
                    {p.apelido}
                    {p.isDuvida && <span className="ml-1 text-yellow-500 text-[10px]">(dúvida)</span>}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${posColor[p.posicao_id]}`}>
                    {data.posicoes[p.posicao_id]?.abreviacao}
                  </span>
                  {/* Full avg */}
                  <div className="flex flex-col items-end gap-0 min-w-[52px]">
                    <span className={`text-xs font-bold ${p.isDuvida ? 'text-yellow-400' : 'text-orange-400'}`}>
                      {p.media_num.toFixed(1)}
                    </span>
                    {p.posicao_id !== 6 && (
                      <span className="text-[9px] font-semibold text-blue-400">
                        B:{calcBaseScore(p).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function MatchCard({ match, data, idx, onPlayerClick }: { match: CartolaMatches['partidas'][0]; data: CartolaData; idx: number; onPlayerClick?: (player: Player) => void }) {
  const [expanded, setExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'pitch' | 'list'>('pitch');

  const homeClub = data.clubes[String(match.clube_casa_id)];
  const awayClub = data.clubes[String(match.clube_visitante_id)];
  if (!homeClub || !awayClub) return null;

  const homeLineup = buildProbableLineup(match.clube_casa_id, data);
  const awayLineup = buildProbableLineup(match.clube_visitante_id, data);

  const matchDate = new Date(match.partida_data);
  const dateStr = matchDate.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  const homeProvaveis = homeLineup.all.filter(p => !p.isDuvida).length;
  const homeDuvida = homeLineup.all.filter(p => p.isDuvida).length;
  const awayProvaveis = awayLineup.all.filter(p => !p.isDuvida).length;
  const awayDuvida = awayLineup.all.filter(p => p.isDuvida).length;
  const totalCount = homeLineup.all.length + awayLineup.all.length;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/70 hover:bg-gray-800 transition-colors border-b border-gray-700"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="text-gray-500 text-xs font-mono w-4">{idx + 1}</span>

        {/* Home */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-white font-bold text-sm">{homeClub.abreviacao}</span>
          <img src={homeClub.escudos?.['45x45']} alt={homeClub.nome} className="w-7 h-7 object-contain" />
        </div>

        <span className="text-gray-600 text-xs font-semibold mx-1">×</span>

        {/* Away */}
        <div className="flex items-center gap-2 flex-1 justify-start">
          <img src={awayClub.escudos?.['45x45']} alt={awayClub.nome} className="w-7 h-7 object-contain" />
          <span className="text-white font-bold text-sm">{awayClub.abreviacao}</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-gray-500 text-xs hidden sm:inline">{dateStr}</span>
          {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* View mode toggle + info */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex bg-gray-800 rounded-lg border border-gray-700 p-0.5">
              <button
                onClick={() => setViewMode('pitch')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === 'pitch' ? 'bg-green-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                ⚽ Campo
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-blue-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                📋 Lista
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Info size={12} />
                {totalCount} jogadores
              </span>
              <span className="flex items-center gap-1 text-green-400 font-semibold">
                ● {homeProvaveis + awayProvaveis} prováveis
              </span>
              {(homeDuvida + awayDuvida) > 0 && (
                <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                  ? {homeDuvida + awayDuvida} dúvida
                </span>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-gray-500 px-1">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Provável
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border-2 border-dashed border-yellow-400 inline-block" />
              <span className="text-yellow-400">? Dúvida</span>
            </span>
          </div>

          {viewMode === 'pitch' ? (
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Home */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <img src={homeClub.escudos?.['30x30']} alt={homeClub.nome} className="w-5 h-5 object-contain" />
                  <span className="text-white font-bold text-sm">{homeClub.nome}</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    <span className="text-green-400">{homeProvaveis}</span>
                    {homeDuvida > 0 && <span className="text-yellow-400"> +{homeDuvida}?</span>}
                  </span>
                </div>
                {homeLineup.all.length > 0 ? (
                  <PitchView lineup={homeLineup} data={data} onPlayerClick={onPlayerClick} />
                ) : (
                  <div className="flex-1 min-h-[200px] bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 text-sm border border-gray-700">
                    Sem jogadores prováveis
                  </div>
                )}
              </div>

              {/* Away */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <img src={awayClub.escudos?.['30x30']} alt={awayClub.nome} className="w-5 h-5 object-contain" />
                  <span className="text-white font-bold text-sm">{awayClub.nome}</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    <span className="text-green-400">{awayProvaveis}</span>
                    {awayDuvida > 0 && <span className="text-yellow-400"> +{awayDuvida}?</span>}
                  </span>
                </div>
                {awayLineup.all.length > 0 ? (
                  <PitchView lineup={awayLineup} data={data} onPlayerClick={onPlayerClick} />
                ) : (
                  <div className="flex-1 min-h-[200px] bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 text-sm border border-gray-700">
                    Sem jogadores prováveis
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Home list */}
              <div className="flex-1 bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <img src={homeClub.escudos?.['30x30']} alt={homeClub.nome} className="w-5 h-5 object-contain" />
                  <span className="text-white font-bold text-sm">{homeClub.nome}</span>
                  <span className="ml-auto text-xs text-green-400 font-semibold">{homeLineup.formation}</span>
                </div>
                {homeLineup.all.length > 0 ? (
                  <PlayerListView lineup={homeLineup} data={data} onPlayerClick={onPlayerClick} />
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">Sem dados</p>
                )}
              </div>

              {/* Away list */}
              <div className="flex-1 bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <img src={awayClub.escudos?.['30x30']} alt={awayClub.nome} className="w-5 h-5 object-contain" />
                  <span className="text-white font-bold text-sm">{awayClub.nome}</span>
                  <span className="ml-auto text-xs text-green-400 font-semibold">{awayLineup.formation}</span>
                </div>
                {awayLineup.all.length > 0 ? (
                  <PlayerListView lineup={awayLineup} data={data} onPlayerClick={onPlayerClick} />
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">Sem dados</p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-xs text-gray-600 text-center pt-2 border-t border-gray-800">
            {match.local && <span>📍 {match.local} · </span>}
            <span>{dateStr}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamLineups({ data, matches, onPlayerClick }: Props) {
  const validMatches = matches.partidas.filter((m) => m.valida);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users size={24} className="text-teal-400" />
          Escalações Prováveis
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Rodada {matches.rodada} — jogadores{' '}
          <span className="text-green-400 font-semibold">Prováveis</span> e{' '}
          <span className="text-yellow-400 font-semibold">em Dúvida</span>.
          Passe o mouse para ver detalhes de cada jogador.
        </p>
      </div>

      {validMatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={48} className="text-gray-600 mb-4" />
          <p className="text-gray-400 font-medium">Nenhuma partida válida para esta rodada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {validMatches.map((match, idx) => (
            <MatchCard key={idx} match={match} data={data} idx={idx} onPlayerClick={onPlayerClick} />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600 mt-6 text-center">
        * Escalações são estimativas baseadas no status dos atletas no Cartola FC.
        Jogadores marcados com <span className="text-yellow-400 font-bold">?</span> estão em dúvida.
      </p>
    </div>
  );
}
