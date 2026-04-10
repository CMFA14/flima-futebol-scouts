import { useMemo } from 'react';
import { CartolaData, CartolaMatches, Player, PlayerMatchHistory } from '../types';
import { generateGoldenTips, GoldenTip } from '../utils/crossStats';
import { Star, ShieldAlert, Target, Shield, Zap, Flame, Lock, Handshake, CircleDot, ArrowUpFromLine } from 'lucide-react';

interface Props {
  data: CartolaData;
  matches: CartolaMatches;
  history: Record<number, PlayerMatchHistory[]>;
  onPlayerClick?: (player: Player) => void;
}

const TYPE_CONFIG = {
  LADRAO_BOLA: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-700/50', label: 'Tijolo Defensivo' },
  PAREDAO: { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-700/50', label: 'Paredão' },
  AVENIDA: { icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-700/50', label: 'Avenida Aberta' },
  CACA_FALTAS: { icon: Zap, color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-700/50', label: 'Ímã de Faltas' },
  HOT_SHOOTER: { icon: Flame, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-700/50', label: 'Atirador em Chamas' },
  PITBULL: { icon: Zap, color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-700/50', label: 'Cachorro Louco' },
  SG_HUNTER: { icon: Lock, color: 'text-cyan-400', bg: 'bg-cyan-900/20', border: 'border-cyan-700/50', label: 'Caçador de SG' },
  GARCOM: { icon: Handshake, color: 'text-pink-400', bg: 'bg-pink-900/20', border: 'border-pink-700/50', label: 'Garçom' },
  CARRASCO_PENALTI: { icon: CircleDot, color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-700/50', label: 'Carrasco do Pênalti' },
  CROSS_KING: { icon: ArrowUpFromLine, color: 'text-teal-400', bg: 'bg-teal-900/20', border: 'border-teal-700/50', label: 'Rei do Cruzamento' }
};

export default function GoldenTips({ data, matches, history, onPlayerClick }: Props) {
  // Generate tips only once when data/matches or history change
  const tips = useMemo(() => generateGoldenTips(data.atletas, matches.partidas, data.clubes, history), [data, matches, history]);

  const renderCard = (tip: GoldenTip) => {
    const config = TYPE_CONFIG[tip.type];
    const Icon = config.icon;

    return (
      <div 
        key={`${tip.player.atleta_id}-${tip.type}`} 
        className={`rounded-2xl border ${config.border} bg-gray-900 overflow-hidden transition-all duration-300 hover:shadow-lg lg:hover:-translate-y-1 cursor-pointer`}
        onClick={() => onPlayerClick?.(tip.player)}
      >
        <div className={`p-3 relative ${config.bg} flex justify-between items-start border-b border-gray-800`}>
          <div className="flex items-center gap-2">
            <Icon size={18} className={config.color} />
            <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
              {config.label}
            </span>
          </div>
          <div className="bg-gray-800/80 px-2 py-0.5 rounded-md flex items-center shadow-inner">
             <img src={tip.club.escudos['30x30']} alt={tip.club.abreviacao} className="w-4 h-4 mr-1.5" />
             <span className="text-white font-bold text-xs">C$ {tip.player.preco_num.toFixed(1)}</span>
          </div>
        </div>
        
        <div className="p-4 flex gap-4 items-center relative">
          <div className="relative">
            <img 
              src={tip.player.foto.replace('FORMATO', '140x140')} 
              alt={tip.player.apelido}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-700 shadow-xl bg-gray-800 z-10 relative"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://s.sglbasket.com/img/default-avatar.png'; }}
            />
            {data.posicoes[String(tip.player.posicao_id)] && (
              <div className="absolute -bottom-2 lg:-right-2 right-1/2 translate-x-1/2 lg:translate-x-0 bg-gray-700 text-[10px] px-1.5 py-0.5 rounded font-bold shadow text-white z-20">
                {data.posicoes[String(tip.player.posicao_id)].abreviacao}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg leading-tight lg:leading-normal">
              {tip.player.apelido}
            </h3>
            <p className="text-gray-400 text-xs mt-1 bg-gray-800/50 p-2 rounded-lg leading-relaxed border border-gray-800/80">
              {tip.description}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const categorizedTips = {
    DEFENSE: tips.filter(t => ['LADRAO_BOLA', 'PAREDAO', 'PITBULL', 'SG_HUNTER'].includes(t.type)),
    ATTACK: tips.filter(t => ['AVENIDA', 'CACA_FALTAS', 'HOT_SHOOTER', 'GARCOM', 'CARRASCO_PENALTI', 'CROSS_KING'].includes(t.type))
  };

  return (
    <div className="p-4 sm:p-6 space-y-8 animate-in fade-in duration-500">
      <div className="mb-6 flex items-start gap-4 flex-col lg:flex-row lg:justify-between lg:items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Star size={24} className="text-yellow-400 fill-yellow-400" />
            Dicas de Ouro
            <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider translate-y-[-2px]">
              Estatística Avançada
            </span>
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Cruzamento tático usando dados avançados do Cartola (Scouts de Jogadores) vs FBref (Pontos Fracos do Adversário).
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {categorizedTips.DEFENSE.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
              <Shield className="text-blue-400" size={20} /> Oportunidades Defensivas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {categorizedTips.DEFENSE.slice(0, 15).map(renderCard)}
            </div>
          </section>
        )}

        {categorizedTips.ATTACK.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
              <Target className="text-emerald-400" size={20} /> Foco no Ataque
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {categorizedTips.ATTACK.slice(0, 15).map(renderCard)}
            </div>
          </section>
        )}
        
        {tips.length === 0 && (
          <div className="bg-gray-800/40 p-8 rounded-2xl border border-gray-700/50 text-center">
            <Star size={36} className="mx-auto text-gray-500 mb-2 opacity-50" />
            <h3 className="text-gray-300 font-bold">Nenhum cruzamento relevante encontrado</h3>
            <p className="text-gray-500 text-sm mt-1">Os algoritmos não encontraram assimetrias tão óbvias na base de dados para esta rodada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
