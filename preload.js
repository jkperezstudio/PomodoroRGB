const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rgb', {
    action: (name) => ipcRenderer.send('rgb-action', name)
});
