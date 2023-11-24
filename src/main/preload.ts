// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import Store from 'electron-store';
import electron from 'electron';
export type Channels = 'resize-window';
const store = new Store();

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  openai: {
    openaiKey: (store.get('OpenAIKey') as string) ?? '',
    saveOpenAIKey(key: string) {
      store.set('OpenAIKey', key);
    },
    deleteOpenAIKey() {
      store.delete('OpenAIKey');
    },
  },
};

const utilsHandler = {
  clipboardWrite(content: string) {
    electron.clipboard.writeText(content);
  },
  isDebug:
    process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true',
};

contextBridge.exposeInMainWorld('electron', electronHandler);
contextBridge.exposeInMainWorld('utils', utilsHandler);

export type ElectronHandler = typeof electronHandler;
export type UtilsHandler = typeof utilsHandler;
