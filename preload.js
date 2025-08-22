const { contextBridge, ipcRenderer } = require('electron');

// Exponemos funciones seguras al frontend
contextBridge.exposeInMainWorld('pomodoro', {
    start: (work, rest) => ipcRenderer.send('start-pomodoro', work, rest)
});
