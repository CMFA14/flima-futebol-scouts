import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Brasileirão Série A = tournament 325
// Seasons: 2026 = 87631 | 2025 = 73383 | 2024 = 58766
// ⚠️ Atualize SEASON_ID quando a temporada mudar
const TOURNAMENT_ID = 325;
const SEASON_ID = 87631; // 2026

// Mapeamento: cartolaId -> sofascoreId
// Times para o Brasileirão 2026 (confirmados)
// Times confirmados na Série A 2026
// Sofascore IDs obtidos diretamente da API de standings 2026
const TEAMS_MAPPING = [
  { cartolaId: 262,  sofascoreId: 5981,  name: 'Flamengo' },
  { cartolaId: 275,  sofascoreId: 1963,  name: 'Palmeiras' },
  { cartolaId: 264,  sofascoreId: 1957,  name: 'Corinthians' },
  { cartolaId: 276,  sofascoreId: 1981,  name: 'São Paulo' },
  { cartolaId: 266,  sofascoreId: 1961,  name: 'Fluminense' },
  { cartolaId: 267,  sofascoreId: 1974,  name: 'Vasco' },
  { cartolaId: 263,  sofascoreId: 1958,  name: 'Botafogo' },
  { cartolaId: 282,  sofascoreId: 1977,  name: 'Atlético-MG' },
  { cartolaId: 284,  sofascoreId: 5926,  name: 'Grêmio' },
  { cartolaId: 285,  sofascoreId: 1966,  name: 'Internacional' },
  { cartolaId: 283,  sofascoreId: 1954,  name: 'Cruzeiro' },
  { cartolaId: 265,  sofascoreId: 1955,  name: 'Bahia' },
  { cartolaId: 287,  sofascoreId: 1962,  name: 'Vitória' },
  { cartolaId: 280,  sofascoreId: 1999,  name: 'Bragantino' },
  { cartolaId: 291,  sofascoreId: 1967,  name: 'Coritiba' },
  { cartolaId: 270,  sofascoreId: 21845, name: 'Chapecoense' },
  { cartolaId: 314,  sofascoreId: 2012,  name: 'Remo' },
  { cartolaId: 370,  sofascoreId: 21982, name: 'Mirassol' },
  { cartolaId: 277,  sofascoreId: 1968,  name: 'Santos' },
  { cartolaId: 288,  sofascoreId: 1942,  name: 'Sport' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json'
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

async function scrapeData() {
  console.log('Iniciando extração de dados da Sofascore (via API Aberta)...');
  
  const sofascoreDict = {};
  
  for (const team of TEAMS_MAPPING) {
    console.log(`Buscando estatísticas de ${team.name} (ID: ${team.sofascoreId})...`);
    const url = `https://api.sofascore.com/api/v1/team/${team.sofascoreId}/unique-tournament/${TOURNAMENT_ID}/season/${SEASON_ID}/statistics/overall`;
    
    try {
      const statsObj = await fetchJson(url);
      
      // Salva usando o ID do Cartola como chave para facilitar o cruzamento no front-end
      sofascoreDict[team.cartolaId] = {
        name: team.name,
        sofascoreId: team.sofascoreId,
        statistics: statsObj.statistics
      };
      
      // Delay de 800ms para evitar bloqueios de WAF (Cloudflare) da Sofascore API aberta
      await new Promise(r => setTimeout(r, 800));
    } catch(err) {
      console.warn(`[!] Erro ao baixar ${team.name}:`, err.message);
    }
  }
  
  const outputPath = path.join(__dirname, '../src/data/sofascore_data.json');
  
  // Garantir diretório criado
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(sofascoreDict, null, 2));
  console.log(`\n✅ Sucesso! Dados estáticos salvos e cacheados em: ${outputPath}`);
  console.log('Isso economizará centenas de requisições à sua RapidAPI mensais!');
}

scrapeData();
