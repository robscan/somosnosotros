# 318 · Fuera «sin fines de lucro» y fuera «solo San Luis Potosí» de los textos

**Pieza:** OL-290. **Rama:** `textos-sin-lucro-ciudades`. **Fecha:** 2026-10-05.
**Estado:** candidato listo para revisión del gestor; sin PR y sin publicar.

## Decisión del founder

2026-10-05: «elimina la leyenda sin fines de lucro. Podríamos introducir un creador de flyers en el futuro. Solo por protección elimina eso. Además deja de decir que solo es directorio de San Luis. Abriremos el catálogo a más ciudades pronto.»

Criterio aplicado: no se sustituye por ninguna otra afirmación sobre la naturaleza legal o comercial del proyecto. El proyecto se describe por lo que hace (un directorio de centros culturales y una agenda de eventos para que la gente se conozca). San Luis Potosí aparece solo como «empezó en» donde la frase lo necesita, o no aparece. La regla «los negocios no entran al directorio» no cambia.

## Textos cambiados

| Archivo | Antes | Después |
|---|---|---|
| `src/app/ayuda/page.tsx` (¿Qué es Somos Nosotros?) | «Un directorio de los lugares culturales de San Luis Potosí y su agenda de eventos, para que la gente de la ciudad se entere de qué hay y se conozca. Sin fines de lucro; lo publican la administración y quienes se registran.» | «Un directorio de lugares culturales y su agenda de eventos, para que la gente se entere de qué hay en su ciudad y se conozca. Lo publican la administración y quienes se registran.» |
| `src/app/privacidad/page.tsx` (Quién responde por tus datos) | «…una plataforma sin fines de lucro para que la gente de San Luis Potosí conozca sus lugares culturales, sus artistas y su agenda.» | «…una plataforma para que la gente conozca los lugares culturales, los artistas y la agenda de su ciudad.» |
| `src/app/reglas/page.tsx` (subtítulo) | «Somos Nosotros es de la gente de San Luis Potosí. Estas son las reglas para que siga sirviendo.» | «Estas son las reglas para que Somos Nosotros siga sirviendo a la gente que lo usa.» |
| `src/app/personas/[id]/page.tsx` (descripción al compartir la ficha de una persona) | «Va a 3 eventos próximos · San Luis Potosí» (ciudad fija en el texto) | «Va a 3 eventos próximos» (igual con 0 y 1 evento) |
| `package.json` (`description`) | «Directorio de centros culturales y agenda de eventos. San Luis Potosí.» | «Directorio de centros culturales y agenda de eventos.» |
| `scripts/instituciones/invitar-agendas.ts` (`INTRO`, el correo a instituciones) | «Somos Nosotros es un directorio sin fines de lucro de centros culturales y agenda de eventos de San Luis Potosí, para que la gente local se conozca.» | «Somos Nosotros es un directorio de centros culturales y agenda de eventos, para que la gente local se conozca.» |
| `scripts/capo/invitar.ts` (correo de invitación a artistas, texto llano y HTML) | «…para armar el directorio de Somos Nosotros, donde la gente de San Luis Potosí encuentra centros culturales y eventos.» | «…donde la gente encuentra centros culturales y eventos.» |
| `scripts/capo/invitacion.md` (plantilla de ese correo) | igual que la fila anterior | igual que la fila anterior |
| `docs/rediseno/31-agendas-por-correo.md` (las dos plantillas de correo, líneas de «Cuerpo») | «…un directorio sin fines de lucro de centros culturales y agenda de eventos de San Luis Potosí, para que la gente local se conozca.» | «…un directorio de centros culturales y agenda de eventos, para que la gente local se conozca.» |
| `README.md` | «Proyecto sin fines de lucro. Directorio de centros culturales y agenda de eventos para conocer gente local. Empieza en San Luis Potosí.» | «Directorio de centros culturales y agenda de eventos para conocer gente local. Empezó en San Luis Potosí.» |
| `CLAUDE.md` (primera descripción) | «Plataforma sin fines de lucro: directorio de centros culturales y agenda de eventos para que la gente local se conozca. Empieza en San Luis Potosí.» | «Directorio de centros culturales y agenda de eventos para que la gente local se conozca. Empezó en San Luis Potosí y no se limita a ella: el catálogo se abrirá a más ciudades.» Más un párrafo nuevo con la decisión, la fecha y las palabras textuales. |
| `docs/DEFINICION.md` («Qué es») | «Una plataforma sin fines de lucro para que la gente de una ciudad se entere… Empieza en **San Luis Potosí**.» | «Un directorio de centros culturales y una agenda de eventos para que la gente de una ciudad se entere… Empezó en **San Luis Potosí** y no se limita a ella: el catálogo se abrirá a más ciudades. No afirma nada sobre su naturaleza legal o comercial» con la decisión, fecha y palabras textuales entre paréntesis (marca como sustituidas las dos frases anteriores). |
| `docs/ops/PROMPT_INICIO.md` | «plataforma sin fines de lucro, directorio de centros culturales y agenda de eventos para que la gente local de San Luis Potosí se entere de qué hay y se conozca.» | «directorio de centros culturales y agenda de eventos para que la gente local se entere de qué hay y se conozca (empezó en San Luis Potosí).» |

