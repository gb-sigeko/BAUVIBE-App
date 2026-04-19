import { spawnSync } from "node:child_process";

function run(cmd: string, args: string[], env?: Record<string, string>) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  return r.status ?? 1;
}

let code = 0;
code |= run("npm", ["run", "lint"]);
code |= run("npm", ["run", "build"]);
// Playwright nutzt den bereits gebauten Stand (kein doppeltes `next build` im webServer).
code |= run("npx", ["playwright", "test"], { PW_USE_EXISTING_BUILD: "1" });
process.exit(code);
