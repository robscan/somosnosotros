# 249 · Avisos en la app: el alta fallaba; «Instalar la app» dentro de la app (OL-220)

**Fecha:** 2026-09-25 · **Rama:** `avisos-app-arreglo` · **Quién:** gestor de cambios

## Lo que vio el founder

En TestFlight 1.0 (3), Ajustes › Avisos › «En el teléfono»:

> No pudimos darte de alta en este teléfono. Intenta de nuevo. (TypeError: e.addListener("registration",e=>a(e.value)).then is not a function …)

En la misma pantalla aparecía «Instalar la app — Ábrela en Safari para instalarla», estando ya dentro de la app.

## Causa

- `src/lib/pushCliente.ts` (`esperarTokenApns`, OL-213) llama `addListener(...).then(...)`: supone que el plugin devuelve una promesa. La web usa el plugin por `window.Capacitor.Plugins.PushNotifications`, sin el paquete de npm. Por esa vía, la app devuelve el objeto con `remove()` directamente, sin promesa. El `.then` lanzaba un TypeError dentro del `new Promise` y el alta terminaba en «fallo». En el simulador de OL-213 no se vio porque la prueba con sesión real no se pudo hacer (bitácora 242), y el simulacro de las pruebas unitarias devolvía una promesa.
- `src/lib/plataforma.ts` (`leerPlataforma`) marcaba `instalada` solo con el modo de pantalla de la web instalada. Dentro de la app no se cumple, así que `decidirInstalar` ofrecía instalar.

## Arreglo

- `esperarTokenApns` acepta las dos formas: `Promise.resolve(addListener(...))` y guarda su `remove`. El tipo del puente lo refleja (`Promise<Oyente> | Oyente`).
- `leerPlataforma`: `instalada: instalada || esAppNativa(agente)`. Dentro de la app ya está instalada por definición y la fila no aparece.
- Pruebas nuevas:
  - En `pushCliente.test.ts`, el plugin devuelve el oyente sin promesa y el alta termina bien. Con el código anterior esa prueba falla por el TypeError.
  - En `plataforma.test.ts`, con el agente de la app, `decidirInstalar` responde «ya-instalada».

Solo cambia la web: llega a la app en cuanto se publica, sin otra compilación.

## Evidencia

- `vitest` de los dos archivos: 66 pruebas en verde.
- `npm run lint` sin errores y `npm run typecheck` en verde.
- CI en el PR.

Pendiente: que el founder active «En el teléfono» en la app, acepte el permiso de iOS y quede registrado.
