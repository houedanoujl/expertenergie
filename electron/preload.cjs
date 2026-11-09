// Pont entre la page et l'application : seulement les actions de l'écran d'administration.
// Le code d'accès est vérifié dans le processus principal, jamais dans la page.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('kiosk', {
  unlock: pin => ipcRenderer.invoke('kiosk:unlock', String(pin ?? '')),
  lock: () => ipcRenderer.invoke('kiosk:lock'),
  stats: () => ipcRenderer.invoke('kiosk:stats'),
  exportCsv: () => ipcRenderer.invoke('kiosk:export'),
  reload: () => ipcRenderer.invoke('kiosk:reload'),
  quit: () => ipcRenderer.invoke('kiosk:quit'),
})
