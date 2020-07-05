/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow, dialog } from 'electron';
import IsDev from 'electron-is-dev';
import { autoUpdater } from 'electron-updater';
import ElectronLog from 'electron-log';
import * as Sentry from '@sentry/electron';
import MenuBuilder from './menu';

Sentry.init({
  dsn: 'https://cf07bcc0594241ce8c7db854e0f3f65a@sentry.io/1297683'
});

let mainWindow = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    webPreferences: {
      nodeIntegration: true
    }
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  if (IsDev) {
    ElectronLog.transports.file.level = 'debug';
  } else {
    ElectronLog.transports.file.level = 'error';
  }

  ElectronLog.info('App Started!');

  autoUpdater.logger = ElectronLog;
  autoUpdater.on('error', error => {
    dialog.showErrorBox(
      'Error: ',
      error == null ? 'unknown' : (error.stack || error).toString()
    );
  });

  autoUpdater.on('update-downloaded', () => {
    /*
    dialog.showMessageBox(
      {
        title: 'Install Updates',
        message:
          'A newer version of UPR is available. UPR will restart and come back better than ever!'
      },
      () => {
        setImmediate(() => autoUpdater.quitAndInstall());
      }
    );
    */
  });

  autoUpdater.on('update-not-available', () => {
    dialog.showMessageBox({
      title: 'No Updates',
      message: 'Current version is up-to-date.'
    });
  });

  if (!IsDev) {
    autoUpdater
      .checkForUpdatesAndNotify()
      .catch(e => Sentry.captureException(e));
    ElectronLog.info('Checking for updates...');
  }
  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', createWindow);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
