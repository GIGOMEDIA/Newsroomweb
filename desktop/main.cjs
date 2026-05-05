const { app, BrowserWindow, Menu, net, protocol, shell } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const isDev = !app.isPackaged;
let mainWindow;

const DIST_DIR = path.join(__dirname, "..", "dist");
const ICON_PATH = path.join(__dirname, "..", "build", "icon.png");
const APP_SCHEME = "app";
const APP_URL = `${APP_SCHEME}://crednews/`;

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      allowServiceWorkers: true,
      bypassCSP: false,
      corsEnabled: true,
      secure: true,
      standard: true,
      stream: true,
      supportFetchAPI: true,
    },
  },
]);

const registerAppProtocol = () => {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith("/")) pathname = pathname.slice(1);
    if (!pathname) pathname = "index.html";

    const candidates = [
      path.join(DIST_DIR, pathname),
      path.join(DIST_DIR, `${pathname}.html`),
      path.join(DIST_DIR, pathname, "index.html"),
      path.join(DIST_DIR, "index.html"),
    ];

    for (const candidate of candidates) {
      try {
        return await net.fetch(pathToFileURL(candidate).toString());
      } catch {
        // try the next candidate
      }
    }

    return new Response("Not found", { status: 404 });
  });
};

const sendAction = (action) => {
  mainWindow?.webContents.send("menu-action", action);
};

const createMenu = () => {
  const template = [
    {
      label: "File",
      submenu: [
        {
          accelerator: "CommandOrControl+N",
          click: () => createWindow(),
          label: "New Window",
        },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Navigate",
      submenu: [
        {
          accelerator: "CommandOrControl+1",
          click: () => sendAction("feed"),
          label: "Feed",
        },
        {
          accelerator: "CommandOrControl+2",
          click: () => sendAction("events"),
          label: "Events",
        },
        {
          accelerator: "CommandOrControl+3",
          click: () => sendAction("search"),
          label: "Search",
        },
        {
          accelerator: "CommandOrControl+4",
          click: () => sendAction("saved"),
          label: "Saved",
        },
        { type: "separator" },
        {
          accelerator: "CommandOrControl+K",
          click: () => sendAction("search"),
          label: "Quick Search",
        },
        {
          accelerator: "CommandOrControl+R",
          click: () => sendAction("refresh"),
          label: "Refresh Current View",
        },
        {
          accelerator: "CommandOrControl+B",
          click: () => sendAction("bookmark"),
          label: "Bookmark Current Article",
        },
        {
          accelerator: "Esc",
          click: () => sendAction("back"),
          label: "Back",
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          click: () =>
            shell.openExternal("https://github.com/ukemeikot/crednews"),
          label: "NEWSROOM Documentation",
        },
        {
          click: () => {
            mainWindow?.webContents.executeJavaScript(
              "alert('NEWSROOM desktop\\nCross-platform newsroom app with offline saved articles.')",
            );
          },
          label: "About NEWSROOM",
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    backgroundColor: "#07090B",
    height: 820,
    icon: ICON_PATH,
    minHeight: 720,
    minWidth: 390,
    show: false,
    title: "NEWSROOM",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      webSecurity: false,
    },
    width: 1280,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("context-menu", (_event, params) => {
    const menu = Menu.buildFromTemplate([
      {
        click: () => sendAction("back"),
        enabled: mainWindow.webContents.canGoBack(),
        label: "Back",
      },
      {
        click: () => sendAction("refresh"),
        label: "Refresh View",
      },
      { type: "separator" },
      { role: "copy", visible: Boolean(params.selectionText) },
      { role: "paste", visible: params.isEditable },
      {
        click: () => shell.openExternal(params.linkURL),
        enabled: Boolean(params.linkURL),
        label: "Open Link in Browser",
      },
      {
        click: () => mainWindow.webContents.copy(),
        enabled: Boolean(params.linkURL),
        label: "Copy Link",
      },
    ]);
    menu.popup({ window: mainWindow });
  });

  if (isDev) {
    mainWindow.loadURL(
      process.env.ELECTRON_START_URL || "http://localhost:8081",
    );
  } else {
    mainWindow.loadURL(APP_URL);
  }
};

app.whenReady().then(() => {
  registerAppProtocol();
  createMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
