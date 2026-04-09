import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function globoAuthPlugin() {
  return {
    name: 'globo-auth-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/auth/globo' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { email, password } = JSON.parse(body);
              if (!email || !password) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Email and password are required' }));
              }

              console.log('>>> Abrindo Navegador Reais (Puppeteer) para Auth Globo...');
              const browser = await puppeteer.launch({
                headless: false,
                defaultViewport: null,
                args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
              });

              const page = await browser.newPage();
              let glbId: string | null = null;
              let authError: string | null = null;

              await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

              page.on('response', async (response) => {
                const url = response.url();
                if (url.includes('api/authentication') && response.request().method() === 'POST') {
                  try {
                    const data = await response.json();
                    if (data.glbId) glbId = data.glbId;
                    else if (data.id === 'Authentication Error' || data.userMessage) {
                      authError = data.userMessage || 'E-mail ou senha inválidos';
                    }
                  } catch (e) {}
                }
              });

              await page.goto('https://login.globo.com/login/4728', { waitUntil: 'networkidle2' });

              try {
                await page.waitForSelector('#login', { visible: true, timeout: 5000 });
                await page.focus('#login');
                await page.evaluate(() => (document.getElementById('login') as HTMLInputElement).value = '');
                await page.type('#login', email, { delay: 50 });
                
                // Tratar se a senha está na mesma tela ou tem botão próximo
                const passwordField = await page.$('#password');
                if (!passwordField) {
                   const nextBtn = await page.$('button[type="submit"]');
                   if (nextBtn) await nextBtn.click();
                }

                await page.waitForSelector('#password', { visible: true, timeout: 5000 });
                await page.focus('#password');
                await page.evaluate(() => (document.getElementById('password') as HTMLInputElement).value = '');
                await page.type('#password', password, { delay: 50 });
                
                await page.click('button[type="submit"]');
              } catch (e: any) {
                console.log('Auto-preenchimento pausado (Captcha?). Preencha manualmente na janela aberta.');
              }

              // Aguardar captura do Token
              for (let i = 0; i < 120; i++) { // Até 2 minutos
                if (glbId || authError || !browser.connected) break;
                
                try {
                  const cookies = await page.cookies();
                  const glbCookie = cookies.find(c => c.name.toLowerCase() === 'glbid');
                  if (glbCookie && glbCookie.value) {
                    glbId = glbCookie.value;
                    break;
                  }
                } catch(e) {}
                await new Promise(r => setTimeout(r, 1000));
              }

              if (browser.connected) await browser.close();

              res.setHeader('Content-Type', 'application/json');
              if (glbId) {
                console.log('>>> Login Realizado! GLBID interceptado com sucesso.');
                res.end(JSON.stringify({ glbId }));
              } else if (authError) {
                 res.statusCode = 401;
                 res.end(JSON.stringify({ error: authError }));
              } else {
                 res.statusCode = 401;
                 res.end(JSON.stringify({ error: 'Autenticação abortada ou falhou. Tente novamente.' }));
              }

            } catch (error: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

function fbrefScraperPlugin() {
  return {
    name: 'fbref-scraper-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/scrape/fbref' && req.method === 'POST') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });

          const send = (msg: string) => res.write(`data: ${msg}\n\n`);
          send('🔄 Iniciando scraper do FBref...');

          const scriptPath = path.resolve(__dirname, 'scripts/scraper.js');
          const child = spawn('node', ['--experimental-vm-modules', scriptPath], {
            cwd: __dirname,
            env: { ...process.env },
          });

          child.stdout.on('data', (chunk: Buffer) => {
            chunk.toString().split('\n').filter(Boolean).forEach((line: string) => send(line));
          });
          child.stderr.on('data', (chunk: Buffer) => {
            chunk.toString().split('\n').filter(Boolean).forEach((line: string) => send(`⚠️ ${line}`));
          });
          child.on('close', (code: number) => {
            send(code === 0 ? '✅ DONE' : `❌ ERRO (código ${code})`);
            res.end();
          });
          child.on('error', (err: Error) => {
            send(`❌ Falha ao iniciar scraper: ${err.message}`);
            res.end();
          });
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), globoAuthPlugin(), fbrefScraperPlugin()],
  server: {
    proxy: {
      '/api/cartola': {
        target: 'https://api.cartola.globo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cartola/, ''),
        headers: {
          'Origin': 'https://cartola.globo.com',
          'Referer': 'https://cartola.globo.com/#!/mercado/escalacao',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        },
        configure: (proxy: any) => {
          proxy.on('proxyReq', (proxyReq: any, req: any) => {
            const glbid = req.headers['x-glb-token'];
            console.log(`[ProxyReq] ${req.method} ${req.url} | Token exists: ${!!glbid} | Len: ${glbid ? glbid.length : 0}`);
            if (glbid) {
              const currentCookies = proxyReq.getHeader('Cookie');
              const newCookie = currentCookies ? `${currentCookies}; glbid=${glbid}` : `glbid=${glbid}`;
              proxyReq.setHeader('Cookie', newCookie);
            }
          });
          proxy.on('proxyRes', (proxyRes: any, req: any, res: any) => {
            let body = [] as any[];
            proxyRes.on('data', (chunk: any) => body.push(chunk));
            proxyRes.on('end', () => {
              if (req.url.includes('/auth/time/salvar')) {
                const responseString = Buffer.concat(body).toString();
                console.log(`[ProxyRes] ${req.method} ${req.url} -> Status: ${proxyRes.statusCode}`);
                console.log(`[ProxyRes Body]`, responseString.slice(0, 300));
              }
            });
          });
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
