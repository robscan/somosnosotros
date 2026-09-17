# 066 · Logotipo final del founder en la barra; favicon e iconos del símbolo SN sobre blanco (OL-040)

**Fecha:** 2026-09-16 (madrugada del 17) · **Rama:** `logo-final` · **Base:** el founder entregó tres SVG en `docs/diseno/logotipo/LogoFinal/` y pidió: (1) que `SMNSTRS - logo` sea el logo del encabezado, "el nuevo y final"; (2) rehacer favicon e icono de la app con `SN - Symbol`, con fondo blanco, porque en su iPhone el icono instalado se veía transparente (captura: cuadro oscuro con el SN apenas visible).

## Qué se hizo
- **Barra:** `public/logotipo.svg` sale ahora del arte final (coordenadas redondeadas a un decimal, 36 → 28 KB, tinta `#1a1a1a`). Un solo archivo para los dos tamaños: `logotipo-chico.svg` se borró y `Logotipo` lo usa a 28 px en raíz y 24 px en interiores (proporción 3908×795).
- **Iconos:** `docs/diseno/logotipo/iconos-sn.mjs` (con `sharp`, que ya viene con Next) genera del símbolo SN: `src/app/favicon.ico` (16, 32 y 48), `apple-touch-icon.png` (180), `icono-192.png`, `icono-512.png`, `icono-maskable-512.png` (dentro del círculo seguro) e `icono-aviso.png` (silueta blanca para Android). **Todos con fondo blanco opaco, sin esquinas transparentes**: los PNG de 192 y 512 anteriores tenían las esquinas transparentes y eso es lo que iOS pintó oscuro.
- `insignia.py` (la insignia de Android, de la bitácora 064) se borró: la genera el mismo script.
- Documentación: `logotipo/README.md` (arte final como fuente de verdad, historia del dibujo generado debajo), `LINEA_GRAFICA.md` y el comentario de `layout.tsx`.
- Hoja de revisión `docs/diseno/logotipo/iconos-revision.png`: favicon en pestaña clara y oscura a tamaño real y ampliado, inicio de iPhone, icono adaptable con su círculo, insignia sobre gris.

## Verificación
- `npm run lint`, `npm run typecheck` y `npm test` (206 pruebas): en verde.
- App de la rama en local a 390×844: el logo nuevo a la izquierda en Agenda y Lugares, y chico al centro en la ficha de evento. `/favicon.ico`, los seis PNG, `/logotipo.svg` y el manifiesto responden 200.
- Por comprobar en el iPhone del founder con producción: quitar la app instalada y volver a agregarla (iOS guarda el icono al instalar; no se actualiza solo).

## Notas
- El emblema (`SMSNSTRS - Emblema.svg`, con "somosnosotros.org") queda guardado sin uso; sirve para piezas de presentación o la portada de vista previa.
- El favicon lleva el símbolo con manos, como pidió el founder; a 16 px las manos son textura, el SN se lee.
