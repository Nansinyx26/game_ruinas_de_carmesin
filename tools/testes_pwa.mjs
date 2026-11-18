// ECLIPSE ZERO · Testes automatizados da configuração PWA e Mobile
// ---------------------------------------------------------------------------
// Valida manifest.webmanifest, service worker (sw.js), ícones, meta tags iOS/Android,
// instruções de instalação, responsividade e controles de toque.
// Uso: node tools/testes_pwa.mjs
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let aprovados = 0;
let falhas = 0;
const lista = [];

function testar(nome, cond, detalhe) {
  if (cond) {
    aprovados++;
    lista.push({ nome, ok: true });
    console.log(`  ✓ ${nome}`);
  } else {
    falhas++;
    lista.push({ nome, ok: false, detalhe });
    console.error(`  ✗ ${nome}: ${detalhe || 'falha na verificação'}`);
  }
}

console.log('=== TESTES DE CONFIGURAÇÃO PWA E MOBILE ===\n');

// 1. Manifest
console.log('--- 1. Web App Manifest (manifest.webmanifest) ---');
const manifestPath = path.join(raiz, 'manifest.webmanifest');
testar('manifest.webmanifest existe', fs.existsSync(manifestPath));

let manifest = null;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  testar('manifest.webmanifest é JSON válido', true);
} catch (e) {
  testar('manifest.webmanifest é JSON válido', false, e.message);
}

if (manifest) {
  testar('Manifest possui name ("ECLIPSE ZERO")', manifest.name === 'ECLIPSE ZERO');
  testar('Manifest possui short_name', Boolean(manifest.short_name));
  testar('Manifest possui start_url válida', manifest.start_url === './jogar.html' || manifest.start_url === 'jogar.html');
  testar('Manifest display é fullscreen ou standalone', manifest.display === 'fullscreen' || manifest.display === 'standalone');
  testar('Manifest display_override suporta standalone', Array.isArray(manifest.display_override) && manifest.display_override.includes('standalone'));
  testar('Manifest orientation é landscape', manifest.orientation === 'landscape');
  testar('Manifest possui background_color e theme_color', Boolean(manifest.background_color) && Boolean(manifest.theme_color));
  
  testar('Manifest possui ícones declarados', Array.isArray(manifest.icons) && manifest.icons.length >= 2);
  let tem192 = false, tem512 = false, temMaskable = false;
  for (const ic of manifest.icons || []) {
    const p = path.join(raiz, ic.src);
    const existe = fs.existsSync(p);
    testar(`Ícone ${ic.src} (${ic.sizes}) existe no disco`, existe);
    if (ic.sizes === '192x192') tem192 = true;
    if (ic.sizes === '512x512' && ic.purpose !== 'maskable') tem512 = true;
    if (ic.purpose === 'maskable') temMaskable = true;
  }
  testar('Manifest tem ícone 192x192 para Android', tem192);
  testar('Manifest tem ícone 512x512 para splash screen', tem512);
  testar('Manifest tem ícone maskable (adaptativo Android)', temMaskable);
}

// 2. Service Worker
console.log('\n--- 2. Service Worker (sw.js) ---');
const swPath = path.join(raiz, 'sw.js');
testar('sw.js existe', fs.existsSync(swPath));
const swContent = fs.readFileSync(swPath, 'utf8');

testar('sw.js define versão de cache', /const VERSAO\s*=\s*['"][^'"]+['"]/.test(swContent));
testar('sw.js trata evento "install"', swContent.includes("addEventListener('install'"));
testar('sw.js trata evento "activate"', swContent.includes("addEventListener('activate'"));
testar('sw.js trata evento "fetch"', swContent.includes("addEventListener('fetch'"));
testar('sw.js usa skipWaiting e clients.claim', swContent.includes('skipWaiting()') && swContent.includes('clients.claim()'));
testar('sw.js implementa rede-primeiro para código (evita bugs de versão)', swContent.includes('cache: \'no-cache\'') && swContent.includes('codigo'));
testar('sw.js implementa cache-primeiro para mídias/modelos GLB', swContent.includes('if (salvo && !codigo) return salvo'));

