import { useState } from 'react';
import { CartolaData, CartolaMatches } from '../types';
import { BettingTipsResponse, BettingTip } from '../services/gemini';
import { TrendingUp, Zap, Shield, DollarSign, Bot, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

interface Props {
  data: CartolaData;
  matches: CartolaMatches;
  manualBettingTips?: BettingTipsResponse | null;
}

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 70 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-400 w-8 text-right">{value}%</span>
    </div>
  );
}

function TipCard({ tip, accent }: { tip: BettingTip; accent: string }) {
  return (
    <div className={`bg-gray-900 border ${accent} rounded-xl p-4 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-white font-bold text-sm">{tip.jogo}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
          tip.confianca >= 70
            ? 'bg-green-900/50 text-green-400'
            : tip.confianca >= 50
            ? 'bg-yellow-900/50 text-yellow-400'
            : 'bg-red-900/50 text-red-400'
        }`}>
          {tip.confianca}% conf.
        </span>
      </div>
      <p className="text-orange-400 font-bold text-base">{tip.dica}</p>
      <p className="text-gray-400 text-xs leading-relaxed">{tip.justificativa}</p>
      <ConfidenceBar value={tip.confianca} />
    </div>
  );
}

function Section({
  title,
  icon,
  tips,
  borderColor,
  headerColor,
  badgeColor,
  description,
}: {
  title: string;
  icon: React.ReactNode;
  tips: BettingTip[];
  borderColor: string;
  headerColor: string;
  badgeColor: string;
  description: string;
}) {
  if (!tips || tips.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-3 p-3 rounded-xl ${badgeColor}`}>
        <span className={headerColor}>{icon}</span>
        <div>
          <h3 className={`font-bold text-base ${headerColor}`}>{title}</h3>
          <p className="text-gray-400 text-xs">{description}</p>
        </div>
        <span className={`ml-auto text-xs font-bold px-2 py-1 rounded-full ${badgeColor} border ${borderColor} ${headerColor}`}>
          {tips.length} dica{tips.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {tips.map((tip, i) => (
          <TipCard key={i} tip={tip} accent={borderColor} />
        ))}
      </div>
    </div>
  );
}

export default function BettingTips({ matches, manualBettingTips }: Props) {
  const [tips, setTips] = useState<BettingTipsResponse | null>(null);

  useEffect(() => {
    if (manualBettingTips) {
      setTips(manualBettingTips);
    }
  }, [manualBettingTips]);



  const validCount = matches.partidas.filter((m) => m.valida).length;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign size={24} className="text-emerald-400" />
          Dicas de Apostas IA
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Rodada {matches.rodada} — {validCount} partida{validCount !== 1 ? 's' : ''} analisada{validCount !== 1 ? 's' : ''} com Gemini AI
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 mb-6 flex items-start gap-2">
        <AlertCircle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
        <p className="text-yellow-300/80 text-xs">
          As dicas são geradas por IA com base em estatísticas e <strong>não garantem resultados</strong>. Aposte com responsabilidade.
        </p>
      </div>

      {/* Empty State / manual loading */}
      {!tips && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 text-center max-w-md w-full space-y-4">
            <div className="flex justify-center">
              <Bot size={48} className="text-gray-500" />
            </div>
            <h3 className="text-white font-bold text-lg">Nenhuma Previsão Carregada</h3>
            <p className="text-gray-400 text-sm">
              Siga até a aba <strong>Prompt IA</strong>, copie o prompt, gere a saída na sua I.A. favorita e aplique de volta na plataforma.
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {tips && (
        <div className="space-y-6">
          <Section
            title="Fáceis de Bater"
            icon={<Shield size={20} />}
            tips={tips.faceis}
            borderColor="border-green-700/50"
            headerColor="text-green-400"
            badgeColor="bg-green-900/20"
            description="Alta confiança baseada em dados sólidos — 70% a 90%"
          />
          <Section
            title="Apostas Normais"
            icon={<TrendingUp size={20} />}
            tips={tips.normais}
            borderColor="border-yellow-700/50"
            headerColor="text-yellow-400"
            badgeColor="bg-yellow-900/20"
            description="Tendência clara com alguma incerteza — 50% a 69%"
          />
          <Section
            title="Arriscadas"
            icon={<Zap size={20} />}
            tips={tips.arriscadas}
            borderColor="border-red-700/50"
            headerColor="text-red-400"
            badgeColor="bg-red-900/20"
            description="Alto risco, alto retorno — 30% a 49%"
          />


        </div>
      )}

      <p className="text-xs text-gray-600 mt-6 text-center">
        * Dicas geradas por IA são estimativas e não constituem aconselhamento financeiro.
      </p>
    </div>
  );
}
