// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Mapea estados del UI a acciones que entiende rgbctl.py
function mapStateToAction(state) {
    switch ((state || '').toLowerCase()) {
        case 'work': return 'work';
        case 'rest': return 'break';
        case 'longbreak': return 'break';
        case 'paused': return 'pause';
        case 'idle': return 'restore';   // arcoíris por defecto
        default: return 'restore';
    }
}

contextBridge.exposeInMainWorld('electronAPI', {
    changeLEDs: (state) => {
        const action = mapStateToAction(state);
        ipcRenderer.send('rgb-action', action);
    },
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close'),
    // Si más adelante quieres notificaciones/sonidos:
    showNotification: (title, body) => ipcRenderer.send('notify', { title, body }),
    playSound: () => ipcRenderer.send('play-sound'),
});
