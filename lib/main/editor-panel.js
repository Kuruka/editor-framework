'use strict';

const Electron = require('electron');
const BrowserWindow = Electron.BrowserWindow;

let _panel2windows = {};
let _panel2argv = {};

function _dock ( panelID, win ) {
  // Editor.info('%s dock to %s', panelID, win.name ); // DEBUG

  let editorWin = _panel2windows[panelID];

  // if we found same panel dock in different place
  if ( editorWin && editorWin !== win ) {
    // TODO: should we report error ????
  }

  _panel2windows[panelID] = win;
}

function _undock ( panelID ) {
  let editorWin = _panel2windows[panelID];
  // Editor.info('%s undock from %s', panelID, editorWin.name ); // DEBUG

  if ( editorWin ) {
    editorWin.sendToPage( 'panel:undock', panelID );
    delete _panel2windows[panelID];
    return editorWin;
  }

  return null;
}

function _saveLayout ( editorWin, panelID ) {
  // save standalone panel's layout
  if ( !editorWin.isMainWindow ) {
    let panelProfile = Editor.loadProfile( `layout.${panelID}`, 'local' );
    let winSize = editorWin.nativeWin.getContentSize();
    let winPos = editorWin.nativeWin.getPosition();

    panelProfile.x = winPos[0];
    panelProfile.y = winPos[1];
    panelProfile.width = winSize[0];
    panelProfile.height = winSize[1];
    panelProfile.save();
  }
}

/**
 * Panel module for operating specific panel
 * @module Editor.Panel
 */
