import { useState, useEffect } from 'react';
import { CartolaData, CartolaMatches } from '../types';
import { fetchPontuadosRodada } from '../services/api';
import { generateProjections, evaluateRound, getProjections, getEvaluation, PlayerProjection, MLEvaluation } from '../services/mlEngine';
import { BrainCircuit, TrendingUp, AlertTriangle, CheckCircle, RefreshCcw, Activity } from 'lucide-react';

interface Props {
  data: CartolaData;
  matches: CartolaMatches;
}

export default function MachineLearningPanel({ data, matches }: Props) {
  const [projections, setProjections] = useState<PlayerProjection[]>([]);
  const [evaluation, setEvaluation] = useState<MLEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'projections' | 'evaluation'>('projections');

  useEffect(() => {
    // Carrega/Gera Projeções
    let currents = getProjections(matches.rodada);
    if (!currents || currents.length === 0) {
      currents = generateProjections(data, matches);
    }
    // Ordena do maior para o menor Expected Points
    currents.sort((a, b) => b.expected_points - a.expected_points);
    setProjections(currents);

    // Checa Avaliação da Rodada Passada
    const checkPastRound = async () => {
      const pastRodada = matches.rodada - 1;
      if (pastRodada <= 0) return;

      let pastEval = getEvaluation(pastRodada);
      if (!pastEval) {
         setLoading(true);
         try {
           const pastResults = await fetchPontuadosRodada(pastRodada);
           if (pastResults && pastResults.atletas) {
              pastEval = evaluateRound(pastRodada, pastResults.atletas, data);
           }
         } catch(e) {
           console.error("Failed to fetch past round results to evaluate:", e);
         }
         setLoading(false);
      }
      setEvaluation(pastEval);
    };

    checkPastRound();
  }, [matches.rodada, data, matches]);

  const handleRegenerate = () => {
    setLoading(true);
    setTimeout(() => {
      const newProj = generateProjections(data, matches);
      newProj.sort((a, b) => b.expected_points - a.expected_points);
      setProjections(newProj);
      setLoading(false);
    }, 500); // UI feedback
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full bg-gray-900 overflow-y-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-teal-400 flex items-center">
            <BrainCircuit className="mr-2" /> Inteligência Nativa (Auto-Calibrável)
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Motor estatístico interno. Projeta pontos e aprende com os próprios erros. Nenhuma IA externa necessária.
          </p>
        </div>
        
        <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg border border-gray-700">
          <button
            onClick={() => setActiveView('projections')}
            className={`px-4 py-2 rounded flex items-center space-x-2 font-medium transition-colors text-sm ${
              activeView === 'projections' ? 'bg-teal-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp size={16} />
            <span>Projeções (Rodada {matches.rodada})</span>
          </button>
          
          <button
            onClick={() => setActiveView('evaluation')}
            className={`px-4 py-2 rounded flex items-center space-x-2 font-medium transition-colors text-sm ${
              activeView === 'evaluation' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
            disabled={!evaluation}
          >
            <Activity size={16} />
            <span>Auditoria (Rodada {matches.rodada - 1})</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
        </div>
      )}

      {/* TELA DE PROJEÇÕES */}
      {!loading && activeView === 'projections' && (
        <div className="flex-1">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-bold text-gray-200">Pontos Esperados Calculados</h3>
             <button onClick={handleRegenerate} className="text-xs flex items-center text-teal-400 hover:text-teal-300">
               <RefreshCcw size={14} className="mr-1" /> Forçar Recálculo
             </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {projections.slice(0, 32).map((p, index) => {
                const clubEscudo = data.clubes[p.clube_id]?.escudos?.['60x60'];
                return (
                 <div key={p.atleta_id} className="bg-gray-800 border border-teal-900/40 rounded-xl p-4 flex items-center space-x-4">
                    <div className="relative">
                      <img 
                        src={p.foto ? p.foto.replace('FORMATO', '140x140') : 'https://s3.amazonaws.com/escudos.cartolafc.globo.com/default-player.png'} 
                        alt={p.apelido} 
                        className="w-12 h-12 rounded-full object-cover bg-gray-700" 
                      />
                      {clubEscudo && <img src={clubEscudo} className="w-5 h-5 absolute -bottom-1 -right-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-100 truncate text-sm">{p.apelido}</div>
                      <div className="text-xs text-gray-500">{data.posicoes[p.posicao_id]?.abreviacao} • Média Base: {Math.round(p.media_base * 100)/100}</div>
                    </div>
                    <div className="bg-gray-900 rounded px-2 py-1 border border-gray-700 text-center min-w-[50px]">
                      <div className="text-xs text-gray-500 font-semibold mb-0.5">#{index+1}</div>
                      <div className="text-sm font-black text-teal-500">{p.expected_points.toFixed(1)}</div>
                    </div>
                 </div>
                );
             })}
           </div>
        </div>
      )}

      {/* TELA DE AVALIAÇÃO E APRENDIZADO */}
      {!loading && activeView === 'evaluation' && evaluation && (
        <div className="flex-1 flex flex-col xl:flex-row gap-6">
           
           {/* Resumo de Erro e Log de Ajustes */}
           <div className="w-full xl:w-1/3 flex flex-col gap-4">
             <div className="bg-gray-800 rounded-xl border border-indigo-900/50 p-5">
               <h3 className="font-bold text-indigo-400 mb-2 flex items-center">
                 <Activity size={18} className="mr-2" /> Visão Geral do Erro
               </h3>
               <p className="text-gray-300 text-sm mb-4">
                 Na rodada {evaluation.rodada}, a diferença média absoluta entre a projeção do nosso Motor e o cartola real (MAE) foi de:
               </p>
               <div className="text-4xl font-black text-center text-white bg-gray-900 rounded-lg py-4 border border-gray-700">
                 {evaluation.mae.toFixed(1)} <span className="text-base text-gray-400 font-medium tracking-wide">pts de erro/jogador</span>
               </div>
             </div>

             <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex-1">
               <h3 className="font-bold text-gray-200 mb-4 flex items-center">
                 <BrainCircuit size={18} className="mr-2 text-cyan-400" /> Lições Aprendidas
               </h3>
               <div className="space-y-3">
                 {evaluation.adjustments.map((adj, i) => (
                   <div key={i} className="flex text-sm bg-gray-900/50 p-3 rounded border border-gray-700/50">
                     {adj.includes("Superestimamos") || adj.includes("Subestimamos") 
                       ? <AlertTriangle size={16} className="text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                       : <CheckCircle size={16} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                     }
                     <span className="text-gray-300">{adj}</span>
                   </div>
                 ))}
               </div>
             </div>
           </div>

           {/* Lista Detalhada de Erros Críticos */}
           <div className="w-full xl:w-2/3 bg-gray-800 border border-gray-700 rounded-xl p-5 flex flex-col">
             <h3 className="font-bold text-gray-200 mb-4">Maiores Desvios (Projetado vs Realidade)</h3>
             
             <div className="overflow-x-auto flex-1">
               <table className="w-full text-sm text-left">
                 <thead className="bg-gray-900/80 text-gray-400 text-xs uppercase">
                   <tr>
                     <th className="px-4 py-3 rounded-tl-lg">Jogador</th>
                     <th className="px-4 py-3 text-center">Modelo Projetou</th>
                     <th className="px-4 py-3 text-center">Fez na Realidade</th>
                     <th className="px-4 py-3 text-right rounded-tr-lg">Erro Incorrido</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-800">
                   {evaluation.details.slice(0, 15).map(item => (
                     <tr key={item.atleta_id} className="hover:bg-gray-700/30 transition-colors">
                       <td className="px-4 py-3 font-semibold text-gray-200 truncate max-w-[120px]">{item.apelido}</td>
                       <td className="px-4 py-3 text-center text-gray-400">{item.expected.toFixed(1)}</td>
                       <td className="px-4 py-3 text-center text-teal-400 font-bold">{item.actual.toFixed(1)}</td>
                       <td className="px-4 py-3 text-right">
                         <span className={`px-2 py-1 rounded text-xs font-bold ${
                           item.error > 0 ? 'bg-red-900/30 text-red-400' : 'bg-blue-900/30 text-blue-400'
                         }`}>
                           {item.error > 0 ? '▼ Faltou ' : '▲ Surpresa: '}
                           {Math.abs(item.error).toFixed(1)}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>

           </div>
        </div>
      )}

      {/* Não tem avaliação ainda */}
      {!loading && activeView === 'evaluation' && !evaluation && (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-gray-800/50 rounded-xl border border-gray-700 flex-1">
          <Activity size={48} className="text-gray-600 mb-4" />
          <p className="text-gray-400 font-medium max-w-md">
             A rodada {matches.rodada - 1} não foi avaliada ou você não gerou projeções nela. Aguarde a rodada atual terminar para ver a Calibração e Aprendizado em ação.
          </p>
        </div>
      )}
    </div>
  );
}
