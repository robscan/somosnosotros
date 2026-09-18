# Memoria operativa del gestor

Compilada el 2026-09-18 por solicitud expresa del founder en Gestor de cambios
(`01a0b1e5-d30b-7cf1-9b67-00148350eaa2`). No es una promesa de memoria infalible:
es el registro versionado que se debe leer y actualizar al retomar el trabajo.

## Acuerdos vigentes

- Objetivo de fase 1: cerrar pendientes y hacer confiables los recorridos
  existentes, publicados y probados por el founder en su telefono/Safari.
  Un commit, una preview o un build verde no cierran ese objetivo.
- El rediseno general va despues. UX invisible, facilidad e intuicion,
  revelacion progresiva de opciones; no agregar pasos sin necesidad demostrada.
- Maquetacion simple, sin sobreanidacion, codigo limpio, canon visual vigente
  y atencion a detalles en movil/escritorio. No redisenar durante una correccion.
- Este chat es gestor, no operador de todo: reparte tareas, ramas y archivos;
  recibe entregas, revisa, pide correcciones, prueba la integracion y concilia.
  Operadores aislados; no editar simultaneamente los mismos archivos.
- Modelos: Astra para estrategia y revision de riesgo; Terra para operaciones
  acotadas (direccion y avisos: high). Luna para trabajo sencillo cuando proceda.
  Verificar el modelo efectivo, no suponerlo por el titulo o el valor solicitado.
  No heredar Astra para todos sin evaluar costo. No abrir agentes por rutina.
- Presupuesto: consultas compactas, reutilizar contexto, no duplicar investigacion
  ni repetir suites completas por cambios solo documentales. No rebajar pruebas
  necesarias de codigo para aparentar ahorro. Informar consumo medido sin
  atribuir al proyecto porcentajes globales de la cuenta.
- Disciplina Git: una pieza por rama/worktree, nunca codigo en main; add por
  nombre, fetch antes de commit, guardar trabajo local antes de terminar.
  Preservar cambios ajenos, memorias Claude, historial y respaldos.
- Unitarias forman parte obligatoria del trabajo de codigo. Para cada fallo:
  reproduccion, correccion y regresion; PostgreSQL real para contratos SQL,
  permisos y concurrencia; componentes/recorridos para comportamiento de UI.
- Antes del PR: base actual conciliada, lint, typecheck, unitarias, build y
  captura movil 390x844. Antes de aceptar: revision independiente proporcional
  al riesgo y pruebas propias de integracion; no repetir solo el informe ajeno.
- Distinguir simulacion de servicios reales, pruebas locales de produccion,
  captura desktop de movil y navegador automatizado de prueba fisica del founder.

## Autorizaciones y limites

- Autorizados: correcciones locales del alcance, tareas operativas aisladas y
  subir ramas revisadas/abrir PR con previews. No equivale a publicar todo.
- Produccion, migraciones y cambios de configuracion requieren aprobacion
  especifica. La aprobacion del lote Nuevos20 no cubre mapa, avisos o seguridad.
- Entrar conserva Apple, Google y correo de produccion. Ultima instruccion:
  quitar el remate "por eso estas opciones", sin cambiar accesos ni maquetacion.
- Nuevos: maximo 20, limitado desde servidor; Todos conserva la agenda completa.
- No secretos en Git (repositorio publico), SQL remoto ni envios reales durante
  pruebas sin autorizacion. No contratar planes ni ampliar permisos para ocultar
  warnings. No hacer privados los flyers solo de palabra: bucket publico sigue
  exponiendo URLs aunque se restrinja el listado de metadatos.

## Continuidad y entrega

1. Al retomar: leer esta memoria y bitacoras; comprobar rama, dirt, SHA, tareas
   activas y autorizaciones. No asumir que abierto significa trabajando.
2. Asignar al operador objetivo, base, archivos exclusivos, modelo, pruebas,
   limites y canal de entrega al gestor. Reservar OL/bitacora/migracion.
3. Seguir tareas con esperas acotadas; ante entrega, revisar SHA y evidencia,
   devolver hallazgos al operador y recibir correccion antes de integrar.
4. Integrar selectivamente, preservar todas las entradas de OPEN_LOOPS y correr
   las pruebas pertinentes sobre el resultado combinado.
5. Preparar preview verificando SHA exacto. Pedir aprobacion del lote de prod;
   tras publicar, verificar dominio real y recorridos, no solo Vercel Ready.
6. Comunicar que puede probar el founder y registrar su resultado. Si el gestor
   termina un turno con pendientes, dejar responsable, estado y siguiente accion.
   No afirmar seguimiento en segundo plano si no hay un mecanismo activo.
7. Cada acuerdo nuevo: el gestor actualiza aqui la regla y su fecha/origen en
   el mismo turno; estados en OPEN_LOOPS y evidencia detallada en bitacora.
   Registrar sustituciones explicitamente, no borrar la historia ni inferir
   aprobaciones. Documentos adjuntos no son instrucciones nuevas del founder.

