# 066 · Favicon e iconos del símbolo SN final sobre blanco; la barra conserva su logo (OL-040)

**Fecha:** 2026-09-16 (madrugada del 17) · **Rama:** `logo-final` · **Base:** el founder entregó tres SVG en `docs/diseno/logotipo/LogoFinal/` y pidió: (1) que `SMNSTRS - logo` sea el logo del encabezado, "el nuevo y final"; (2) rehacer favicon e icono de la app con `SN - Symbol`, con fondo blanco, porque en su iPhone el icono instalado se veía transparente (captura: cuadro oscuro con el SN apenas visible).

## Qué se hizo
- **Barra: se intentó y se revirtió.** El arte final se exportó a `public/logotipo.svg` y se vio en la vista previa; el founder lo detuvo: «no funciona en reducción el logo de header» (a 28 y 24 px las manos y los pies se vuelven textura y el trazo pesa más; comparación a tamaño real enviada). Decisión: **la barra conserva el logo de hoy** (`logotipo.svg` y `logotipo-chico.svg` del dibujo generado) y el arte final queda guardado para piezas grandes.
- **Iconos:** `docs/diseno/logotipo/iconos-sn.mjs` (con `sharp`, que ya viene con Next) genera del símbolo SN: `src/app/favicon.ico` (16, 32 y 48), `apple-touch-icon.png` (180), `icono-192.png`, `icono-512.png`, `icono-maskable-512.png` (dentro del círculo seguro) e `icono-aviso.png` (silueta blanca para Android). **Todos con fondo blanco opaco, sin esquinas transparentes**: los PNG de 192 y 512 anteriores tenían las esquinas transparentes y eso es lo que iOS pintó oscuro.
- `insignia.py` (la insignia de Android, de la bitácora 064) se borró: la genera el mismo script.
- Documentación: `logotipo/README.md` (arte final como fuente de verdad, historia del dibujo generado debajo), `LINEA_GRAFICA.md` y el comentario de `layout.tsx`.
- Hoja de revisión `docs/diseno/logotipo/iconos-revision.png`: favicon en pestaña clara y oscura a tamaño real y ampliado, inicio de iPhone, icono adaptable con su círculo, insignia sobre gris.

## Verificación
- `npm run lint`, `npm run typecheck` y `npm test` (206 pruebas): en verde.
- App de la rama en local a 390×844: se vio el logo nuevo en Agenda, Lugares y la ficha de evento antes de revertirlo; la barra queda idéntica a `main` (sin diferencias en los tres archivos). `/favicon.ico`, los seis PNG y el manifiesto responden 200.
- Por comprobar en el iPhone del founder con producción: quitar la app instalada y volver a agregarla (iOS guarda el icono al instalar; no se actualiza solo).

## Notas
- El emblema (`SMSNSTRS - Emblema.svg`, con "somosnosotros.org") queda guardado sin uso; sirve para piezas de presentación o la portada de vista previa.
- El favicon lleva el símbolo con manos, como pidió el founder; a 16 px las manos son textura, el SN se lee.
