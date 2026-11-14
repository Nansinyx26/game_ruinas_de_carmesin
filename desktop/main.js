'use strict';
// ECLIPSE ZERO · Versão de PC (Electron)
// ---------------------------------------------------------------------------
// O app de PC abre A MESMA versão publicada na web (config.json → url): toda atualização do jogo
// chega às duas ao mesmo tempo, sem baixar instalador de novo. O que já foi jogado fica guardado
// pelo service worker do jogo (sw.js), então o app abre sem internet depois da primeira vez.
// Diferenças da aba do navegador: janela própria sem barras, F11 para tela cheia, a placa de vídeo
// dedicada pedida ao sistema, sem limitar os quadros quando a janela perde o foco.
// Segurança: a página não tem acesso ao Node (contextIsolation, sandbox); links para fora abrem no
// navegador do sistema; a janela só navega dentro do endereço do jogo.
// Gerar o instalador: cd desktop && npm install && npm run pacote (ou o workflow "Versão de PC").
// ---------------------------------------------------------------------------
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const ORIGEM = new URL(CONFIG.url);

// a placa de vídeo dedicada e o WebGL mesmo em placas da lista de bloqueio do Chromium
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

function dentro(url) {
  try { const u = new URL(url); return u.origin === ORIGEM.origin && u.pathname.startsWith(ORIGEM.pathname); } catch (e) { return false; }
}

function abrir() {
  const w = new BrowserWindow({
    width: 1600, height: 900, minWidth: 960, minHeight: 540, backgroundColor: '#05090f', title: CONFIG.titulo, autoHideMenuBar: true, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  Menu.setApplicationMenu(null);
  w.once('ready-to-show', () => w.show());
  const offline = () => w.loadFile(path.join(__dirname, 'offline.html'));
  w.webContents.on('did-fail-load', (e, codigo, desc, url, principal) => { if (principal && codigo !== -3) offline(); });
  w.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  w.webContents.on('will-navigate', (e, url) => { if (!dentro(url) && !url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  w.webContents.on('before-input-event', (e, k) => {
    if (k.type !== 'keyDown') return;
    if (k.key === 'F11') { w.setFullScreen(!w.isFullScreen()); e.preventDefault(); }
    if (k.key === 'F5') { w.loadURL(CONFIG.url); e.preventDefault(); }   // (também volta da tela sem internet)
  });
  w.loadURL(CONFIG.url).catch(offline);
}

app.whenReady().then(abrir);
app.on('window-all-closed', () => app.quit());
