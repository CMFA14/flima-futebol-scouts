import pandas as pd
import requests
from bs4 import BeautifulSoup
import time
import json
import os
import re

print("Iniciando extração do FBref...")

# Dicionário de conversão de nomes do FBref para o padrão Cartola (Abreviações ou Nomes)
TEAM_MAP = {
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
}

# Configurações de requisição
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def clean_dataframe(df):
    """Achata as colunas do MultiIndex do FBref e limpa nomes de times."""
    # Achata as colunas se for MultiIndex
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ['_'.join(col).strip() if col[0] != col[1] else col[0] for col in df.columns]
        
    # O FBref costuma colocar coisas extras ou linhas de "Squad", etc.
    # Filtra as linhas de totalização
    df = df.dropna(subset=[df.columns[0]])
    return df

def fetch_table(url, table_index=0):
    print(f"Buscando URL: {url} ...")
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()

    # O comando read_html localiza as tags <table>
    tabelas = pd.read_html(response.text)
    time.sleep(4) # Rate limit crucial de 4 segundos
    return clean_dataframe(tabelas[table_index])

def fetch_table_by_id(url, table_id):
    """Busca uma tabela específica pelo atributo id (necessário para tabelas ocultas via comentários HTML)."""
    print(f"Buscando tabela '{table_id}' em: {url} ...")
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()

    # FBref envolve algumas tabelas em comentários HTML — precisamos descomentá-las
    html = response.text.replace("<!--", "").replace("-->", "")
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", {"id": table_id})
    if table is None:
        raise ValueError(f"Tabela com id='{table_id}' não encontrada em {url}")

    df = pd.read_html(str(table), header=1)[0]
    time.sleep(4)
    return clean_dataframe(df)

def process_fbref_data():
    # As URLs usam o ID da competição 24 para a Serie A do Brasil.
    # Essas URLs sempre podem mudar ligeiramente a cada temporada, então estamos parametrizando as rotas base.
    
    # 1. POSSE (Possession) - Para perdas de posses / desarmes sofridos
    url_possession = "https://fbref.com/pt/comps/24/possession/Estatisticas-Serie-A"
    
    # 2. DEFESA (Defense) - Para chutes bloqueados / interceptações
    url_defense = "https://fbref.com/pt/comps/24/defense/Estatisticas-Serie-A"
    
    # 3. xG (Expected Goals / Shooting) - Para cruzamento ofensivo
    url_shooting = "https://fbref.com/pt/comps/24/shooting/Estatisticas-Serie-A"

    # 4. MISC (Miscellaneous) - Para desarmes cedidos (TklW do adversário)
    url_misc = "https://fbref.com/en/comps/24/Serie-A-Stats"

    try:
        df_poss = fetch_table(url_possession)
        df_def = fetch_table(url_defense)
        df_shoot = fetch_table(url_shooting)
        df_misc_opp = fetch_table_by_id(url_misc, "stats_misc_opp")
        
        # Mapear os Dataframes para um dicionário combinando as stats por clube
        fbref_database = {}

        # Iterar linha por linha para construir o objeto JSON final (usando a tabela de defesa como base dos times)
        # O nome da coluna do time na maioria dessas páginas é 'Equipe' ou parecido
        team_col_poss = [c for c in df_poss.columns if 'Equipe' in c or 'Squad' in c][0]
        team_col_def = [c for c in df_def.columns if 'Equipe' in c or 'Squad' in c][0]
        team_col_shoot = [c for c in df_shoot.columns if 'Equipe' in c or 'Squad' in c][0]
        team_col_misc_opp = [c for c in df_misc_opp.columns if 'Squad' in c or 'Equipe' in c][0]
        
        for idx, row in df_poss.iterrows():
            raw_team_name = row[team_col_poss]
            # Algumas vezes vem com 'vs' (ex: "vs Flamengo" para atributos do adversário). Vamos tirar o "vs " se houver
            clean_name = re.sub(r'^vs\s+', '', str(raw_team_name)).strip()
            
            cartola_abbr = TEAM_MAP.get(clean_name, clean_name)
            
            # Pular linhas de total que o FBref injeta
            if raw_team_name == 'Total' or pd.isna(raw_team_name):
                continue
                
            fbref_database[cartola_abbr] = {
                "nome_fbref": clean_name,
                "posse": {
                    # Take-ons procurados - Desarmes Sofridos (Tackled)
                    "desarmes_sofridos": int(row.get('Desafios_Tkl', row.get('Desafios_Desarme', 0))),
                    # Perdas de Posse (Dispossessed, Miscontrols)
                    "perdas_posse": int(row.get('Carregadas_Perdida', 0)) + int(row.get('Carregadas_Corte', 0))
                }
            }
            
        for idx, row in df_def.iterrows():
            raw_team_name = row[team_col_def]
            clean_name = re.sub(r'^vs\s+', '', str(raw_team_name)).strip()
            cartola_abbr = TEAM_MAP.get(clean_name, clean_name)
            
            if cartola_abbr in fbref_database:
                fbref_database[cartola_abbr]["defesa"] = {
                    "chutes_bloqueados": int(row.get('Bloqueios_Chutes', 0)),
                    "interceptacoes": int(row.get('Int', 0)),
                    "desarmes_feitos": int(row.get('Desarmes_Tkl', row.get('Desarmes_Desarme', 0))) # Opcional pra cruzar
                }
                
        for idx, row in df_shoot.iterrows():
            raw_team_name = row[team_col_shoot]
            clean_name = re.sub(r'^vs\s+', '', str(raw_team_name)).strip()
            cartola_abbr = TEAM_MAP.get(clean_name, clean_name)
            
            if cartola_abbr in fbref_database:
                # O Pandas costuma converter colunas de float para object, vamos garantir
                try:
                    xg = float(row.get('Padrão_xG', 0))
                    gols = int(row.get('Padrão_Gols', 0))
                except (ValueError, TypeError):
                    xg = 0.0
                    gols = 0
                    
                fbref_database[cartola_abbr]["ataque"] = {
                    "gols_feitos": gols,
                    "xG": xg,
                    "finalizacoes_alvo": int(row.get('Padrão_SoA', 0))
                }
                
        # Desarmes cedidos: TklW da tabela de adversários (misc_opp)
        for idx, row in df_misc_opp.iterrows():
            raw_team_name = row[team_col_misc_opp]
            clean_name = re.sub(r'^vs\s+', '', str(raw_team_name)).strip()
            cartola_abbr = TEAM_MAP.get(clean_name, clean_name)

            if raw_team_name == 'Total' or pd.isna(raw_team_name):
                continue

            if cartola_abbr in fbref_database:
                fbref_database[cartola_abbr].setdefault("posse", {})["desarmes_sofridos"] = int(row.get('TklW', 0))

        # Garantir que o diretório target exista
        out_dir = os.path.join("src", "data")
        os.makedirs(out_dir, exist_ok=True)
        
        out_path = os.path.join(out_dir, "fbref_data.json")
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(fbref_database, f, ensure_ascii=False, indent=2)
            
        print(f"Sucesso! Dados salvos em {out_path} para {len(fbref_database)} clubes.")
        
    except Exception as e:
        import traceback
        print(f"Erro ao capturar dados do FBref:")
        traceback.print_exc()

if __name__ == "__main__":
    process_fbref_data()
