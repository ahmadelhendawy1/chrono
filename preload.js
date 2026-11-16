'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const id = Math.random().toString(36).slice(2, 10);
const on = (channel, cb) => ipcRenderer.on(channel, (_e, ...args) => cb(...args));

contextBridge.exposeInMainWorld('chrono', {
  id,
  platform: process.platform,
  getSettings: () => ipcRenderer.invoke('settings:get'),
  patch: (p) => ipcRenderer.invoke('settings:patch', p, id),
  reset: () => ipcRenderer.invoke('settings:reset', id),
  onSettings: (cb) => on('settings:changed', cb),
  getState: () => ipcRenderer.invoke('state:get'),
  weather: () => ipcRenderer.invoke('weather:get'),
  refreshWeather: () => ipcRenderer.invoke('weather:refresh'),
  onWeather: (cb) => on('weather:changed', cb),
  onWeatherError: (cb) => on('weather:error', cb),
  geo: (q, lang) => ipcRenderer.invoke('geo:search', q, lang),
  prayer: (offsetDays) => ipcRenderer.invoke('prayer:get', offsetDays || 0),
  getNotes: () => ipcRenderer.invoke('notes:get'),
  setNotes: (list) => ipcRenderer.invoke('notes:set', list, id),
  onNotes: (cb) => on('notes:changed', cb),
  popoutNote: (noteId) => ipcRenderer.send('notes:popout', noteId),
  resize: (w, h) => ipcRenderer.send('ui:size', w, h),
  hideWidget: (wid) => ipcRenderer.send('ui:hide-widget', wid),
  openSettings: (tab) => ipcRenderer.send('ui:open-settings', tab),
  onSettingsTab: (cb) => on('settings:tab', cb),
  closeSelf: () => ipcRenderer.send('ui:close-self'),
  collapseBar: (c) => ipcRenderer.send('bar:collapse', c),
  onBarCollapsed: (cb) => on('bar:collapsed', cb)
});
