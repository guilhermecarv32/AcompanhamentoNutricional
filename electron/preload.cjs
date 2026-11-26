const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  listProfiles: () => ipcRenderer.invoke('db:profiles:list'),
  createProfile: (name) => ipcRenderer.invoke('db:profiles:create', name),
  renameProfile: (id, name) =>
    ipcRenderer.invoke('db:profiles:rename', { id, name }),
  deleteProfile: (id) => ipcRenderer.invoke('db:profiles:delete', id),
  getSetting: (key) => ipcRenderer.invoke('db:settings:get', key),
  setSetting: (key, value) =>
    ipcRenderer.invoke('db:settings:set', { key, value }),
  getPaths: () => ipcRenderer.invoke('app:getPaths'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeToggle: () => ipcRenderer.invoke('window:maximizeToggle'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
})
