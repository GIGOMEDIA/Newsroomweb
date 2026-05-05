const { contextBridge, ipcRenderer } = require('electron');

ipcRenderer.on('menu-action', (_event, action) => {
  window.dispatchEvent(
    new CustomEvent('crednews:menu-action', {
      detail: { action },
    }),
  );
});

contextBridge.exposeInMainWorld('crednewsDesktop', {
  platform: process.platform,
});
