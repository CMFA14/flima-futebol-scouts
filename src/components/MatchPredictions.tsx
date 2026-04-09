import { CartolaData, CartolaMatches } from '../types';
import { Target, Shield, TrendingUp, Swords } from 'lucide-react';
import leagueTableData from '../data/league_table.json';
import fbrefData from '../data/fbref_data.json';

interface Props {
  data: CartolaData;
  matches: CartolaMatches;
}

interface LeagueEntry {
  clube: string;
  nome: string;
  posicao: number;
  pts: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
}

interface FBrefEntry {
  nome_fbref: string;
  ataque: { gols_feitos: number; xG: number; finalizacoes_alvo: number };
  defesa: { chutes_bloqueados: number; interceptacoes: number };
  indisciplina?: { faltas_cometidas: number };
}

const leagueTable: LeagueEntry[] = leagueTableData as LeagueEntry[];
const fbref: Record<string, FBrefEntry> = fbrefData as Record<string, FBrefEntry>;

function findLeagueEntry(abreviacao: string, nome: string): LeagueEntry | undefined {
  return leagueTable.find(
    (e) =>
      e.clube === abreviacao ||
      e.clube.toLowerCase() === abreviacao.toLowerCase() ||
      e.nome.toLowerCase() === nome.toLowerCase() ||
      nome.toLowerCase().includes(e.nome.toLowerCase()) ||
      e.nome.toLowerCase().includes(nome.toLowerCase())
  );
}

function predictMatch(
  homeAbrv: string,
  homeNome: string,
  awayAbrv: string,
  awayNome: string
) {
  const homeLeague = findLeagueEntry(homeAbrv, homeNome);
  const awayLeague = findLeagueEntry(awayAbrv, awayNome);
  const homeFbref = fbref[homeAbrv];
  const awayFbref = fbref[awayAbrv];

  const homeGames = homeLeague
    ? homeLeague.vitorias + homeLeague.empates + homeLeague.derrotas
    : 0;
  const awayGames = awayLeague
    ? awayLeague.vitorias + awayLeague.empates + awayLeague.derrotas
    : 0;

  const homeAttack = homeLeague && homeGames > 0
    ? homeLeague.gols_pro / homeGames
    : homeFbref
    ? homeFbref.ataque.finalizacoes_alvo / 20
    : 1.2;

  const homeDefense = homeLeague && homeGames > 0
    ? homeLeague.gols_contra / homeGames
    : 1.3;

  const awayAttack = awayLeague && awayGames > 0
    ? awayLeague.gols_pro / awayGames
    : awayFbref
    ? awayFbref.ataque.finalizacoes_alvo / 20
    : 1.1;

  const awayDefense = awayLeague && awayGames > 0
    ? awayLeague.gols_contra / awayGames
    : 1.3;

  // FBref adjustments
  const homeAttackBonus = homeFbref ? homeFbref.ataque.finalizacoes_alvo / 25 : 1;
  const awayDefenseBonus = awayFbref ? awayFbref.defesa.interceptacoes / 60 : 1;
  const awayAttackBonus = awayFbref ? awayFbref.ataque.finalizacoes_alvo / 25 : 1;
  const homeDefenseBonus = homeFbref ? homeFbref.defesa.interceptacoes / 60 : 1;

  const HOME_ADV = 1.15;
  const AWAY_DIS = 0.87;

  let predictedHomeGoals =
    homeAttack * (awayDefense + 0.1) * homeAttackBonus * HOME_ADV -
    awayDefenseBonus * 0.2;
  let predictedAwayGoals =
    awayAttack * (homeDefense + 0.1) * awayAttackBonus * AWAY_DIS -
    homeDefenseBonus * 0.2;

  predictedHomeGoals = Math.max(0.3, predictedHomeGoals);
  predictedAwayGoals = Math.max(0.3, predictedAwayGoals);

  const diff = predictedHomeGoals - predictedAwayGoals;

  // Simple probability estimation from goal difference
  let homeWinPct: number;
  let drawPct: number;
  let awayWinPct: number;

  if (diff > 1.2) {
    homeWinPct = 72; drawPct = 17; awayWinPct = 11;
  } else if (diff > 0.6) {
    homeWinPct = 55; drawPct = 24; awayWinPct = 21;
  } else if (diff > 0.2) {
    homeWinPct = 44; drawPct = 27; awayWinPct = 29;
  } else if (diff > -0.2) {
    homeWinPct = 36; drawPct = 30; awayWinPct = 34;
  } else if (diff > -0.6) {
    homeWinPct = 26; drawPct = 27; awayWinPct = 47;
  } else if (diff > -1.2) {
    homeWinPct = 18; drawPct = 22; awayWinPct = 60;
  } else {
    homeWinPct = 10; drawPct = 16; awayWinPct = 74;
  }

  return {
    homeGoals: Math.round(predictedHomeGoals * 10) / 10,
    awayGoals: Math.round(predictedAwayGoals * 10) / 10,
    homeWinPct,
    drawPct,
    awayWinPct,
    homeLeague,
    awayLeague,
    homeFbref,
    awayFbref,
  };
}

