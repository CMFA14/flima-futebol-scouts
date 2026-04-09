export interface Scout {
  G?: number; // Gol
  A?: number; // Assistência
  FT?: number; // Finalização na trave
  FD?: number; // Finalização defendida
  FF?: number; // Finalização para fora
  FS?: number; // Falta sofrida
  PS?: number; // Pênalti sofrido
  DP?: number; // Defesa de pênalti
  SG?: number; // Jogo sem sofrer gol
  DE?: number; // Defesa
  DS?: number; // Desarme
  PP?: number; // Pênalti perdido
  FC?: number; // Falta cometida
  CR?: number; // Cartão vermelho
  CA?: number; // Cartão amarelo
  GS?: number; // Gol sofrido
  GC?: number; // Gol contra
  CV?: number; // Cartão vermelho
  PC?: number; // Pênalti cometido
  I?: number; // Impedimento
  V?: number; // Vitória
}

export interface PlayerMatchHistory {
  rodada: number;
  pontos: number;
  scout: Scout;
  opponent_id?: number;
  isHome?: boolean;
}

export interface MercadoStatus {
  status_mercado: number; // 1 = Aberto, 2 = Fechado, 3/4 = Manutenção, etc
  fechamento: {
    dia: number;
    mes: number;
    ano: number;
    hora: number;
    minuto: number;
    timestamp: number;
  };
}

export interface Player {
  atleta_id: number;
  apelido: string;
  foto: string;
  pontos_num: number;
  preco_num: number;
  variacao_num: number;
  media_num: number;
  jogos_num: number;
  clube_id: number;
  posicao_id: number;
  status_id: number;
  minimo_para_valorizar?: number;
  scout: Scout;
}

export interface Club {
  id: number;
  nome: string;
  abreviacao: string;
  escudos: {
    '60x60': string;
    '45x45': string;
    '30x30': string;
  };
}

export interface Position {
  id: number;
  nome: string;
  abreviacao: string;
}

export interface Match {
  clube_casa_id: number;
  clube_visitante_id: number;
  partida_data: string;
  local: string;
  valida: boolean;
}

export interface CartolaData {
  atletas: Player[];
  clubes: Record<string, Club>;
  posicoes: Record<string, Position>;
}

export interface CartolaMatches {
  partidas: Match[];
  rodada: number;
}

export interface FBrefClubStats {
  nome_fbref: string;
  posse: {
    desarmes_sofridos: number;
    perdas_posse: number;
  };
  defesa: {
    chutes_bloqueados: number;
    interceptacoes: number;
    gols_sofridos: number;
  };
  ataque: {
    gols_feitos: number;
    finalizacoes_alvo: number;
  };
  indisciplina?: {
    faltas_cometidas: number;
  };
}

// Parciais & Team Response Types
export interface PontuadoAtleta {
  apelido: string;
  pontuacao: number;
  scout: Scout;
  foto: string;
  posicao_id: number;
  clube_id: number;
  entrou_em_campo?: boolean;
}

export interface PontuadosResponse {
  atletas: Record<number, PontuadoAtleta>;
  clubes: Record<string, Club>;
  posicoes: Record<string, Position>;
}

export interface AtletaTimeUser {
  atleta_id: number;
  posicao_id: number;
}

export interface UserTeamResponse {
  atletas: AtletaTimeUser[];
  capitao_id: number;
  reservas: AtletaTimeUser[];
  time: {
    time_id: number;
    nome: string;
    nome_cartola: string;
    url_escudo_png: string;
    pontos: number;
    pontos_campeonato: number;
  };
}
