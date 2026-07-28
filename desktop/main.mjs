import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
const port = 4317;
const appUrl = `http://127.0.0.1:${port}`;
let mainWindow;
let nextServer;

function startNextServer() {
  const nodeBin = process.env.npm_node_execpath ?? "node";
  nextServer = spawn(
    nodeBin,
    [nextBin, "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
    },
  );
}

async function waitForNextServer() {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (nextServer?.exitCode !== null) {
      throw new Error(`Next.js exited before ${appUrl} became available.`);
    }

    try {
      const response = await fetch(appUrl, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {
      // The dev server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${appUrl}.`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#0b0d10",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });
  void mainWindow.loadURL(appUrl);
}

app.setName("Trading Journal");

app.whenReady().then(async () => {
  try {
    startNextServer();
    await waitForNextServer();
    createWindow();
  } catch (error) {
    console.error(error);
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  nextServer?.kill("SIGTERM");
});