El aviso de privacidad y las reglas no se tocaron en nada más (ni cláusulas ni la fecha «Última actualización»).

## Lo que NO se tocó, y por qué

Metadatos SEO, Open Graph, `manifest.ts`, JSON-LD y títulos: ya no nombraban San Luis ni «sin fines de lucro» (`layout.tsx`, `manifest.ts`, `lugares/page.tsx` y `artistas/page.tsx` usan texto general; los comentarios que dicen «San Luis» describen un error ya corregido, OL-059). Se comprobó en el build local, ver abajo.

- **Datos y lógica donde San Luis es un dato real (d):** `CIUDAD_INICIAL` y la ciudad por defecto (`src/lib/ciudad.ts`), `direccionContexto.ts`, `geocodificar.ts`, `hojaDonde.ts`, `lugares.ts` (recorte de direcciones), `fechas.ts`, `novedades/consultas.ts`, comentarios del código, fixtures, pruebas, migraciones, `supabase/tests`, direcciones de lugares, scripts de importación CAPO e instituciones (`lugares.json`, `agendas.json`, `eventos*.json`, etc.).
- **Asunto de los correos a instituciones** («agendas de X en San Luis Potosí», `invitar-agendas.ts` y su prueba): dice dónde está la institución a la que se escribe, no limita el proyecto; esa tanda es de San Luis.
- **`scripts/instituciones/lugares.json` línea 879:** «Asociación civil sin fines de lucro que desde 1995 enseña alemán…» describe a otra organización (un lugar del directorio), no al proyecto. Es dato de una ficha real; se queda.
- **Nombre «Catálogo de Artistas Potosinos»** (`origen.ts`, privacidad, reglas, `sitemap.ts`): es el nombre de una fuente, hay que citarlo tal cual.
- **`docs/ops/AGENDAS_CULTURALES.md`, `PROMPT_REDES.md`, `docs/PLAN.md` («Ciudad inicial: San Luis Potosí», «mapa de San Luis Potosí» en la prueba de la fase 0):** datos de la ciudad inicial y de la rutina de investigación de esa ciudad.
- **Historia (c):** bitácoras, `docs/heredado`, `docs/investigaciones/seo.md` (consultas de búsqueda reales), `docs/council`, `docs/diseno/TIPOGRAFIAS_PREMIUM.md` (la nota sobre descuentos de fundiciones para «organizaciones sin fines de lucro» es un hecho de esa investigación, no una descripción del proyecto), prototipos ya firmados, capturas, `ASIGNACIONES.md`, `COLA_DE_PIEZAS.md`, `REVISION_*`, `PEDIR_AYUDA_*` y las entradas viejas de `OPEN_LOOPS.md`.
- **«La regla de los negocios»** y toda la lista de «Qué NO es» de `DEFINICION.md`: sin cambios.

## Para decidir por el founder (no se reescribió nada)

Afirmaciones que hoy dependen de que el proyecto no cobre ni venda. No se tocaron:

