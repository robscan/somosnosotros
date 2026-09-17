# 21 · Más datos en Administración: qué se lee ya, y qué pediría guardar algo nuevo (firmado: A)

**Fecha:** 2026-09-17 (madrugada) · **Base:** [18-administracion-fricciones.md](18-administracion-fricciones.md) (N2, D3) y [19-administracion-flujo-y-estados.md](19-administracion-flujo-y-estados.md) (firmado 2026-09-16) · **Carta:** [PRINCIPIOS_UX.md](../PRINCIPIOS_UX.md) · **Quién firma:** el founder. **Rama:** `panel-mas-datos` (OL-060, bitácora 089)

**Firma del founder (2026-09-17, madrugada):** «A» — solo la opción A, sin B ni C. Se construye en una rama nueva desde el `main` del momento, no en `panel-mas-datos` (que se queda como el documento). Falta que gestión de cambios dé rama, bitácora, OL y, si hace falta, el nombre de la migración.

## De dónde sale esto

El founder pidió revisar el SEO del proyecto y, en el camino, sumar Google Analytics. Al preguntarle para qué, dijo: «Lo que necesito es la información de mi panel de administración de usuario pero cada vez con más datos. No lo quiero para publicidad. Ese objetivo se puede seguir cubriendo como lo hacemos hasta ahora?» — y confirmó que quiere seguir respetando la privacidad y no rastreando a la gente; lo que busca es entender cómo se comporta para mejorar la app.

