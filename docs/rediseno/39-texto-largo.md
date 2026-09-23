# Texto largo a pantalla completa (OL-145, B6)

**Fecha:** 2026-09-23 · **Renglón del founder (L19):** «Al escribir textos largos mejor mostrar el campo de texto más grande a pantalla completa, para evitar que se corte el texto. Es decir cuando se seleccione campo de texto largo entonces se expande el campo o solo se muestra ese campo (probemos)». · **Carta:** [PRINCIPIOS_UX.md](../PRINCIPIOS_UX.md) · **Canon:** [15-formularios-canon-flujo-y-estados.md](15-formularios-canon-flujo-y-estados.md) · **Prototipo:** [prototipos/texto-largo.html](prototipos/texto-largo.html) · **Quién firma:** el founder.

## El problema de hoy

El campo "Descripción" de `FormularioEvento.tsx`, `FormularioLugar.tsx` y `FormularioArtista.tsx` es el mismo `<textarea multilinea>` de `Campo.tsx`: `min-height: 84px` fijo y `resize: none` (`Campo.module.css`). Con un texto largo (600–1000 caracteres según el formulario, `LIMITES_*.descripcion`) el campo no crece: el texto se corta y solo se ve haciendo scroll dentro de una caja de tres o cuatro renglones. Las tres pantallas viven dentro de "Más" (progressive disclosure, decisión 3 del canon), así que el problema aparece siempre después de abrir esa sección.

## Las dos variantes

**A · crece en su sitio.** El `<textarea>` se queda donde está, sin tope de alto (`scrollHeight` en cada tecla), y la pantalla se desplaza para que el cursor y el renglón activo queden sobre el teclado. Sin capa nueva: el formulario entero sigue visible arriba y abajo del campo.

**B · pantalla completa.** Al tocar el renglón se abre una capa con cabecera fija (título "Descripción", contador y "Listo"), el texto ocupa todo el alto libre y el teclado queda abajo, igual que "Editar perfil" (decisión 6 del canon) pero para un solo campo. Al tocar "Listo" cierra y el formulario vuelve a mostrar el renglón resuelto (icono, "Descripción", las primeras tres líneas) — el mismo dibujo de renglón resuelto del canon (icono | clave / valor), no un textarea suelto.

## Comparación

| | A · crece en su sitio | B · pantalla completa |
|---|---|---|
| Qué se ve mientras se escribe | Todo el formulario (Cuándo, Dónde…) se aleja pero sigue ahí, empujado por el campo que crece | Solo la descripción: el resto del formulario desaparece detrás de la capa |
| Riesgo | Con el texto cerca del tope (900+ caracteres) el campo mide más que la pantalla: hay que bajar para ver el principio, y el resto de los renglones queda lejos | Ninguno: el alto del campo es fijo (la ventana visual menos cabecera y teclado); nunca se corta |
| Coherencia con el canon | Nueva: hoy ningún campo del canon crece sin tope | Ya existe: es "Editar perfil" (P0/P1) aplicado a un campo dentro de un alta, y la hoja "Dónde es" ya usa pantalla completa para una decisión sola |

**Recomiendo B.** Resuelve el corte de raíz (el alto del campo deja de depender de cuánto se escribió) y no inventa un patrón nuevo: ya es cómo se edita el perfil y cómo abre "Dónde es". A sigue teniendo el corte disfrazado — con 900 caracteres el campo crecido no cabe en pantalla y hay que bajar para verlo completo, que es el mismo síntoma que hoy con menos pasos. B además dice qué falta del límite (contador en la cabecera, visible todo el tiempo) sin competir con el título como en el canon de hoy.

## Cómo entraría al canon

Si el founder firma B: nueva decisión en [15-formularios-canon-flujo-y-estados.md](15-formularios-canon-flujo-y-estados.md), punto "Texto largo a pantalla completa" — todo campo `multilinea` de `Campo.tsx` con `mostrarContador` (hoy: descripción de evento, lugar y artista) se vuelve un renglón resuelto que abre esta capa, en vez de un `<textarea>` en el propio formulario; `Campo.tsx` ganaría una variante o un componente hermano (`CampoLargo` o similar) que las tres pantallas comparten, sin duplicar la capa tres veces. La regla 8 del canon (salir con algo escrito pregunta) no cambia: sigue viviendo en el formulario, no en la capa del texto.

## Qué falta antes de construirlo

La firma del founder sobre cuál de las dos probar en el iPhone (o si prefiere ver ambas ahí antes de decidir); después, una pieza de código aparte que mueva las tres descripciones al patrón elegido.
