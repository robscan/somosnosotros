# 252 · Los enlaces del sitio abren la app de iPhone (OL-223)

**Fecha:** 2026-09-26 · **Rama:** `enlaces-abren-app`, desde `origin/main` (0f7d5d1) · **OL:** OL-223 · **Modelo:** Opus 5.5 (gestor). Sin subagentes, council ni workflows.

## Lo que vio el founder

«Al abrir pincel en una computadora, escanear codigo con camara de celular, me abre navegador y pide inicio de
sesión, pero ya tengo la sesión en app, por que no me abre app?»

Lo de que Safari pidiera entrar era la navegación privada; el founder lo descartó. Queda lo principal: el QR abre
Safari y no la app, que es donde está la sesión.

## Causa

- El QR de la pared lleva a `https://somosnosotros.org/obra/<id>/mando` (`urlDelMando`, `src/lib/qr.ts`).
- `apple-app-site-association` (OL-194) solo reclamaba `/eventos/*`, `/lugares/*` y `/artistas/*`, así que iOS
  abría Safari, que no comparte la sesión de la app.
- La misma lista de tres rutas estaba en producción y en la copia de la CDN de Apple
  (`app-site-association.cdn-apple.com/a/v1/somosnosotros.org`), comprobado con `curl`.

## Arreglo

Se reclama todo el sitio (`/*`). Las exclusiones van primero, porque iOS se queda con el primer componente que
coincide:

- `/auth/*`: entrar. La vuelta de Apple y Google la atrapa `ASWebAuthenticationSession`, y el enlace del correo
  sigue abriéndose en el navegador, como hasta ahora.
- `/api/*`: no son páginas.
- `/avisos/baja*`: la baja de avisos del correo funciona sin sesión.
- `/eventos/*/calendario*`: el archivo .ics. Dentro de la app, el calendario va por la hoja nativa (OL-214).

## Lo nativo no cambia

- `SceneDelegate.swift` carga en el WKWebView cualquier enlace universal que le llega (`capacitorOpenUniversalLink`).
- Con la app cerrada del todo, Capacitor 8.5.2 no manda el enlace durante `willConnectTo`. Espera al primer
  `capacitorViewDidAppear`, que publica `CAPBridgeViewController.viewDidAppear`, y `MainViewController` no lo
  sobrescribe. Lo leí en `CAPSceneDelegateProxy.swift` de la etiqueta 8.5.2 en GitHub. Para entonces el
  observador de `SceneDelegate` ya existe.
- Por eso no hace falta una compilación nueva: sirve la 3.

## Evidencia

- `route.test.ts` simula cómo lee iOS los componentes (gana el primero que coincide). Comprueba que `/`,
  `/obra/<id>/mando`, las fichas, `/agenda` y `/ajustes` abren la app, y que `/auth/*`, `/api/*`, `/avisos/baja` y
  el .ics se quedan en el navegador.
- vitest (3 pruebas), eslint y typecheck en verde; el CI completo corre en el PR.
- Sin captura 390×844: el cambio no se ve en ninguna pantalla. La prueba de verdad es en el teléfono.

## Para probar

El iPhone lee este archivo a través de la CDN de Apple al instalar o actualizar la app, y la CDN guarda su copia
un tiempo. Tras publicar, el gestor comprueba con `curl` que la CDN ya muestra `/*`. Entonces el founder:

1. Borra la app y la reinstala desde TestFlight. Tendrá que volver a entrar.
2. Abre la pared de una obra en la computadora y escanea el QR con la cámara del iPhone.
3. Debe abrirse la app, directo en el mando, con su sesión.
