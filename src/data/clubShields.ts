/**
 * Mapeamento de ID do clube (Cartola FC) → escudo oficial via Wikipedia Commons.
 * Fallback automático para o escudo do Cartola caso a URL não carregue.
 * IDs confirmados da temporada 2025 (caRtola/data).
 */
export const OFFICIAL_SHIELDS: Record<number, string> = {
  262: 'https://commons.wikimedia.org/wiki/Special:FilePath/Flamengo_braz_logo.svg',         // Flamengo
  263: 'https://commons.wikimedia.org/wiki/Special:FilePath/Botafogo_de_Futebol_e_Regatas_logo.svg', // Botafogo
  264: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sport_Club_Corinthians_Paulista_crest.svg', // Corinthians
  265: 'https://commons.wikimedia.org/wiki/Special:FilePath/Esporte_Clube_Bahia_logo.svg',    // Bahia
  266: 'https://commons.wikimedia.org/wiki/Special:FilePath/Fluminense_Football_Club.svg',    // Fluminense
  267: 'https://commons.wikimedia.org/wiki/Special:FilePath/CR_Vasco_da_Gama.svg',            // Vasco da Gama
  275: 'https://commons.wikimedia.org/wiki/Special:FilePath/Palmeiras_logo.svg',              // Palmeiras
  276: 'https://commons.wikimedia.org/wiki/Special:FilePath/Brasao_do_Sao_Paulo_Futebol_Clube.svg', // São Paulo
  277: 'https://commons.wikimedia.org/wiki/Special:FilePath/Santos_logo.svg',                 // Santos
  280: 'https://commons.wikimedia.org/wiki/Special:FilePath/Red_Bull_Bragantino_(logo).svg',  // Red Bull Bragantino
  282: 'https://commons.wikimedia.org/wiki/Special:FilePath/Clube_Atl%C3%A9tico_Mineiro_logo.svg', // Atlético Mineiro
  283: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cruzeiro_EC.svg',                 // Cruzeiro
  284: 'https://commons.wikimedia.org/wiki/Special:FilePath/Gremio_logo.svg',                 // Grêmio
  285: 'https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_do_Sport_Club_Internacional.svg', // Internacional
  286: 'https://commons.wikimedia.org/wiki/Special:FilePath/EC_Juventude.svg',                // Juventude
  287: 'https://commons.wikimedia.org/wiki/Special:FilePath/Esporte_Clube_Vit%C3%B3ria_(2024).svg', // Vitória
  292: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sport_Club_do_Recife.svg',        // Sport
  293: 'https://commons.wikimedia.org/wiki/Special:FilePath/Athletico_Paranaense_(Logo_2019).svg', // Athletico PR
  354: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cear%C3%A1_Sporting_Club_logo.svg', // Ceará
  356: 'https://commons.wikimedia.org/wiki/Special:FilePath/Fortaleza_Esporte_Clube_logo.svg', // Fortaleza
  2305: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mirassol_FC_logo.png',           // Mirassol
};

/** Retorna o escudo oficial do clube. Se não houver mapeamento, retorna o fallback do Cartola. */
export function getClubShield(clubId: number, cartolaFallback?: string): string {
  return OFFICIAL_SHIELDS[clubId] ?? cartolaFallback ?? '';
}
