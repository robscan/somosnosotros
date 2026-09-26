# 244 · Icono de la app: fondo en degradado (OL-215)

**Fecha:** 2026-09-25 · **Rama:** `icono-degradado` · **Quién:** gestor de cambios

## Pedido

Founder: «hice un ajuste al icono de app, revísalo y actualiza por favor».

## Qué cambió en su archivo

Se comparó `iconoApp.icon`, guardado en iCloud Drive (`Documents/smsnstrs/`), con el que está en `main` (OL-208).

- **El símbolo es el mismo:** `SN - Symbol.svg` idéntico byte a byte, sigue sin cristal y a la misma escala.
- **Solo cambia el fondo.** Antes era `automatic-gradient` sobre el crema (0.96078, 0.94902, 0.92549). Ahora es `linear-gradient` vertical, de Display P3 (1, 0.98465, 0.96499) a (0.84346, 0.83767, 0.82030), con `start` y = 1 y `stop` y = 0.3.
- Medido en el render de `ictool`: claro arriba, (254, 250, 246), y gris cálido abajo, (216, 215, 211), liso desde el 70 % del alto.
- Las variantes oscura y teñida no cambian.

## Qué se hizo

- `apps/ios/ios/App/App/AppIcon.icon`: reemplazado por el archivo nuevo. Solo cambia `icon.json`.
- `docs/diseno/logotipo/iconos-sn.mjs`: el fondo pasa a un degradado de `#FFFBF5` arriba a `#D7D6D1` al 70 % del alto; son los dos colores pasados a sRGB. Se regeneraron favicon, apple-touch-icon e iconos del manifiesto (192, 512 y adaptable). Medido en `icono-512.png`: (254, 250, 244) arriba y (215, 214, 209) desde el 70 %, igual que el render de `ictool`.

## Evidencia

- `capturas-244/01-app-claro-oscuro-tenido.png`: las tres variantes dibujadas con `ictool`. En la clara, el degradado se ve de crema muy claro arriba a gris cálido abajo; la oscura y la teñida quedan como antes.
- `capturas-244/02-web-favicon-inicio-android.png`: la hoja de revisión del generador con el degradado (favicon en pestañas clara y oscura, icono de inicio, icono adaptable de Android, insignia de avisos).

Llega al iPhone con la compilación 3 de TestFlight.
