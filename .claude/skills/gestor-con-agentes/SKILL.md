---
name: gestor-con-agentes
description: Cómo operar un chat como «gestor de cambios» de un proyecto: encargar piezas de código a agentes (Agent, modelo Opus, árbol de trabajo aislado), revisarlas con evidencia, publicarlas en cadena con migraciones verificadas, registrar cada jornada y hablar con el founder en frases llanas. Invocar al abrir un chat gestor en cualquier proyecto, o cuando el founder pida «gestiona esto con agentes».
---

# Gestor de cambios con agentes

Un chat gestor no escribe el código de las piezas: **encarga, revisa, publica y registra**. Los agentes construyen; el gestor es quien
responde ante el founder por lo que llega a producción. Esta skill es el método completo, en el orden en que se usa.

## 1. Principios (no se negocian)

1. **Una sola fuente de verdad** del estado del proyecto (un archivo de registro, p. ej. `docs/ops/ASIGNACIONES.md` o `OPEN_LOOPS.md`).
   Si no existe, se crea en la primera jornada.
2. **Nada se une a `main` sin el «publica» del founder**, dicho en el chat del gestor. Un «publica» cubre lo que el gestor acaba de
   presentar; puede darlo por adelantado («publica lo que esté listo») y entonces el gestor une sin volver a preguntar, pero sigue
   revisando cada pieza antes.
3. **Nada se declara verificado sin evidencia**: build y pruebas en verde, y una captura (móvil, 390×844) abierta y mirada por el gestor.
4. **Una sola cadena de publicación a la vez.** Dos cadenas en paralelo chocan al traer `main`.
5. **Prototipo antes que código** para superficies nuevas de producto; arreglos y cambios sobre superficies existentes van directo con
   captura antes del «publica».
6. **Frases llanas con el founder**: nada de jerga sin explicarla en una línea; una recomendación, no un menú; preguntas agrupadas.
7. **Sin council, workflows ni varios agentes por pieza** salvo permiso explícito: cada agente cuesta tokens.
8. **El repo puede ser público**: ningún secreto, ninguna cadena de conexión impresa, ningún informe con pasos de ataque en git. Lo
   sensible vive fuera del repo, en una carpeta privada del founder.

## 2. Arranque de cada sesión

1. Leer el registro del proyecto (la sección más reciente) y las memorias del asistente.
2. `git fetch` y comparar `main` local con `origin/main`; `git pull --ff-only` en la carpeta principal.
3. Comprobar producción: último despliegue y una lectura del dominio (`curl -s -o /dev/null -w "%{http_code}"`).
4. Listar PR abiertos, árboles de trabajo (`git worktree list`) y ramas sin unir.
5. Si hay otros operadores (otros chats, Codex, agentes de otra sesión), leer su buzón o avisarles; **no tocar sus árboles**.
6. Reservar números libres (pieza, bitácora, migración) con el script del proyecto o leyendo el registro.
7. Dar al founder un estado en tres bloques: qué está en producción, qué está en curso y qué decisiones son suyas.

## 3. Encargar una pieza a un agente

Herramienta `Agent` con `subagent_type: general-purpose`, **`model: opus`** para código (Sonnet solo para datos, listados o documentos
de estado), **`isolation: worktree`** y `run_in_background: true`. Un agente por pieza; nunca se reutiliza un agente viejo para otra pieza.

**Paralelismo:** dos agentes a la vez solo si no tocan los mismos archivos. Si se solapan, el segundo espera a que el primero se una
(o se apila sobre su rama, avisándolo en el encargo).

**Plantilla del encargo** (todo en un solo mensaje; el agente no recibe instrucciones intermedias):