Con eso, Google Analytics (o cualquier medidor de terceros) queda fuera: manda datos a otra empresa con un fin que hoy no existe, y contradice tanto el aviso de privacidad («Sin rastreo ni publicidad») como una decisión ya tomada en [18](18-administracion-fricciones.md#fuera-a-propósito): *«Visitas, páginas vistas o tiempo en la app: no hay rastreo y no se propone.»* Este documento no reabre esa decisión — la respeta — y en cambio ordena qué se puede saber **sin salir de Supabase**, separando lo que ya existe de lo que sería un dato nuevo sobre las personas.

## Primero: lo que ya se lee, sin guardar nada nuevo

El panel (`src/lib/panel.ts`, migración `20260917090000_panel_administracion.sql`) ya junta más de lo que parece a simple vista. Cada pregunta de abajo se responde hoy mismo, con datos que ya existen por otra razón (la cuenta, el "Voy", el seguir):

| Pregunta | De dónde sale | Dónde se ve hoy / cómo se ampliaría |
|---|---|---|
| ¿Cuántas cuentas nuevas hay y cuántas hacen algo? | `perfiles.creado_en`, `asistencias`, `seguimientos`, contenido publicado | Indicador "Personas activas", con su desglose (abrieron, voy, siguieron, publicaron, nuevas) |
| ¿La comunidad crece semana a semana? | `indicadores_diarios` (una foto por día) | Los 4 indicadores de arriba, con flecha y tendencia de hasta 12 semanas — **hoy con 2 fotos** (2026-09-16 y 2026-09-17, verificado en producción); la propia regla del founder (decisión 4 de [19](19-administracion-flujo-y-estados.md)) ya frena la tendencia hasta tener 4 muestras, así que no se ve nada raro mientras tanto. Ver el aparte sobre huecos, abajo |
| De las cuentas nuevas de esta semana, ¿cuántas ya dijeron "Voy" a algo? | `perfiles.creado_en` + `asistencias.creado_en` (las dos con fecha y hora) | No armado todavía como pregunta propia, pero es una consulta nueva sobre columnas que ya existen — sin migración |
| ¿Quién nunca volvió a entrar? | `cuentas_vistas` + `perfiles` | Ya en "Gestionar → Personas" (`nunca_entraron`, contando por `auth.users.last_sign_in_at`) y en cada ficha de persona ("Nunca entró"/última vez). Ver el aparte sobre `cuentas_vistas`, abajo |
| ¿Cuántos eventos logran que 2 o más personas coincidan? | `asistencias` | Indicador "Coincidencias", con el evento más grande de la semana |
| ¿La comunidad publica, o solo la administración? | `lugares.creado_por`, `eventos.creado_por`, `artistas.creado_por` | Indicador "Publica la comunidad" |
| ¿Qué tan completas están las fichas? | `lugares`, `eventos`, `artistas` | "Gestionar": sin fecha próxima, sin imagen, sin foto |

**`indicadores_diarios` no se guarda garantizado cada mañana.** Hay dos caminos, y basta uno: la tarea del cron de las 9:00 (`/api/recordatorios` → `guardar_indicadores()`, decisión 4 de [19](19-administracion-flujo-y-estados.md)), o, si esa tarea no dejó la foto de hoy, el primer vistazo del día de un administrador (`panel_resumen()`, `on conflict (dia) do nothing`, migración `20260917100000_zona_horaria.sql`). **Un día sin que corra el cron y sin que ningún administrador abra `/admin` se queda sin foto, y la tendencia semanal tiene un hueco ese día.** Con el uso de hoy (varios administradores al día) es poco probable, pero no está garantizado — ver la opción A.

**El límite real de `cuentas_vistas`, para no prometer de más:** guarda **una sola fila por cuenta con el último día que abrió la app** (decisión A de D3, doc [18](18-administracion-fricciones.md), ya firmada y en producción) — no un historial, y **solo desde que se desplegó** (`VistoHoy`, migración `20260917090000_panel_administracion.sql`, hoy 2026-09-17): en producción tiene **1 sola fila**. Antes de que pase más tiempo, casi ninguna cuenta vieja va a tener esta marca puesta, así que su "última vez" en el panel sigue viniendo del respaldo (`ultima_entrada`, el último inicio de sesión real de Supabase) — que para quien usa una sesión larga sin volver a entrar por correo o código puede ser una fecha vieja, aunque abra la app todos los días. Con eso se puede saber, hacia adelante, *"¿esta cuenta volvió alguna vez después de registrarse?"* y *"¿sigue viva?"*, pero **no** se puede dibujar la curva clásica de retención (día 1, día 7, día 30) ni saber cuántas veces volvió, porque esos días intermedios nunca se guardaron. Ampliar esa curva sí pediría guardar más — ver abajo.

## Las opciones

### Opción A · Quedarse así, y mostrar mejor lo que ya hay (recomendada)

No se guarda nada nuevo sobre las personas. El trabajo es de pantalla y consultas: un panel de "Cómo va la comunidad" en Administración con las preguntas de la tabla de arriba ya redactadas (embudo de alta → primer Voy, cuántos siguen volviendo, tendencia semanal en cuanto haya 4 semanas), reusando `indicadores_diarios`, `cuentas_vistas`, `asistencias`, `seguimientos` y las fechas de alta. Sin tabla nueva, sin función `security definer` nueva más allá de que la consulta se agregue a `panel_resumen` o viva en una función hermana con el mismo patrón (`revoke all … from public, anon; grant execute … to authenticated`, comprobando `es_admin()`). **Sin renglón nuevo en el aviso de privacidad**, porque no se guarda nada que no se guardara ya.

**Incluida en esta opción, si el founder la quiere:** cerrar el hueco de `indicadores_diarios` de arriba, para que la foto del día se guarde sola siempre, sin depender de que un administrador abra `/admin`. Son solo conteos del sitio entero (nada nuevo sobre ninguna persona, sin renglón de aviso). El cron que ya existe (`/api/recordatorios`, 9:00 hora de la ciudad) ya hace esta tarea de paso; si se prefiere separarla en su propio cron (por ejemplo, para que corra más cerca de la medianoche y no a media mañana), Vercel permite más de uno por proyecto incluso en el plan gratuito — conviene confirmar el número exacto en el panel de Vercel antes de construirlo, no es necesaria para lo demás de esta pieza.

**Decisión:** ☑ Sí, construir esto primero (founder, 2026-09-17).

### Opción B · Guardar si la app se instaló

**Qué respondería:** cuántas cuentas (o cuántos teléfonos) tienen la app instalada — hoy no hay forma de saberlo, ni agregada ni por persona.
**Qué habría que guardar:** una marca (por cuenta, o por dispositivo) de que se instaló, escrita por el mismo código que ya distingue "instalada" para la hoja de avisos (`src/lib/plataforma.ts`, `instalada`). Es un dato nuevo sobre la persona.
**Aviso de privacidad:** sí pediría un renglón, parecido al que ya existe para "el último día que abriste la app" — una línea, no un cambio de fondo.
**Costo:** una tabla o columna, una función que la escriba (mismo patrón que `marcar_visto`), una prueba con PGlite.

**Decisión:** ☐ Sí, sumarlo. ☑ No, por ahora (founder, 2026-09-17).

### Opción C · Contar dónde se abandona un formulario largo (alta de lugar, evento o artista)

**Qué respondería:** de quienes abren "Registrar lugar" (o evento, o artista), cuántos llegan a cada paso y cuántos publican — la pregunta de UX real, más allá de si "la app es difícil de usar".
**Qué habría que guardar:** contadores agregados por paso y por día (cuántas veces se abrió el paso 2, no quién lo abrió). **No es una tabla por persona** — es más parecido a `indicadores_diarios` que a una bitácora de comportamiento, y con eso alcanza para ver el abandono sin construir un perfil de nadie.
**Aviso de privacidad:** aun siendo agregado y anónimo, es una medición que hoy no existe y el aviso dice que no la hay — pediría su renglón igual, por ser claros.
**Costo:** una tabla de conteos, una función que sume un paso, ajustar los tres formularios para avisar en cada paso.
**Condición, no opcional:** la función que suma un paso tiene que pedir sesión (`to authenticated`, sin guardar quién fue) y no quedar abierta a cualquiera sin cuenta — las tres altas ya exigen cuenta para publicar, así que exigirla aquí no cambia a quién mide; sin esa condición, cualquiera podría inflar los números llamándola desde fuera de la app. Si hiciera falta, también un tope por cuenta al día.
**Nota:** esto es lo más parecido a lo que ofrecería un medidor de terceros (Google Analytics, Vercel Analytics) — pero quedándose en Supabase, sin mandar nada a nadie más.

**Decisión:** ☐ Sí, sumarlo. ☑ No, por ahora (founder, 2026-09-17).

## Lo que no se propone

- **Google Analytics, Google Tag Manager o Vercel Analytics.** Mandan datos a un tercero con un fin nuevo; el founder ya dijo que no los quiere y que su necesidad la cubre lo propio.
- **Dispositivo, navegador o de dónde vino la visita** (Google, WhatsApp, directo): solo lo da un medidor de terceros o guardar el encabezado de cada visita — ninguna de las dos encaja con "no rastrear a los usuarios". Si algún día importa, es su propia conversación, no parte de esto.
- **Perfil de comportamiento por persona o clic a clic:** no está sobre la mesa en ninguna opción de arriba.
- **Reabrir N2 o D3 de [18](18-administracion-fricciones.md):** los indicadores de personas siguen sin contar a la administración, y "el último día que abriste la app" se queda como está (solo el día, sin hora).

## Lo que decidió el founder

1. ~~¿Opción A sola, o A y alguna de B/C también?~~ **«A»** (2026-09-17): solo la opción A. B y C quedan descartadas por ahora, no pendientes.
2. Sin B ni C no hace falta renglón nuevo en el aviso de privacidad — la pregunta de si el correo del punto 2 original aplicaría queda sin objeto.
