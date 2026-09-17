# 093 · La cámara del cartel no respondía al toque (alta de evento)

**Fecha:** 2026-09-17 · **Rama:** `alta-evento-toques` · **OL:** OL-062 · **PR:** pendiente

## Lo que reportó el founder

«Estoy tratando de subir un evento y al seleccionar la cámara para subir un flyer, seleccionar una fecha dando tap en el chip no sucede nada.» Lo vio en su iPhone, contra producción. Sin ese botón no se puede publicar un evento leyendo el cartel, así que gestión de cambios le dio prioridad sobre lo demás.

## La causa (reproducida, no supuesta)

El campo del nombre era un `<label>` que envolvía **dos** campos: el texto del nombre y, dentro del icono de la cámara, un `<input type="file">`. Un `<label>` solo manda el toque a **un** campo: el primero que encuentra dentro. Así que el toque en la cámara llegaba al campo de texto.

Encima, ese campo de archivo medía **1×1 px** (`FormularioCanon.module.css`, `.accionCampo > input`), sin cubrir los 40×40 px del icono. Por eso el botón funcionaba **a veces**: solo si el dedo caía en ese punto de 1 px, que Safari alcanza con su tolerancia de toque. Descentrado un poco, el toque enfocaba el nombre y no pasaba nada más.

**No es una regresión de las piezas recientes** (#87 «Atrás coherente», #88 y #91 de deslizar, ni las hojas con teclado). Nació así en [82989b6](https://github.com/robscan/somosnosotros/commit/82989b6) (2026-09-15, «Alta de evento con el canon (PR D): la cámara en el campo»). Está igual en producción, que es donde lo vio el founder.

Evidencia en el simulador (FLOWYA iPhone SE, iOS 26.3), con la app real corriendo contra un respaldo local:
- toque en el centro exacto del icono → abre el selector de archivo;
- toque a 7 px del centro, todavía sobre el dibujo de la cámara → **el cursor se va al campo "Nombre del evento"**;
- en un banco de pruebas aparte, el registro de eventos lo dice literal: `spanA → touchstart`, `labelA → click (destino: tituloA)`.

## El chip de fecha: no se reprodujo

Se probó con el dedo en el simulador, en la app real: el chip **sí** abre el calendario del teléfono y la fecha elegida entra en el formulario («jue 24 de sep · 19:00»). También aislado, con y sin el campo de texto enfocado. El patrón de `ChipNativo` (el campo nativo invisible encima, del mismo tamaño) está bien construido y ningún ancestro lo recorta ni intercepta el toque.

La explicación más probable de lo que vio el founder: viene encadenado con lo anterior. Al tocar la cámara se abría el teclado sobre el campo del nombre; con el teclado arriba, el primer toque en otro sitio lo consume el cierre del teclado. Queda pendiente confirmarlo con él.

## El arreglo

1. `src/app/eventos/FormularioEvento.tsx`: la caja del nombre pasa de `<label>` a `<div>`, y la cámara pasa de `<span>` a **su propio `<label>`**. Es el mismo patrón que ya usan `FormularioPerfil` y `FormularioArtista` (`canon.accionIcono`). El campo de texto no pierde nada: ya tenía `aria-label` y `placeholder`.
2. `src/components/ui/FormularioCanon.module.css`: el campo de archivo de `.accionCampo` cubre el icono entero (`inset: 0`) en vez de medir 1×1 px. La clase solo se usa aquí.

## La prueba

`src/lib/marcado.test.ts`: lee el JSX de todas las pantallas y no deja que ningún `<label>` envuelva más de un campo. Falla con el código anterior (`app/eventos/FormularioEvento.tsx:340 envuelve 2 campos`) y pasa con el arreglo. Es pura lógica en Node, sin infraestructura de React en el repo (gestión de cambios no la quiere, 2026-09-17).

## Verificado

- `npm run lint` (solo un aviso viejo en `docs/diseno/logotipo/iconos-sn.mjs`), `npm run typecheck`, **321 pruebas en 35 archivos**, `npm run build` en verde.
- Simulador, con el dedo: el mismo toque descentrado que antes fallaba ahora abre el selector; se elige una foto de la galería, se sube y el formulario sigue («No pude leer el cartel» es esperado: la llave de Anthropic del entorno de prueba es falsa).
- La ✕ de borrar el nombre sigue funcionando dentro de la caja nueva.
- Captura a 390×844 y comprobación en el DOM: el campo de archivo mide 40×40 y recibe el toque en el centro **y en la esquina**; el `<label>` de la cámara está asociado al campo de archivo.

## Dos cosas que salieron de paso

1. **Un error que no se ve.** Si la validación falla en un dato que vive en un renglón cerrado, el aviso rojo se pinta dentro del renglón y nadie lo ve: se toca "Publicar evento" y no pasa nada. Salió con la imagen (`eventos.ts:151` exige `https`). En producción esa regla no debería saltar, pero el agujero existe para cualquier error de "Más".
2. **La zona más apretada de la app.** Con el nombre escrito, la ✕ y la cámara quedan pegadas dentro de un campo de 48 px. El founder lo señaló el mismo día: sacar de ahí el leer-el-cartel y ponerlo por separado, y decirlo en la descripción porque es la función estelar. Pieza aparte, con prototipo antes que código.
