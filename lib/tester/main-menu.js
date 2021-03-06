'use strict';

const Electron = require('electron');

const BrowserWindow = Electron.BrowserWindow;
const ipcMain = Electron.ipcMain;

module.exports = function () {
  return [
    // Test Runner
    {
      label: 'Test Runner',
      submenu: [
        {
          label: 'Hide',
          accelerator: 'CmdOrCtrl+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'CmdOrCtrl+Shift+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: function () {
            Editor.mainWindow.close();
          }
        },
      ]
    },

    // Edit
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
      ]
    },

    // Window
    {
      label: 'Window',
      id: 'window',
      submenu: Editor.isDarwin ?  [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize',
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        },
        { type: 'separator' },
        {
          label: 'Bring All to Front',
          role: 'front'
        },
      ] : [
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        }
      ]
    },

    // Developer
    {
      label: 'Developer',
      id: 'developer',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click () {
            ipcMain.emit('mocha-reload');
            BrowserWindow.getFocusedWindow().reload();
          }
        },
        { type: 'separator' },
        {
          label: 'Inspect Element',
          accelerator: 'CmdOrCtrl+Shift+C',
          click () {
            let nativeWin = BrowserWindow.getFocusedWindow();
            let editorWin = Editor.Window.find(nativeWin);
            if ( editorWin ) {
              editorWin.sendToPage( 'window:inspect' );
            }
          }
        },
        {
          label: 'Developer Tools',
          accelerator: 'CmdOrCtrl+Alt+I',
          click () {
            let focusedWindow = BrowserWindow.getFocusedWindow();
            if ( focusedWindow ) {
              focusedWindow.openDevTools();
            }
          }
        },
      ]
    },
  ];
};
