import { useState } from 'react';
import { Shield, Zap, BarChart, Bot, Check, ChevronRight, Trophy, Star, Activity, ArrowRight } from 'lucide-react';
import SupabaseAuthModal from './SupabaseAuthModal';

interface LandingPageProps {
  onEnter: () => void;
  onGuestEnter: () => void;
}

export default function LandingPage({ onEnter, onGuestEnter }: LandingPageProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleLoginClick = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleSignupClick = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-orange-500/30 overflow-x-hidden">
      
      {/* Navbar Minimalista */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-20">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Flima Futebol <span className="text-orange-500">Scouts</span></span>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={handleLoginClick} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors duration-200">
            Login
          </button>
          <button 
            onClick={handleSignupClick} 
            className="px-5 py-2.5 bg-white text-gray-950 text-sm font-bold rounded-full hover:bg-gray-200 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
          >
            Começar Grátis
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-10 pb-32 px-6 lg:pt-16 lg:pb-40 z-10 w-full max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Efeito Glow de fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/20 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>

        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-8">
          <Zap className="w-3.5 h-3.5" />
          <span>Inteligência Analítica Flima Scouts</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
          Domine o mercado com <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-orange-500">
            Decisões de Elite
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Chega de sorte. Nosso Motor de IA próprio analisa estatísticas táticas, mando de campo e histórico de desempenho para escalar o seu time campeão toda rodada — sem depender de nenhuma IA externa.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={handleLoginClick} 
            className="group flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-2xl hover:from-orange-500 hover:to-red-500 transition-all duration-300 shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_40px_rgba(249,115,22,0.5)] hover:-translate-y-1 w-full sm:w-auto text-lg"
          >
            <span>Entrar na Conta</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button 
            onClick={onGuestEnter}
            className="group flex items-center justify-center space-x-2 px-8 py-4 bg-gray-900 border border-gray-700 text-white font-bold rounded-2xl hover:bg-gray-800 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 w-full sm:w-auto text-lg"
          >
            <span>Explorar sem conta</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-orange-400" />
          </button>
        </div>

        <p className="text-xs text-gray-600 mt-4">Modo visitante — dados reais, sem necessidade de cadastro</p>

        {/* Dashboard Preview Mockup */}
        <div className="mt-20 relative w-full max-w-5xl mx-auto p-4 rounded-[2rem] bg-gradient-to-b from-gray-800/50 to-gray-900/50 border border-t-gray-700 border-x-gray-800 border-b-gray-900 shadow-2xl backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent z-10 pointer-events-none rounded-[2rem] h-[120%]"></div>
          <div className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-950 shadow-inner relative z-0">
             {/* Fake UI Header */}
             <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center px-4 space-x-2">
               <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
               <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
               <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
             </div>
             {/* Fake UI Body */}
             <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                   <div className="h-32 bg-gray-900 rounded-xl border border-gray-800 animate-pulse delay-75"></div>
                   <div className="h-48 bg-gray-900 rounded-xl border border-gray-800 animate-pulse delay-100"></div>
                </div>
                <div className="space-y-4">
                   <div className="h-40 bg-gray-900 rounded-xl border border-gray-800 animate-pulse delay-150"></div>
                   <div className="h-40 bg-gradient-to-br from-orange-600/20 to-red-600/10 rounded-xl border border-orange-500/20 animate-pulse delay-200"></div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 relative z-20 bg-gray-950 border-t border-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">A Vantagem Competitiva <br className="hidden md:block"/> Que Seu Time Precisa</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Nossa plataforma quebra todos os dados dos jogadores e adversários num nível tático e prático para as suas escalações.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/30 transition-colors group">
              <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Top Scouts Avançado</h3>
              <p className="text-gray-400 leading-relaxed">
                Descubra a *Média Base* de todos os jogadores, ignorando pontos dependentes de gols (SG) para focar apenas em quem comete estatística bruta e frequente.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-gray-900/50 border border-gray-800 hover:border-orange-500/30 transition-colors group">
              <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-orange-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Radar de Risco Defensivo</h3>
              <p className="text-gray-400 leading-relaxed">
                Avalie o SG de goleiros e defensores cruzando dados táticos do FBref — finalizações ao gol, interceptações e volume defensivo — para identificar os melhores confrontos da rodada.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-gray-900/50 border border-gray-800 hover:border-purple-500/30 transition-colors group">
              <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bot className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Motor de IA Nativo</h3>
              <p className="text-gray-400 leading-relaxed">
                Nossa inteligência própria projeta pontos por jogador, prevê resultados de partidas e se auto-calibra a cada rodada aprendendo com os próprios erros — 100% local, sem APIs pagas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative z-20">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 -z-10 pointer-events-none"></div>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Escolha seu caminho no Flima Scouts</h2>
            <p className="text-gray-400 text-lg">Atualize para o Pro e tenha o ecossistema completo para mitigar a sorte.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            {/* Free Tier */}
            <div className="p-8 md:p-10 rounded-[2.5rem] bg-gray-900 border border-gray-800 relative shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-2">Amador</h3>
              <div className="flex items-baseline mb-6">
                 <span className="text-5xl font-extrabold tracking-tight text-white">R$ 0</span>
                 <span className="text-gray-500 ml-2">/para sempre</span>
              </div>
              <p className="text-sm text-gray-400 mb-8 border-b border-gray-800 pb-8">
                Perfeito para montar aquele time no grupo de amigos casualmente usando uma tela moderna.
              </p>
              
              <ul className="space-y-4 mb-10">
                <li className="flex items-start text-gray-300 group">
                   <Check className="w-5 h-5 text-gray-500 mr-3 shrink-0 mt-0.5 group-hover:text-green-400 transition-colors" /> 
                   <span>Acesso à <strong className="text-white">Formação de Escalações</strong></span>
                </li>
                <li className="flex items-start text-gray-300 group">
                   <Activity className="w-5 h-5 text-gray-500 mr-3 shrink-0 mt-0.5 group-hover:text-green-400 transition-colors" /> 
                   <span>Checagem Básica de <strong className="text-white">Parciais</strong> ao vivo</span>
                </li>
                <li className="flex items-start text-gray-300 group">
                   <ChevronRight className="w-5 h-5 text-gray-500 mr-3 shrink-0 mt-0.5 group-hover:text-green-400 transition-colors" /> 
                   <span>Tabela Simplificada do Campeonato</span>
                </li>
                <li className="flex items-start text-gray-600 opacity-50">
                   <Check className="w-5 h-5 text-gray-700 mr-3 shrink-0 mt-0.5" /> 
                   <span className="line-through">Média Base e análise FBref avançada</span>
                </li>
                <li className="flex items-start text-gray-600 opacity-50">
                   <Check className="w-5 h-5 text-gray-700 mr-3 shrink-0 mt-0.5" /> 
                   <span className="line-through">Motor de IA Nativo com auto-calibração</span>
                </li>
              </ul>
              
              <button 
                onClick={handleSignupClick} 
                className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors"
               >
                 Criar Conta Grátis
              </button>
            </div>

            {/* Pro Tier */}
            <div className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-b from-gray-800/80 to-gray-900 border-2 border-orange-500 relative shadow-2xl shadow-orange-900/20 transform md:-translate-y-4">
              <div className="absolute top-0 right-10 -translate-y-1/2">
                <span className="inline-flex items-center space-x-1 bg-orange-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg shadow-orange-500/30">
                  <Star className="w-3.5 h-3.5 fill-white" />
                  <span>Mais Popular</span>
                </span>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">Pro Analítico</h3>
              <div className="flex items-baseline mb-6">
                 <span className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">R$ 19</span>
                 <span className="text-gray-500 ml-2">,90/mês</span>
              </div>
              <p className="text-sm text-gray-400 mb-8 border-b border-gray-700 pb-8">
                Tudo o que os tops nacionais usam. Uma suíte massiva de dados e algoritmos de decisão preditivos.
              </p>
              
              <ul className="space-y-4 mb-10">
                <li className="flex items-start text-gray-100 font-medium">
                   <Check className="w-5 h-5 text-orange-500 mr-3 shrink-0 mt-0.5 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]" /> 
                   <span>Tudo incluso no Plano Amador</span>
                </li>
                <li className="flex items-start text-gray-300">
                   <Check className="w-5 h-5 text-orange-500 mr-3 shrink-0 mt-0.5" /> 
                   <span><strong className="text-white">Top Scouts</strong> com isolamento de Média Base</span>
                </li>
                <li className="flex items-start text-gray-300">
                   <Check className="w-5 h-5 text-orange-500 mr-3 shrink-0 mt-0.5" /> 
                   <span>Banco de dados tático <strong className="text-white">FBref integrado</strong></span>
                </li>
                <li className="flex items-start text-gray-300">
                   <Check className="w-5 h-5 text-orange-500 mr-3 shrink-0 mt-0.5" /> 
                   <span><strong className="text-white">Radar de Risco Defensivo</strong> atualizado em tempo real</span>
                </li>
                <li className="flex items-start text-gray-300">
                   <Check className="w-5 h-5 text-orange-500 mr-3 shrink-0 mt-0.5" /> 
                   <span>Motor de <strong className="text-white">IA Nativa Flima</strong> com projeções e auto-calibração por rodada</span>
                </li>
              </ul>
              
              <button 
                onClick={() => {
                   alert("Recurso de Assinatura via Cartão de Crédito integrará a tela de checkout.");
                   handleSignupClick();
                }} 
                className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
               >
                 Assinar o Flima PRO
              </button>
            </div>
            
          </div>
        </div>
      </section>

      {/* Footer Minimalista */}
      <footer className="border-t border-gray-900 bg-gray-950 py-10 text-center">
        <p className="text-gray-500 text-sm flex items-center justify-center space-x-1">
          <span>&copy; {new Date().getFullYear()} Flima Futebol Scouts.</span> 
          <span>Todos os direitos reservados. Não possui afiliação com o Cartola FC Oficial.</span>
        </p>
      </footer>

      {/* Modal Backend Supabase */}
      <SupabaseAuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          onEnter();
        }}
        initialMode={authMode}
      />

    </div>
  );
}
