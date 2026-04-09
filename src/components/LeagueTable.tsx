import { CartolaData } from '../types';
import { Trophy } from 'lucide-react';
import leagueDataRaw from '../data/league_table.json';

interface LeagueRow {
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

const leagueData = leagueDataRaw as LeagueRow[];

interface Props {
  data: CartolaData;
}

export default function LeagueTable({ data }: Props) {
  return (
    <div className="p-4 sm:p-6 h-full overflow-hidden flex flex-col">
      <div className="flex items-center mb-6">
        <Trophy className="text-orange-500 mr-3" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-white">Classificação - Série A</h2>
          <p className="text-gray-400 text-sm">Tabela atualizada baseada no site FBref</p>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-900 text-gray-400 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-4 py-3">Clube</th>
                <th className="px-4 py-3 text-center w-12">PTS</th>
                <th className="px-3 py-3 text-center w-10">J</th>
                <th className="px-3 py-3 text-center w-10 hidden sm:table-cell">V</th>
                <th className="px-3 py-3 text-center w-10 hidden sm:table-cell">E</th>
                <th className="px-3 py-3 text-center w-10 hidden sm:table-cell">D</th>
                <th className="px-3 py-3 text-center w-10 hidden md:table-cell">GP</th>
                <th className="px-3 py-3 text-center w-10 hidden md:table-cell">GC</th>
                <th className="px-3 py-3 text-center w-10 hidden sm:table-cell">SG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {leagueData.map((row) => {
                const cartolaClubId = Object.keys(data.clubes).find(k => data.clubes[k].abreviacao === row.clube);
                const club = cartolaClubId ? data.clubes[cartolaClubId] : null;
                const escudo = club?.escudos?.['30x30'] || 'https://s3.amazonaws.com/escudos.cartolafc.globo.com/default.png';
                const matches = row.vitorias + row.empates + row.derrotas;
                const diff = row.gols_pro - row.gols_contra;
                
                let positionColor = "text-gray-400";
                if (row.posicao <= 4) positionColor = "text-blue-400 font-bold";
                else if (row.posicao <= 6) positionColor = "text-cyan-400";
                else if (row.posicao <= 12) positionColor = "text-green-400";
                else if (row.posicao >= 17) positionColor = "text-red-500 font-bold";

                return (
                  <tr key={row.clube} className="hover:bg-gray-700/30 transition-colors">
                    <td className={`px-4 py-3 text-center ${positionColor}`}>{row.posicao}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={escudo} alt={row.nome} className="w-6 h-6 object-contain" />
                        <span className="font-semibold text-white">{row.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-white bg-gray-900/40">{row.pts}</td>
                    <td className="px-3 py-3 text-center text-gray-300">{matches}</td>
                    <td className="px-3 py-3 text-center text-gray-400 hidden sm:table-cell">{row.vitorias}</td>
                    <td className="px-3 py-3 text-center text-gray-400 hidden sm:table-cell">{row.empates}</td>
                    <td className="px-3 py-3 text-center text-gray-400 hidden sm:table-cell">{row.derrotas}</td>
                    <td className="px-3 py-3 text-center text-gray-400 hidden md:table-cell">{row.gols_pro}</td>
                    <td className="px-3 py-3 text-center text-gray-400 hidden md:table-cell">{row.gols_contra}</td>
                    <td className={`px-3 py-3 text-center font-medium hidden sm:table-cell ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-900/50 p-3 text-xs text-gray-400 flex flex-wrap gap-4 border-t border-gray-700">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Libertadores</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-400"></div> Pré-Libertadores</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"></div> Sul-Americana</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Rebaixamento</div>
        </div>
      </div>
    </div>
  );
}
