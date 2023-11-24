/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import Store from 'electron-store';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

Store.initRenderer();
let mainWindow: BrowserWindow | null = null;
let mainWindowShown = true;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// if (isDebug) {
//   require('electron-debug')();
// }

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 724,
    height: 100,
    // resizable: false,
    focusable: true,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: process.platform === 'win32',
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('show', () => {
    mainWindowShown = true;
  });
  mainWindow.on('hide', () => {
    mainWindowShown = false;
  });
  // mainWindow.on('blur', () => {
  //   // mainWindow?.hide();
  //   mainWindowFocus = false;
  // });
  // mainWindow.on('focus', () => {
  //   // mainWindow?.hide();
  //   mainWindowFocus = true;
  // });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

ipcMain.on('resize-window', (event, arg) => {
  console.log('Get resize', arg);
  if (mainWindow) mainWindow.setSize(arg.width, arg.height);
});
/**
 * Add event listeners...
 */
if (process.platform === 'darwin') {
  app.dock.hide();
}

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  console.log('Quitting ChatSpot');
  globalShortcut.unregister('CommandOrControl+Alt+K');
});

const toggleWindow = () => {
  if (mainWindow) {
    // make sure show/hide will return the focus to the previous app
    // https://stackoverflow.com/questions/50642126/previous-window-focus-electron
    if (mainWindowShown) {
      mainWindow.minimize();
      mainWindow.hide();
      if (process.platform === 'darwin') app.hide();
    } else {
      mainWindow.show();
      mainWindow.restore();
    }
  } else {
    createWindow();
  }
};

app
  .whenReady()
  .then(() => {
    const appIcon = new Tray(
      nativeImage.createFromPath(getAssetPath('icon.png')).resize({
        width: 18,
        height: 18,
      }),
    );
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'ChatSpot',
      },
      { type: 'separator' },
      {
        label: 'Toggle',
        accelerator: 'CommandOrControl+Alt+K',
        click: () => {
          toggleWindow();
        },
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          app.quit();
        },
      },
    ]);
    appIcon.setContextMenu(contextMenu);

    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
    const ret = globalShortcut.register('CommandOrControl+Alt+K', toggleWindow);

    if (!ret) {
      console.log('registration failed');
    }
  })
  .catch(console.log);
