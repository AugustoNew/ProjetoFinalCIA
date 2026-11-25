import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const prismaCli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://agendaki:agendaki_dev@localhost:5432/agendaki_e2e?schema=public";
const result = spawnSync(
  process.execPath,
  [prismaCli, "migrate", "reset", "--force", "--skip-seed"],
  {
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
}
