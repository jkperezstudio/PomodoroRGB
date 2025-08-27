const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close'),
});

contextBridge.exposeInMainWorld('rgb', {
    action: (name) => ipcRenderer.send('rgb-action', name)
});
