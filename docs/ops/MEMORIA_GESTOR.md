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
- Pruebas proporcionales por objeto: cubrir comportamiento cambiado, fallos y
  contratos afectados, sin cuotas de cantidad. Durante la iteracion ejecutar
  pruebas focalizadas; reservar la suite completa para integracion final o
  cambios transversales. Reutilizar evidencia del mismo codigo/base y entorno;
  no repetir suites entre operador, gestor y CI sin una razon concreta.
  SQL/permisos requieren pruebas de contratos; UI requiere revision visual del
  recorrido afectado. Solo documentacion: verificar diff, sin suite ni build.
- Antes del PR: base actual conciliada y verificaciones pertinentes al cambio;
  el candidato de publicacion requiere lint, typecheck, unitarias y build,
  con captura movil 390x844 si cambia UI. Antes de aceptar: revision proporcional
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
- 2026-09-18, ajuste del founder tras el reporte de 679 unitarias: seleccionar
  pruebas por riesgo e impacto de cada objeto, evitar derroche. El numero es
  la suite acumulada del candidato, no pruebas nuevas del lote ni una meta.
  Cada encargo debe indicar pruebas focalizadas, evidencia reutilizable y
  motivo para ampliar cobertura. Esta regla sustituye repetir toda la suite
  por cada cambio o revision; no elimina controles de seguridad ni CI requerido.
- 2026-09-18, reserva de prototipo Pincel autorizado por el founder en tarea
  01a0b601-b973-7983-95eb-fe66f43e1988: OL-084, bitacora118,
  rama codex/pincel-prototipo desde d1b5bdc417a495c2ff5e40594b2df636feff26e0,
  worktree /Users/apple-1/somosnosotros-pincel-prototipo. Operador Terra medium.
  Solo experiments/pincel-prototipo y documentacion propia; sin cambios a app,
  backend, dependencias, migraciones o produccion. Reutilizar evidencia del spike;
  pruebas focalizadas de estados/pinceles y recorrido visual movil/escritorio,
  sin suite global. Prototipo de sesion y colaboracion simuladas, no integracion
  real. Esta pieza no bloquea el cierre de fase1.
- 2026-09-18, tras publicar PR104: se libera la pieza autorizada por el founder
  en tarea 01a0b61e-abcd-7483-a141-116715ad40d4. Reserva OL-085/bitacora119,
  rama codex/directorios-alfabeticos desde eb2f80efa07b6efefeee1db7ea295ea1dcb997ba,
  worktree /Users/apple-1/somosnosotros-directorios-alfabeticos. Terra high.
  Directorios alfabeticos con salto por letra, cercania opcional en Lugares,
  destacados 2x e imagen rectangular de artistas en carriles. Solo UI/consultas
  de directorios y documentacion propia, sin SQL/Auth/avisos/eventos/formularios.
  Pruebas focalizadas de orden, acentos, filtros y paginacion; capturas movil y
  escritorio. Entrega local para revision, sin publicar automaticamente.
- 2026-09-18, estado posterior verificado: PR103/0a30598 y PR104/eb2f80e ya en
  produccion. Ultimo deployment3bmn3soofYhiEsajoKpGzQAVEpJF con dominio real,
  CI PR/main verdes,42 migraciones remotas. Captura de avisos activa desde
  23:04:19.708Z; entregar=false,recordatorios_desde=NULL, cron nuevo no instalado.
  Activacion consultada otra vez al quedar prod lista; respuesta pendiente.
  Advisor0ERROR/25WARN/9INFO, sin silenciar sugerencias. Detalle y limites en105,
  111 y113. Pendiente validacion del founder de guardado/flyer en dispositivo,
  decisiones de privacidad/Auth y activacion real. No geocodificacion retroactiva.
  Pincel entrego65c6d1b; gestor pidio corregir solo el boton central sin efecto,
  con prueba focalizada, sin suite global. Directorios se ejecuta separado.
  Metadata Pincel confirmaTerra (effort high observado aunque medium solicitado);
  no deducir modelo efectivo del texto generico GPT-5 del prompt.
- 2026-09-18, seguimiento de piezas separadas: directorios9c04ecf/6c80849
  retenidos sin PR por revision del orden foto/placeholder, recuperacion del
  indice con busqueda/vacios y tarjeta unica2x. Correcciones focalizadas con
  Terra high, no otra suite global. Founder agrego foto real antes de placeholder
  en sliders, con fecha dentro de cada grupo semanal (decision en su tarea).
  Pincel65c6d1b/ea06274: revision detecto reinicio por click tras pulsacion larga;
  correccion en curso. Founder aprobo iterar participante como controlador sin
  header/titulo, salir+personas, colores, boton circular y panel tactil desplegable;
  proyeccion se conserva y admin simula entrypoints de panel/evento. Misma rama,
  OL084/bit118 y ownership, sin backend ni produccion. No publicar ninguno de
  estos checkpoints como entrega final ni mezclar con PR104 ya desplegado.
- 2026-09-18, entrega posterior Pincel:4619757 corrige la pulsacion larga y
  9f82a08 incorpora controlador limpio, colores, boton circular y panel tactil,
  con entrypoints admin/evento simulados. Delta revisado por gestor y aceptado
  para validacion visual local del founder, NO para integracion o produccion.
  Evidencia del operador:6 tests focalizados y capturas390; limitacion declarada
  de pulsacion larga sin automatizacion DOM. Cierre documental pedido, sin repetir
  pruebas. Accesibilidad de nombres/seleccion de colores pendiente antes de integrar.
- 2026-09-18, decision posterior en tarea Pincel: founder rechaza el controlador
  9f82a08 y pide "Cuestiona tu y mejora". Sustituye su aceptacion como candidato
  visual: sigue local, NO aprobado por founder. Gestor autoriza otra iteracion
  solo participante en la misma rama/OL084/bit118, Terra high, sin proyeccion/admin
  ni infraestructura. Defaults sin onboarding extra, gesto central con feedback,
  modo dedo explicito y seleccion de color accesible; critica concreta desde
  captura actual y verificacion focalizada, sin suite global ni nuevos agentes.
