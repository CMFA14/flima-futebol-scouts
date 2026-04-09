import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

console.log("Iniciando extração do FBref com Puppeteer...");

const TEAM_MAP: Record<string, string> = {
    "Flamengo": "FLA",
    "Palmeiras": "PAL",
    "Atlético Mineiro": "CAM",
    "Botafogo (RJ)": "BOT",
    "São Paulo": "SAO",
    "Fluminense": "FLU",
    "Grêmio": "GRE",
    "Internacional": "INT",
    "Athletico Paranaense": "CAP",
    "Fortaleza": "FOR",
    "Corinthians": "COR",
    "Cruzeiro": "CRU",
    "Vasco da Gama": "VAS",
    "Bahia": "BAH",
    "Vitória": "VIT",
    "Juventude": "JUV",
    "Criciúma": "CRI",
    "Atlético Goianiense": "ACG",
    "Cuiabá": "CUI",
    "Red Bull Bragantino": "RBB"
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeTable(page: any, url: string, tableId: string, extractor: (row: Element) => any) {
    console.log(`Buscando ${tableId} em ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(4000);

    return await page.evaluate((tid: string, extractorStr: string) => {
        const extractor = new Function('row', `return (${extractorStr})(row)`);
        const results: any[] = [];
        const table = document.querySelector(`#${tid}`);
        if (!table) {
            console.warn(`Tabela #${tid} não encontrada`);
            return results;
        }
        table.querySelectorAll('tbody tr:not(.thead)').forEach((row: Element) => {
            const teamCell = row.querySelector('th[data-stat="team"], td[data-stat="team"]');
            const teamName = teamCell?.textContent?.trim().replace(/^vs\s+/, '');
            if (!teamName || teamName === 'Squad' || teamName === 'Total') return;
            const data = extractor(row);
            if (data) results.push({ team: teamName, ...data });
        });
        return results;
    }, tableId, extractor.toString());
}

async function scrapeFBref() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const fbrefDatabase: any = {};

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 1. POSSE — perdas_posse (dispossessed + miscontrols)
        const possData = await scrapeTable(
            page,
            'https://fbref.com/en/comps/24/possession/Serie-A-Possession-Stats',
            'stats_squads_possession_for',
            (row: Element) => {
                const get = (stat: string) => parseInt(row.querySelector(`td[data-stat="${stat}"]`)?.textContent || '0') || 0;
                return {
                    dispossessed: get('dispossessed'),
                    miscontrols: get('miscontrols')
                };
            }
        );

        // 2. DEFESA — interceptações e chutes bloqueados
        const defData = await scrapeTable(
            page,
            'https://fbref.com/en/comps/24/defense/Serie-A-Defense-Stats',
            'stats_squads_defense_for',
            (row: Element) => {
                const get = (stat: string) => parseInt(row.querySelector(`td[data-stat="${stat}"]`)?.textContent || '0') || 0;
                return {
                    blocks_shots: get('blocks_shots'),
                    interceptions: get('interceptions')
                };
            }
        );

        // 3. ATAQUE — xG, gols e finalizações no alvo
        const shootData = await scrapeTable(
            page,
            'https://fbref.com/en/comps/24/shooting/Serie-A-Shooting-Stats',
            'stats_squads_shooting_for',
            (row: Element) => {
                const get = (stat: string) => row.querySelector(`td[data-stat="${stat}"]`)?.textContent?.trim() || '0';
                return {
                    xg: parseFloat(get('xg')) || 0,
                    goals: parseInt(get('goals')) || 0,
                    shots_on_target: parseInt(get('shots_on_target')) || 0
                };
            }
        );

        // 4. DESARMES SOFRIDOS — TklW da tabela adversária (misc_opp)
        const miscOppData = await scrapeTable(
            page,
            'https://fbref.com/en/comps/24/misc/Serie-A-Miscellaneous-Stats',
            'stats_misc_opp',
            (row: Element) => {
                const get = (stat: string) => parseInt(row.querySelector(`td[data-stat="${stat}"]`)?.textContent || '0') || 0;
                return { tackles_won: get('tackles_won') };
            }
        );

        console.log(`possData: ${possData.length} times | defData: ${defData.length} | shootData: ${shootData.length} | miscOppData: ${miscOppData.length}`);

        // Consolidar
        possData.forEach((row: any) => {
            const abbr = TEAM_MAP[row.team] || row.team;
            fbrefDatabase[abbr] = {
                nome_fbref: row.team,
                posse: {
                    desarmes_sofridos: 0, // será preenchido pelo miscOppData
                    perdas_posse: (row.dispossessed || 0) + (row.miscontrols || 0)
                }
            };
        });

        defData.forEach((row: any) => {
            const abbr = TEAM_MAP[row.team] || row.team;
            if (fbrefDatabase[abbr]) {
                fbrefDatabase[abbr].defesa = {
                    chutes_bloqueados: row.blocks_shots || 0,
                    interceptacoes: row.interceptions || 0
                };
            }
        });

        shootData.forEach((row: any) => {
            const abbr = TEAM_MAP[row.team] || row.team;
            if (fbrefDatabase[abbr]) {
                fbrefDatabase[abbr].ataque = {
                    gols_feitos: row.goals || 0,
                    xG: row.xg || 0,
                    finalizacoes_alvo: row.shots_on_target || 0
                };
            }
        });

        miscOppData.forEach((row: any) => {
            const abbr = TEAM_MAP[row.team] || row.team;
            if (fbrefDatabase[abbr]) {
                fbrefDatabase[abbr].posse.desarmes_sofridos = row.tackles_won || 0;
            }
        });

        const outDir = path.join(process.cwd(), 'src', 'data');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        const outPath = path.join(outDir, 'fbref_data.json');
        fs.writeFileSync(outPath, JSON.stringify(fbrefDatabase, null, 2));

        console.log(`Sucesso! ${Object.keys(fbrefDatabase).length} clubes salvos em ${outPath}`);
        console.log("Amostra:", JSON.stringify(Object.entries(fbrefDatabase).slice(0, 2), null, 2));

    } catch (error) {
        console.error("Erro ao capturar dados do FBref:", error);
    } finally {
        await browser.close();
    }
}

scrapeFBref();
