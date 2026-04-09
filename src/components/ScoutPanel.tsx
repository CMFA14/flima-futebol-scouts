import { useState, useMemo } from 'react';
import { CartolaData, Player, FBrefClubStats } from '../types';
import { Target, Shield, Flame, Medal, Award, Activity, Users, List, LayoutGrid, ChevronDown, X } from 'lucide-react';
import fbrefDataRaw from '../data/fbref_data.json';

const fbrefData = fbrefDataRaw as Record<string, FBrefClubStats>;

interface Props {
  data: CartolaData;
  onPlayerClick?: (player: Player) => void;
}

type ScoutCategory = {
  id: string;
  name: string;
  shortName: string;
  icon: React.ElementType;
  color: string;
  calculate: (p: Player) => number;
  format: (val: number) => string;
};

type ClubCategory = {
  id: string;
  name: string;
  shortName: string;
  icon: React.ElementType;
  color: string;
  calculate: (c: FBrefClubStats) => number;
  format: (v: number) => string;
};



const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  2: { label: 'Dúvida', color: 'text-yellow-400' },
  3: { label: 'Suspenso', color: 'text-red-400' },
  5: { label: 'Contundido', color: 'text-red-500' },
  6: { label: 'Nulo', color: 'text-gray-500' },
  7: { label: 'Provável', color: 'text-green-400' },
};

// --------------- Base Score Logic ---------------
const PT = {
  DS: 1.0, FS: 0.5, DE: 1.0, FF: 0.8, FD: 1.2, FT: 3.0,
  FC: -0.3, CA: -1.0, CV: -3.0, I: -0.1,
};

function calcBaseScorePanel(player: Player): number {
  const s = player.scout || {};
  const games = player.jogos_num || 1;
  let pts = (s.FC || 0) * PT.FC + (s.CA || 0) * PT.CA + (s.CV || 0) * PT.CV + (s.I || 0) * PT.I;
  const pos = player.posicao_id;
  if (pos === 1) pts += (s.DE || 0) * PT.DE;
  else if (pos === 2 || pos === 3) pts += (s.DS || 0) * PT.DS + (s.FS || 0) * PT.FS;
  else if (pos === 4) pts += (s.DS || 0) * PT.DS + (s.FS || 0) * PT.FS + (s.FF || 0) * PT.FF + (s.FD || 0) * PT.FD + (s.FT || 0) * PT.FT;
  else if (pos === 5) pts += (s.FS || 0) * PT.FS + (s.FF || 0) * PT.FF + (s.FD || 0) * PT.FD + (s.FT || 0) * PT.FT;
  return pts / games;
}

const BASE_SCOUTS_LABEL: Record<number, string> = {
  1: 'DE', 2: 'DS + FS', 3: 'DS + FS', 4: 'DS + FS + Fin.', 5: 'FS + Fin.', 6: '—',
};

