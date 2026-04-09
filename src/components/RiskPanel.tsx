import { useState } from 'react';
import { CartolaData, Player } from '../types';
import { AlertTriangle, Flag } from 'lucide-react';

interface Props {
  data: CartolaData;
}

type RiskCategory = {
  id: string;
  name: string;
  icon: React.ElementType;
  calculate: (p: Player) => number;
  format: (val: number) => string;
};

export default function RiskPanel({ data }: Props) {
  const categories: RiskCategory[] = [
    { id: 'fc', name: 'Faltas Cometidas', icon: Flag, calculate: p => p.scout?.FC || 0, format: v => `${v} faltas` },
    { id: 'ca', name: 'Cartões Amarelos', icon: AlertTriangle, calculate: p => p.scout?.CA || 0, format: v => `${v} CA` },
    { id: 'cv', name: 'Cartões Vermelhos', icon: AlertTriangle, calculate: p => p.scout?.CV || 0, format: v => `${v} CV` },
    { id: 'i', name: 'Impedimentos', icon: Flag, calculate: p => p.scout?.I || 0, format: v => `${v} impedimentos` },
    { id: 'pontos_neg', name: 'Maior Risco (Pt Perdidos)', icon: AlertTriangle, calculate: p => {
      // Peso estimado de pontos perdidos: CA(-1.5) CV(-3) FC(-0.3) I(-0.1) GC(-3) PP(-4)
      return (p.scout?.CA || 0) * 1.5 + 
             (p.scout?.CV || 0) * 3 + 
             (p.scout?.FC || 0) * 0.3 + 
             (p.scout?.I || 0) * 0.1 + 
             (p.scout?.GC || 0) * 3 + 
             (p.scout?.PP || 0) * 4;
    }, format: v => `${v.toFixed(1)} pt projetados perdidos` },
  ];

  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  
  const currentCategory = categories.find(c => c.id === activeCategory)!;
  
  const topPlayers = data.atletas
    .filter(p => p.status_id === 7 || p.jogos_num > 0)
    .map(p => ({
      ...p,
      scoutTotal: currentCategory.calculate(p)
    }))
    .filter(p => p.scoutTotal > 0)
    .sort((a, b) => b.scoutTotal - a.scoutTotal)
    .slice(0, 10);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-red-500 mb-2 flex items-center">
          <AlertTriangle className="mr-2 text-red-500" /> Radar de Risco
        </h2>
        <p className="text-gray-400">Jogadores com maiores índices de infrações e scouts negativos (Os Escoteiros Maus)</p>
      </div>

      <div className="flex overflow-x-auto space-x-2 pb-4 mb-6 scrollbar-hide">
        {categories.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-red-600 text-white font-medium'
                  : 'bg-gray-800 text-gray-400 hover:bg-red-900/40 hover:text-white border border-gray-700'
              }`}
            >
              <Icon size={16} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topPlayers.map((player, index) => {
          const club = data.clubes[player.clube_id];
          const clubEscudo = club?.escudos?.['60x60'];
          
          return (
            <div key={player.atleta_id} className="bg-gray-800 border border-red-900/30 rounded-xl p-5 relative overflow-hidden group hover:border-red-600/50 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img 
                      src={player.foto ? player.foto.replace('FORMATO', '140x140') : 'https://s2-cartola.glbimg.com/aA-HwH-zL-_0R1894u1k3wD8FDU=/140x140/smart/filters:strip_icc()/https://s2.glbimg.com/OqD0yBlyf-rR_TfM-tW7Q5Y3JtU=/https://s3.amazonaws.com/escudos.cartolafc.globo.com/default-player.png'} 
                      alt={player.apelido} 
                      className="w-14 h-14 rounded-full object-cover bg-gray-700" 
                    />
                    {clubEscudo && (
                      <img src={clubEscudo} alt={club?.nome} className="w-5 h-5 absolute -bottom-1 -right-1" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg leading-tight">{player.apelido}</h3>
                    <span className="text-xs font-semibold text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full inline-block mt-1">
                      {data.posicoes[player.posicao_id]?.abreviacao}
                    </span>
                  </div>
                </div>
                
                <div className="text-center bg-gray-900 rounded-lg px-3 py-2 border border-gray-700 min-w-[64px]">
                  <div className="text-xs text-gray-500 font-medium">#{index + 1}</div>
                  <div className="text-xl font-black text-red-500">
                    {typeof player.scoutTotal === 'number' && !Number.isInteger(player.scoutTotal) 
                      ? player.scoutTotal.toFixed(1) 
                      : player.scoutTotal}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700/50">
                <div>
                  <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Jogos</div>
                  <div className="text-gray-300 font-medium">{player.jogos_num}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Média / Jogo</div>
                  <div className="text-gray-300 font-medium">
                    {(player.scoutTotal / (player.jogos_num || 1)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {topPlayers.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            Nenhum dado encontrado para esta categoria.
          </div>
        )}
      </div>
    </div>
  );
}
