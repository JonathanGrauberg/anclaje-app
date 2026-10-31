// Postgres local SIN Docker: crea y maneja un cluster propio en .pgdata/ (puerto 5433)
// usando los binarios de una instalación de PostgreSQL existente.
//
//   node scripts/db-local.mjs up      crea (si hace falta) y arranca el cluster
//   node scripts/db-local.mjs down    lo detiene
//   node scripts/db-local.mjs status
//
// Busca los binarios en PG_BIN, en el PATH o en "C:\Program Files\PostgreSQL\<versión>\bin".
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const PORT = process.env.PG_LOCAL_PORT ?? "5433";
const USER = "sentir";
const DB = "sentir";
const root = path.resolve(import.meta.dirname, "..");
const dataDir = path.join(root, ".pgdata");
const logFile = path.join(dataDir, "server.log");
const exe = process.platform === "win32" ? ".exe" : "";

function findBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["pg_ctl"], {
    encoding: "utf8",
  });
  if (which.status === 0) return path.dirname(which.stdout.split(/\r?\n/)[0]);
  const base = "C:\\Program Files\\PostgreSQL";
  if (existsSync(base)) {
    const versions = readdirSync(base).sort((a, b) => Number(b) - Number(a));
    for (const v of versions) {
      const bin = path.join(base, v, "bin");
      if (existsSync(path.join(bin, `pg_ctl${exe}`))) return bin;
    }
  }
  throw new Error("No encontré PostgreSQL. Instalalo o definí PG_BIN con la carpeta bin.");
}

const bin = findBin();
const run = (name, args, opts = {}) =>
  execFileSync(path.join(bin, name + exe), args, { stdio: "inherit", ...opts });
const isRunning = () =>
  spawnSync(path.join(bin, `pg_ctl${exe}`), ["status", "-D", dataDir], { stdio: "ignore" })
    .status === 0;

const cmd = process.argv[2] ?? "up";

if (cmd === "up") {
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log("Creando cluster en .pgdata …");
    run("initdb", ["-D", dataDir, "-U", USER, "--auth=trust", "-E", "UTF8", "--locale=C"]);
  }
  if (!isRunning()) {
    // stdin "ignore": sin stdin el comando no queda esperando. (Con stdout/stderr en "ignore"
    // Postgres falla al iniciar en Windows.) La salida del servidor va a .pgdata/server.log.
    run(
      "pg_ctl",
      [
        "start",
        "-D",
        dataDir,
        "-l",
        logFile,
        "-w",
        "-o",
        `-p ${PORT} -c listen_addresses=localhost`,
      ],
      { stdio: ["ignore", "inherit", "inherit"] },
    );
    if (!isRunning()) throw new Error(`No pude arrancar Postgres. Revisá ${logFile}`);
  }
  const exists = spawnSync(
    path.join(bin, `psql${exe}`),
    [
      "-h",
      "localhost",
      "-p",
      PORT,
      "-U",
      USER,
      "-d",
      "postgres",
      "-tAc",
      `SELECT 1 FROM pg_database WHERE datname='${DB}'`,
    ],
    { encoding: "utf8" },
  ).stdout.trim();
  if (exists !== "1") run("createdb", ["-h", "localhost", "-p", PORT, "-U", USER, DB]);
  console.log(`Postgres listo en postgresql://${USER}@localhost:${PORT}/${DB}`);
} else if (cmd === "down") {
  if (isRunning()) run("pg_ctl", ["stop", "-D", dataDir, "-m", "fast"]);
  else console.log("No estaba corriendo.");
} else if (cmd === "status") {
  console.log(isRunning() ? "Corriendo" : "Detenido");
} else {
  console.error(`Comando desconocido: ${cmd}`);
  process.exit(1);
}
