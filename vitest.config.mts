import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
// El "exports" del paquete solo expone "." (a index.js, que siempre lanza); se arma la ruta a su empty.js a mano.
const serverOnlyVacio = join(dirname(require.resolve("server-only")), "empty.js");

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Fuera de Next, "server-only" lanza siempre; en el build real se resuelve vacío por la condición
      // "react-server". Aquí se apunta al mismo archivo vacío para poder probar la lógica pura de esos módulos.
      "server-only": serverOnlyVacio,
    },
  },
});
