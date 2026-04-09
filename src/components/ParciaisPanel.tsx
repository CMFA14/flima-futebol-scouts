import { useState, useEffect, useRef } from 'react';
import { CartolaData, Player } from '../types';
import { fetchPontuados, fetchTeamById, fetchClubes, searchTeams } from '../services/api';
import { getClubShield } from '../data/clubShields';
import { Activity, RefreshCw, AlertCircle, Search, X, Users } from 'lucide-react';

interface Props { data: CartolaData; onPlayerClick?: (player: Player) => void; }

export default function ParciaisPanel({ data, onPlayerClick }: Props) {
  const [query, setQuery]         = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults]     = useState<any[] | null>(null);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  const [teamId, setTeamId]       = useState<number | null>(null);
  const [teamData, setTeamData]   = useState<any | null>(null);
  const [pontuados, setPontuados] = useState<any | null>(null);
  const [clubes, setClubes]       = useState<Record<string, any>>({});
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── busca por nome ─── */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchErr(null);
    setResults(null);
    try {
      const res = await searchTeams(query);
      setResults(res);
      if (res.length === 0) setSearchErr('Nenhum time encontrado. Tente outro nome.');
    } catch (err: any) {
      setSearchErr(err.message || 'Erro na busca.');
    } finally {
      setSearching(false);
    }
  };

  /* ─── seleciona time da lista ─── */
  const handleSelect = (id: number) => {
    setTeamId(id);
    setResults(null);
    setQuery('');
  };

  /* ─── carrega dados do time ─── */
  const loadData = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const [team, points, clubs] = await Promise.all([
        fetchTeamById(id),
        fetchPontuados(),
        fetchClubes().catch(() => ({})),
      ]);
      setTeamData(team);
      setPontuados(points);
      setClubes(clubs);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar parciais.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── auto-refresh a cada 30s ─── */
  useEffect(() => {
    if (!teamId) return;
    loadData(teamId);
    intervalRef.current = setInterval(async () => {
      try { setPontuados(await fetchPontuados()); } catch { /* silencia */ }
    }, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [teamId]);

  const handleReset = () => {
    setTeamId(null); setTeamData(null); setError(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  /* ════════════════════════════════════════
     TELA 1 — busca / seleção de time
  ════════════════════════════════════════ */
  if (!teamId) return (
    <div className="flex flex-col items-center justify-center min-h-[520px] p-6 text-center">
      <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-5 border border-gray-700 shadow-xl">
        <Activity size={32} className="text-orange-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Parciais ao Vivo</h2>
      <p className="text-gray-400 max-w-xs mb-7 text-sm">
        Digite o nome do seu time no Cartola para buscar sua escalação e pontuações em tempo real.
      </p>

      {/* Campo de busca */}
      <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-sm mb-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Nome do seu time…"
          className="flex-1 bg-gray-800 border border-gray-700 focus:border-orange-500 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!query.trim() || searching}
          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
        >
          {searching
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <Search size={16} />}
          Buscar
        </button>
      </form>

      {/* Erro de busca */}
      {searchErr && (
        <p className="text-red-400 text-sm flex items-center gap-2 mb-3">
          <AlertCircle size={15} /> {searchErr}
        </p>
      )}

      {/* Lista de resultados */}
      {results && results.length > 0 && (
        <div className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
          <p className="text-xs text-gray-500 px-4 py-2 border-b border-gray-700 flex items-center gap-1.5">
            <Users size={12} /> {results.length} time{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''} — clique para ver as parciais
          </p>
          <ul className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-gray-700/50">
            {results.map((t: any) => (
              <li key={t.slug}>
                <button
                  onClick={() => handleSelect(t.time_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/60 transition-colors text-left"
                >
                  {t.url_escudo_png
                    ? <img src={t.url_escudo_png} alt="" className="w-10 h-10 object-contain flex-shrink-0 drop-shadow" />
                    : <div className="w-10 h-10 rounded-lg bg-gray-700 flex-shrink-0 flex items-center justify-center text-gray-400"><Users size={16} /></div>
                  }
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{t.nome}</p>
                    <p className="text-gray-400 text-xs truncate">{t.nome_cartola}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  /* ════════════════════════════════════════
     TELA 2 — carregando
  ════════════════════════════════════════ */
  if (loading && !teamData) return (
    <div className="flex flex-col items-center justify-center h-[500px]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4" />
      <p className="text-gray-400 animate-pulse text-sm">Carregando escalação…</p>
    </div>
  );

  /* ════════════════════════════════════════
     TELA 3 — erro
  ════════════════════════════════════════ */
  if (error && !teamData) return (
    <div className="flex flex-col items-center justify-center h-[500px] p-6 text-center">
      <AlertCircle size={44} className="text-red-500 mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Ops, algo deu errado.</h2>
      <p className="text-gray-400 text-sm mb-6">{error}</p>
      <div className="flex gap-3">
        <button onClick={() => teamId && loadData(teamId)} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-700 text-sm transition-colors">Tentar novamente</button>
        <button onClick={handleReset} className="bg-orange-700 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">Buscar outro time</button>
      </div>
    </div>
  );

  if (!teamData) return null;

  /* ════════════════════════════════════════
     TELA 4 — parciais
  ════════════════════════════════════════ */
  let totalScore = 0;

  const renderPlayer = (p: any, isReserva = false) => {
    const pId     = p.atleta_id;
    const pBase   = data.atletas.find(a => a.atleta_id === pId);
    const live    = pontuados?.atletas?.[pId];
    const nickname = live?.apelido || pBase?.apelido || p.apelido || `Atleta ${pId}`;
    const photo   = (live?.foto || pBase?.foto || p.foto || '').replace('FORMATO', '140x140');
    const posId   = live?.posicao_id || pBase?.posicao_id || p.posicao_id || 1;
    const pos     = pontuados?.posicoes?.[String(posId)] || data.posicoes?.[posId];
    const clubId  = live?.clube_id || pBase?.clube_id || p.clube_id;
    const club    = clubId
      ? (clubes[String(clubId)] || pontuados?.clubes?.[String(clubId)] || data.clubes?.[clubId])
      : null;
    const isCap   = pId === teamData.capitao_id;

    const rawScore  = live?.pontuacao ?? null;
    const showScore = rawScore !== null ? (isCap ? rawScore * 2 : rawScore) : null;
    if (!isReserva && showScore !== null) totalScore += showScore;

    const cartolaEscudo = club?.escudos?.['60x60'] || club?.escudos?.['45x45'] || club?.escudos?.['30x30'];
    const escudoUrl = clubId ? getClubShield(clubId, cartolaEscudo) : cartolaEscudo;

    return (
      <div 
        key={pId} 
        onClick={() => {
          if (pBase) onPlayerClick?.(pBase);
        }}
        className="bg-gray-700/40 border border-gray-700/50 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-700/60 transition-colors"
      >
        {/* Foto do jogador */}
        <div className="relative flex-shrink-0">
          {photo
            ? <img src={photo} alt={nickname} className="w-12 h-12 rounded-full object-cover bg-gray-600" />
            : <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-gray-300 font-bold text-lg">{nickname[0]}</div>
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-white text-sm truncate">{nickname}</span>
            {isCap && <span className="bg-orange-500 text-[10px] text-white font-bold px-1 py-0.5 rounded leading-none">C</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {pos && <span className="bg-gray-600 text-gray-200 text-[11px] px-1.5 rounded">{pos.abreviacao}</span>}
            {/* Escudo oficial do clube */}
            {escudoUrl
              ? <img
                  src={escudoUrl}
                  alt={club?.abreviacao || ''}
                  title={club?.nome}
                  className="w-6 h-6 object-contain flex-shrink-0"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (cartolaEscudo && img.src !== cartolaEscudo) img.src = cartolaEscudo;
                    else img.style.display = 'none';
                  }}
                />
              : club && <span className="text-gray-500 text-[11px]">{club.abreviacao}</span>
            }
            {club && <span className="text-gray-400 text-[11px]">{club.abreviacao}</span>}
          </div>
        </div>

        <div className="flex-shrink-0 text-right min-w-[52px]">
          {showScore !== null
            ? <span className={`text-lg font-black ${showScore >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                {showScore >= 0 ? '+' : ''}{showScore.toFixed(1)}
              </span>
            : <span className="text-[11px] text-gray-500 bg-gray-800 rounded px-2 py-1">—</span>
          }
        </div>
      </div>
    );
  };

  const atletas  = teamData.atletas  || [];
  const reservas = teamData.reservas || [];

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          {/* Escudo do time do cartoleiro */}
          {teamData.time?.url_escudo_png
            ? <img
                src={teamData.time.url_escudo_png}
                alt={teamData.time?.nome || ''}
                className="w-16 h-16 object-contain drop-shadow-lg flex-shrink-0"
              />
            : <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                <Activity className="text-green-500" size={26} />
              </div>
          }
          <div>
            <h2 className="text-2xl font-bold text-white leading-tight">
              {teamData.time?.nome || `Time #${teamId}`}
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-gray-400 text-sm">Cartoleiro: <span className="text-orange-400">{teamData.time?.nome_cartola || '—'}</span></span>
              <button onClick={handleReset} className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1">
                <X size={11} /> Trocar time
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 flex-1 md:flex-none text-center min-w-[110px]">
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Pontuação</div>
            <div className="text-2xl font-black text-green-400">{totalScore.toFixed(1)}</div>
          </div>
          <button
            onClick={() => teamId && loadData(teamId)}
            disabled={loading}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-4 flex items-center justify-center border border-gray-700 transition-colors disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-orange-500' : ''} />
          </button>
        </div>
      </div>

      {/* Titulares + Banco */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col overflow-y-auto custom-scrollbar">
          <h3 className="text-base font-bold text-white mb-3 sticky top-0 bg-gray-800/90 backdrop-blur pb-2 z-10 border-b border-gray-700">
            Titulares <span className="text-gray-500 font-normal text-sm">({atletas.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {atletas.map((a: any) => renderPlayer(a))}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col overflow-y-auto custom-scrollbar">
          <h3 className="text-base font-bold text-white mb-3 sticky top-0 bg-gray-800/90 backdrop-blur pb-2 z-10 border-b border-gray-700">
            Banco <span className="text-gray-500 font-normal text-sm">({reservas.length})</span>
          </h3>
          <div className="flex flex-col gap-2.5">
            {reservas.length > 0
              ? reservas.map((a: any) => renderPlayer(a, true))
              : <p className="text-gray-500 text-sm text-center py-8">Banco vazio</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
