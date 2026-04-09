import { useState } from 'react';
import { authenticateGlobo } from '../services/api';
import { KeyRound, X, ExternalLink, ClipboardPaste, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: string) => void; // JSON string do time OU token GLBID
  requireTokenOnly?: boolean;
}

type Mode = 'choose' | 'json' | 'email' | 'token';

// Lê os dados direto do $rootScope do AngularJS — funciona após a página carregar
const FETCH_COMMAND = `(function(){var data=null;try{var rs=angular.element(document.body).injector().get('$rootScope');function walk(s,d){if(!s||d>20||data)return;if(s.time&&s.time.nome){data={time:s.time,atletas:s.atletas||[]};return;}walk(s.$$childHead,d+1);if(!data)walk(s.$$nextSibling,d+1);}walk(rs,0);}catch(e){}if(!data){[].slice.call(document.querySelectorAll('.ng-scope')).some(function(el){try{var s=angular.element(el).scope();if(s&&s.time&&s.time.nome){data={time:s.time,atletas:s.atletas||[]};return true;}}catch(e){}});}if(data){copy(JSON.stringify(data));console.log('Copiado!',data.time.nome);}else{console.log('Nao encontrado via scope. Use a aba Network: filtre "auth/time", clique na requisicao e copie a Response.');}})()`;

// Instrução via Network tab (fallback garantido)
// DevTools → Network → filtrar "auth" → clicar em "time" → aba Response → copiar tudo