let EditorPanel = {
  templateUrl: 'editor-framework://static/window.html',

  /**
   * Open a panel and pass argv to it. The argv will be sent as argument in `panel:run` message in page-level
   * @method open
   * @param {string} panelID - a panelID
   * @param {object} argv - argument store as key-value table, which will pass later
   */
  open ( panelID, argv ) {
    let panelInfo = Editor.Package.panelInfo(panelID);
    if ( !panelInfo ) {
      Editor.error(`Failed to open panel ${panelID}, panel info not found.`);
      return;
    }

    _panel2argv[panelID] = argv;

    let editorWin = EditorPanel.findWindow(panelID);
    if ( editorWin ) {
      // if we found the window, send panel:run to it
      Editor.sendToPanel( panelID, 'panel:run', argv );
      editorWin.show();
      editorWin.focus();
      return;
    }

    //
    let windowName = `editor-window-${new Date().getTime()}`;
    let windowOptions = {
      useContentSize: true,
      width: parseInt(panelInfo.width),
      height: parseInt(panelInfo.height),
      minWidth: parseInt(panelInfo['min-width']),
      minHeight: parseInt(panelInfo['min-height']),
      maxWidth: parseInt(panelInfo['max-width']),
      maxHeight: parseInt(panelInfo['max-height']),
    };

    // load layout-settings, and find windows by name
    let layoutProfile = Editor.loadProfile(`layout.${panelID}`, 'local' );
    if ( layoutProfile ) {
      if ( layoutProfile.x ) {
        windowOptions.x = parseInt(layoutProfile.x);
      }

      if ( layoutProfile.y ) {
        windowOptions.y = parseInt(layoutProfile.y);
      }

      if ( layoutProfile.width ) {
        windowOptions.width = parseInt(layoutProfile.width);
      }

      if ( layoutProfile.height ) {
        windowOptions.height = parseInt(layoutProfile.height);
      }
    }

    windowOptions.windowType = panelInfo.type || 'dockable';

    // NOTE: fixed-size window always use package.json settings
    if ( panelInfo.type === 'fixed-size' ) {
      windowOptions.width = parseInt(panelInfo.width);
      windowOptions.height = parseInt(panelInfo.height);
    }

    if ( isNaN(windowOptions.width) ) {
      windowOptions.width = 400;
    }

    if ( isNaN(windowOptions.height) ) {
      windowOptions.height = 400;
    }

    if ( isNaN(windowOptions.minWidth) ) {
      windowOptions.minWidth = 200;
    }

    if ( isNaN(windowOptions.minHeight) ) {
      windowOptions.minHeight = 200;
    }

    // create new window
    // DISABLE: currently, I don't want to support page
    // if ( panelInfo.page ) {
    //   url = panelInfo.page;
    // }

    //
    editorWin = new Editor.Window(windowName, windowOptions);
    _dock( panelID, editorWin );

    // BUG: https://github.com/atom/atom-shell/issues/1321
    editorWin.nativeWin.setContentSize( windowOptions.width, windowOptions.height );
    editorWin.nativeWin.setMenuBarVisibility(false);

    if ( panelInfo.type === 'simple' ) {
      let names = panelID.split('.');
      editorWin.load(`packages://${names[0]}/${panelInfo.frame}`, argv);
    } else {
      editorWin.load(EditorPanel.templateUrl, {
        panelID: panelID
      });
    }
    editorWin.focus();
  },

  /**
   * Close a panel via panelID
   * @method close
   * @param {string} panelID - a panelID
   */
  close ( panelID ) {
    let editorWin = _undock(panelID);
    if ( !editorWin ) {
      return;
    }

    _saveLayout( editorWin, panelID );

    // check if we have other panels in the same window
    // if no panels left, we close the window
    let found = false;
    for ( let id in _panel2windows ) {
      if ( editorWin === _panel2windows[id] ) {
        found = true;
        break;
      }
    }

    // if not panel exists in this window, and it is not the main window, close it.
    if ( !found && !editorWin.isMainWindow ) {
      editorWin.close();
    }
  },

  /**
   * Find and return an editor window that contains the panelID
   * @method findWindow
   * @param {string} panelID - a panelID
   * @return {Editor.Window}
   */
  findWindow ( panelID ) {
    return _panel2windows[panelID];
  },

  /**
   * Find and return editor window list that contains panel defined in package via packageName
   * @method findWindows
   * @param {string} packageName
   * @return {Editor.Window[]}
   */
  findWindows (packageName) {
    let wins = [];

    for ( let p in _panel2windows ) {
      let pair = p.split('.');
      if ( pair.length !== 2 ) {
        continue;
      }

      let name = pair[1];
      if ( name === packageName ) {
        let editorWin = _panel2windows[p];

        if ( wins.indexOf (editorWin) === -1 ) {
          wins.push(editorWin);
        }
      }
    }

    return wins;
  },

  /**
   * Find and return panel ID list that contains panel defined in package via packageName
   * @method findPanels
   * @param {string} packageName
   * @return {string[]}
   */
  findPanels ( packageName ) {
    let panelIDs = [];
    for ( let p in _panel2windows ) {
      let pair = p.split('.');
      if ( pair.length !== 2 ) {
        continue;
      }

      let name = pair[0];
      if ( name === packageName ) {
        panelIDs.push(pair);
      }
    }

    return panelIDs;
  },

  /**
   * Close all panels defined in package via packageName
   * @method closeAll
   * @param {string} packageName
   */
  closeAll (packageName) {
    let panelIDs = EditorPanel.findPanels(packageName);
    for (let i = 0; i < panelIDs.length; ++i) {
      EditorPanel.close( panelIDs[i] );
    }
  },

  // NOTE: this only invoked in editor-window on-close event
  // NOTE: please go to read main/editor-window.js 'on-close' event comment for more detail about why we do _saveLayout here
  _onWindowClose ( editorWin ) {
    for ( let id in _panel2windows ) {
      let win = _panel2windows[id];
      if ( win === editorWin ) {
        _saveLayout( editorWin, id );
      }
    }
  },

  // NOTE: this only invoked in editor-window on-closed event
  _onWindowClosed ( editorWin ) {
    for ( let id in _panel2windows ) {
      let win = _panel2windows[id];
      if ( win === editorWin ) {
        delete _panel2windows[id];
      }
    }
  },
};

module.exports = EditorPanel;

// ========================================
// Ipc
// ========================================

const ipcMain = Electron.ipcMain;

ipcMain.on('panel:query-info', ( event, reply, panelID ) => {
  if ( !panelID ) {
    Editor.error( 'Empty panelID' );
    reply();
    return;
  }

  // get panelInfo
  let panelInfo = Editor.Package.panelInfo(panelID);
  if ( panelInfo ) {
    // load profiles
    for ( let type in panelInfo.profiles ) {
      let profile = panelInfo.profiles[type];
      profile = Editor.loadProfile( panelID, type, profile );
      panelInfo.profiles[type] = profile;
    }
  }

  //
  reply(panelInfo);
});

ipcMain.on('panel:ready', ( event, panelID ) => {
  let argv = _panel2argv[panelID];
  Editor.sendToPanel( panelID, 'panel:run', argv );
});

ipcMain.on('panel:open', ( event, panelID, argv ) => {
  EditorPanel.open( panelID, argv );
});

ipcMain.on('panel:dock', ( event, panelID ) => {
  let browserWin = BrowserWindow.fromWebContents( event.sender );
  let editorWin = Editor.Window.find(browserWin);
  _dock( panelID, editorWin );
});

ipcMain.on('panel:close', ( event, panelID ) => {
  EditorPanel.close( panelID );
});

ipcMain.on('panel:wait-for-close', ( event, reply, panelID ) => {
  EditorPanel.close( panelID );
  reply();
});
