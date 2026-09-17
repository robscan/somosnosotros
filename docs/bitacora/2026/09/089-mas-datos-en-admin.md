# 089 · Propuesta: más datos en Administración, sin rastreo (OL-060)

**Fecha:** 2026-09-17 (madrugada) · **Rama:** `panel-mas-datos` (árbol de trabajo en `.claude/worktrees/panel-mas-datos`, desde `origin/main` 6249a3e; solo documento, commit local, sin push, sin migración) · **Pieza:** OL-060.

## Qué pidió el founder

En el mismo chat donde se revisaba el SEO del proyecto: *"crea proyecto de tags (si no está creado aún) y crea + conecta analytics de google (usa mi cuenta)"*, y después: *"Que saber embudos, dispositivos, recurrencia y todos los datos que pueda obtener de analytics."*

Al preguntarle para qué, acotó el pedido: *"Lo que necesito es la información de mi panel de administración de usuario pero cada vez con más datos. No lo quiero para publicidad. Ese objetivo se puede seguir cubriendo como lo hacemos hasta ahora?"* y, tras la respuesta, confirmó: *"Se me gusta que respetemos privacidad y no rastreemos a los usuarios. Lo que quiero es saber cómo se comportan para mejorar la ux."*

## La opinión y la decisión

- **Google Analytics / Google Tag Manager quedan fuera.** Mandan datos a un tercero con un fin que hoy no existe: contradicen el aviso de privacidad («Sin rastreo ni publicidad») y una decisión ya escrita en [18-administracion-fricciones.md](../../../rediseno/18-administracion-fricciones.md): «Visitas, páginas vistas o tiempo en la app: no hay rastreo y no se propone.» El founder lo confirmó él mismo.
- **Lo que sí responde el pedido ("cada vez con más datos", "cómo se comportan para mejorar la ux") ya vive, en buena parte, en Supabase**, sin ningún tercero: `src/lib/panel.ts` y la migración `20260917090000_panel_administracion.sql` ya juntan altas, "Voy"/"Me interesa", seguimientos, publicaciones y el último día que cada cuenta abrió la app.
- **La distinción que hacía falta:** "qué termina haciendo la gente" (activación, retención) ya se puede leer sin guardar nada nuevo; "dónde se atora dentro de una pantalla" (embudo de abandono paso a paso) sí sería un dato nuevo, aunque quede 100% en Supabase y agregado (no por persona) — se lo separé al founder antes de proponer nada.
- **Gestión de cambios**, avisado por `send_message`. Reservó bitácora 089, OL-060 y la rama `panel-mas-datos` (primero `analitica`, corregido a este nombre al confirmarse el rumbo sin Google). Instrucciones: documento primero, nada de código hasta la firma; partir de [18](../../../rediseno/18-administracion-fricciones.md) sin reabrir N2 ni D3; revisar `src/lib/panel.ts` para no repetir lo que ya calcula; separar claro lo que se lee ya de lo que sería dato nuevo, con su renglón de aviso de privacidad; número de documento 21 (enlazando 18 y 19); primera opción del documento, "no guardar nada nuevo".
- **Aparte, en el camino:** el founder reportó el título de la ventana repetido en la app instalada de escritorio (Chrome, Mac) — se resolvió en la pieza de SEO (rama `seo-indexar`, misma sesión), no en esta.

## Qué se hizo

