# 081 · Imagen sin foto con el símbolo SN

**Fecha:** 2026-09-16 (noche) · **Rama:** `sin-foto-sn` (árbol de trabajo en `.claude/worktrees/sin-foto-sn`; commit local, sin push) · **Pieza:** OL-054.

## Qué pidió el founder
Al aprobar el prototipo de Destacados (OL-052):
> «Cuando los eventos, lugares o artistas no tengan imagen de portada, entonces usa una imagen con el symbol que te dí en el centro, crea la imagen de place holder y luego la usas, no compongas en vivo el image place holder con el simbolo.»

> «ojo: en artistas usamos contenedor redondo, consistente con avatar de artistas.»

Además: «Se exigente al maquetar y al escribir código, no sobre anides ni dejes lineas de código basura» y «informa siempre de lo que haces al chat de gestión de cambios y espera instrucciones».

El plan se mandó al encargado antes de empezar. Respondió:
- esta pieza va primero, en su rama y con esta bitácora y OL-054;
- Destacados sigue después, cuando esto esté en `main`;
- en los archivos que también toca el PR #78 (zona horaria), solo el hueco sin foto, sin reordenar ni reformatear.

## Qué se hizo
- **Las imágenes.** `docs/diseno/logotipo/sin-foto-sn.mjs` (sharp, desde `LogoFinal/SN - Symbol.svg`) genera:
  - `public/sin-foto.png` (336×336, 4 KB), para miniaturas y avatares;
  - `public/sin-foto-ancha.png` (1680×660, 8 KB), para la banda de las fichas.

  Son opacas, con fondo `--fondo-miniatura` (`#e6e6e2`) y el símbolo en `#b1b0a9`. El tono se eligió entre tres: se lee a 48 px sin competir con las fotos de al lado. Se le mandaron al founder antes de conectarlas.
- **Dónde se usan.** `SIN_FOTO` y `SIN_FOTO_ANCHA` viven en `src/lib/imagen.ts`. Donde había un icono sobre gris ahora hay `<img src={foto ?? SIN_FOTO} alt="">`, con la clase de la foto y sus medidas fijas:
  - renglón de evento;
  - listas de Lugares y de Artistas (redonda por su contenedor);
  - tarjeta del mapa;
  - lugares y artistas que sigue una persona;
  - renglones del panel;
  - sugerencias de «Dónde es» y de «Quién se presenta» (28 px, redonda).
- **Fichas.** `Cartel` acepta `src` nulo y pone la imagen en la misma caja (banda de 220 px o avatar redondo de 112 px), sin lupa ni visor. Las tres fichas lo llaman siempre.
- **Lo que se borró** porque ya nadie lo usaba:
  - `.fotoVacia` en `Renglon`, `admin` y `Sugerencia`, y `.miniVacia` en `SelectorQuien`;
  - el icono por sección del panel y sus tres importaciones, `IconoCalendario` en `RenglonEvento` e `IconoPin` en `VistaLugares`;
  - el tamaño variable de `IconoDisciplina`, que solo pedían los huecos.
- **[Línea gráfica](../../../diseno/LINEA_GRAFICA.md):** el párrafo del hueco sin foto dice ahora qué imagen es, dónde vive y cómo se genera.
- 19 archivos, 63 líneas añadidas y 122 quitadas. Sin migración ni variables.

## Maquetación
- Cada hueco sin foto pasa de 4 nodos (`span`, `svg` y sus trazos) a 1 (`img`). No hay envoltorios nuevos.
- En las fichas sin foto ya no se pinta el botón del visor.

## Evidencia
- Lint con 0 errores (queda 1 aviso previo en `iconos-sn.mjs`), tipos, 258 pruebas y build en verde.
- **Capturas a 390×844** con `next dev` de la rama contra una API falsa local de solo lectura (datos inventados, sin producción) y una sesión de administrador inventada:
  - Agenda: Mariachi Universitario, sin foto;
  - Lugares › Lista: Biblioteca Central y Casa de la Cultura de Soledad;
  - Artistas: Cumbia Fantasma y Abraham Delgadillo, en círculo;
  - ficha de lugar sin foto (banda) y ficha de artista sin foto (círculo);
  - panel › Lugares.
- **No mirado en pantalla:** la tarjeta del mapa (en local no hay Mapbox) y las sugerencias de los formularios. Usan el mismo cambio.
- En la consola solo aparece el registro del service worker de `next dev`, ajeno a esta pieza.
- Al terminar se apagaron los dos servidores, se borró `.env.local` y se restauró `CLAUDE.md`.

## Hallazgos de paso
- `src/components/ui/Tarjeta.tsx` no se importa en ningún sitio.
- En su ficha, un evento sin cartel no usa la foto de su lugar (en el renglón sí) y ahora muestra el símbolo. Si se prefiere la foto del lugar, es un cambio de una línea.
- Para una sesión inventada, la firma del token debe ser base64url válida: `getClaims` rechaza `firma` con «JWT not in base64url format».

## Queda
- Push, PR y producción: el encargado de gestión de cambios.
- Firma del founder en el iPhone.
- Destacados (OL-052, bitácora 082) empieza cuando esto esté en `main`. Antes, confirmar con el founder D1, D2, D3 y el color, con sus opciones.
