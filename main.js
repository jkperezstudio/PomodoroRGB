const { app, BrowserWindow, ipcMain, powerMonitor } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

const OPENRGB_PATH = "C:\\Program Files\\OpenRGB\\OpenRGB.exe";
const OPENRGB_PORT = 6742;

// --- util: espera a que el puerto esté escuchando
function waitForPort(port, host = '127.0.0.1', retries = 60, delayMs = 500) {
    return new Promise((resolve, reject) => {
        const tryOnce = (left) => {
            const s = net.createConnection(port, host);
            s.once('connect', () => { s.end(); resolve(); });
            s.once('error', () => {
                s.destroy();
                if (left <= 1) reject(new Error('OpenRGB server not reachable'));
                else setTimeout(() => tryOnce(left - 1), delayMs);
            });
        };
        tryOnce(retries);
    });
}

// --- arranca OpenRGB (elevado si ya lo tienes así) y espera el socket
function ensureOpenRGBServer() {
    return waitForPort(OPENRGB_PORT).catch(() => {
        const child = spawn(OPENRGB_PATH, ['--server', '--startminimized'], {
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
        return waitForPort(OPENRGB_PORT);
    });
}

let didRestore = false;

async function restoreRGB() {
    if (didRestore) return;
    didRestore = true;
    try { await ensureOpenRGBServer(); } catch {/* no bloquees salida */ }
    const script = path.join(__dirname, 'rgbctl.py');
    // usa 'py -3' si es más fiable en tu máquina
    spawn('python', [script, 'restore'], { stdio: 'ignore', detached: true }).unref();
}

// Windows: cierre de sesión / apagado
app.on('session-end', restoreRGB);

// Señal de apagado del SO (power)
powerMonitor.on('shutdown', () => {
    restoreRGB();
});


function createWindow() {
    const win = new BrowserWindow({
        width: 400,
        height: 300,
        resizable: false,
        maximizable: false,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
            // Removemos enableBlinkFeatures ya que no es necesario
        }
    });
    win.loadFile('index.html');
    win.removeMenu();

    // Para depurar, puedes abrir las herramientas de desarrollo
    // win.webContents.openDevTools();
}

// --- NUEVO: acciones RGB atómicas (work/break/restore/off)
ipcMain.on('rgb-action', async (_event, action) => {
    try {
        await ensureOpenRGBServer();
    } catch (e) {
        console.error('No pude arrancar/conectar con OpenRGB:', e.message);
        return;
    }

    // Lanza rgbctl.py con la acción solicitada
    const script = path.join(__dirname, 'rgbctl.py');
    spawn('python', [script, String(action)], { stdio: 'ignore', detached: true }).unref();
});

ipcMain.on('window-minimize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win) win.minimize();
});
ipcMain.on('window-close', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win) win.close();
});

// (Opcional) Si quieres, elimina el handler viejo 'start-pomodoro'

// ---
app.on('before-quit', restoreRGB);
app.on('session-end', restoreRGB);
app.on('window-all-closed', () => {
    restoreRGB().finally(() => {
        app.quit(); // <-- esto fuerza la salida real
    });
});



process.on('exit', restoreRGB);

powerMonitor.on('shutdown', () => {
    restoreRGB();
});

app.whenReady().then(createWindow);

