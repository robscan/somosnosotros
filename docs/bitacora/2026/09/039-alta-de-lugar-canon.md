# 039 · Alta de lugar con el canon

**Fecha:** 2026-09-15 · **Rama:** `alta-lugar-canon` → PR · **Pieza:** OL-019, PR C (diseño firmado en [13](../../rediseno/13-novedades-perfil-alta-flujo-y-estados.md), decisiones 8 a 12); cierra el PR 3 de OL-010

## Qué pidió el founder
Cuestionar fuerte el alta de lugar (fricción entre el campo de nombre y el mapa; propuso paginar). Firmó la alternativa: una cosa a la vez con renglones resueltos, el mapa en su hoja y solo cuando hace falta, dos salidas por intención en Dónde, sin frases de ayuda, iconos con tooltip, y "¿Qué es?" con tipo Otro. Lo fijó como canon para cuestionar los demás formularios.

## Qué se hizo
- **Base** (`20260915150000_lugar_detalle.sql`, aplicada a producción): `lugares.detalle` (máximo 60), qué es cuando el tipo es Otro. `lib/lugares · etiquetaLugar` ("Otro · Taller de cerámica") en la ficha.
- **`FormularioLugar`** reescrito con el canon:
  1. Un campo arriba, el nombre, con la lupa dentro y foco al llegar; sin frase de ayuda. Las sugerencias de Mapbox con icono de pin: lugares con nombre (nombre, dirección) y direcciones ("**Workshop 850** · Usar la dirección Calle 5 de Mayo 850"), que ubican sin nombrar. "Ya está registrado: …" como aviso con icono.
  2. **Dónde**: resuelto en cuanto algo lo resuelve (sugerencia, Estoy aquí, hoja) con la dirección y "Cambiar"; pendiente con borde punteado, "Falta" y dos iconos por intención: ubicación (acabo de descubrir el lugar: pone el pin donde estoy sin abrir nada) y lupa (sé dónde está: abre la hoja con el campo de dirección enfocado).
  3. **Tipo**: deducido del nombre, "Otro" si no hay pista; al abrir, chips; con Otro, "¿Qué es? Ej. taller de cerámica (opcional)".
  4. **Más**: descripción, un campo de enlace, foto de portada; para el administrador, la dirección de una imagen y "Solo yo lo veo". Se esconde sin desmontar: lo escrito y los enlaces no se pierden al cerrar. En edición viene abierto.
  5. El botón dice qué falta ("falta el nombre", "falta dónde está") y queda deshabilitado hasta entonces.
- **`HojaDonde`** (nueva): campo de dirección con sugerencias de Mapbox (geocodificación v6), el mapa con el pin y el mismo botón de ubicación del mapa de Lugares, la dirección deducida del pin y "Listo". Se abre solo desde Dónde.
- Borrador local con el detalle; el resto (sesión de búsqueda, repetidos, "¿Es este?", foto, privado) igual que antes.

## Verificación
Lint, typecheck, 134 pruebas (nueva: el detalle solo cuenta con tipo Otro) y build en verde. Mirado a 390×844 con un usuario desechable (borrado al terminar): al llegar, el campo con lupa y los tres renglones (Dónde · Falta con los dos iconos; Tipo · Por el nombre; Más) y el botón "Publicar lugar · falta el nombre"; al escribir "Workshop 850", tres direcciones marcadas "Usar la dirección…", dos lugares con nombre de otras ciudades y el aviso "Ya está registrado: Workshop 850"; la lupa abre la hoja "Dónde está" con el campo, el mapa con su botón de ubicación y "Listo". Maquetación: renglones como `li` con grid de areas (icono, clave, valor, acción, cuerpo); sin envoltorios.

## Pendiente
- Firma del founder en el iPhone (Estoy aquí con GPS real, arrastrar el pin, publicar).
- Cuestionar con este canon el alta de evento, el alta de artista y la hoja Editar del perfil (pedido del founder para después).
