# 070 · Panel de administración: fricciones, indicadores y prototipo v1 para firma (OL-044)

**Fecha:** 2026-09-16 (noche) · **Rama:** `panel-admin` (árbol de trabajo propio en `.claude/worktrees/panel-admin`) · **Pedido del founder:** "Quiero que me ayudes a trabajar la sección de administración de la app, actualmente tengo algunos listados con información, pero me falta ver usuarios por ejemplo, analiza y cuestiona ese panel, propón nuevos datos y KPI's para mostrar, por último crea un diseño que facilite lectura, sin comprometer en ningún momento las otras acciones, incluye una opción para volver admins a usuarios." A mitad del trabajo recordó las reglas para no afectar otras ramas ni chats ([GESTION_DE_CAMBIOS](../../../ops/GESTION_DE_CAMBIOS.md)).

## Qué se hizo
- **Mirada al panel actual** (skill front-visual), con `next dev` de la rama a 390×844, una sesión de administrador inventada y datos inventados, sin conexión a producción.
  - El primer intento fue un intermediario de solo lectura hacia producción. El sistema de permisos bloqueó arrancar la app contra datos reales, así que se detuvo antes de atender una sola petición (su registro solo dice "escuchando").
  - En su lugar se usó un respaldo 100 % local, sin red. El árbol de trabajo quedó sin `.env`, con un `.env.local` de dos variables locales, borrado al terminar.
- **Medición en producción:** un script en el scratchpad leyó conteos agregados con la llave de servicio, solo lectura, sin nombres ni correos. Lo principal: 5 cuentas (1 administradora), 58 lugares visibles, 85 eventos próximos (todos del administrador), 522 artistas, 12 "voy" (todos del administrador) y 0 reportes. Tabla completa en [18](../../../rediseno/18-administracion-fricciones.md).
- **[18-administracion-fricciones.md](../../../rediseno/18-administracion-fricciones.md):** diagnóstico, 21 fricciones con su ley y severidad (7 altas), tres decisiones abiertas (D1 quién hace administradores, D2 correo visible, D3 guardar el último día que se abrió la app) e indicadores propuestos. Los cuatro del resumen salen de las pruebas del PLAN: Personas activas, Coincidencias, Agenda de la semana y Publica la comunidad.
- **[19-administracion-flujo-y-estados.md](../../../rediseno/19-administracion-flujo-y-estados.md):** flujo, 25 estados, 14 decisiones numeradas con su ley, inventario de acciones (ninguna se pierde; ocultar lo reportado baja de 2 toques a 1; ocultar desde una lista sube de 1 a 2, a propósito) y lo necesario para construir.
- **Prototipo** [prototipos/administracion.html](../../../rediseno/prototipos/administracion.html), publicado en https://claude.ai/artifact/PcgGzqamg82XpZ5yDFkTUn.
  - Diez estados: resumen de hoy con conteos reales; con pendientes y un indicador abierto; después de decidir; Personas; ficha de administración; hoja para hacer administrador; ya es administrador; hoja para quitar; Lugares con ocultos; menú de los tres puntos.
  - Responden al toque los indicadores, las tarjetas, el rol, "Ver" correo y los tres puntos.

## Evidencia del panel actual (medido en el DOM, 390×844)
- 2344 px de alto (2.8 pantallas); `main` con 282 nodos y profundidad 8.
- 30 botones "Ocultar" y 2 "Mostrar", sin confirmación.
- 20 filas terminan en 386 px de 390: se salen 16 px del margen de 20.
- En el reclamo, el enlace "ver" empieza en 437 px y el título se recorta en 358 px: no se ve.

## Revisión de maquetación del prototipo
- Hijos directos y grid con áreas; sin estilos en línea.
- Los `span` sin clase son los conteos de los chips y el tipo dentro del enlace de la ficha ("· Lugar"), no envoltorios.
- Profundidad máxima 6 dentro de cada pantalla. Nodos por pantalla: 73 el resumen de hoy, 115 con pendientes, 78 Personas, 78 la ficha de administración, 88 Lugares.
- A 402 px de ancho, ningún elemento de los diez teléfonos se sale del margen.
- **Tras mirarlo, dos arreglos:**
  - el renglón de Rol pasó al dibujo de Ajustes (el estado en negrita y la descripción debajo; antes el estado iba en letra chica);
  - "···" en los rótulos se leía como una raya con la letra de la app: ahora dice "los tres puntos".

## Hallazgos de paso
- **`revoke update (rol)`** (migración `20260914080000`) no restringe. Según la documentación de Postgres, quitar un permiso de columna no quita el de la tabla completa; la barrera real es el trigger `proteger_rol`. Se confirma en la base al construir ("Para construir" en [19](../../../rediseno/19-administracion-flujo-y-estados.md)).
- **`perfiles` se lee sin sesión** (ya anotado en la revisión del 2026-09-14): todo dato nuevo solo para administración va en tablas aparte.
- **Next.js 16.3 escribe un bloque en `CLAUDE.md`** al correr `next dev` ("nextjs-agent-rules"). Se restauró el archivo y no entra en el commit. Puede pasarle a cualquier árbol de trabajo donde corra `next dev`.
- **`preview_start` solo lee `.claude/launch.json` de la carpeta principal:** desde un árbol de trabajo arranca el servidor en la carpeta principal, que ya tenía el de otro chat. Por eso se corrió `next dev -p 3140` en el árbol y la vista previa se abrió por URL. Al terminar se detuvieron solo ese servidor y el respaldo local; el servidor del otro chat (puerto 3000) siguió intacto.

## Verificación
- Solo documentos y un prototipo HTML: no se tocó código de la app, así que no aplican lint, pruebas ni build. El árbol de trabajo quedó con únicamente los cuatro archivos nuevos de esta pieza.
- El prototipo se miró entero en el panel del navegador (a 402 y a 850 px), estado por estado, antes de publicarlo.

## Queda
- **Firma del founder:** correcciones, D1, D2 y D3.
- **Con la firma:** construir en tres piezas, cada una probada en su iPhone: resumen y pendientes; personas y rol (con migración: funciones y dos tablas; una línea del aviso de privacidad por D2 y otra por D3); listas de fichas.
- **Sin push ni PR:** commit local en `panel-admin`.
