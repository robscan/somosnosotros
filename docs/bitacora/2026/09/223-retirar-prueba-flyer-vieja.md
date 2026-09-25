# 223 · Se retira `flyer.componentes.test.mjs`, prueba de una hoja que ya no existe (OL-189)

**Fecha:** 2026-09-25 · **Rama:** `retirar-prueba-flyer-vieja`, desde `origin/main` (`8b32fc0`). Operador nuevo (Fable 5.1).

## De dónde viene

Hallazgo del operador de OL-187 (bitácora 221): `src/app/eventos/flyer.componentes.test.mjs` seguía probando la
versión de la hoja «¿Dónde es?» del alta de evento anterior a OL-173 y OL-182. Este chat investigó primero cómo se
ejecutaba el archivo, informó al gestor y esperó su decisión (regla 0 de `GESTION_DE_CAMBIOS.md`). Decisión del
gestor: retirarlo.

## Cómo se ejecutaba (y por qué en la práctica ya no)

- **No lo corría nada automático.** `npm test` es `vitest run`, y `vitest.config.ts` solo incluye
  `src/**/*.test.ts` y `scripts/**/*.test.ts`. El CI (`.github/workflows/ci.yml`) corre lint, typecheck, test,
  test:db y build; ninguno invoca `node --test`.
- **Solo a mano**, con `node --test src/app/eventos/flyer.componentes.test.mjs`. Empaquetaba `FormularioEvento` real
  con esbuild (Mapbox con estilo local, acciones simuladas) y lo abría en Chromium con Playwright.
- **Playwright no es dependencia del repo** (ni `playwright` ni `esbuild` figuran en `package.json`; esbuild solo está
  en `node_modules` como dependencia transitiva). El archivo lo importaba por la variable `PLAYWRIGHT_MODULE`, que en
  la bitácora 112 apuntaba a una ruta de Codex fuera del repo. En un checkout limpio no arranca.
- **Tres piezas seguidas sin poder correrlo:** las bitácoras 135, 148 y 182 anotan lo mismo, «sin Playwright en este
  árbol, no corrió». La última vez que se ejecutó en verde fue en la bitácora 112 (41 recorridos, entorno de Codex).

## Qué probaba y qué quedó obsoleto

22 pruebas (`test(`), la mayoría sobre el flujo «¿Dónde es?» viejo: diálogo «Es en otro sitio», campo
«Buscar la dirección», lista «Direcciones encontradas», «Nombre del sitio», «Dirección exacta». Unas 20 referencias a
selectores que ya no existen. La hoja actual (`HojaDondeEs.tsx`, reescrita en OL-173 y OL-182) tiene el diálogo
«¿Dónde es?», el campo «Buscar el lugar», la lista `lista-donde-es` «Lugares y direcciones» y el campo «Nombre del
lugar». El flujo «otro sitio → nombre → dirección» ya no existe como tal: actualizar el archivo habría sido reescribir
la mitad, no renombrar etiquetas.

Historia del archivo: creado en OL-088, tocado por última vez en OL-147 (bitácora 182). OL-173, OL-179 y OL-182
reescribieron la hoja sin tocarlo.

## Por qué se retira y no se reescribe

Una prueba que no corre en CI ni en local limpio y que describe una pantalla que ya no existe no protege nada; solo
confunde al siguiente operador (como pasó en OL-187). Reescribirla exigiría además meter Playwright y esbuild como
dependencias del repo y un script `test:navegador` con Chromium en CI: es una decisión de costo del founder, que queda
anotada para otro día y no se hace en esta pieza.

## Dónde queda la cobertura real de «¿Dónde es?»

Pruebas unitarias con vitest, dentro de `npm test` y del CI:

- `src/app/eventos/dondeEsPantalla.test.ts` (OL-173, ampliada en OL-182 y OL-187): 37 casos sobre la lógica de la hoja.
- `src/app/eventos/direccionContexto.test.ts`: 41 casos sobre la dirección en contexto.
- `src/app/eventos/gestosFlyer.test.ts`: 19 casos sobre los gestos del cartel.
- `src/app/eventos/direccion.acciones.test.ts`: 4 casos sobre las acciones de dirección.

## Fuera de alcance (por instrucción del gestor)

Los otros cinco `*.componentes.test.mjs` (`Destacados`, `nuevos`, `ui/cargador`, `guardado`, `cupo`) tienen el mismo
problema de ejecución, pero solo el del flyer usaba los selectores viejos; no se tocan. `HojaDondeEs*` tampoco.

## Verificación

Sin capturas: no hay UI.

- `npm run lint`: 0 errores, 1 aviso preexistente y ajeno (`docs/diseno/logotipo/iconos-sn.mjs`, variable sin uso).
- `npm run typecheck`: falla solo por la colisión de mayúsculas conocida `LetreroCorreoLigado.tsx` /
  `letreroCorreoLigado.ts` en macOS (2 errores en `src/app/artistas/page.tsx`, ya anotada en OPEN_LOOPS como pendiente
  de reservar); ya estaba así en `origin/main` y no la toca esta pieza.
- `npm test`: 98 archivos, 1255 pruebas, todas en verde.
- `npm run build`: compila y se detiene en el mismo typecheck de la colisión (mismo aviso).
- `git diff --check`: limpio. Sin correos en el diff.