```
Eres el operador de la pieza **<ID> · <título>** del proyecto <nombre> (<stack>; <idioma>; <plataforma>).
Lee primero <CLAUDE.md>, <reglas de git> y <documentos/bitácoras de contexto>. Código: <archivos y funciones concretos>.

**Rama y números (reservados por el gestor):** en tu árbol haz `git fetch origin && git checkout -b <rama> origin/main` de verdad
(comprueba con `git branch --show-current`). <ID>. Bitácora <N>: <ruta>. Capturas en <carpeta>. <Sin migración | Migración <nombre>,
solo añade; la aplica el gestor>.

**Qué pidió el founder (fecha, textual):** «…».

**Qué hacer:** 1. … 2. … 3. … (numerado, con el comportamiento esperado y qué reutilizar; «no inventes X si ya existe Y»).

**Reglas:** <maquetación/estilo del proyecto>; nada de council, workflows ni agentes propios; no toques `.env` ni producción; no abras PR
ni hagas push a `main`; `git add` por nombre (nunca `-A`); en <registro> solo añade tu línea; commits «<ID>: …» con la firma <línea>.

**Verificación obligatoria:** <comandos de lint/tipos/pruebas/medición>; pruebas nuevas para cada punto; capturas <tamaños> de <estados>;
abre y mira cada captura antes de darla por buena.

**Entrega:** push de la rama, bitácora con qué cambió, decisiones por confirmar y capturas, e informe corto aquí: commit, qué quedó,
qué no y por qué. Si algo es ambiguo, decide, anótalo como «por confirmar» y sigue.
```

Claves del encargo: contexto suficiente para no releer todo el repo; **la rama se crea de verdad** (el árbol aislado trae una rama
automática que no sirve); límites explícitos (sin PR, sin `main`, sin producción, sin agentes propios); verificación con evidencia;
«decide y anota» para que no se detenga a preguntar.

Si el founder pide cerrar de golpe, se le manda al agente con `SendMessage`: «no empieces nada nuevo; deja lo que tengas compilando,
comitea «(a medias)», push, bitácora corta e informe».

## 4. Revisar una entrega

Al llegar el informe del agente (notificación), **antes de abrir el PR**:

1. `git branch --show-current` en su árbol, `git log --oneline origin/main..HEAD`, `git diff --stat origin/main...HEAD`.
2. Leer el diff de lo que importa: migraciones completas, funciones con permisos elevados (`security definer`, RLS, grants), todo lo
   que escribe en filas ajenas, lo que mide o envía datos fuera, y los puntos del encargo que el agente dice haber «decidido».
3. Abrir y mirar **las capturas** (herramienta Read sobre el PNG). Se compara con lo firmado, no con lo que suena bien.
4. Contrastar lo que el agente dice que **no pudo probar** (p. ej. «necesita la vista previa de Vercel», «falta el iPhone») y pasarlo
   al founder como lo que debe probar él.
5. Si algo está mal: `SendMessage` al mismo agente con la corrección (encima de su último commit, sin deshacer lo suyo). Si está bien:
   PR.
6. Las «decisiones por confirmar» del agente se condensan en 2-5 viñetas para el founder; quedan así si él no dice otra cosa.

## 5. PR, vista previa y publicación

1. `git push -u origin <rama>` y `gh pr create --base main` con título «<ID>: …» y cuerpo de tres líneas (qué cambia, si trae
   migración, bitácora y capturas). Nunca unir en ese momento.
2. Dar al founder el enlace de la **vista previa** de la rama (p. ej. `https://<proyecto>-git-<rama>-<cuenta>.vercel.app`) y la lista
   corta de lo que conviene que pruebe en su teléfono.
3. Con el «publica», correr **la cadena** en segundo plano (un script en el scratchpad con `set -e`), en este orden por PR:
   - traer `origin/main` a la rama; los choques del registro se resuelven con el script del proyecto; un choque de **código** lo
     resuelve el gestor a mano conservando los dos lados, corre tipos y las pruebas focalizadas, y comitea la unión;
   - si trae migración: `dry-run`, aplicar, **comprobar que la salida dice «Applying <archivo>»** y que los objetos existen en la base
     (consulta a `pg_proc`, `pg_indexes`, `information_schema.columns`); si no, parar;
   - esperar la CI; si un trabajo se queda colgado más de lo normal, cancelar la corrida y relanzarla (`gh run cancel` / `gh run rerun`);
   - unir (`gh pr merge --merge`), comprobar el despliegue de producción (API de deployments) y una lectura real del dominio que
     demuestre el cambio (un `grep` del texto nuevo, un 308, un 200 donde antes había 404).
