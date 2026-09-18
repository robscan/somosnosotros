import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const runner = fileURLToPath(new URL("./test-db.mjs", import.meta.url));

describe("guardas del banco PostgreSQL", () => {
  it.each([
    ["", "falta TEST_DATABASE_URL"],
    ["no-es-url", "no es una URL"],
    ["https://127.0.0.1/postgres", "debe usar postgres"],
    ["postgresql://postgres@example.invalid/postgres", "solo acepta hosts loopback"],
    ["postgresql://postgres@127.0.0.1/postgres?host=example.invalid", "no acepta parametros"],
    ["postgresql://postgres@127.0.0.1/production", "no a una base"],
    ["postgresql://postgres@127.0.0.1/sn_test_anterior", "no a una base"],
  ])("rechaza una configuracion insegura antes de conectar: %s", (url, mensaje) => {
    const result = spawnSync(process.execPath, [runner], {
      env: { ...process.env, TEST_DATABASE_URL: url, DATABASE_URL: "postgresql://example.invalid/produccion" },
      encoding: "utf8",
      timeout: 5000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(mensaje);
    expect(result.stdout).not.toContain("migraciones aplicadas");
  });
});
