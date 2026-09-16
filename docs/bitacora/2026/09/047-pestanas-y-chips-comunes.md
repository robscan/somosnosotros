# 047 · Tira de pestañas común y chips de la agenda sobre el chip común

**Fecha:** 2026-09-16 (tarde) · **Base:** los dos pendientes de la pasada de maquetación (bitácora 046) que el founder aceptó · **PR:** aparte del #53, con captura de la agenda.

## Qué se hizo
- **`ui/Pestanas`** (`Pestanas` + `Pestana`): la tira con la raya común en la base y la elegida con la raya del color de acción. La raya de la base va como sombra interior, así no suma alto ni pide márgenes negativos; la de la elegida, de 2 px, la pisa. `repartidas` = columnas iguales a lo ancho. La usan los filtros de la agenda (Todos · Cercanos · Siguiendo · Nuevos), Mapa · Lista en Lugares y los números de la ficha de persona ("Va a 2 · Sigue 1"); cada una conserva solo lo suyo (gutter, pegajosa, el número grande).
- **Chips de la agenda** (Hoy, ciudad, lupa): el dibujo base es el de `ui/Chip.module.css` (borde, redondeo, fondo, letra, sin salto); la agenda solo añade lo suyo (`.chipContexto`: 40 px de alto, negrita, icono suave, y `.marcado` para la fecha elegida). Se fue la copia del chip y la del campo nativo invisible (`.encima`).
- La cabecera pegajosa de la agenda ya no pone su propia raya (la pone la tira): `--alto-cabecera-agenda` pasa de 101 a 100 px, y la caja del mapa de Lugares deja de restar el píxel de la raya.
- Hallazgo al construir: el modificador del chip se llamaba `.contexto`, igual que la fila que los contiene, y la fila perdió su relleno (cabecera de 84 px en vez de 100). Renombrado a `.chipContexto`; medido después: cabecera 100 px = fila de chips 56 + pestañas 44, igual que la variable.

## Evidencia
- lint, typecheck y 145 pruebas en verde.
- Capturas a 390 de ancho: agenda con chips y pestañas (medida la cabecera: 100 px), Lugares con Mapa · Lista, ficha de persona con "Va a 0 · Sigue 1".

## Firma
Firmado por el founder en el iPhone (2026-09-16, tarde): "Te firmo todo".