1. `src/app/layout.tsx` (descripción, Open Graph y Twitter), `src/app/agenda/page.tsx` y `src/lib/perfil.ts` (`TEXTO_INVITAR`, el texto de «invitar»): «**Gratis**, sin cuenta para mirar». Es una promesa de costo en el texto que sale al compartir el sitio. Si el creador de flyers fuera de pago, convendría quitar «Gratis» (queda «Sin cuenta para mirar»).
2. `src/app/privacidad/page.tsx`, «Con quién se comparten»: «**No vendemos ni cedemos tus datos** a nadie más.»
3. `src/app/privacidad/page.tsx`, «Cookies» y `src/app/entrar/FormularioEntrar.tsx`: «**Sin rastreo ni publicidad**» y «Entras sin contraseña y sin rastreo ni publicidad.»
4. `src/app/reglas/page.tsx`, comentario del código (no sale en pantalla): «un directorio sin cobro no los necesita [términos y condiciones]». Con un posible servicio de pago, las reglas podrían necesitarlos.
5. Aviso de privacidad: «Última actualización: 16 de septiembre de 2026.» No se cambió porque el encargo prohíbe tocar más que esas dos cosas; el texto del aviso sí cambió (una frase) y el propio aviso promete la fecha nueva si cambia. Decide el founder si lo fecha el 2026-10-05.
6. Texto de «Gratis» de eventos (precio de cada evento) y el filtro «Gratis» de Agenda: son datos de cada evento, no una afirmación sobre el proyecto; no se tocan.

## Lo que vive fuera del repo y habría que cambiar a mano

- **Ficha de la App Store (App Store Connect):** descripción, texto promocional y subtítulo; revisar que no digan «sin fines de lucro» ni «San Luis». La decisión del 2026-09-25 menciona un subtítulo «Agenda cultural de tu ciudad…» (ya general); el resto no se pudo comprobar desde el repo.
- **Perfiles de redes sociales** (Instagram y otros): biografía.
- **Plantillas de correo en Supabase (Auth) y Resend:** `supabase/config.toml` no trae plantillas propias (las líneas `content_path` están comentadas); revisar en el panel de Supabase (Authentication > Email Templates) y en Resend por si el texto lleva la frase.
- **Search Console:** la propiedad no guarda textos propios; solo si se reenvía el sitemap o se pide reindexar, los resultados se actualizan solos con el nuevo HTML. Nada que editar.
- **Correos ya enviados** (CAPO e instituciones): no se pueden cambiar.
- **Vercel (metadatos del proyecto, descripción del repo en GitHub):** la descripción del repositorio `robscan/somosnosotros` y la del proyecto en Vercel, si dicen «sin fines de lucro».

## Comprobaciones

- `npm run lint`: 0 errores (1 aviso previo en `VisorImagen.componentes.test.mjs`, no tocado). `npm run typecheck`: limpio.
- `npx vitest run scripts/instituciones/invitar-agendas scripts/capo/invitar src/lib/perfil src/lib/estructurados`: 4 archivos, 52 pruebas, todas en verde. Ninguna prueba afirmaba los textos cambiados.
- Build local (`next build`) contra el respaldo local (puertos 8851 y 3151 propios, cerrados por PID al terminar; variables inventadas, sin `.env`). Con `next start` y `curl`:

| Ruta | HTTP | «lucro» en el HTML | Título y descripción con «San Luis» |
|---|---|---|---|
| `/` | 200 | 0 | no |
| `/lugares` | 200 | 0 | no |
| `/artistas` | 200 | 0 | no |
| `/agenda` | 200 | 0 | no |
| `/ayuda` | 200 | 0 | no |
| `/privacidad` | 200 | 0 | no |
| `/reglas` | 200 | 0 | no |

  «San Luis Potosí» sigue saliendo en `/`, `/lugares`, `/artistas` y `/agenda` solo como la ciudad elegida por defecto y como datos de los lugares y eventos (variables y fixtures); en `/ayuda`, `/privacidad` y `/reglas` ya no sale. `manifest.webmanifest` no nombra la ciudad.
- Sin captura móvil: solo cambia texto de tres páginas legales y metadatos de un compartido; no hay cambio de estructura ni de estilo.