// Verifica arquivos do ESSENCIAL
const matchEssencial = swContent.match(/const ESSENCIAL\s*=\s*\[([^\]]+)\]/);
if (matchEssencial) {
  const itens = matchEssencial[1].split(',').map(s => s.trim().replace(/^['"]\.\/|['"]$/g, '')).filter(Boolean);
  for (const item of itens) {
    if (item === '') continue; // raiz './'
    const p = path.join(raiz, item);
    testar(`Arquivo essencial do SW "${item}" existe`, fs.existsSync(p));
  }
}

// 3. index.html (Landing page + Instalação)
console.log('\n--- 3. Landing Page & Instalação PWA (index.html) ---');
const indexPath = path.join(raiz, 'index.html');
testar('index.html existe', fs.existsSync(indexPath));
const indexContent = fs.readFileSync(indexPath, 'utf8');

testar('index.html possui meta viewport', indexContent.includes('<meta name="viewport"'));
testar('index.html referencia manifest.webmanifest', indexContent.includes('manifest.webmanifest'));
testar('index.html referencia apple-touch-icon', indexContent.includes('apple-touch-icon'));
testar('index.html possui botão de instalação no celular (#instalar)', indexContent.includes('id="instalar"'));
testar('index.html escuta evento "beforeinstallprompt" do Android', indexContent.includes('beforeinstallprompt'));
testar('index.html escuta evento "appinstalled"', indexContent.includes('appinstalled'));
testar('index.html detecta modo standalone/fullscreen já instalado', indexContent.includes('display-mode: standalone') || indexContent.includes('display-mode: fullscreen'));
testar('index.html possui instruções específicas para Safari/iOS', indexContent.includes('Compartilhar') && indexContent.includes('Adicionar à Tela de Início'));
testar('index.html registra service worker com protocolo seguro', indexContent.includes('navigator.serviceWorker.register'));

// 4. jogar.html (Tela do Jogo + Mobile)
console.log('\n--- 4. Jogo & Controles Mobile (jogar.html) ---');
const jogarPath = path.join(raiz, 'jogar.html');
testar('jogar.html existe', fs.existsSync(jogarPath));
const jogarContent = fs.readFileSync(jogarPath, 'utf8');

testar('jogar.html possui meta viewport mobile', jogarContent.includes('name="viewport"') && jogarContent.includes('width=device-width'));
testar('jogar.html referencia manifest.webmanifest', jogarContent.includes('manifest.webmanifest'));
testar('jogar.html referencia apple-touch-icon', jogarContent.includes('apple-touch-icon'));
testar('jogar.html carrega script de controles de toque (js/touch.js)', jogarContent.includes('js/touch.js'));

// 5. Controles de Toque (js/touch.js)
console.log('\n--- 5. Sistema de Toque (js/touch.js) ---');
const touchPath = path.join(raiz, 'js/touch.js');
testar('js/touch.js existe', fs.existsSync(touchPath));
const touchContent = fs.readFileSync(touchPath, 'utf8');

testar('touch.js trata touchstart, touchmove, touchend, touchcancel', 
  touchContent.includes('touchstart') && touchContent.includes('touchmove') && 
  touchContent.includes('touchend') && touchContent.includes('touchcancel'));
testar('touch.js implementa analógico virtual (stick)', touchContent.includes('this.stick'));
testar('touch.js ativa automaticamente ao toque ou por URL (?touch=1)', touchContent.includes('touch=1'));

console.log(`\n========================================`);
console.log(`RESULTADO PWA: ${aprovados}/${aprovados + falhas} aprovados, ${falhas} falhas`);
console.log(`========================================\n`);

process.exit(falhas > 0 ? 1 : 0);

