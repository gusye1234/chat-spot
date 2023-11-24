import { ElectronHandler, UtilsHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    utils: UtilsHandler;
  }
}

export {};
