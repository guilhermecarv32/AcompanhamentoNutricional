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
  listDietMeals: (profileId) => ipcRenderer.invoke('db:diet:list', profileId),
  getDietMeal: (id) => ipcRenderer.invoke('db:diet:get', id),
  createDietMeal: (profileId, meal) =>
    ipcRenderer.invoke('db:diet:create', { profileId, meal }),
  updateDietMeal: (id, meal) =>
    ipcRenderer.invoke('db:diet:update', { id, meal }),
  deleteDietMeal: (id) => ipcRenderer.invoke('db:diet:delete', id),
  listMealLogsByDay: (profileId, day) =>
    ipcRenderer.invoke('db:logs:listByDay', { profileId, day }),
  listMealLogsByRange: (profileId, fromDay, toDay) =>
    ipcRenderer.invoke('db:logs:listByRange', { profileId, fromDay, toDay }),
  getMealLog: (id) => ipcRenderer.invoke('db:logs:get', id),
  createMealLog: (profileId, log) =>
    ipcRenderer.invoke('db:logs:create', { profileId, log }),
  updateMealLog: (id, log) =>
    ipcRenderer.invoke('db:logs:update', { id, log }),
  deleteMealLog: (id) => ipcRenderer.invoke('db:logs:delete', id),
  getMetricsSummary: (profileId) =>
    ipcRenderer.invoke('db:metrics:summary', profileId),
  listWeights: (profileId, limit) =>
    ipcRenderer.invoke('db:metrics:weights:list', { profileId, limit }),
  createWeight: (profileId, payload) =>
    ipcRenderer.invoke('db:metrics:weights:create', { profileId, payload }),
  updateWeight: (id, payload) =>
    ipcRenderer.invoke('db:metrics:weights:update', { id, payload }),
  deleteWeight: (id) => ipcRenderer.invoke('db:metrics:weights:delete', id),
  listBodyMetrics: (profileId, limit) =>
    ipcRenderer.invoke('db:metrics:body:list', { profileId, limit }),
  createBodyMetrics: (profileId, payload) =>
    ipcRenderer.invoke('db:metrics:body:create', { profileId, payload }),
  deleteBodyMetrics: (id) =>
    ipcRenderer.invoke('db:metrics:body:delete', id),
  listWorkouts: (profileId, limit) =>
    ipcRenderer.invoke('db:metrics:workouts:list', { profileId, limit }),
  createWorkout: (profileId, payload) =>
    ipcRenderer.invoke('db:metrics:workouts:create', { profileId, payload }),
  deleteWorkout: (id) => ipcRenderer.invoke('db:metrics:workouts:delete', id),
  listSleep: (profileId, limit) =>
    ipcRenderer.invoke('db:metrics:sleep:list', { profileId, limit }),
  createSleep: (profileId, payload) =>
    ipcRenderer.invoke('db:metrics:sleep:create', { profileId, payload }),
  deleteSleep: (id) => ipcRenderer.invoke('db:metrics:sleep:delete', id),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeToggle: () => ipcRenderer.invoke('window:maximizeToggle'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
})