export default function LoginModal({ isOpen, onClose, onSuccess, requireTokenOnly = false }: Props) {
  const [mode, setMode] = useState<Mode>(requireTokenOnly ? 'email' : 'choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pasted, setPasted] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);

  if (!isOpen) return null;

  const handleOpenGlobo = () => {
    window.open('https://cartola.globo.com', '_blank', 'noopener,noreferrer');
    setMode('json');
  };

  const handleJsonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = pasted.trim();
    if (!value) {
      setError('Cole os dados copiados do console.');
      return;
    }
    // Valida se é JSON válido com campos esperados
    try {
      const parsed = JSON.parse(value);
      if (!parsed.atletas && !parsed.time) {
        setError('JSON inválido: não parece ser dados do Cartola. Tente novamente.');
        return;
      }
    } catch {
      setError('Não é um JSON válido. Certifique-se de colar o resultado completo do console.');
      return;
    }
    setError('');
    onSuccess(value);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Preencha email e senha.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const tok = await authenticateGlobo(email, password);
      onSuccess(tok);
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/50">
          <h3 className="text-lg font-bold text-white flex items-center">
            <KeyRound className="mr-2 text-orange-500" size={20} />
            Conectar conta Globo.com
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          {/* CHOOSE mode */}
          {mode === 'choose' && (
            <>
              <p className="text-sm text-gray-400">Escolha como deseja fazer login:</p>

              <button
                type="button"
                onClick={handleOpenGlobo}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                <ExternalLink size={18} />
                Abrir Cartola no Navegador (Google / Social)
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-xs text-gray-500 font-medium">ou</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>

              {requireTokenOnly ? (
                 <button
                   type="button"
                   onClick={() => { setMode('token'); setError(''); }}
                   className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                 >
                   <KeyRound size={18} />
                   Colar token GLBID diretamente
                 </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode('email'); setError(''); }}
                  className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  <KeyRound size={18} />
                  Entrar com E-mail e Senha
                </button>
              )}
            </>
          )}

          {/* JSON mode — fetch direto do Cartola com credentials */}
          {mode === 'json' && (
            <>
              <div className="bg-blue-900/30 border border-blue-500/40 rounded-lg p-3 text-sm text-blue-200">
                Cartola foi aberto no navegador. Siga os passos abaixo — leva menos de 1 minuto.
              </div>

              {/* Instructions accordion */}
              <button
                type="button"
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full flex items-center justify-between text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors"
              >
                <span>Passo a passo</span>
                {showInstructions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showInstructions && (
                <div className="space-y-3">
                  {/* Método 1: Console */}
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-xs font-semibold text-green-400 mb-2">⚡ Método 1 — Console (mais rápido)</p>
                    <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>
                        Na aba do Cartola ({' '}
                        <span className="text-blue-400 font-mono">cartola.globo.com/#!/time</span>
                        {' '}) pressione{' '}
                        <kbd className="bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded font-mono">F12</kbd>
                        {' '}→ aba <span className="text-white font-semibold">Console</span>
                      </li>
                      <li>
                        Se aparecer aviso de colagem, digite{' '}
                        <code
                          onClick={() => navigator.clipboard.writeText('allow pasting')}
                          className="bg-gray-700 text-yellow-300 px-1 py-0.5 rounded font-mono cursor-pointer hover:bg-gray-600"
                          title="Clique para copiar"
                        >allow pasting</code>
                        {' '}+ Enter
                      </li>
                      <li>Clique no comando abaixo, cole no console e pressione Enter:</li>
                      <li className="list-none">
                        <code
                          onClick={() => navigator.clipboard.writeText(FETCH_COMMAND)}
                          className="block bg-gray-800 border border-green-700/50 text-green-400 px-3 py-2 rounded font-mono text-[10px] cursor-pointer hover:bg-gray-700 hover:border-green-500 transition-all break-all"
                          title="Clique para copiar"
                        >
                          {'(function(){ /* ler scope AngularJS */ })()  ← Clique para copiar'}
                        </code>
                      </li>
                      <li>O console mostrará <span className="text-green-400 font-mono">Copiado!</span> — cole abaixo com Ctrl+V</li>
                    </ol>
                  </div>

                  {/* Método 2: Network tab */}
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-xs font-semibold text-yellow-400 mb-2">🔧 Método 2 — Aba Network (sempre funciona)</p>
                    <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>Pressione <kbd className="bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded font-mono">F12</kbd> → clique na aba <span className="text-white font-semibold">Network</span></li>
                      <li>No campo de filtro da aba Network, digite <code className="bg-gray-700 text-yellow-300 px-1 py-0.5 rounded font-mono">auth/time</code></li>
                      <li>Recarregue a página do Cartola com <kbd className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded font-mono text-[10px]">F5</kbd></li>
                      <li>Clique na requisição <span className="text-white font-semibold">time</span> que aparecer → aba <span className="text-white font-semibold">Response</span></li>
                      <li>Selecione tudo (<kbd className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded font-mono text-[10px]">Ctrl+A</kbd>) e copie (<kbd className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded font-mono text-[10px]">Ctrl+C</kbd>)</li>
                      <li>Cole abaixo com <kbd className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded font-mono text-[10px]">Ctrl+V</kbd></li>
                    </ol>
                  </div>
                </div>
              )}

              <form onSubmit={handleJsonSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Cole os dados do console aqui
                  </label>
                  <textarea
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    rows={4}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder='{"time":{"nome":"..."},"atletas":[...],...}'
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-orange-900/20"
                >
                  <ClipboardPaste size={18} />
                  Conectar Meu Time
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setMode('choose'); setError(''); setPasted(''); }}
                className="w-full text-xs text-gray-500 hover:text-gray-300 py-1 transition-colors"
              >
                Voltar
              </button>
            </>
          )}

          {/* EMAIL mode */}
          {mode === 'email' && (
            <>
              <p className="text-sm text-gray-400">
                Faça login com email e senha. Suas credenciais não são salvas.
              </p>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-orange-900/20 flex justify-center items-center"
                >
                  {isLoading ? <span className="animate-pulse">Autenticando...</span> : 'Entrar e Aplicar Escalação'}
                </button>
              </form>
              {!requireTokenOnly && (
                <button
                  type="button"
                  onClick={() => { setMode('choose'); setError(''); }}
                  className="w-full text-xs text-gray-500 hover:text-gray-300 py-1 transition-colors mt-4"
                >
                  Voltar
                </button>
              )}
            </>
          )}

          {/* TOKEN mode (GlbId) */}
          {mode === 'token' && (
            <>
              <p className="text-sm text-gray-400">
                Cole o seu token GLBID diretamente para enviar a escalação.
              </p>
              <form onSubmit={(e) => {
                 e.preventDefault();
                 if (pasted.trim()) onSuccess(pasted.trim());
              }} className="space-y-4">
                <div>
                  <textarea
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    rows={4}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                    placeholder="Cole seu X-GLB-Token aqui..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-purple-900/20"
                >
                  Salvar Escalação com Token
                </button>
              </form>
              <button
                type="button"
                onClick={() => { setMode(requireTokenOnly ? 'email' : 'choose'); setError(''); setPasted(''); }}
                className="w-full text-xs text-gray-500 hover:text-gray-300 py-1 transition-colors mt-4"
              >
                Voltar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