- **[21-administracion-mas-datos.md](../../../rediseno/21-administracion-mas-datos.md):** propuesta sin firmar.
  - Tabla de 7 preguntas que ya se responden hoy sin guardar nada nuevo (activación por cohorte de alta, tendencia semanal, quién no ha vuelto, coincidencias, quién publica, qué falta completar), con la columna que lo sostiene y dónde se ve o se vería.
  - El límite real de `cuentas_vistas`, para no prometer de más: guarda una sola fila por cuenta con el último día, no un historial — alcanza para "¿volvió alguna vez?" pero no para la curva de retención día 1/7/30.
  - Tres opciones con casilla para el founder: **A** (recomendada) mostrar mejor lo que ya existe, sin dato nuevo ni línea de aviso; **B** guardar si la app se instaló (dato nuevo, renglón de aviso); **C** contadores agregados de abandono por paso en las altas largas (dato nuevo aunque sea anónimo y agregado, renglón de aviso).
  - Sección "Lo que no se propone": Google Analytics, Vercel Analytics, dispositivo/navegador/origen de la visita, perfil de comportamiento por persona, y reabrir N2/D3.
  - Cierre: qué le toca decidir al founder, incluida la pregunta de si el renglón nuevo del aviso (si elige B o C) necesita el correo que el aviso promete para cambios de fondo — el founder decidió el 2026-09-17 no mandar correo por el último cambio del aviso; vale confirmar si aplica igual aquí.

## Corrección tras revisión de gestión de cambios

Gestión de cambios revisó el commit a892aa4 contra la migración, el código y producción (solo lectura); la estructura quedó bien (A recomendada, B y C aparte, sin terceros, OPEN_LOOPS sin pérdidas), pero había datos que corregir antes de pasar a firma:

1. **`indicadores_diarios` no se guarda garantizado "cada mañana".** Lo intenta el cron de las 9:00 (`/api/recordatorios` → `guardar_indicadores()`) y, si ese día aún no dejó la foto, el primer vistazo de un administrador la deja como respaldo (`panel_resumen()`, `on conflict (dia) do nothing`, migración `20260917100000_zona_horaria.sql`). Un día sin ninguna de las dos cosas se queda sin foto. Corregido en el documento 21, con la opción de cerrar ese hueco dentro de la opción A.
2. Producción tiene **2 fotos** (2026-09-16 y 2026-09-17), no 1. Corregido.
3. **`cuentas_vistas` tiene 1 sola fila en producción**, porque solo cuenta desde que se desplegó (hoy). Se anotó en el documento 21 que, mientras tanto, la "última vez" de casi toda cuenta vieja sigue viniendo del respaldo (`ultima_entrada`, el inicio de sesión real de Supabase), que puede verse más viejo de lo que es para quien usa una sesión larga.
4. La regla de las 4 muestras antes de dibujar tendencia es la **decisión 4 de [19-administracion-flujo-y-estados.md](../../../rediseno/19-administracion-flujo-y-estados.md)**, no de 18 (la cita venía de `src/lib/panel.ts:167` y del comentario de `api/recordatorios/route.ts`). Corregido en el documento 21.
5. La fecha de "no mandar correo por el cambio del aviso" es **2026-09-17**, no 16. Corregido en el documento 21 y aquí arriba.
6. La cita del founder ya era literal en esta bitácora; se igualó la del documento 21, que la tenía recortada.
7. **Opción C** ahora pide sesión para contar un paso (sin guardar quién fue) y deja anotado un tope por cuenta al día si hiciera falta, para que la función no quede abierta a que cualquiera infle los números desde fuera de la app.

## Firma

El founder contestó **«A»** en este mismo chat (2026-09-17, madrugada): solo la opción A (mostrar mejor lo que ya existe, sin dato nuevo), sin B ni C. Marcado en [21-administracion-mas-datos.md](../../../rediseno/21-administracion-mas-datos.md).

## Pendiente

- Avisar a gestión de cambios de la firma y pedir rama, bitácora, OL y nombre de migración (si hace falta una, para las funciones de consulta nuevas) para la pieza de construcción — en una rama nueva desde el `main` de ese momento, no en `panel-mas-datos`.
- Construir: pantalla "Cómo va la comunidad" en Administración con las preguntas del documento 21, y, si el founder también quiere cerrar el hueco de `indicadores_diarios` (nota de la opción A), que la foto del día se guarde sola siempre.
