# 523 · OL-491 · Crédito de la portada en fichas de lugares y artistas

**Fecha:** 2026-10-29. **Rama:** `portada-credito` (desde `origin/main` `5bd1ec60`, con `origin/main` unido después en `cc546ab3`). **Quién:** agente del Gestor de cambios VII (Opus 5.5, árbol aislado), sin subagentes.
**Manda:** el encargo OL-491 del gestor: la semana de Instagram solo publica fichas con material (OL-488) y, para completar las portadas de 80 lugares con fecha próxima, se consiguieron 47 fotos, 44 de Wikimedia Commons con licencias CC BY, CC BY-SA, CC0 y dominio público. Las CC BY y CC BY-SA piden decir autor y licencia donde se usa la foto: la ficha pública y la publicación de Instagram.
**Estado:** hecho, con **una migración** (`20261029300000_portada_credito.sql`, solo añade). Sin variables nuevas. No toqué producción, `.env` ni llaves. Espera revisión del gestor y el «publica» del founder.

Términos (una línea cada uno):
- **CC BY / CC BY-SA:** licencias libres que dejan usar la foto si se dice quién la hizo y con qué licencia (la SA, además, pide compartir igual lo que se derive).
- **Crédito:** la línea «Foto: autor · licencia» que cumple esa condición.

## 1. La base

`supabase/migrations/20261029300000_portada_credito.sql`:
- `lugares.portada_credito text` y `artistas.portada_credito text`, nulas (nula = sin crédito), con `check`: de 1 a 160 letras y en una línea (sin saltos ni caracteres de control).
- Quién la lee y quién la escribe: lo mismo que `portada`. Las políticas de las dos tablas son por fila y ninguna tiene permisos por columna: la lee quien ve la ficha (anónimo incluido si es visible y pública) y la escriben su autor, su cuenta ligada y la administración.
- **Lecturas públicas:** no hay vistas sobre estas tablas, y la ficha, la hoja de Lugares y el trabajador de Instagram leen la tabla directamente (se añadió la columna a sus `select`). Las funciones que devuelven `portada` son de Administración (`panel_lugares`, `admin_buscar_fichas`, `instagram_candidatos`) o la de la página de la bio (`instagram_semana_bio`, la miniatura en /ig, que lleva a la ficha con su crédito): ninguna pinta la portada grande, así que no se vuelve a crear ninguna y ninguna firma cambia (las de Instagram las tocan otras piezas).
- **Orden:** el nombre lo reservó el gestor, pero `main` ya trae `20261029270000_panel_comparado.sql` (OL-494), posterior. Si esa ya se aplicó en producción, `supabase db push` rechaza una más vieja: aplicar esta con `--include-all` o que el gestor le dé un nombre nuevo antes de publicar.
- Prueba: `supabase/tests/pg/portada-credito.test.mjs`, en una transacción que se deshace: la columna en las dos tablas; autora y cuenta ligada escriben, otra cuenta y anónimo no, la administración sí; anónimo y cualquier cuenta leen el de una ficha visible, no el de una oculta ni el de un lugar privado; 161 letras, vacío y salto de línea rechazados (23514); 160 con acento sí; se borra con nulo.

## 2. La ficha pública

`ui/Heroe` recibe `credito` y, si hay portada, pinta debajo una línea `<p>` en su propia área de la rejilla (`credito`, entre los números de la cabecera oscura y los avisos; `Ficha.module.css` § 3c): «Foto: Pablo Pérez · CC BY-SA 4.0», 14 px, gris (`--texto-suave`). Nunca sobre la foto. Desde 1048 va en la columna de la derecha, bajo el título.
- `lib/creditoFoto.ts` parte el texto: lo de antes del primer «·» es el nombre; si el crédito trae una dirección http(s) entre paréntesis o al final, el nombre enlaza a ella con `EnlaceExterno` (`target="_blank" rel="noopener noreferrer"` y el aviso de salida de siempre, «Vas a salir de Somos Nosotrxs · commons.wikimedia.org»). Una dirección que no es http(s) se queda como texto; solo una dirección enlaza su dominio, sin inventar un autor. Quita un «Foto:» que alguien escriba delante.
- El toque del enlace llega a 44 con relleno vertical en línea (crece el área que se toca, no el renglón), y el aire de arriba de la línea es ese mismo relleno: el toque no pisa la portada, que abre la foto entera.
- Lugar (`/lugares/[slug]`), artista (`/artistas/[slug]`) y la ficha dentro de la hoja de Lugares (el crédito llega con el cuerpo de la ficha, `abrirFichaEnHoja`; la lista no lo trae).

## 3. La edición

- **Lugar** (`FormularioLugar`, en «Más», bajo la foto y el campo de la dirección de la imagen) y **artista** (`FormularioArtista`, dentro del renglón «Portada»): `Campo` «Crédito de la foto», solo si hay portada, con la ✕ de siempre, el tope de 160 y la ayuda «Autor y licencia, si la foto no es tuya». Mismo formulario para la propia persona y para la administración.
- Al poner otra portada (subida o, la administración, pegando una dirección) el crédito se vacía solo: era de la foto anterior. Sin portada se guarda nulo.
- Las acciones (`actualizarLugar`, `actualizarArtista`) usan `creditoAlGuardar`: sin portada, nulo; si el formulario no manda el campo (una pestaña abierta antes del despliegue) no se toca; si lo manda, limpio (vacío = nulo) o «Máximo 160 caracteres.» El alta por pasos no cambia (no tiene el campo; `crear_lugar_con_horario` no se toca).

## 4. El texto de Instagram

