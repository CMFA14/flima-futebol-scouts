import { useState, useRef } from 'react';
import { RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';

type Status = 'idle' | 'running' | 'done' | 'error';

export default function FbrefUpdater() {
  const [status, setStatus]     = useState<Status>('idle');
  const [logs, setLogs]         = useState<string[]>([]);
  const [open, setOpen]         = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef              = useRef<HTMLDivElement>(null);

  const runScraper = async () => {
    setStatus('running');
    setLogs([]);
    setOpen(true);
    setShowLogs(true);

    try {
      const res = await fetch('/api/scrape/fbref', { method: 'POST' });
      if (!res.body) throw new Error('Sem resposta do servidor');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          setLogs(prev => [...prev, line]);
          logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          if (line === '✅ DONE') {
            setStatus('done');
            setTimeout(() => window.location.reload(), 1500);
          } else if (line.startsWith('❌')) {
            setStatus('error');
          }
        }
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `❌ ${err.message}`]);
      setStatus('error');
    }
  };

  const statusColor = {
    idle:    'bg-gray-700 hover:bg-gray-600',
    running: 'bg-blue-700 cursor-wait',
    done:    'bg-green-700',
    error:   'bg-red-700',
  }[status];

  const statusLabel = {
    idle:    '🔄 Atualizar FBref',
    running: '⏳ Coletando...',
    done:    '✅ Atualizado!',
    error:   '❌ Erro',
  }[status];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">

      {/* Painel de logs */}
      {open && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-80 max-h-72 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
            <span className="text-xs font-semibold text-gray-300">Log do Scraper (FBref)</span>
            <div className="flex gap-1">
              <button
                onClick={() => setShowLogs(v => !v)}
                className="text-gray-400 hover:text-white p-0.5"
              >
                {showLogs ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {showLogs && (
            <div className="overflow-y-auto flex-1 p-3 space-y-1 font-mono text-[11px]">
              {logs.length === 0 && (
                <p className="text-gray-500 italic">Aguardando saída...</p>
              )}
              {logs.map((l, i) => (
                <p
                  key={i}
                  className={
                    l.startsWith('✅') ? 'text-green-400' :
                    l.startsWith('❌') ? 'text-red-400'   :
                    l.startsWith('⚠️') ? 'text-yellow-400' :
                    'text-gray-300'
                  }
                >
                  {l}
                </p>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}

          {status === 'done' && (
            <p className="text-center text-xs text-green-400 py-1 bg-green-900/20">
              Recarregando dados em instantes...
            </p>
          )}
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={status === 'running' ? undefined : runScraper}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-semibold shadow-lg transition-all ${statusColor}`}
        title="Rodar scraper do FBref e atualizar dados"
      >
        <RefreshCw size={16} className={status === 'running' ? 'animate-spin' : ''} />
        {statusLabel}
      </button>
    </div>
  );
}
