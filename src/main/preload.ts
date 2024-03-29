// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent, shell } from 'electron';
import Store from 'electron-store';
import electron from 'electron';

const store = new Store();
export type Channels =
  | 'resize-window'
  | 'reset-openai-key'
  | 'reload-openai-model'
  | 'open-window'
  | 'take-shot'
  | 'open-dev-mode'
  | 'open-image'
  | 'open-screenshot';
export type PromptDict = Record<string, string>;

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
    removeAllListeners(channel: Channels) {
      ipcRenderer.removeAllListeners(channel);
    },
  },
  openai: {
    openaiKey: (store.get('OpenAIKey') as string) ?? '',
    openaiModel: (store.get('OpenAIModel') as string) ?? 'gpt-3.5-turbo',
    saveOpenAIKey(key: string) {
      store.set('OpenAIKey', key);
    },
    deleteOpenAIKey() {
      store.delete('OpenAIKey');
    },
    deleteOpenAIModel() {
      store.delete('OpenAIModel');
    },
  },
};

const utilsHandler = {
  addPrompt(promptName: string, promptContent: string) {
    store.set(`prompt.${promptName}`, promptContent);
  },
  getPrompts() {
    const data = store.get('prompt');
    if (!data) {
      return {} as PromptDict;
    }
    return data as PromptDict;
  },
  deletePrompt(promptName: string) {
    store.delete(`prompt.${promptName}`);
  },
  clipboardWrite(content: string) {
    electron.clipboard.writeText(content);
  },
  getTheme() {
    return (store.get('theme') as string) ?? 'light';
  },
  setTheme(theme: string) {
    store.set('theme', theme);
  },
  isDebug:
    process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true',
  isDarwin: process.platform === 'darwin',
};

contextBridge.exposeInMainWorld('electron', electronHandler);
contextBridge.exposeInMainWorld('utils', utilsHandler);

export type ElectronHandler = typeof electronHandler;
export type UtilsHandler = typeof utilsHandler;
