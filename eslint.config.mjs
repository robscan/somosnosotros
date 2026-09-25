import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Árboles de trabajo de otros chats (cada uno con su node_modules y .next).
    ".claude/**",
    // Envoltorio nativo de iOS (Capacitor): tiene su propio proyecto y dependencias, no forma parte de la web.
    "apps/**",
  ]),
]);

export default eslintConfig;
