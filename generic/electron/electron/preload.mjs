import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  // Add safe APIs here if you need them later.
})
