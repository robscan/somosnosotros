# 384 · Una sola espera para toda imagen que se sube

**Pieza:** OL-353. **Rama:** `indicador-subida` (sobre `origin/main` `97fd40d7`). **Fecha:** 2026-10-08. **Operador:** Claude (agente del gestor V).
**Estado:** hecho y probado con pruebas de componentes en Chromium (subida de verdad, Storage lento y con fallo); falta el iPhone del founder y la vista previa de Vercel. **Sin migración.**

## Qué pidió el founder (2026-10-08)

Tras OL-352 (las fotos se preparan en el teléfono antes de subir): «Y pon un indicador de carga de imagen por favor.» Entre que el teléfono prepara la foto y la sube pasan unos segundos y en varios flujos no se veía nada: solo cambiaba un letrero («Subiendo…») y el hueco de la foto seguía vacío o con la de antes.

## Qué cambió

1. **Una sola espera, la que ya había.** El canon ya tenía una espera de imagen: la del cartel del alta (OL-302), la foto elegida que late despacio mientras se sube y se lee. Es la que se usa ahora en todas: la foto que eligió la persona, en su hueco (miniatura, portada, avatar), **atenuada y latiendo** entre 0,8 y 0,45 de opacidad (quieta en 0,6 con «reducir movimiento»). No el esqueleto gris de los carriles (ese es para lo que aún no se conoce; aquí la foto ya está en el teléfono) ni el símbolo SN (es el de cambiar de pantalla). Sin texto nuevo: los letreros que ya había («Subiendo…», «Subiendo la foto…», «Leyendo el cartel…») se quedan.
2. **Desde que se elige hasta que la imagen final se ve.** La vista es una dirección local del teléfono (`URL.createObjectURL`), así que aparece en el mismo instante. Al subir, la espera sigue hasta que la imagen subida se puede dibujar (se pide antes de quitarla, con un tope de 8 s): no queda un hueco en blanco entre la vista local y la del Storage.
3. **El control que la disparó, apagado** mientras tanto (como «Publicando…»): el campo de archivo `disabled`, la etiqueta-botón con `aria-disabled` (la cámara se ve apagada) y `aria-busy` en el hueco y en el control; «Listo» y «Guardar» siguen apagados como ya estaban.
4. **Un fallo quita la espera y deja lo de antes** (OL-352: «No se pudo leer la imagen…», «pesa más de 5 MB», o la red): la tarea de cada pantalla no toca la foto si falla, y el aviso sale donde ya salía.
5. **Código:**
   - `src/components/ui/useSubidaDeFoto.ts` (nuevo): el estado de una subida para todas las pantallas. `subir(campo | archivo, tarea, cual)` toma el archivo (y vacía el campo para poder volver a elegir el mismo), deja la vista local, corre la tarea de la pantalla (`subirFoto` y lo que cada una haga después) y, si la tarea devuelve la dirección subida, la precarga. Una subida a la vez. `cual` separa dos huecos de una pantalla (foto y portada de artista). Devuelve `subiendo`, `vista` y `vistaDe(cual)`.
   - `src/components/ui/FotoSubida.tsx` + `.module.css` (nuevos): la `<img>` del hueco, sin envoltorio (la maqueta quien la pone): la vista local con la espera o la imagen subida. Exporta la clase para las miniaturas del creador y para el renglón de «Publicado» (que pinta un componente ajeno).
   - El latido de `PasoCartel.module.css` se quitó de ahí: `PasoEspera` usa `FotoSubida`.

| Pantalla | Archivo | El hueco |
|---|---|---|
| Cartel del alta y de editar, con y sin lectura | `nuevo/evento/useLeerCartel.ts` (usa el hook), `PasoCartel.tsx` (`PasoEspera`) | el cartel chico al centro |
| Foto propia del creador | `eventos/[id]/cartel/CreadorCartel.tsx`, `FotoDelCartel.tsx` | el renglón «Tu foto» con la miniatura y «Subiendo la foto…» (sin «Usar otra foto» ni «Quitar» mientras tanto) |
| Las cuatro miniaturas del creador al redibujarse | `CreadorCartel.tsx` (`Miniatura`) | cada miniatura, hasta que el servidor la entrega |
| Portada de lugar (alta por pasos y editar) | `nuevo/lugar/PasosLugar.tsx`, `lugares/FormularioLugar.tsx` | la portada ancha |
| Foto y portada de artista (alta por pasos, editar) | `nuevo/artista/PasosArtista.tsx`, `artistas/FormularioArtista.tsx` | el círculo / la portada; en editar, el sitio del icono del renglón |
| «Agregar foto» de Publicado (alta de artista) | `nuevo/artista/AltaArtista.tsx`, `Publicado.tsx` | la foto del renglón del artista, como se verá en Artistas |
| Foto de perfil | `ajustes/editar/FormularioPerfil.tsx` | el sitio del icono del renglón Foto |

