import { spawn } from "node:child_process";

const windows = process.platform === "win32";
const npx = windows ? "npx.cmd" : "npx";
const npm = windows ? "npm.cmd" : "npm";
const children = [];
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exit(exitCode);
}

function start(command, args, onOutput) {
  const options = {
    cwd: process.cwd(),
    stdio: onOutput ? ["inherit", "pipe", "pipe"] : "inherit",
  };
  const child = windows
    ? spawn([command, ...args].join(" "), { ...options, shell: true })
    : spawn(command, args, options);

  children.push(child);

  if (onOutput) {
    child.stdout?.on("data", (chunk) => {
      process.stdout.write(chunk);
      onOutput(chunk.toString());
    });
    child.stderr?.on("data", (chunk) => {
      process.stderr.write(chunk);
      onOutput(chunk.toString());
    });
  }

  child.on("exit", (code) => {
    if (stopping) return;
    console.error(`\nA project process stopped (exit code ${code ?? 1}).`);
    stop(code ?? 1);
  });

  return child;
}

console.log("Starting Sepolia frontend and auto-renew watcher...");
console.log("Enter the Hardhat keystore password once when prompted.\n");

let frontendStarted = false;
let watcherOutput = "";

function startFrontendWhenWatcherIsReady(output) {
  watcherOutput = (watcherOutput + output).slice(-4000);

  if (
    !frontendStarted &&
    watcherOutput.includes("Auto-renew watcher started")
  ) {
    frontendStarted = true;
    console.log("\nAuto-renew watcher ready. Starting frontend...\n");
    start(npm, ["--prefix", "frontend", "run", "dev"]);
  }
}

start(npx, [
  "hardhat",
  "--network",
  "sepolia",
  "--build-profile",
  "production",
  "run",
  "scripts/auto-renew.ts",
], startFrontendWhenWatcherIsReady);

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
