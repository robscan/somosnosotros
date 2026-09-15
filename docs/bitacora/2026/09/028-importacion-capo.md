# 028 · Importación del Catálogo de Artistas Potosinos (CAPO)

**Fecha:** 2026-09-14 · **Rama:** trabajo sin commit sobre `main` (el founder decide el PR) · **Pieza:** OL-011

## Qué pidió el founder
Revisar catalogoartistaspotosino.com (catálogo público de la Dirección de Cultura Municipal, hecho en Google Sites), ver si prohíbe copiarlo y qué tan viable era traer sus datos e imágenes. Tras la evaluación decidió: importar todo **sin fotos**, fichas marcadas "por confirmar", correos guardados aparte solo para una invitación futura (plantilla todavía no), primero artistas y luego lugares.

## Lo que se encontró
- Sin términos de uso, sin aviso de derechos, sin licencia. Solo un aviso de privacidad que cubre los datos que el artista entrega al municipio al registrarse y promete no transferirlos. La portada dice que el catálogo "debería ser de dominio público".
- 51 páginas, unas 690 fichas en el HTML (nombre, biografía, iconos a redes, correo `mailto:`; imagen antes del nombre). Las imágenes solo descargan con URL firmada por un navegador real (curl da 403); como no se importan, no hizo falta Playwright.
- Fotos y biografías son obra de los artistas o sus fotógrafos: la foto era el punto frágil. Los correos (482) son datos personales: no van en la ficha.

## Lo que se hizo
- **Migración 0011** (`20260914060000_capo.sql`, aplicada a producción): `artistas.origen` y `lugares.origen` (`'capo'`), y tabla `contactos_importados` (correo, fuente, url, `invitado_en`) con RLS sin políticas: solo la llave de servicio la lee (comprobado: la llave anónima recibe `[]`).
- **`scripts/capo/`**: `capo.ts` (funciones puras: HTML → registros → fichas; 16 pruebas en `capo.test.ts`), `capturar.ts` (baja las páginas, escribe `salida/*.json` e `informe-captura.md`), `importar.ts` (inserta con la llave de servicio; geocodifica lugares con Mapbox dentro de una caja de la ciudad y solo acepta dirección exacta en la misma calle; `--simular`, `--solo artistas|lugares`), `correr.mjs` (compila con esbuild reutilizando `src/lib` y corre con `.env`). `scripts/capo/salida/` está en `.gitignore` porque trae correos.
- Lectura del HTML: nombres en h2, en h1 (páginas de danza) o en párrafo en negritas seguido de "(San Luis Potosí)"; encabezados entre paréntesis son el origen; dos encabezados seguidos son alias y nombre; en páginas a columnas el texto puede venir antes del encabezado y se reparte por nombre. Disciplina, detalle (género musical, "pintura", "compañía de teatro") y tipo por defecto salen de la ruta de la página; `deducirTipoArtista` corrige el tipo por el nombre. Descripción recortada a 600 en fin de frase. Redes con `normalizarRedes`, sin enlaces de Google/forms. Duplicados por nombre normalizado unidos (14 artistas en dos páginas).
- **UI**: `src/lib/origen.ts` (`ORIGENES`), `PieOrigen` en las fichas de artista y lugar: "Ficha tomada del Catálogo de Artistas Potosinos de la Dirección de Cultura Municipal, por confirmar." En artista, si quien mira no puede editarla: "¿Eres tú? Soy yo / es mi grupo" (el flujo ya existente).

## Resultado en producción (2026-09-14)
| | Capturados | Insertados | Pendientes |
|---|---|---|---|
| Artistas | 520 | 520 | 0 |
| Lugares | 18 | 13 | 5 sin dirección exacta |
| Correos | 482 | 482 en `contactos_importados` | — |

Lugares para dar de alta a mano desde el teléfono: CM Produzioni / Sensea Immersive (sin dirección; probablemente no es un lugar potosino), Teatro Carpa Medel Hns. (Plan de Guadalupe con Coronel Espinoza, solo resuelve a calle), Casa-estudio 1864, Gallery 337 y BajoCeiba (sin dirección en el catálogo).

Sabido y aceptado: unas 10 fichas del catálogo son eventos o festivales más que artistas ("Slam Poetry", "Festival Internacional Mexicana Hasta La Piel", "Otro show donde sea"); dos nombres de la misma persona ("Irlanda Mainou" y "Irlanda Mainou Montañéz"). El admin las oculta o une desde la app. 41 artistas quedaron sin redes; 34 descripciones se recortaron.

## Evidencia
Lint, typecheck, 97 pruebas y build en verde. Capturas a 390×844 en el navegador integrado (servidor local contra producción): lista de Artistas con 521, ficha de Vitalis con el pie de origen y "Soy yo / es mi grupo", ficha de Aurora Co-Lab con dirección geocodificada y pie de origen.

## Pendiente (no hecho a propósito)
- Plantilla del correo de invitación y su envío por tandas (15–20 al día): el founder lo pidió para después.
- Alta a mano de los 5 lugares.
- Repetir la captura más adelante: `importar` salta lo que ya existe por nombre.
