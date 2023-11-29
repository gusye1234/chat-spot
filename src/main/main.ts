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
  desktopCapturer,
} from 'electron';
import Screenshots from 'electron-screenshots';
import fs from 'fs';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
// import MenuBuilder from './menu';
import Store from 'electron-store';
import { resolveHtmlPath } from './util';

const store = new Store();
let screenshot: Screenshots | null = null;
let mainWindow: BrowserWindow | null = null;
let mainWindowShown = true;

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

const toggleWindow = () => {
  if (mainWindow) {
    // make sure show/hide will return the focus to the previous app
    // https://stackoverflow.com/questions/50642126/previous-window-focus-electron
    if (mainWindowShown) {
      mainWindow.minimize();
      mainWindow.hide();
      if (process.platform === 'darwin') app.hide();
    } else {
      mainWindow.webContents.send('open-window');
      mainWindow.show();
      mainWindow.restore();
    }
  } else {
    createWindow();
  }
};

const screenShot = () => {
  if (screenshot) {
    screenshot.startCapture();
  }
  // desktopCapturer
  //   .getSources({
  //     types: ['screen'],
  //     thumbnailSize: {
  //       width: 640,
  //       height: 480,
  //     },
  //   })
  //   .then(async (sources) => {
  //     const source = sources[0];
  //     // const image = source.thumbnail.toPNG();
  //     // console.log(source.thumbnail.toDataURL().slice(0, 100));
  //     if (mainWindow) {
  //       mainWindow.webContents.send('take-shot', source.thumbnail.toDataURL());
  //     }
  //   });
};

// Function to save data URL to a file and open it
function openImageFromDataUrl(dataUrl: string) {
  // Convert the data URL to a native image
  const image = nativeImage.createFromDataURL(dataUrl);
  // Get the image as a Buffer
  const imageBuffer = image.toPNG();

  // Generate a file path
  const filePath = path.join(app.getPath('temp'), 'temp-image.png');

  // Write the file to the file system
  fs.writeFile(filePath, imageBuffer, (err: any) => {
    if (err) throw err;

    // Open the image file with the default image viewer
    shell.openPath(filePath).catch((err) => {
      console.error('Failed to open image:', err);
    });
  });
}

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
    resizable: isDebug,
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

  // const menuBuilder = new MenuBuilder(mainWindow);
  // menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

const createScreenshotWindow = () => {
  screenshot = new Screenshots({ singleWindow: true });

  screenshot.on('ok', (e, buffer, bounds) => {
    const imageBuffer = Buffer.from(buffer);
    const image = nativeImage.createFromBuffer(imageBuffer);
    const imageUrl = image.toDataURL();
    console.log('capture', imageUrl.slice(0, 20));
    if (mainWindow) {
      mainWindow.webContents.send('take-shot', imageUrl);
    }
  });

  screenshot.on('save', (e, buffer, bounds) => {
    e.preventDefault();
    const imageBuffer = Buffer.from(buffer);
    const image = nativeImage.createFromBuffer(imageBuffer);
    const imageUrl = image.toDataURL();
    console.log('capture', imageUrl.slice(0, 20));
    if (mainWindow) {
      mainWindow.webContents.send('take-shot', imageUrl);
    }
    screenshot?.endCapture();
  });
};

if (process.platform === 'darwin') {
  app.dock.hide();
}

/**
 * Add event listeners...
 */
ipcMain.on('resize-window', (event, arg) => {
  console.log('resize', arg);
  if (mainWindow) mainWindow.setSize(mainWindow.getSize()[0], arg.height);
  // if (mainWindow) mainWindow.setSize(arg.width, arg.height);
});

ipcMain.on('open-dev-mode', (event) => {
  if (mainWindow && isDebug) mainWindow.webContents.openDevTools();
});

ipcMain.on('open-image', (event, dataUrl) => {
  openImageFromDataUrl(dataUrl);
});

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

app
  .whenReady()
  .then(() => {
    createScreenshotWindow();
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
        label: 'Reset OpenAI key',
        click: () => {
          if (mainWindow) {
            store.delete('OpenAIKey');
            mainWindow.webContents.send('reset-openai-key');
          }
        },
      },
      {
        label: 'Change AI',
        submenu: [
          {
            label: 'GPT-3.5',
            checked: true,
            type: 'radio',
            click: () => {
              if (mainWindow) {
                store.set('OpenAIModel', 'gpt-3.5-turbo-1106');
                mainWindow.webContents.send('reload-openai-model');
              }
            },
          },
          {
            label: 'GPT-4',
            checked: false,
            type: 'radio',
            click: () => {
              if (mainWindow) {
                store.set('OpenAIModel', 'gpt-4-1106-preview');
                mainWindow.webContents.send('reload-openai-model');
              }
            },
          },
        ],
      },
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
      {
        label: 'Shots',
        click: () => {
          screenShot();
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