`conCreditoDeFoto` en `src/lib/instagram/texto.ts` (cambio mínimo; `destacado.ts` no se toca): con crédito, la línea «Foto: …» del texto de la tarjeta de un lugar o artista dice el crédito en lugar de «Foto: @cuenta» (la cuenta sigue en «Más en @…»); si el texto no la tenía (sin Instagram, o la cuenta quitada) va tras «Lee su ficha…». Sin crédito el texto no cambia: la foto vino de su Instagram y sigue «Foto: @cuenta». Se aplica en `textoDeFicha` (`src/lib/instagram/ficha.ts`, que ahora lee `portada_credito`): lo usan el trabajador de la cola y el espejo de Facebook.

**Lo que falta, fuera de esta pieza:** la vista previa del texto en la hoja del día (`src/components/instagram/HojaDia.tsx`, de otro operador) arma el texto con `textoArtista`/`textoLugar` directo: no enseña el crédito aunque la publicación sí lo lleve (si la administración no reescribe el texto). Es una línea: envolverlo con `conCreditoDeFoto(texto, credito)` cuando la hoja tenga el crédito.

## 5. Comprobaciones

- `npm run lint`: 0 errores (2 avisos ya existentes en otros archivos).
- `npm run typecheck`: correcto.
- `npm test`: 319 archivos, 5142 pruebas correctas (nuevas: `creditoFoto.test.ts` 12, `texto.test.ts` +4, `Heroe.test.ts` +3).
- `TEST_DATABASE_URL=… npm run test:db`: 3043 comprobaciones, 0 fallaron (con `portada-credito.test.mjs`).
- `npm run inventario`: sin novedades.
- `npm run medir`: 63 pantallas × 4 anchos, sin novedades (la rejilla de la ficha gana un área vacía cuando no hay crédito; el respaldo no trae créditos, así que las fichas con crédito se miden en las capturas, § 6).
- `npm run test:componentes`: 802 pruebas, 0 fallaron.
- A 1280, la ficha de lugar tiene un `div` de `ui/EntradaFicha` (la ficha «cerrada», fuera de la vista) que ya se salía a lo ancho antes de esta pieza; `medir` no lo marca y no lo toqué.

## 6. Capturas (`docs/rediseno/capturas-523/`)

`scripts/ops/auditoria-ui/capturar-portada-credito.mjs`: la app compilada contra el respaldo local (datos inventados, sesión de la administración del respaldo), Chrome real a 2×, toques reales (clics de Playwright). Créditos inventados: Teatro de la Paz con dirección, Museo del Ferrocarril largo sin dirección, Feleal con portada y crédito. Medidas de cada ficha: la línea queda debajo de la foto (nunca encima), 14 px gris, sin desplazamiento a lo ancho a 320, 390 y 430; el enlace mide 47 de alto.

- `01-lugar-credito-390.png`: Teatro de la Paz. Bajo la portada, «Foto: Pablo Pérez · CC BY-SA 4.0» en gris, el nombre subrayado; debajo los tres números. La cabecera no cambia.
- `02-lugar-credito-320.png`: lo mismo a 320; cabe en una línea.
- `03-lugar-credito-430.png`: lo mismo a 430.
- `04-lugar-credito-aviso-salida-390.png`: tras tocar «Pablo Pérez», la hoja «Vas a salir de Somos Nosotrxs · commons.wikimedia.org» con Continuar y Quedarme aquí.
- `05-lugar-credito-largo-320.png`: el crédito largo del Museo del Ferrocarril va a dos líneas, sin enlace; los números siguen debajo.
- `06-artista-credito-390.png` y `07-artista-credito-320.png`: Feleal con portada y avatar; «Foto: Ana López · CC BY-SA 4.0» bajo la portada, sin enlace, y después el sello «Nuevo video».
- `08-hoja-lugar-credito-390.png`: la ficha abierta en la hoja de Lugares, con la misma línea bajo la portada.
- `09-lugar-credito-1280.png`: escritorio; la línea en la columna de la derecha, bajo el título, junto a la foto y no sobre ella.
- `10-editar-lugar-credito-390.png` y `11-editar-lugar-credito-320.png`: editar el lugar (administración), en «Más»: la foto, «O pega la dirección de una imagen» y «Crédito de la foto» con el crédito guardado, su ✕ y la ayuda.
- `12-editar-lugar-credito-escrito-390.png`: tras tocar la ✕ (el campo queda vacío y con el foco) y escribir otro crédito. Al tocar «Guardar cambios», el cambio que llegó al respaldo lleva `portada_credito: "Luis Martínez · CC BY 4.0 (https://…)"`.
- `13-editar-artista-credito-390.png` y `14-editar-artista-credito-320.png`: editar a Feleal; el renglón «Portada lista» se abre con «Crédito de la foto» y su ayuda. Al tocar «Quitar la portada», el campo se va (0 campos).

## 7. Preguntas al founder

1. **¿Los 160 caracteres alcanzan?** Un crédito con la dirección de Wikimedia Commons («Autor · CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:…)») ronda 110 a 150; con nombres de archivo largos o acentos codificados (`%C3%AD`) puede pasar de 160. Se puede guardar sin la dirección (la licencia solo pide autor y licencia «de forma razonable») o subir el tope.
2. **En Instagram, ¿el crédito con su dirección o solo autor y licencia?** Hoy va tal cual se guardó; en Instagram las direcciones del texto no se pueden tocar.
3. **Miniaturas** (listas de Lugares, Inicio, /ig): no llevan crédito; quien toca llega a la ficha, que sí lo dice. ¿Basta así?