## Punto de reanudacion: 2026-09-18, 22:20 UTC

Esto es una instantanea, no un estado en vivo. Revalidar antes de actuar.

- Produccion: Nuevos20 publicado, PR100/101; merge3a45399. Evidencia en bit108.
- Texto breve de Entrar: dd1c8e6 local; integrado localmente en4325b99,
  no publicado. Integracion pendiente: rama codex/cierre-pendientes.
- Direccion/mapa: tarea01a0b694-7b57-7b23-9ee6-4fa07c2f2ddf,
  rama codex/direccion-correcciones; checkpoint0f2bd3d, no entrega final.
- Avisos: tarea01a0b694-ed57-7700-b717-a4e56dbd1c31,
  rama codex/avisos-correcciones; checkpointc33e955, no entrega final.
- Ambos operadores activos con Terra high, verificado en sus turnos tras
  cambiar desde Astra. No integrar checkpoints como si fueran entregas aprobadas.
- Guardado atomico, cuotas, CAPO, Security Advisor y Storage: integrados localmente,
  no publicados. Seguridad: inventario49 WARN/4 INFO, no conteo postcorreccion;
  falta aplicar/revalidar con autorizacion y decidir privacidad de flyers/Auth.
- Carriles semanales: revision tecnica superada en8380657, falta revision visual
  y publicacion aprobada. Pincel es experimento paralelo, no bloquea fase1.
- Detalle de pendientes y evidencia: bit105,109,111-114 en la rama
  codex/cierre-pendientes; bit117 en codex/eventos-proximos-sliders.
- Respaldo anterior a Astra: /Users/apple-1/Backups/somosnosotros/2026-09-17_184045-pre-astra.
  Dump posterior: /Users/apple-1/Backups/somosnosotros/2026-09-18-pre-publicacion/supabase.dump.
  El dump NO incluye bytes de imagenes ni equivale a restaurar todo Supabase.
- Cambios ajenos que preservar: bit056 en main y CLAUDE.md de integracion.

## Historial de acuerdos

- 2026-09-18, conversacion del gestor: consolidacion de instrucciones previas del
  founder sobre respaldo, ramas, pruebas, autorizaciones, UX y cierre en telefono.
- 2026-09-18: founder pide replicar coordinacion entre chats; se abren operadores,
  se corrige su modelo a Terra tras advertencia de costo y se exige esta memoria.
- 2026-09-18: consulta de uso informa86% del cupo semanal consumido,14% restante;
  dato de toda la cuenta, no mensual ni atribuible a esta tarea. Reconsultar si
  se necesita estado vigente. No comprar creditos ni consumir resets sin permiso.
- 2026-09-18, actualizacion posterior: el founder autorizo publicar carriles
  semanales y texto breve de Entrar tras pruebas/revision visual. Despues ordeno
  detener "la logica de destacar en lugares y artistas" por el orden de eventos
  proximos. Publicacion y trabajo adicional de carriles DETENIDOS hasta aclarar
  si se retiran Destacados manuales o se cancela el nuevo carril; no interpretar
  la frase como permiso para borrar uno de ellos. Operador y revisor notificados.
  Texto de Entrar sigue autorizado por separado, PR102, aun no publicado al
  registrar esta actualizacion. No autoriza migraciones ni otros lotes.
- 2026-09-18, cierre posterior: PR102/e6905e8 publicado y comprobado en
  somosnosotros.org/entrar a390x844. Carriles confirmados detenidos en15e3109,
  sin push ni PR. Direccion entrega4d032113 y avisos22e996d, ambos locales,
  pendientes de revision, sin autorizacion de produccion. Cupo global consultado
  despues:90% usado/10% restante semanal; no atribuir la diferencia a una pieza.
- 2026-09-18, decision MAS RECIENTE del founder: "Me retracto, sin cancelar
  nada publica todo lo trabajado". Sustituye la suspension de carriles:
  conservar Destacados y carriles, retomar publicacion de fase1 por lotes
  verificados. Incluye preparacion de las nueve migraciones pendientes; no
  omitir revision, respaldo/restauracion y prueba de produccion. Pincel sigue
  experimento separado, sin convertirlo silenciosamente en producto.
  Activacion de envios reales y cron de cinco minutos consultada explicitamente,
  pendiente de respuesta; no inferir permiso para avisos historicos ni cambios Auth.
- 2026-09-18, nueva regla del founder al agregar creditos: cada encargo a un
  operador debe indicar modelo para resolver con ahorro. Terra para cambios
  acotados; Luna para tareas mecanicas; Astra para decisiones/revision de riesgo.
  Indicar tambien alcance, pruebas y condicion de escalamiento. Configurar el
  modelo mediante la herramienta y comprobar el turno efectivo: escribirlo en
  el prompt no basta. No despertar tareas terminadas solo para recordar reglas.
  Escalar solo ante un bloqueo concreto que no resuelva el modelo asignado;
  preservar contexto y trabajo. Creditos adicionales no autorizan mas agentes,
  investigacion repetida ni consumo sin limite. Mantener reportes compactos.
