# 21 · Más datos en Administración: qué se lee ya, y qué pediría guardar algo nuevo (propuesta, sin firmar)

**Fecha:** 2026-09-17 (madrugada) · **Base:** [18-administracion-fricciones.md](18-administracion-fricciones.md) (N2, D3) y [19-administracion-flujo-y-estados.md](19-administracion-flujo-y-estados.md) (firmado 2026-09-16) · **Carta:** [PRINCIPIOS_UX.md](../PRINCIPIOS_UX.md) · **Quién firma:** el founder. **Rama:** `panel-mas-datos` (OL-060, bitácora 089) · **Este documento no está firmado.** Nada de código hasta que el founder elija.

## De dónde sale esto

El founder pidió revisar el SEO del proyecto y, en el camino, sumar Google Analytics. Al preguntarle para qué, dijo: «Lo que necesito es la información de mi panel de administración, pero cada vez con más datos. No lo quiero para publicidad.» — y confirmó que quiere seguir respetando la privacidad y no rastreando a la gente; lo que busca es entender cómo se comporta para mejorar la app.

Con eso, Google Analytics (o cualquier medidor de terceros) queda fuera: manda datos a otra empresa con un fin que hoy no existe, y contradice tanto el aviso de privacidad («Sin rastreo ni publicidad») como una decisión ya tomada en [18](18-administracion-fricciones.md#fuera-a-propósito): *«Visitas, páginas vistas o tiempo en la app: no hay rastreo y no se propone.»* Este documento no reabre esa decisión — la respeta — y en cambio ordena qué se puede saber **sin salir de Supabase**, separando lo que ya existe de lo que sería un dato nuevo sobre las personas.

## Primero: lo que ya se lee, sin guardar nada nuevo

El panel (`src/lib/panel.ts`, migración `20260917090000_panel_administracion.sql`) ya junta más de lo que parece a simple vista. Cada pregunta de abajo se responde hoy mismo, con datos que ya existen por otra razón (la cuenta, el "Voy", el seguir):

| Pregunta | De dónde sale | Dónde se ve hoy / cómo se ampliaría |
|---|---|---|
| ¿Cuántas cuentas nuevas hay y cuántas hacen algo? | `perfiles.creado_en`, `asistencias`, `seguimientos`, contenido publicado | Indicador "Personas activas", con su desglose (abrieron, voy, siguieron, publicaron, nuevas) |
| ¿La comunidad crece semana a semana? | `indicadores_diarios` (una foto por día, ya se guarda cada mañana) | Los 4 indicadores de arriba, con flecha y tendencia de hasta 12 semanas — **hoy con 1 día de historia** (la tabla empezó a llenarse hoy, 2026-09-17); la propia regla del founder (D3 de 18) ya frena la tendencia hasta tener 4 muestras, así que no se ve nada raro mientras tanto |
| De las cuentas nuevas de esta semana, ¿cuántas ya dijeron "Voy" a algo? | `perfiles.creado_en` + `asistencias.creado_en` (las dos con fecha y hora) | No armado todavía como pregunta propia, pero es una consulta nueva sobre columnas que ya existen — sin migración |
| ¿Quién nunca volvió a entrar? | `cuentas_vistas` + `perfiles` | Ya en "Gestionar → Personas" (`nunca_entraron`) y en cada ficha de persona ("Nunca entró") |
| ¿Cuántos eventos logran que 2 o más personas coincidan? | `asistencias` | Indicador "Coincidencias", con el evento más grande de la semana |
| ¿La comunidad publica, o solo la administración? | `lugares.creado_por`, `eventos.creado_por`, `artistas.creado_por` | Indicador "Publica la comunidad" |
| ¿Qué tan completas están las fichas? | `lugares`, `eventos`, `artistas` | "Gestionar": sin fecha próxima, sin imagen, sin foto |

**El límite real, para no prometer de más:** `cuentas_vistas` guarda **una sola fila por cuenta con el último día que abrió la app** (D3 de [18](18-administracion-fricciones.md), ya firmado y en producción) — no un historial. Con eso se puede saber *"¿esta cuenta volvió alguna vez después de registrarse?"* (comparando su alta con ese último día) y *"¿sigue viva?"*, pero **no** se puede dibujar la curva clásica de retención (día 1, día 7, día 30) ni saber cuántas veces volvió, porque esos días intermedios nunca se guardaron. Ampliar esa curva sí pediría guardar más — ver abajo.

## Las opciones

### Opción A · Quedarse así, y mostrar mejor lo que ya hay (recomendada)

No se guarda nada nuevo. El trabajo es de pantalla y consultas: un panel de "Cómo va la comunidad" en Administración con las preguntas de la tabla de arriba ya redactadas (embudo de alta → primer Voy, cuántos siguen volviendo, tendencia semanal en cuanto haya 4 semanas), reusando `indicadores_diarios`, `cuentas_vistas`, `asistencias`, `seguimientos` y las fechas de alta. Sin tabla nueva, sin función `security definer` nueva más allá de que la consulta se agregue a `panel_resumen` o viva en una función hermana con el mismo patrón (`revoke all … from public, anon; grant execute … to authenticated`, comprobando `es_admin()`). **Sin renglón nuevo en el aviso de privacidad**, porque no se guarda nada que no se guardara ya.

**Decisión:** ☐ Sí, construir esto primero.

### Opción B · Guardar si la app se instaló

**Qué respondería:** cuántas cuentas (o cuántos teléfonos) tienen la app instalada — hoy no hay forma de saberlo, ni agregada ni por persona.
**Qué habría que guardar:** una marca (por cuenta, o por dispositivo) de que se instaló, escrita por el mismo código que ya distingue "instalada" para la hoja de avisos (`src/lib/plataforma.ts`, `instalada`). Es un dato nuevo sobre la persona.
**Aviso de privacidad:** sí pediría un renglón, parecido al que ya existe para "el último día que abriste la app" — una línea, no un cambio de fondo.
**Costo:** una tabla o columna, una función que la escriba (mismo patrón que `marcar_visto`), una prueba con PGlite.

**Decisión:** ☐ Sí, sumarlo. ☐ No, por ahora.

### Opción C · Contar dónde se abandona un formulario largo (alta de lugar, evento o artista)

**Qué respondería:** de quienes abren "Registrar lugar" (o evento, o artista), cuántos llegan a cada paso y cuántos publican — la pregunta de UX real, más allá de si "la app es difícil de usar".
**Qué habría que guardar:** contadores agregados por paso y por día (cuántas veces se abrió el paso 2, no quién lo abrió). **No es una tabla por persona** — es más parecido a `indicadores_diarios` que a una bitácora de comportamiento, y con eso alcanza para ver el abandono sin construir un perfil de nadie.
**Aviso de privacidad:** aun siendo agregado y anónimo, es una medición que hoy no existe y el aviso dice que no la hay — pediría su renglón igual, por ser claros.
**Costo:** una tabla de conteos, una función que sume un paso (sin sesión, sin relacionar con la cuenta), ajustar los tres formularios para avisar en cada paso.
**Nota:** esto es lo más parecido a lo que ofrecería un medidor de terceros (Google Analytics, Vercel Analytics) — pero quedándose en Supabase, sin mandar nada a nadie más.

**Decisión:** ☐ Sí, sumarlo. ☐ No, por ahora.

## Lo que no se propone

- **Google Analytics, Google Tag Manager o Vercel Analytics.** Mandan datos a un tercero con un fin nuevo; el founder ya dijo que no los quiere y que su necesidad la cubre lo propio.
- **Dispositivo, navegador o de dónde vino la visita** (Google, WhatsApp, directo): solo lo da un medidor de terceros o guardar el encabezado de cada visita — ninguna de las dos encaja con "no rastrear a los usuarios". Si algún día importa, es su propia conversación, no parte de esto.
- **Perfil de comportamiento por persona o clic a clic:** no está sobre la mesa en ninguna opción de arriba.
- **Reabrir N2 o D3 de [18](18-administracion-fricciones.md):** los indicadores de personas siguen sin contar a la administración, y "el último día que abriste la app" se queda como está (solo el día, sin hora).

## Lo que decide el founder

1. ¿Opción A sola, o A y alguna de B/C también?
2. Si entra B o C, el texto exacto del renglón nuevo del aviso de privacidad lo revisa antes de publicarse (como con cualquier cambio que "afecte a cómo usamos tus datos" — el aviso promete avisar por correo; el founder decidió el 2026-09-16 no mandar correo por el último cambio, así que vale confirmar si aplica igual aquí).