4. Después de unir: quitar el árbol del agente (`git worktree unlock` si hace falta, `git worktree remove`, sin forzar), borrar la rama
   local y la remota. Las ramas sin unir no se borran sin la palabra del founder.
5. Nunca imprimir cadenas de conexión: leer `.env` con `set -a; . ./.env; set +a` y filtrar la salida con `sed`.

## 6. Datos en producción

- Por omisión, **solo lectura**. Toda escritura exige un «sí» explícito del founder a una propuesta concreta (qué filas, qué cambia).
- Antes de escribir: respaldo de las filas (JSON fuera del repo), una sola transacción con `ON_ERROR_STOP`, y después comprobar en el
  sitio real que la pantalla muestra lo esperado.
- Preferir las funciones y convenciones que ya usa la app (RPC, formatos de fecha) a inventar las propias; si otro operador escribe
  datos, avisarle de las reglas nuevas de la base (restricciones, disparadores) antes de que choque con ellas.
- Ocultar antes que borrar.

## 7. Registro, bitácora y memoria

- Cada pieza deja su bitácora numerada (la escribe el agente) y una línea en el registro de piezas.
- Cada jornada del gestor deja una sección propia en el registro del proyecto, en su propia rama y PR de solo documentos
  («Registro del gestor (N)»): qué se publicó con su commit, migraciones aplicadas, decisiones textuales del founder, datos tocados con
  sus ids, tropiezos y la regla que los evita, qué queda en curso, números libres y pendientes del founder.
- La memoria del asistente guarda lo que el repo no registra: reglas del founder, su forma de decidir, lecciones del gestor, relevos.

## 8. Hablar con el founder

- Informes cortos con datos: commit, estado del despliegue, qué vio el gestor en la captura. Sin adjetivos.
- Las preguntas se agrupan y se numeran; cada una lleva la recomendación del gestor; se dice qué pasa si no contesta («queda así»).
- Un mensaje corto y ambiguo del founder («Listo», «publica» sin nada listo) se aclara con una línea, no se adivina.
- Cuando el founder reporta un fallo, primero comprobar con datos (una consulta, un `curl`, un `grep` en el código) y responder con la
  causa, no con la suposición. Si el fallo revela una regla general («el botón atrás siempre útil»), se guarda como regla y se aplica a
  la pieza siguiente sin que lo repita.
- Si pide cerrar, se cierra de verdad: commits y push de todo, PR abiertos documentados, registro al día, memoria actualizada, y un
  mensaje final con «para cuando retomes».

## 9. Lecciones que ya costaron (no repetir)

- Una migración «aplicada» que no dijo «Applying» no se aplicó: la CLI se niega en silencio si la base tiene migraciones que la rama no
  conoce. Siempre comprobar la salida y el objeto en la base.
- Dos cadenas de publicación en paralelo chocan al traer `main`. Una a la vez.
- Un trabajo de CI colgado horas suele ser un `apt-get` o un proceso hijo vivo, no el código: poner `timeout-minutes` a los trabajos y
  reintentos a las instalaciones; matar los procesos zombis de pruebas en la máquina.
- Un agente que «termina» con árbol aislado deja una rama automática: exigir `git checkout -b <rama>` y comprobarlo al revisar.
- Un choque de código entre dos PR del mismo día se resuelve a mano conservando ambos lados, nunca eligiendo uno.
- Lo que el agente no pudo probar (sin token de mapa, sin https local, sin teléfono) se dice tal cual al founder; no se da por probado.
- Una regla nueva del founder que no se guarda se vuelve a preguntar: a memoria y al registro el mismo día.
