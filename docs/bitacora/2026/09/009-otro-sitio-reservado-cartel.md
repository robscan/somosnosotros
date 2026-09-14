# 009 · Eventos en otro sitio, sitio reservado y lectura del cartel (2026-09-13)

Rama `eventos-sitio-y-cartel`. Tres pedidos del founder: que un evento no necesite un lugar registrado ("no como stopper; siempre nos conviene que se registren lugares"), que un sitio se pueda **revelar con condiciones** (unas horas o un día antes, solo a personas con sesión), y llenar el evento a partir de la foto del cartel.

## Regla de producto

**El evento se anuncia; el sitio se guarda.** Tres modos en "Dónde":
- **Un lugar registrado** (como antes; sigue siendo el camino principal y el que pone pin en el mapa).
- **Otro sitio**: texto público ("Plaza de Armas") y pin opcional. No da de alta nada en el directorio.
- **Sitio reservado**: texto público de cómo se anuncia ("Casa en Tequis") y, aparte, la dirección exacta, indicaciones y pin exacto. Se revelan a las personas con sesión desde X horas antes (3 h, 6 h, 1 día, 2 días); el autor y el administrador las ven siempre.

## Cómo se protege

- Migraciones 0004 y 0005: `eventos.lugar_id` pasa a opcional; columnas `sitio_texto`, `sitio_lat/lng`, `sitio_reservado`, `sitio_revelar_desde` (pública: todos ven *cuándo* se revela, no *qué*); check "lugar o sitio". Tabla nueva **`eventos_sitio_privado`** (evento_id, direccion, lat, lng, indicaciones, revelar_desde) con RLS: lectura si `gestiona_evento()` (autor o admin) o `auth.uid() is not null and now() >= revelar_desde`; escritura solo autor/admin. **La regla vive en la base**, no en la pantalla: un anónimo que consulte la API directamente recibe cero filas.
- La ficha lee la fila privada con la sesión de quien mira; la base decide. Estados: dirección visible (con "Cómo llegar" al pin exacto); "se revela aquí el <fecha>. Vuelve entonces." (con sesión, aún no toca); "se revela a las personas registradas el <fecha>. Entra para verla" (sin sesión). La agenda y el texto para compartir dicen "Casa en Tequis · sitio reservado". El `.ics` lleva solo el texto público.

## Lectura del cartel

- `src/lib/cartel.ts` (solo servidor): Anthropic SDK, modelo `claude-opus-5`, salida estructurada con `zodOutputFormat` (título, fecha YYYY-MM-DD, hora, hora de fin, lugar, dirección, gratis/precio, descripción corta, enlace); la imagen se manda por URL pública de Storage; `output_config.effort: "low"`; devuelve null si no hay llave, si el modelo declina (`stop_reason: "refusal"`) o si falla. Sin *fallbacks* de refusal: para carteles no hace falta y así se mantiene simple.
- `leerCartelAccion` (server action): exige sesión, solo acepta URLs de nuestro Storage, llama a `leerCartel`, convierte con `cartelAFormulario` y busca el lugar por nombre entre los registrados (`lugares_con_nombre`; si hay exactamente uno, lo selecciona; si no, pasa a "Otro sitio" con el texto leído).
- Formulario: el botón "¿Tienes el cartel? Súbelo y llenamos el evento" aparece solo cuando `ANTHROPIC_API_KEY` existe en el servidor (`lecturaDeCartelActiva()`). La imagen queda además como cartel del evento. Aviso al terminar: "Leí el cartel. Revisa el título/la fecha/el lugar y publica".
- **Sin probar contra el modelo**: no hay llave en esta Mac ni en Vercel. Probado el resto (validación, conversión, camino "no configurado").

## Verificación (390×844, base real, usuarios desechables borrados)

- Alta con "Sitio reservado": campos públicos y reservados, revelar "3 horas antes", evento hoy 21:00 → ficha del autor con dirección e indicaciones.
- Lector con sesión a las 18:33 (revelar 18:00): ve la dirección. Segundo evento con revelar en +1 h: "se revela aquí el domingo, 13 de septiembre, 19:33. Vuelve entonces."
- Anónimo por la web: solo "Entra para verla" y la hora; consulta anónima directa a `eventos_sitio_privado`: 0 filas.
- Agenda: "Casa en Tequis · sitio reservado · Gratis". Lint, typecheck, 45 pruebas, build.

## Lectura del cartel probada con el modelo (mismo día, con la llave del founder)

Cartel de prueba generado con PIL (título, "con Trío Bravo", "Sábado 26 de septiembre", "20:00 h", "Casa 1100", "Centro Histórico, San Luis Potosí", "Entrada $120 · Estudiantes $80", teléfono, "@casa1100slp"), subido a Storage y leído con `leerCartel` (tsx con `--conditions=react-server`). **5.1 s.** Resultado exacto: título "Noche de Jazz", fecha `2026-09-26` (año deducido bien: el sábado 26 más próximo), hora `20:00`, lugar "Casa 1100" (coincide con el registrado → se selecciona solo), precio "$120 · Estudiantes $80", descripción "Concierto de jazz a cargo del Trío Bravo. Reservas al 444 123 4567.", enlace "@casa1100slp". Ajuste: `enlaceDesdeCartel` convierte "@usuario" en enlace de Instagram, deja enlaces y dominios, y descarta teléfonos (ya van en la descripción). Llave en Vercel solo en Production (en Preview el botón no aparece).
