const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let pythonProcess = null;

function createWindow() {
    const win = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,          // Seguridad activada
            nodeIntegration: false,          // Seguridad activada
            enableRemoteModule: false
        }
    });

    win.loadFile('index.html');
}

// 🧠 Lógica para lanzar el script Python
ipcMain.on('start-pomodoro', (event, work, rest) => {
    if (!pythonProcess) {
        const scriptPath = path.join(__dirname, 'pomodoro.py');

        pythonProcess = spawn('python', [scriptPath, work, rest]);

        pythonProcess.stdout.on('data', (data) => {
            console.log(`[PYTHON STDOUT] ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`[PYTHON STDERR] ${data}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`Python process exited with code ${code}`);
            pythonProcess = null;
        });
    }
});

app.whenReady().then(createWindow);
