# 016 · Línea gráfica: Bricolage Grotesque y logotipo SMSNSTRS (2026-09-14)

Sin rama todavía (se junta con la deuda técnica de la bitácora [015](015-council-rediseno-y-deuda-tecnica.md) en un solo PR cuando el founder lo pida). Cierra OL-007 en su parte de código; la firma es del founder en su iPhone. Decisión y roles: [LINEA_GRAFICA.md](../../../diseno/LINEA_GRAFICA.md).

## Qué quedó

1. **Letra.** `src/app/layout.tsx` carga `Bricolage_Grotesque` con `next/font/google` (ejes `opsz` y `wdth`, subconjuntos `latin` y `latin-ext`, `display: swap`, variable `--fuente-bricolage`) y la pone en `<html>`. Se sirve desde nuestro dominio; sin llamada a Google en cada visita.
2. **Tokens en `globals.css`.** `--fuente` apunta a la variable; `--ancho-titulo: "wdth" 75` y `--ancho-texto: "wdth" 80`; el cuerpo lleva `font-variation-settings: var(--ancho-texto)`, `font-optical-sizing: auto` y números tabulares; `h1`, `h2`, `h3` llevan ancho 75, peso 700, interlineado 1.15 y `text-wrap: balance`. Escala un punto más grande: 14 / 15 / 17 / 18 / 19 / 26 / 30, más `--letra-logo` de 22 px.
3. **Logotipo.** `ui/Logotipo` (texto SMSNSTRS, peso 800, ancho 75, interletrado −0.01em, color del texto, enlace al inicio) y `ui/Barra` (regreso a la izquierda, logotipo a la derecha). La barra sustituye al enlace "← Volver" en todas las pantallas: ficha de lugar y de evento, perfil, persona, admin, entrar, alta y edición de lugar y de evento. En el inicio, la cabecera del panel pasa a sesión a la izquierda y logotipo a la derecha, con la ciudad y el conteo debajo (la jerarquía del inicio se rediseña aparte: [01-inicio-fricciones.md](../../../rediseno/01-inicio-fricciones.md)).
4. **Nombre visible "Somos Nosotros"** en `title` de todas las pantallas, `applicationName`, `appleWebApp.title`, `manifest.ts` (name y short_name), `siteName` de la vista previa al compartir, el correo de aviso ("en Somos Nosotros") y el remitente por defecto. Ojo: en Vercel la variable `CORREO_REMITENTE` manda sobre el valor por defecto; si allí dice "somosnosotros", hay que cambiarla a mano.
5. **Pesos.** Títulos de pantalla, de sección, de grupo de la agenda y de tarjeta a 700 (la condensada a 600 se ve floja); botón principal a 700; etiquetas en mayúsculas (Cuándo, Dónde, Cuánto) a 500 con interletrado 0.04em.

## Verificación (390×844, servidor local, base real, usuario desechable borrado)

- Inicio con el panel a media altura y expandido; ficha de "Carísimo"; Mi perfil y Publicar un evento con sesión. La letra cargada es Bricolage Grotesque (comprobado con `document.fonts`); el cuerpo reporta `"wdth" 80` y `font-optical-sizing: auto`; el logotipo mide 22 px, peso 800, `"wdth" 75`.
- Ningún campo por debajo de 16 px (consulta sobre todos los `input`, `textarea` y `select` del formulario de evento: lista vacía).
- Lint, typecheck, 53 pruebas y build en verde.
- **Peso de la letra:** `next/font` generó tres woff2: latín 132 KB (precargado), latín extendido 56 KB (precargado) y uno de 24 KB sin precarga. Es más de lo previsto en la línea gráfica ("un solo archivo latino"): el español cabe en el subconjunto latín; quitar `latin-ext` ahorra 56 KB por primera visita. Queda como decisión del founder.

## Fuera de alcance (como se pidió)

Iconos de la PWA, pantalla de entrada con el logotipo grande, tipografía del mapa.
