import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load cartola data
const cartolaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/cartola_data.json'), 'utf-8'));

const searchTerms = ['Coritiba', 'Chapecoense', 'Remo', 'Mirassol', 'Sport', 'Santos', 'Vitória', 'Vitoria', 'Athletico', 'Fortaleza'];

console.log('=== Clubes Cartola ===');
Object.entries(cartolaData.clubes).forEach(([id, club]) => {
  const nome = club.nome || '';
  if (searchTerms.some(t => nome.toLowerCase().includes(t.toLowerCase()))) {
    console.log(`cartolaId: ${id}, nome: "${nome}" (abrev: ${club.abreviacao})`);
  }
});

// Also get ALL clubs for reference
console.log('\n=== TODOS OS CLUBES ===');
Object.entries(cartolaData.clubes).forEach(([id, club]) => {
  console.log(`${id}: ${club.nome}`);
});