function reliabilityInfo(games: number): { label: string; color: string; bg: string } {
  if (games >= 15) return { label: `${games}j ✓✓`, color: 'text-green-400', bg: 'bg-green-900/30' };
  if (games >= 8)  return { label: `${games}j ✓`, color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
  return { label: `${games}j ⚠`, color: 'text-red-400', bg: 'bg-red-900/30' };
}
// --------------- End Base Score Logic ---------------

export default function ScoutPanel({ data, onPlayerClick }: Props) {
  const categories: ScoutCategory[] = [
    { id: 'ds', name: 'Desarmes (DS)', shortName: 'Desarmes', icon: Shield, color: 'orange', calculate: p => p.scout?.DS || 0, format: v => `${v} desarmes` },
    { id: 'sg', name: 'SG – Sem Gol Sofrido', shortName: 'Sem Gols', icon: Shield, color: 'green', calculate: p => p.scout?.SG || 0, format: v => `${v} jogos` },
    { id: 'de', name: 'Defesas (Goleiros)', shortName: 'Defesas', icon: Shield, color: 'blue', calculate: p => p.posicao_id === 1 ? (p.scout?.DE || 0) : 0, format: v => `${v} defesas` },
    { id: 'dp', name: 'Defesas Pênalti (DP)', shortName: 'Def. Pênalti', icon: Award, color: 'purple', calculate: p => p.posicao_id === 1 ? (p.scout?.DP || 0) : 0, format: v => `${v} DP` },
    { id: 'g', name: 'Gols (G)', shortName: 'Gols', icon: Target, color: 'emerald', calculate: p => p.scout?.G || 0, format: v => `${v} gols` },
    { id: 'a', name: 'Assistências (A)', shortName: 'Assistências', icon: Award, color: 'yellow', calculate: p => p.scout?.A || 0, format: v => `${v} assis.` },
    { id: 'fin', name: 'Finalizações (FF+FD+FT)', shortName: 'Finalizações', icon: Flame, color: 'red', calculate: p => (p.scout?.FF || 0) + (p.scout?.FD || 0) + (p.scout?.FT || 0), format: v => `${v} fin.` },
    { id: 'fs', name: 'Faltas Sofridas (FS)', shortName: 'Faltas Sof.', icon: Medal, color: 'pink', calculate: p => p.scout?.FS || 0, format: v => `${v} faltas` },
  ];

  const clubCategories: ClubCategory[] = [
    { id: 'int', name: 'Interceptações (P/ Defesa)', shortName: 'Interceptações', icon: Shield, color: 'blue', calculate: (c) => c.defesa?.interceptacoes || 0, format: (v) => `${v} INT` },
    { id: 'fin_alv', name: 'Finalizações no Alvo', shortName: 'Fin. Alvo', icon: Flame, color: 'red', calculate: (c) => c.ataque?.finalizacoes_alvo || 0, format: (v) => `${v} chutes` },
    { id: 'gls', name: 'Gols Reais', shortName: 'Gols', icon: Target, color: 'emerald', calculate: (c) => c.ataque?.gols_feitos || 0, format: (v) => `${v} gols` },
    { id: 'xg', name: 'Gols Esperados (xG)', shortName: 'xG', icon: Activity, color: 'purple', calculate: (c) => c.ataque?.xG || 0, format: (v) => `${v.toFixed(2)} xG` },
    { id: 'ds_sof', name: 'Desarmes Sofridos', shortName: 'Des. Sofridos', icon: Shield, color: 'orange', calculate: (c) => c.posse?.desarmes_sofridos || 0, format: (v) => `${v} DS` },
    { id: 'pp', name: 'Perdas de Posse', shortName: 'Perdas Posse', icon: Activity, color: 'yellow', calculate: (c) => c.posse?.perdas_posse || 0, format: (v) => `${v} perdas` },
  ];

  const [viewType, setViewType] = useState<'players' | 'clubs' | 'base'>('players');
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [activeClubCat, setActiveClubCat] = useState(clubCategories[0].id);
  const [displayMode, setDisplayMode] = useState<'top20' | 'full'>('top20');
  const [selectedClubFilter, setSelectedClubFilter] = useState<string>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Base view state
  const [basePosFilter, setBasePosFilter] = useState<number>(0); // 0 = all
  const [baseMinGames, setBaseMinGames] = useState<number>(3);

  const currentCategory = categories.find(c => c.id === activeCategory)!;
  const currentClubCat = clubCategories.find(c => c.id === activeClubCat)!;

  // All clubs that have players with this scout value
  const availableClubs = useMemo(() => {
    const clubIds = new Set(
      data.atletas
        .filter(p => (p.status_id === 7 || p.jogos_num > 0) && currentCategory.calculate(p) > 0)
        .map(p => String(p.clube_id))
    );
    return Array.from(clubIds)
      .map(id => ({ id, club: data.clubes[id] }))
      .filter(c => c.club)
      .sort((a, b) => a.club.nome.localeCompare(b.club.nome));
  }, [data, currentCategory]);

  const allPlayers = useMemo(() =>
    data.atletas
      .filter(p => p.status_id === 7 || p.jogos_num > 0)
      .map(p => ({ ...p, scoutTotal: currentCategory.calculate(p) }))
      .filter(p => p.scoutTotal > 0)
      .filter(p => selectedClubFilter === 'all' || String(p.clube_id) === selectedClubFilter)
      .sort((a, b) => b.scoutTotal - a.scoutTotal),
    [data, currentCategory, selectedClubFilter]
  );

  const displayedPlayers = displayMode === 'top20' ? allPlayers.slice(0, 20) : allPlayers;

  const allClubsFBref = useMemo(() =>
    Object.entries(fbrefData)
      .map(([abbr, info]) => {
        const cartolaClubId = Object.keys(data.clubes).find(k => data.clubes[k].abreviacao === abbr) || '';
        return { abbr, cartolaClubId, info, statTotal: currentClubCat.calculate(info) };
      })
      .filter(c => c.statTotal > 0)
      .sort((a, b) => b.statTotal - a.statTotal),
    [data, currentClubCat]
  );

  const displayedClubs = displayMode === 'top20' ? allClubsFBref.slice(0, 20) : allClubsFBref;

  // Base ranking players
  const baseRankingPlayers = useMemo(() =>
    data.atletas
      .filter(p => (p.status_id === 7 || p.jogos_num > 0) && p.posicao_id !== 6 && p.jogos_num >= baseMinGames)
      .filter(p => basePosFilter === 0 || p.posicao_id === basePosFilter)
      .map(p => ({ ...p, baseScore: calcBaseScorePanel(p) }))
      .sort((a, b) => b.baseScore - a.baseScore),
    [data, baseMinGames, basePosFilter]
  );
  const displayedBase = displayMode === 'top20' ? baseRankingPlayers.slice(0, 20) : baseRankingPlayers;

  const colorMap: Record<string, string> = {
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    pink: 'bg-pink-500',
  };

  const borderColorMap: Record<string, string> = {
    orange: 'border-orange-500',
    green: 'border-green-500',
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    emerald: 'border-emerald-500',
    yellow: 'border-yellow-500',
    red: 'border-red-500',
    pink: 'border-pink-500',
  };

  const textColorMap: Record<string, string> = {
    orange: 'text-orange-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    pink: 'text-pink-400',
  };

  const activeCatColor = viewType === 'players' ? currentCategory.color : currentClubCat.color;

  return (
    <div className="p-6 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <BarChartIcon className="text-orange-500" />
            Melhores Scouts
          </h2>
          <p className="text-gray-400 text-sm">Dados do Cartola FC cruzados com estatísticas avançadas do FBref</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* View type toggle */}
          <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700 w-fit">
            <button
              onClick={() => { setViewType('players'); setSelectedClubFilter('all'); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors text-sm ${viewType === 'players' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Users size={15} />
              <span>Jogadores</span>
            </button>
            <button
              onClick={() => setViewType('clubs')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors text-sm ${viewType === 'clubs' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Shield size={15} />
              <span>Clubes (FBref)</span>
            </button>
            <button
              onClick={() => setViewType('base')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors text-sm ${viewType === 'base' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Activity size={15} />
              <span>Média Base</span>
            </button>
          </div>

          {/* Display mode toggle */}
          <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700 w-fit">
            <button
              onClick={() => setDisplayMode('top20')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors text-sm ${displayMode === 'top20' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <LayoutGrid size={15} />
              <span>Top 20</span>
            </button>
            <button
              onClick={() => setDisplayMode('full')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors text-sm ${displayMode === 'full' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List size={15} />
              <span>Lista Completa</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== BASE RANKING VIEW ===== */}
      {viewType === 'base' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Position filter */}
            <div className="flex bg-gray-900 border border-gray-700 rounded-lg p-0.5 flex-wrap gap-0.5">
              {[{ id: 0, label: 'Todos' }, { id: 1, label: 'GOL' }, { id: 2, label: 'LAT' }, { id: 3, label: 'ZAG' }, { id: 4, label: 'MEI' }, { id: 5, label: 'ATA' }].map(pos => (
                <button
                  key={pos.id}
                  onClick={() => setBasePosFilter(pos.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    basePosFilter === pos.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>

            {/* Min games filter */}
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5">
              <span className="text-gray-400 text-xs whitespace-nowrap">Mín. jogos:</span>
              {[1, 3, 5, 8, 12].map(n => (
                <button
                  key={n}
                  onClick={() => setBaseMinGames(n)}
                  className={`text-xs px-2 py-0.5 rounded font-bold transition-colors ${
                    baseMinGames === n ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {n}+
                </button>
              ))}
            </div>

            <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700 w-fit ml-auto">
              <button onClick={() => setDisplayMode('top20')} className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors text-xs ${displayMode === 'top20' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <LayoutGrid size={13} /><span>Top 20</span>
              </button>
              <button onClick={() => setDisplayMode('full')} className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors text-xs ${displayMode === 'full' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <List size={13} /><span>Todos</span>
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 flex-wrap">
            <span>Scouts base por posição:</span>
            {[{ id: 1, label: 'GOL: DE' }, { id: 2, label: 'LAT: DS+FS' }, { id: 3, label: 'ZAG: DS+FS' }, { id: 4, label: 'MEI: DS+FS+Fin.' }, { id: 5, label: 'ATA: FS+Fin.' }].map(p => (
              <span key={p.id} className="text-gray-400"><span className="font-semibold">{p.label.split(':')[0]}:</span>{p.label.split(':')[1]}</span>
            ))}
            <span className="ml-auto">{displayedBase.length} jogadores</span>
          </div>

          {/* Reliability legend */}
          <div className="flex items-center gap-4 text-xs mb-4">
            <span className="text-gray-500">Confiabilidade:</span>
            <span className="text-green-400">✓✓ 15+ jogos (alta)</span>
            <span className="text-yellow-400">✓ 8-14 jogos (média)</span>
            <span className="text-red-400">⚠ &lt;8 jogos (baixa)</span>
          </div>

          {/* Table */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            <div className="grid grid-cols-[32px_1fr_64px_72px_72px_80px_80px] text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 py-2 border-b border-gray-700 bg-gray-800 gap-2">
              <span>#</span>
              <span>Jogador</span>
              <span className="text-center">Pos</span>
              <span className="text-center">Jogos</span>
              <span className="text-center">Média</span>
              <span className="text-center text-blue-400">Base/J</span>
              <span className="text-center">Scouts</span>
            </div>
            <div className="divide-y divide-gray-800">
              {displayedBase.map((player, index) => {
                const club = data.clubes[player.clube_id];
                const pos = data.posicoes[player.posicao_id];
                const rel = reliabilityInfo(player.jogos_num);
                const photo = player.foto ? player.foto.replace('FORMATO', '45x45') : '';
                const posColorMap: Record<number,string> = {
                  1:'bg-yellow-500/20 text-yellow-300', 2:'bg-blue-500/20 text-blue-300',
                  3:'bg-blue-700/20 text-blue-200', 4:'bg-green-500/20 text-green-300',
                  5:'bg-red-500/20 text-red-300',
                };
                return (
                  <div
                    key={player.atleta_id}
                    className="grid grid-cols-[32px_1fr_64px_72px_72px_80px_80px] items-center px-3 py-2 hover:bg-gray-800/60 transition-colors gap-2"
                  >
                    <span className="text-gray-600 text-xs font-mono">#{index + 1}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img src={photo} alt={player.apelido} className="w-8 h-8 rounded-full object-cover bg-gray-700" />
                        {club?.escudos?.['30x30'] && (
                          <img src={club.escudos['30x30']} alt="" className="w-3.5 h-3.5 absolute -bottom-0.5 -right-0.5 rounded-full bg-gray-800" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white text-xs font-semibold truncate">{player.apelido}</div>
                        <div className="text-gray-500 text-[10px] truncate">{club?.abreviacao}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-center ${posColorMap[player.posicao_id] || ''}`}>
                      {pos?.abreviacao}
                    </span>
                    <div className={`text-[10px] font-bold text-center px-1.5 py-0.5 rounded ${rel.bg} ${rel.color}`}>
                      {rel.label}
                    </div>
                    <span className="text-orange-400 text-xs font-bold text-center">{player.media_num.toFixed(1)}</span>
                    <span className="text-blue-400 text-sm font-black text-center">{player.baseScore.toFixed(2)}</span>
                    <span className="text-gray-500 text-[10px] text-center truncate">{BASE_SCOUTS_LABEL[player.posicao_id]}</span>
                  </div>
                );
              })}
              {displayedBase.length === 0 && (
                <div className="py-12 text-center text-gray-500 text-sm">
                  Nenhum jogador encontrado com esses filtros.
                </div>
              )}
            </div>
          </div>

          {baseRankingPlayers.length > 20 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setDisplayMode(d => d === 'top20' ? 'full' : 'top20')}
                className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-xl transition-all font-medium text-sm"
              >
                {displayMode === 'top20' ? <><List size={16} />Ver todos os {baseRankingPlayers.length} jogadores</> : <><LayoutGrid size={16} />Voltar ao Top 20</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== PLAYERS / CLUBS VIEWS ===== */}
      {viewType !== 'base' && (
      <>
      {/* Category pills */}
      <div className="flex overflow-x-auto space-x-2 pb-4 mb-6 scrollbar-hide">
        {(viewType === 'players' ? categories : clubCategories).map(cat => {
          const Icon = cat.icon;
          const isActive = viewType === 'players' ? activeCategory === cat.id : activeClubCat === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                if (viewType === 'players') { setActiveCategory(cat.id); setSelectedClubFilter('all'); }
                else setActiveClubCat(cat.id);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium ${
                isActive
                  ? `${colorMap[cat.color]} text-white shadow-lg`
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700 hover:text-white'
              }`}
            >
              <Icon size={15} />
              <span>{cat.shortName}</span>
            </button>
          );
        })}
      </div>

      {/* Club filter (players only) */}
      {viewType === 'players' && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-gray-400 text-sm font-medium">Filtrar por clube:</span>

          {/* Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(d => !d)}
              className="flex items-center gap-2 bg-gray-800 border border-gray-700 hover:border-gray-500 text-sm text-gray-200 px-3 py-2 rounded-lg transition-colors min-w-[180px] justify-between"
            >
              <div className="flex items-center gap-2">
                {selectedClubFilter !== 'all' && data.clubes[selectedClubFilter]?.escudos?.['30x30'] && (
                  <img src={data.clubes[selectedClubFilter].escudos['30x30']} alt="" className="w-4 h-4 object-contain" />
                )}
                <span>
                  {selectedClubFilter === 'all' ? 'Todos os clubes' : data.clubes[selectedClubFilter]?.nome || 'Clube'}
                </span>
              </div>
              <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedClubFilter('all'); setDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 ${selectedClubFilter === 'all' ? 'text-orange-400 font-semibold' : 'text-gray-300'}`}
                  >
                    Todos os clubes
                  </button>
                  {availableClubs.map(({ id, club }) => (
                    <button
                      key={id}
                      onClick={() => { setSelectedClubFilter(id); setDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 ${selectedClubFilter === id ? 'text-orange-400 font-semibold' : 'text-gray-300'}`}
                    >
                      {club.escudos?.['30x30'] && <img src={club.escudos['30x30']} alt="" className="w-4 h-4 object-contain" />}
                      {club.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedClubFilter !== 'all' && (
            <button
              onClick={() => setSelectedClubFilter('all')}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors bg-gray-700 px-2 py-1 rounded-full"
            >
              <X size={12} /> Limpar
            </button>
          )}

          <span className="text-gray-500 text-xs ml-auto">
            {viewType === 'players'
              ? `${allPlayers.length} jogador${allPlayers.length !== 1 ? 'es' : ''} encontrado${allPlayers.length !== 1 ? 's' : ''}`
              : `${allClubsFBref.length} clubes`}
          </span>
        </div>
      )}

      {/* Stats counter */}
      {viewType === 'players' && displayMode === 'full' && (
        <div className="mb-4 text-sm text-gray-500">
          Mostrando todos os <span className="text-white font-semibold">{displayedPlayers.length}</span> jogadores —{' '}
          <span className={textColorMap[activeCatColor]}>ordenados por {currentCategory.shortName}</span>
        </div>
      )}
      {viewType === 'players' && displayMode === 'top20' && (
        <div className="mb-4 text-sm text-gray-500">
          Top <span className="text-white font-semibold">20</span> por{' '}
          <span className={textColorMap[activeCatColor]}>{currentCategory.shortName}</span>
        </div>
      )}

      {/* Grid */}
      <div className={`grid gap-4 ${displayMode === 'full' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
        {viewType === 'players'
          ? displayedPlayers.map((player, index) => {
              const club = data.clubes[player.clube_id];
              const clubEscudo = club?.escudos?.['60x60'];
              const pos = data.posicoes[player.posicao_id];
              const statusInfo = STATUS_LABELS[player.status_id];
              const catColor = currentCategory.color;

              return (
                <div
                  key={player.atleta_id}
                  className={`bg-gray-900 border ${borderColorMap[catColor]} border-opacity-30 hover:border-opacity-80 rounded-xl p-4 relative overflow-hidden group transition-all cursor-pointer hover:shadow-lg hover:shadow-black/40 hover:-translate-y-0.5`}
                  onClick={() => onPlayerClick?.(player)}
                >
                  {/* Rank badge */}
                  <div className={`absolute top-3 right-3 text-xs font-black ${textColorMap[catColor]} bg-gray-800 px-2 py-0.5 rounded-full`}>
                    #{index + 1}
                  </div>

                  {/* Left accent bar */}
                  <div className={`absolute top-0 left-0 w-1 h-full ${colorMap[catColor]} opacity-70`}></div>

                  {/* Player photo + club badge */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={player.foto ? player.foto.replace('FORMATO', '140x140') : 'https://s2-cartola.glbimg.com/aA-HwH-zL-_0R1894u1k3wD8FDU=/140x140/smart/filters:strip_icc()/https://s2.glbimg.com/OqD0yBlyf-rR_TfM-tW7Q5Y3JtU=/https://s3.amazonaws.com/escudos.cartolafc.globo.com/default-player.png'}
                        alt={player.apelido}
                        className="w-12 h-12 rounded-full object-cover bg-gray-700 border-2 border-gray-700"
                      />
                      {clubEscudo && (
                        <img src={clubEscudo} alt={club?.nome} className="w-5 h-5 absolute -bottom-1 -right-1 rounded-full bg-gray-800 p-0.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-sm leading-tight truncate">{player.apelido}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-xs font-semibold text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
                          {pos?.abreviacao || '?'}
                        </span>
                        {club && (
                          <span className="text-xs text-gray-500 truncate max-w-[80px]">{club.abreviacao}</span>
                        )}
                        {statusInfo && (
                          <span className={`text-xs font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main stat */}
                  <div className={`flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 mb-3 border border-gray-700`}>
                    <span className="text-xs text-gray-400 font-medium">{currentCategory.shortName}</span>
                    <span className={`text-xl font-black ${textColorMap[catColor]}`}>{player.scoutTotal}</span>
                  </div>

                  {/* Mini stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Jogos</div>
                      <div className="text-sm font-bold text-gray-300">{player.jogos_num}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Média</div>
                      <div className="text-sm font-bold text-gray-300">{player.media_num.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">/ Jogo</div>
                      <div className={`text-sm font-bold ${textColorMap[catColor]}`}>
                        {(player.scoutTotal / (player.jogos_num || 1)).toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          : displayedClubs.map((club, index) => {
              const cartolaClub = data.clubes[club.cartolaClubId];
              const clubEscudo = cartolaClub?.escudos?.['60x60'] || 'https://s3.amazonaws.com/escudos.cartolafc.globo.com/default.png';
              const catColor = currentClubCat.color;

              return (
                <div key={club.abbr} className={`bg-gray-900 border ${borderColorMap[catColor]} border-opacity-30 hover:border-opacity-80 rounded-xl p-4 relative overflow-hidden group transition-all hover:shadow-lg hover:shadow-black/40 hover:-translate-y-0.5`}>
                  <div className={`absolute top-0 left-0 w-1 h-full ${colorMap[catColor]} opacity-70`}></div>

                  <div className={`absolute top-3 right-3 text-xs font-black ${textColorMap[catColor]} bg-gray-800 px-2 py-0.5 rounded-full`}>
                    #{index + 1}
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={clubEscudo}
                      alt={club.info.nome_fbref}
                      className="w-12 h-12 rounded-full object-contain bg-gray-700 p-1 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-sm leading-tight truncate">{club.info.nome_fbref}</h3>
                      <span className="text-xs text-gray-500">{club.abbr}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                    <span className="text-xs text-gray-400 font-medium">{currentClubCat.shortName}</span>
                    <span className={`text-xl font-black ${textColorMap[catColor]}`}>
                      {typeof club.statTotal === 'number' && !Number.isInteger(club.statTotal)
                        ? club.statTotal.toFixed(2)
                        : club.statTotal}
                    </span>
                  </div>
                </div>
              );
            })}

        {(viewType === 'players' ? displayedPlayers : displayedClubs).length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-500">
            <Shield size={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum dado encontrado para esta categoria.</p>
            {viewType === 'clubs' && <p className="text-xs mt-1">O FBref pode estar vazio ou as chaves não coincidiram.</p>}
          </div>
        )}
      </div>

      {/* Show more / show less */}
      {viewType === 'players' && allPlayers.length > 20 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setDisplayMode(d => d === 'top20' ? 'full' : 'top20')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-xl transition-all font-medium text-sm"
          >
            {displayMode === 'top20' ? (
              <>
                <List size={16} />
                Ver todos os {allPlayers.length} jogadores
              </>
            ) : (
              <>
                <LayoutGrid size={16} />
                Voltar ao Top 20
              </>
            )}
          </button>
        </div>
      )}

      {viewType === 'clubs' && allClubsFBref.length > 20 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setDisplayMode(d => d === 'top20' ? 'full' : 'top20')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-xl transition-all font-medium text-sm"
          >
            {displayMode === 'top20' ? (
              <>
                <List size={16} />
                Ver todos os {allClubsFBref.length} clubes
              </>
            ) : (
              <>
                <LayoutGrid size={16} />
                Voltar ao Top 20
              </>
            )}
          </button>
        </div>
      )}

      </>
      )}

      {/* Backdrop for dropdown */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
      )}
    </div>
  );
}

function BarChartIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
