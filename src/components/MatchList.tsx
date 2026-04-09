import { Match, Club } from '../types';
import { Calendar, AlertCircle } from 'lucide-react';

interface Props {
  matches: Match[];
  clubes: Record<string, Club>;
  rodada?: number;
}

export default function MatchList({ matches, clubes, rodada }: Props) {
  // Sort matches so that first we have valid matches, then invalid
  const sortedMatches = [...matches].sort((a, b) => {
    if (a.valida === b.valida) return 0;
    return a.valida ? -1 : 1;
  });

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700 h-[600px] flex flex-col">
      <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center">
          <Calendar className="mr-2 text-orange-500" size={20} />
          Jogos da {rodada ? `${rodada}ª ` : ''}Rodada
        </h3>
        <span className="bg-gray-700 text-xs text-gray-300 px-2 py-1 rounded-full font-medium">
          {matches.length} partidas
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {sortedMatches.map((match, i) => {
          const home = clubes[match.clube_casa_id];
          const away = clubes[match.clube_visitante_id];
          
          if (!home || !away) return null;

          return (
            <div 
              key={`${match.clube_casa_id}-${match.clube_visitante_id}-${i}`}
              className={`relative bg-gray-900/50 rounded-lg p-3 border ${
                match.valida ? 'border-gray-700' : 'border-red-900/50 bg-red-900/10'
              }`}
            >
              {!match.valida && (
                <div className="absolute top-0 right-0 left-0 bg-red-900/80 text-white text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 flex justify-center items-center rounded-t border-b border-red-800">
                  <AlertCircle size={10} className="mr-1" /> Não vale para a rodada
                </div>
              )}
              
              <div className={`text-xs text-center text-gray-500 mb-3 ${!match.valida ? 'mt-4' : ''}`}>
                {formatDate(match.partida_data)} • {match.local}
              </div>
              
              <div className="flex items-center justify-between">
                {/* Home Team */}
                <div className="flex flex-col items-center w-1/3">
                  <img 
                    src={home.escudos?.['45x45'] || 'https://s3.amazonaws.com/escudos.cartolafc.globo.com/default.png'} 
                    alt={home.nome} 
                    className={`w-8 h-8 md:w-10 md:h-10 object-contain ${!match.valida ? 'grayscale opacity-60' : ''}`}
                  />
                  <span className={`text-xs mt-1 font-semibold truncate w-full text-center ${!match.valida ? 'text-gray-500' : 'text-gray-300'}`}>
                    {home.abreviacao}
                  </span>
                </div>
                
                {/* VS */}
                <div className="text-gray-600 font-black text-sm w-1/3 text-center">
                  X
                </div>
                
                {/* Away Team */}
                <div className="flex flex-col items-center w-1/3">
                  <img 
                    src={away.escudos?.['45x45'] || 'https://s3.amazonaws.com/escudos.cartolafc.globo.com/default.png'} 
                    alt={away.nome} 
                    className={`w-8 h-8 md:w-10 md:h-10 object-contain ${!match.valida ? 'grayscale opacity-60' : ''}`}
                  />
                  <span className={`text-xs mt-1 font-semibold truncate w-full text-center ${!match.valida ? 'text-gray-500' : 'text-gray-300'}`}>
                    {away.abreviacao}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {matches.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Nenhuma partida encontrada.
          </div>
        )}
      </div>
    </div>
  );
}
