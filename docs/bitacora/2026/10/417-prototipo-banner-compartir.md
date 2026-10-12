# 417 · Prototipo: banner para compartir la app y Destacados más grande (OL-386)

**Fecha:** 2026-10-12. **Rama:** `prototipo-banner-compartir`, base `origin/main` (`567f202e`). **Operador:** Gestor de cambios VI (Fable 5.1), sin agentes. **Sin migración ni código de la app.**
**Página privada:** https://claude.ai/artifact/8EpqEMd3c3n553UqND5KQ8 (versión 12, «Banner para compartir (OL-386)»; la misma página de OL-377, con «Hoy» = lo firmado el 12 de octubre, que ya está en producción). **Estado:** esperando los comentarios y la firma del founder.

## Qué pidió el founder (2026-10-12, 12:10, textual)

«Crea por favor un banner de ancho completo para que los usuarios compartan la app, el banner aparecerá para usuarios logueados que hayan entrado más de 2 veces y les dirá algo como ¿Te gusta Somos Nosotrxs?, comparte con tus amigxs. Analiza lo que te digo, presenta prototipo, aprovecha para crecer proporcionalmente un poco más el carril de destacados/seleccionados para ti.»

## Análisis

1. **Qué es:** una pieza de recomendación, no de contenido: pide algo a la persona. Por eso va a lo ancho (con el aire de 20 px de los carriles, no pegada al borde), una sola vez por sesión en pantalla, con salida clara (× y «Compartir») y solo a quien ya volvió. A quien apenas llega no se le pide nada.
2. **Dónde:** tras «Seleccionados para ti» / «Destacados» (B1 «tras Destacados», la propuesta): es lo primero que se ve y lo que mejor habla de la app; el banner queda justo debajo, al alcance de un gesto, sin ocupar la primera pantalla (con XL+ el carril llena el alto). Alternativas medidas: tras «Tus planes» (ya hay un compromiso de la persona; empuja «Esta semana») y al final de Inicio (lo ven pocos).
3. **Cuándo:** con sesión y a partir de la tercera visita («más de 2 veces»). **Dónde contar:** en el teléfono (`localStorage`, como la memoria de pantalla y «lo nuevo» de Nuevos eventos), un conteo por **día distinto** en que abrió Inicio, para que recargar no cuente; sin red ni tabla nueva y sin saber nada de la persona en el servidor. La base solo guarda el último día que la cuenta abrió la app (`cuentas_vistas`, OL-071), no un conteo; si se quisiera por cuenta y no por teléfono, sería una columna que solo añade. **Cerrar:** la × lo esconde 30 días (en el teléfono). **Tras compartir:** no vuelve (la hoja de compartir del sistema no dice si se compartió de verdad: se da por hecho al abrirla).
4. **Compartir:** `navigator.share({ title: "Somos Nosotrxs", text: "…", url: "https://somosnosotros.org" })`; sin Web Share (escritorio), «Enlace copiado» con el portapapeles, como ya hace la ficha. El enlace es el dominio principal (el founder decidió el 2026-10-10 que somosnosotrxs.org solo va en el cartel).
5. **Texto:** «¿Te gusta Somos Nosotrxs?» · «Compártela con tus amigxs.» · botón «Compartir». Por confirmar la grafía «Nosotrxs» en la app (la marca es «Somos Nosotros»; «Nosotrxs» es el dominio del cartel y el lenguaje incluyente de la app).
6. **Destacados más grande:** de XL (248×310) a **XL+ (280×350)**: se ve una tarjeta y un cuarto, el título a 21 px. «Ancho» (350, una por pantalla) sigue como opción; la propuesta es XL+ porque conserva la pista de que hay más («asoma la siguiente»).

## Los ejercicios nuevos (sobre lo firmado en OL-377)

| Clave | Qué cambia | Opciones |
|---|---|---|
| **B1** | Dónde va el banner | Sin banner (hoy) · **Tras Destacados** · Tras Tus planes · Al final de Inicio |
| **B2** | Cómo se ve | **Suave** (violeta claro, icono y botón violeta) · Violeta (pleno, texto blanco, botón blanco) · Con el símbolo SN |
| **B3** | Cuándo aparece (prueba) | 1.ª visita · 2.ª visita · **3.ª o más** (solo entonces sale) |
| **D2** | Tamaño de Destacados | Grande · XL (hoy, firmado) · **XL+ (280)** · Ancho |

Preajustes: **Hoy** (lo firmado el 12 de octubre, ya en producción: sin banner, XL), **Propuesta** (Hoy + B1 tras Destacados · B2 suave · D2 XL+) y **Firmada** (por firmar). El banner se cierra con la × (aviso con «Deshacer») y «Compartir» dice qué abriría.

## Capturas (`docs/rediseno/capturas-417/`, 390×844, Chrome real)

- `01-hoy-firmado-12-oct-xl-248.png` — Inicio como está hoy en producción: «Seleccionados para ti» en XL.
- `02-propuesta-destacados-xl-280.png` — el carril en XL+: una tarjeta y un cuarto, el título a 21 px.
- `03-propuesta-banner-tras-destacados-suave.png` — el banner suave justo debajo del carril: icono, «¿Te gusta Somos Nosotrxs?», «Compártela con tus amigxs.», × y «Compartir».
- `04-banner-violeta.png`, `05-banner-simbolo.png` — las otras dos pintas.
- `06-banner-tras-tus-planes.png`, `07-banner-al-final.png` — las otras dos posiciones.
- `08-segunda-visita-sin-banner.png` — con dos visitas no sale.
- `09-banner-cerrado-deshacer.png` — tras la ×, el aviso «Cerrado: no vuelve a salir en 30 días · Deshacer».
- `10-destacados-ancho-350.png` — la alternativa «Ancho».
- `11-hoja-ejercicios-nuevos.png` — la hoja con B1, B2, B3 y D2 arriba.

## Por confirmar con el founder

1. Posición (B1), pinta (B2) y tamaño de Destacados (D2).
2. Contar visitas en el teléfono por día distinto (recomendado) o por cuenta en la base.
3. «Nosotrxs» en el texto del banner.
4. Cuánto descansa tras la × (30 días) y si vuelve alguna vez tras compartir (propuesta: no).

## Lo que sigue

Con la firma: una pieza de código chica (componente `BannerCompartir` en Inicio, conteo de visitas en `lib/`, `navigator.share` con respaldo de copiar, pruebas y captura) y el token del tamaño XL+ en `TarjetaEvento`/`Destacados.module.css`.
