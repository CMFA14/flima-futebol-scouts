import { CartolaData, CartolaMatches, PlayerMatchHistory } from '../types';

const PROXY_URL = '/api/cartola/';

export const fetchMercado = async (): Promise<CartolaData> => {
  try {
    const res = await fetch(`${PROXY_URL}atletas/mercado`);
    if (!res.ok) throw new Error('Failed to fetch mercado');
    return res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchMercadoStatus = async (): Promise<any> => {
  try {
    const res = await fetch(`${PROXY_URL}mercado/status`);
    if (!res.ok) throw new Error('Failed to fetch mercado status');
    return res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchPartidas = async (): Promise<CartolaMatches> => {
  try {
    const res = await fetch(`${PROXY_URL}partidas`);
    if (!res.ok) throw new Error('Failed to fetch partidas');
    return res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchPontuados = async (): Promise<any> => {
  try {
    const res = await fetch(`${PROXY_URL}atletas/pontuados`);
    if (!res.ok) throw new Error('Failed to fetch pontuados');
    return res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchPontuadosRodada = async (rodada: number): Promise<any> => {
  try {
    const res = await fetch(`${PROXY_URL}atletas/pontuados/${rodada}`);
    if (!res.ok) throw new Error(`Failed to fetch pontuados rodada ${rodada}`);
    return res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/** Busca times por nome — endpoint público, sem autenticação */
export const searchTeams = async (query: string): Promise<any[]> => {
  const url = `${PROXY_URL}times?q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro na busca (${res.status})`);
  return res.json();
};

/** Retorna todos os clubes do Brasileirão com seus escudos — endpoint público */
export const fetchClubes = async (): Promise<Record<string, any>> => {
  const res = await fetch(`${PROXY_URL}clubes`);
  if (!res.ok) throw new Error('Erro ao buscar clubes');
  return res.json(); // { "262": { nome, abreviacao, escudos: { "60x60": url, ... } }, ... }
};

/** Busca o time pelo ID público — sem autenticação */
export const fetchTeamById = async (id: number): Promise<any> => {
  const url = `${PROXY_URL}time/id/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ao buscar time (${res.status})`);
  const json = await res.json();
  if (!json.atletas || json.atletas.length === 0) {
    throw new Error(json.mensagem || 'Este time ainda não foi escalado nesta rodada.');
  }
  return json;
};

// Removes PROXIES array since we now use Vite local proxy
export const fetchUserTeam = async (token: string): Promise<any> => {
  const TARGET = `${PROXY_URL}auth/time`;

  const errors: string[] = [];

  try {
    const res = await fetch(TARGET, {
      method: 'GET',
      headers: {
        'X-GLB-Token': token,
        'x-glb-token': token,
        'Authorization': `Bearer ${token}`,
      }
    });

    const text = await res.text();
    console.log(`[fetchUserTeam] local-proxy status=${res.status} body=${text.slice(0, 200)}`);

    if (res.ok) {
      try { return JSON.parse(text); } catch { return {}; }
    }
    errors.push(`local-proxy → HTTP ${res.status}: ${text.slice(0, 100)}`);
  } catch (e: any) {
    errors.push(`local-proxy → ${e.message}`);
  }

  // Tenta também via query param
  try {
    const urlQP = `${TARGET}?glbid=${encodeURIComponent(token)}`;
    const res = await fetch(urlQP);
    const text = await res.text();
    console.log(`[fetchUserTeam] query-param status=${res.status} body=${text.slice(0, 200)}`);
    if (res.ok) {
      try { return JSON.parse(text); } catch { return {}; }
    }
    errors.push(`query-param → HTTP ${res.status}: ${text.slice(0, 100)}`);
  } catch (e: any) {
    errors.push(`query-param → ${e.message}`);
  }

  console.error('[fetchUserTeam] Todas as tentativas falharam:', errors);
  throw new Error(`Falha ao obter o time do usuário. Detalhes no console (F12).\n${errors[0]}`);
};

export const authenticateGlobo = async (email: string, password: string): Promise<string> => {
  try {
    const res = await fetch(`/api/auth/globo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || 'Autenticação falhou.');
    }

    if (data.glbId) {
      return data.glbId; // Cartola accepts glbId
    }

    throw new Error('Não foi possível obter o token de acesso (GLBID).');
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const submitLineup = async (token: string, payload: any): Promise<any> => {
  try {
    const res = await fetch(`${PROXY_URL}auth/time/salvar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GLB-Token': token
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = 'Failed to apply lineup';
      try {
        msg = JSON.parse(errText).mensagem || msg;
      } catch {
        // Fallback to generic message
      }
      throw new Error(msg);
    }

    return res.json();
  } catch (error) {
    console.error('Error submitting lineup:', error);
    throw error;
  }
};

export const fetchPlayerHistory = async (rodadaAtual: number, limite: number = 3): Promise<Record<number, PlayerMatchHistory[]>> => {
  const history: Record<number, PlayerMatchHistory[]> = {};
  
  const fetchPromises = [];
  
  for(let i = 1; i <= limite; i++) {
    const rodadaObj = rodadaAtual - i;
    if (rodadaObj <= 0) break;
    
    fetchPromises.push(
      Promise.all([
        fetch(`${PROXY_URL}atletas/pontuados/${rodadaObj}`).then(res => res.ok ? res.json() : null),
        fetch(`${PROXY_URL}partidas/${rodadaObj}`).then(res => res.ok ? res.json() : null)
      ]).then(([data, partidasData]) => {
          if (!data || !data.atletas) return;
          
          let partidas: any[] = [];
          if (partidasData && partidasData.partidas) {
            partidas = partidasData.partidas;
          }

          Object.entries(data.atletas).forEach(([atletaIdStr, atleta]: [string, any]) => {
            const alertaId = Number(atletaIdStr);
            if (!history[alertaId]) {
              history[alertaId] = [];
            }

            const playerClubId = atleta.clube_id;
            let opponentId;
            let isHome;
            if (partidas.length > 0 && playerClubId) {
               const match = partidas.find((p: any) => p.clube_casa_id === playerClubId || p.clube_visitante_id === playerClubId);
               if (match) {
                 isHome = match.clube_casa_id === playerClubId;
                 opponentId = isHome ? match.clube_visitante_id : match.clube_casa_id;
               }
            }

            history[alertaId].push({
              rodada: rodadaObj,
              pontos: atleta.pontuacao || 0,
              scout: atleta.scout || {},
              opponent_id: opponentId,
              isHome: isHome
            });
          });
      }).catch(console.error)
    );
  }
  
  await Promise.all(fetchPromises);
  
  Object.keys(history).forEach(id => {
    history[Number(id)].sort((a, b) => b.rodada - a.rodada);
  });
  
  return history;
};