**Un arreglo que trajo:** en el alta y en editar evento, la espera del cartel ahora dura hasta que la imagen se ve, pero el paso avanza al terminar la subida; «Revisa» y las preguntas se pintaban debajo de la espera ese momento. Ahora solo se pintan sin espera (`AltaEvento.tsx`, `EditarEvento.tsx`). Lo encontró la prueba de siempre de `EditarEvento`.

## Pruebas

- `npm run lint` (solo el aviso viejo de `VisorImagen`), `npm run typecheck`, `npm test` (3405, 187 archivos), `npm run inventario` (sin novedades) y `npm run medir` (37 pantallas × 4 anchos, sin novedades).
- **Componentes en Chromium, nuevas** (subida de verdad: `subirFoto` + `prepararImagen`; Storage es el doble de OL-352 con dos opciones nuevas en `lib/imagenDePrueba.mjs`: `retrasoStorage` en ms y `falloStorage`). Con una JPEG de 2400×1800 y Storage a 2 s:
  - `AltaEvento` (casilla desmarcada, sin lectura): al elegir, la foto local (`blob:`) a 0,6 en el hueco con `aria-busy`, sin campo de archivo y «Subiendo el cartel…»; al subir, «¿Cómo se llama?» con «Cartel guardado» y ninguna espera. Con fallo: «No pude subir el cartel», sin espera, sin imagen y el recuadro de nuevo.
  - `CreadorCartel`: el renglón con la foto local a 0,6 y «Subiendo la foto…», sin campo de archivo; luego «Tu foto» y las miniaturas con la foto atenuadas mientras el servidor (simulado a 1,5 s) las dibuja, hasta quedar todas a 1. Con fallo: el aviso, sin «Tu foto» y «Usar otra foto» de vuelta.
  - `AltaLugar`: la portada local a 0,6, la etiqueta con `aria-busy`, el campo apagado y «Subiendo la foto…» con `aria-disabled`; luego «Listo» y la portada a 1. Con fallo: el aviso, sin portada y el campo de nuevo.
  - `FormularioPerfil` (archivo nuevo, `ajustes/editar/FormularioPerfil.componentes.test.mjs`): el avatar local a 0,6 con «Subiendo…», la cámara y «Guardar» apagados; luego «Tu foto», la ruta `perfiles/ana/foto-<uuid>.jpg` y «Guardar» encendido. Con fallo: el aviso, «Sin foto» y la cámara de nuevo.
- **De siempre, en verde:** `CreadorCartel`, `AltaEvento`, `EditarEvento`, `ClasesEvento`, `Sugerencias`, `AltaArtista`, `AltaLugar`, `FormularioArtista` y `FormularioLugar.editar` (todas en verde, con las nuevas).

## Capturas (`docs/rediseno/capturas-384/`, 390×844)

Abiertas y miradas una por una. La foto de prueba es la JPEG de mitad azul y mitad roja (la de EXIF girado de OL-352): se ve ya derecha en la vista local.

- `384-alta-subiendo`: el alta de evento sin lectura: el cartel elegido al centro, atenuado, y «Subiendo el cartel…» debajo; sin recuadro ni casilla.
- `384-creador-1-subiendo`: «¿Cuál te gusta?» con el renglón de la foto: la miniatura azul y roja atenuada y «Subiendo la foto…», sin acción; las cuatro opciones (un PNG liso en la prueba) a la vista. Letra Arial (el arnés de esa prueba no carga Bricolage).
- `384-creador-2-redibujo`: ya «Tu foto · Quitar la foto»; tres miniaturas (las que llevan la foto) atenuadas mientras se redibujan y la sin foto, entera.
- `384-portada-subiendo`: «¿Quieres agregar algo?» del alta de lugar: la portada elegida, atenuada y ancha; el campo dice «Subiendo…» y el botón del pie «Subiendo la foto…» apagado.
- `384-perfil-subiendo`: el renglón Foto del perfil con el avatar atenuado, «Subiendo…» y la cámara apagada; «Guardar» apagado. (El arnés pinta el formulario solo, sin la cabecera de Ajustes.)

## Decisiones del operador (por confirmar)

1. **La espera es la foto, no un esqueleto ni el símbolo SN:** la persona ve que es su foto la que sube (lo que pidió el encargo); el latido es el del cartel del alta, que ya estaba firmado.
2. **En el creador, mientras sube no hay «Usar otra foto»:** el renglón «Tu foto» aparece de una vez con la foto atenuada y «Subiendo la foto…», en vez de dejar el botón apagado sin hueco donde mostrar la foto. Al fallar vuelve el botón.
3. **Las miniaturas del creador esperan siempre que cargan** (al abrir, con «Ver otros diseños» y tras poner la foto), no solo tras la foto: es la misma situación y así no hay dos comportamientos.
4. **«Agregar foto» de Publicado:** la foto local se ve en el renglón del artista (el sitio donde quedará). La foto final del renglón pasa por el optimizador de Vercel, que no se precarga: puede tardar un instante más que en las otras pantallas.

## Pendiente

- El iPhone del founder (Safari y la app instalada): elegir una foto del carrete en el alta de evento sin lectura, en el creador, en una portada y en el perfil, con la red del teléfono; la vista previa de Vercel.