function getTopPlayers(clubId: number, data: CartolaData, count = 3) {
  return data.atletas
    .filter((a) => a.clube_id === clubId && a.media_num > 0 && a.status_id === 7)
    .sort((a, b) => b.media_num - a.media_num)
    .slice(0, count);
}

function ProbBar({
  homeWin,
  draw,
  awayWin,
}: {
  homeWin: number;
  draw: number;
  awayWin: number;
}) {
  return (
    <div className="w-full">
      <div className="flex rounded-full overflow-hidden h-3">
        <div
          className="bg-green-500 transition-all"
          style={{ width: `${homeWin}%` }}
          title={`Casa ${homeWin}%`}
        />
        <div
          className="bg-yellow-500 transition-all"
          style={{ width: `${draw}%` }}
          title={`Empate ${draw}%`}
        />
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${awayWin}%` }}
          title={`Visitante ${awayWin}%`}
        />
      </div>
      <div className="flex justify-between text-xs mt-1 text-gray-400">
        <span className="text-green-400 font-semibold">{homeWin}% Casa</span>
        <span className="text-yellow-400 font-semibold">{draw}% Empate</span>
        <span className="text-red-400 font-semibold">{awayWin}% Visitante</span>
      </div>
    </div>
  );
}

export default function MatchPredictions({ data, matches }: Props) {
  const validMatches = matches.partidas.filter((m) => m.valida);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Swords size={24} className="text-purple-400" />
          Previsão de Resultados
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Rodada {matches.rodada} — previsões baseadas em desempenho e estatísticas FBref
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {validMatches.map((match, idx) => {
          const homeClub = data.clubes[String(match.clube_casa_id)];
          const awayClub = data.clubes[String(match.clube_visitante_id)];
          if (!homeClub || !awayClub) return null;

          const homeAbrv = homeClub.abreviacao;
          const awayAbrv = awayClub.abreviacao;

          const pred = predictMatch(
            homeAbrv,
            homeClub.nome,
            awayAbrv,
            awayClub.nome
          );

          const homePlayers = getTopPlayers(match.clube_casa_id, data);
          const awayPlayers = getTopPlayers(match.clube_visitante_id, data);

          const matchDate = new Date(match.partida_data);
          const dateStr = matchDate.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });

          const homeLeaguePos = pred.homeLeague?.posicao;
          const awayLeaguePos = pred.awayLeague?.posicao;

          return (
            <div
              key={idx}
              className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden"
            >
              {/* Match header */}
              <div className="bg-gray-800/60 px-4 py-2 flex items-center justify-between border-b border-gray-700">
                <span className="text-xs text-gray-400">{dateStr}</span>
                <span className="text-xs text-gray-500">{match.local}</span>
              </div>

              <div className="p-4 space-y-4">
                {/* Teams row */}
                <div className="flex items-center gap-3">
                  {/* Home */}
                  <div className="flex-1 flex flex-col items-center text-center gap-1">
                    <img
                      src={homeClub.escudos?.['60x60'] || 'https://s3.amazonaws.com/escudos.cartolafc.globo.com/default.png'}
                      alt={homeClub.nome}
                      className="w-12 h-12 object-contain"
                    />
                    <span className="text-white font-bold text-sm leading-tight">
                      {homeClub.abreviacao}
                    </span>
                    {homeLeaguePos && (
                      <span className="text-xs text-gray-500">
                        {homeLeaguePos}º lugar
                      </span>
                    )}
                  </div>

                  {/* Score prediction */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1 text-3xl font-black">
                      <span className="text-green-400">{pred.homeGoals}</span>
                      <span className="text-gray-600 text-xl">×</span>
                      <span className="text-red-400">{pred.awayGoals}</span>
                    </div>
                    <span className="text-xs text-purple-400 font-semibold bg-purple-900/30 px-2 py-0.5 rounded-full">
                      Previsão
                    </span>
                  </div>

                  {/* Away */}
                  <div className="flex-1 flex flex-col items-center text-center gap-1">
                    <img
                      src={awayClub.escudos?.['60x60'] || 'https://s3.amazonaws.com/escudos.cartolafc.globo.com/default.png'}
                      alt={awayClub.nome}
                      className="w-12 h-12 object-contain"
                    />
                    <span className="text-white font-bold text-sm leading-tight">
                      {awayClub.abreviacao}
                    </span>
                    {awayLeaguePos && (
                      <span className="text-xs text-gray-500">
                        {awayLeaguePos}º lugar
                      </span>
                    )}
                  </div>
                </div>

                {/* Probability bar */}
                <ProbBar
                  homeWin={pred.homeWinPct}
                  draw={pred.drawPct}
                  awayWin={pred.awayWinPct}
                />

                {/* Stats row */}
                {(pred.homeFbref || pred.awayFbref) && (
                  <div className="flex gap-2 text-xs">
                    <div className="flex-1 bg-gray-800 rounded-lg p-2 space-y-1">
                      <div className="flex items-center gap-1 text-gray-400 font-semibold mb-1">
                        <Target size={11} />
                        <span>Ataque</span>
                      </div>
                      {pred.homeFbref && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{homeAbrv}</span>
                          <span className="text-orange-400 font-semibold">
                            {pred.homeFbref.ataque.finalizacoes_alvo} SOG
                          </span>
                        </div>
                      )}
                      {pred.awayFbref && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{awayAbrv}</span>
                          <span className="text-orange-400 font-semibold">
                            {pred.awayFbref.ataque.finalizacoes_alvo} SOG
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 bg-gray-800 rounded-lg p-2 space-y-1">
                      <div className="flex items-center gap-1 text-gray-400 font-semibold mb-1">
                        <Shield size={11} />
                        <span>Defesa</span>
                      </div>
                      {pred.homeFbref && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{homeAbrv}</span>
                          <span className="text-blue-400 font-semibold">
                            {pred.homeFbref.defesa.interceptacoes} INT
                          </span>
                        </div>
                      )}
                      {pred.awayFbref && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{awayAbrv}</span>
                          <span className="text-blue-400 font-semibold">
                            {pred.awayFbref.defesa.interceptacoes} INT
                          </span>
                        </div>
                      )}
                    </div>
                    {pred.homeLeague && pred.awayLeague && (
                      <div className="flex-1 bg-gray-800 rounded-lg p-2 space-y-1">
                        <div className="flex items-center gap-1 text-gray-400 font-semibold mb-1">
                          <TrendingUp size={11} />
                          <span>Pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{homeAbrv}</span>
                          <span className="text-yellow-400 font-semibold">
                            {pred.homeLeague.pts}pts
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{awayAbrv}</span>
                          <span className="text-yellow-400 font-semibold">
                            {pred.awayLeague.pts}pts
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Top players */}
                {(homePlayers.length > 0 || awayPlayers.length > 0) && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-semibold mb-1">
                        Destaques {homeAbrv}
                      </p>
                      <div className="space-y-1">
                        {homePlayers.map((p) => (
                          <div
                            key={p.atleta_id}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <img
                              src={p.foto?.replace('FORMATO', '45x45')}
                              alt={p.apelido}
                              className="w-5 h-5 rounded-full bg-gray-700 object-cover"
                            />
                            <span className="text-gray-300 truncate flex-1">
                              {p.apelido}
                            </span>
                            <span className="text-orange-400 font-bold whitespace-nowrap">
                              {p.media_num.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-semibold mb-1 text-right">
                        Destaques {awayAbrv}
                      </p>
                      <div className="space-y-1">
                        {awayPlayers.map((p) => (
                          <div
                            key={p.atleta_id}
                            className="flex items-center gap-1.5 text-xs flex-row-reverse"
                          >
                            <img
                              src={p.foto?.replace('FORMATO', '45x45')}
                              alt={p.apelido}
                              className="w-5 h-5 rounded-full bg-gray-700 object-cover"
                            />
                            <span className="text-gray-300 truncate flex-1 text-right">
                              {p.apelido}
                            </span>
                            <span className="text-orange-400 font-bold whitespace-nowrap">
                              {p.media_num.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {validMatches.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
            <Swords size={48} className="text-gray-600 mb-4" />
            <p className="text-gray-400 font-medium">
              Nenhuma partida válida encontrada para esta rodada.
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-6 text-center">
        * Previsões são estimativas estatísticas e não garantem o resultado real.
      </p>
    </div>
  );
}
