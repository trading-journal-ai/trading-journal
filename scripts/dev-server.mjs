#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(repoRoot, ".next", "dev", "lock");
const mode = process.argv[2] ?? "start";
const defaultPort = 4317;
const portSearchLimit = 20;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];

  const opener = spawn(command[0], command[1], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  opener.once("error", () => {
    console.log(`Could not open the browser automatically. Open ${url}`);
  });
  opener.unref();
}

async function openBrowserWhenReady(url, child) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) return;

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      await response.body?.cancel();
      openBrowser(url);
      return;
    } catch {
      await sleep(250);
    }
  }

  console.log(`The server is still starting. Open ${url} when it is ready.`);
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function commandFor(pid) {
  try {
    return execFileSync("ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function cwdFor(pid) {
  const procCwd = `/proc/${pid}/cwd`;
  try {
    if (fs.existsSync(procCwd)) return fs.realpathSync(procCwd);
  } catch {
    // Fall back to lsof on macOS.
  }

  try {
    const output = execFileSync("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split("\n")
      .find((line) => line.startsWith("n"))
      ?.slice(1);
  } catch {
    return "";
  }
}

function isRepoNextProcess(pid) {
  return (
    cwdFor(pid) === repoRoot && /\b(next dev|next-server)\b/.test(commandFor(pid))
  );
}

function lockState() {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    return Number.isInteger(lock.pid) ? lock : null;
  } catch {
    return null;
  }
}

function lockPid() {
  return lockState()?.pid ?? null;
}

function nextPids() {
  try {
    return execFileSync("pgrep", ["-f", "next"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter(Number.isInteger);
  } catch {
    return [];
  }
}

function collectTargets() {
  const targets = new Map();
  const lockedPid = lockPid();

  if (lockedPid && lockedPid !== process.pid && isAlive(lockedPid) && isRepoNextProcess(lockedPid)) {
    targets.set(lockedPid, "Next dev lock");
  }

  for (const pid of nextPids()) {
    if (pid === process.pid || pid === process.ppid) continue;

    const cwd = cwdFor(pid);
    if (cwd !== repoRoot) continue;

    const command = commandFor(pid);
    if (!/\b(next dev|next-server)\b/.test(command)) continue;

    targets.set(pid, command || "Next dev server");
  }

  return targets;
}

function listeningPortsFor(pid) {
  try {
    const output = execFileSync(
      "lsof",
      ["-a", "-nP", "-p", String(pid), "-iTCP", "-sTCP:LISTEN", "-Fn"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );

    return output
      .split("\n")
      .map((line) => line.match(/:(\d+)$/)?.[1])
      .filter(Boolean);
  } catch {
    return [];
  }
}

function activePorts(targets) {
  const ports = new Set();
  const lock = lockState();

  if (
    lock &&
    targets.has(lock.pid) &&
    Number.isInteger(lock.port) &&
    lock.port >= 1 &&
    lock.port <= 65535
  ) {
    ports.add(String(lock.port));
  }

  for (const [pid, command] of targets) {
    const commandPort = command.match(/(?:--port(?:=|\s+)|-p\s+)(\d+)/)?.[1];
    if (commandPort) ports.add(commandPort);
    for (const port of listeningPortsFor(pid)) ports.add(port);
  }

  return [...ports].sort((left, right) => Number(left) - Number(right));
}

function preferredPort() {
  const configuredPort = process.env.TRADING_JOURNAL_PORT;
  if (!configuredPort) return defaultPort;

  const port = /^\d+$/.test(configuredPort) ? Number.parseInt(configuredPort, 10) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("TRADING_JOURNAL_PORT must be an integer between 1 and 65535.");
    process.exit(1);
  }

  return port;
}

function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }
      reject(error);
    });

    server.once("listening", () => {
      server.close((error) => {
        if (error) reject(error);
        else resolve(true);
      });
    });

    server.listen({ host: "127.0.0.1", port, exclusive: true });
  });
}

async function availablePort() {
  const firstPort = preferredPort();
  const lastPort = Math.min(firstPort + portSearchLimit - 1, 65535);

  for (let port = firstPort; port <= lastPort; port += 1) {
    if (await isPortAvailable(port)) return port;
  }

  throw new Error(`No open port found between ${firstPort} and ${lastPort}.`);
}

async function stopDevServer() {
  const targets = collectTargets();

  if (targets.size === 0) {
    console.log("No repo-local Next dev server found.");
    removeStaleLock();
    return;
  }

  for (const [pid, reason] of targets) {
    if (!isAlive(pid)) continue;
    console.log(`Stopping ${pid} (${reason})...`);
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // It may have exited between discovery and signal.
    }
  }

  await waitForExit([...targets.keys()], 2500);

  for (const pid of targets.keys()) {
    if (!isAlive(pid)) continue;
    console.log(`Force stopping ${pid}...`);
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // It may have exited between checks.
    }
  }

  await waitForExit([...targets.keys()], 1000);
  removeStaleLock();
  console.log("Dev server cleanup complete.");
}

async function waitForExit(pids, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (pids.every((pid) => !isAlive(pid))) return;
    await sleep(100);
  }
}

function removeStaleLock() {
  const pid = lockPid();
  if (!pid || (isAlive(pid) && isRepoNextProcess(pid))) return;

  try {
    fs.unlinkSync(lockPath);
    console.log("Removed stale Next dev lock.");
  } catch {
    // The lock may already be gone.
  }
}

async function startDevServer({ restart = false } = {}) {
  if (restart) {
    await stopDevServer();
  } else {
    const targets = collectTargets();
    if (targets.size > 0) {
      console.log("Trading Journal is already running from this project folder.");
      const ports = activePorts(targets);
      for (const port of ports) {
        console.log(`Open http://localhost:${port}`);
      }
      if (ports[0]) openBrowser(`http://localhost:${ports[0]}`);
      console.log("Run `npm run dev:restart` if you want a fresh server.");
      return;
    }
  }

  const firstPort = preferredPort();
  const port = await availablePort();
  const url = `http://localhost:${port}`;
  if (port !== firstPort) {
    console.log(`Port ${firstPort} is busy; using ${port} instead.`);
  }
  console.log(`Starting Trading Journal at ${url}`);

  const child = spawn(
    "npm",
    ["run", "dev:app", "--", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });

  void openBrowserWhenReady(url, child);
}

if (mode === "start") {
  await startDevServer();
} else if (mode === "stop") {
  await stopDevServer();
} else if (mode === "restart") {
  await startDevServer({ restart: true });
} else {
  console.error("Usage: node scripts/dev-server.mjs <start|stop|restart>");
  process.exit(1);
}
