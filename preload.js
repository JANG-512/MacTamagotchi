const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onCpuUpdate: (callback) => ipcRenderer.on('cpu-update', (_event, value) => callback(value))
});
