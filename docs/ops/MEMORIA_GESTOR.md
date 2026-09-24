# Memoria operativa del gestor

Compilada el 2026-09-18 por solicitud expresa del founder en Gestor de cambios
(`01a0b1e5-d30b-7cf1-9b67-00148350eaa2`). No es una promesa de memoria infalible:
es el registro versionado que se debe leer y actualizar al retomar el trabajo.

## Acuerdos vigentes

- Asignaciones activas y reservas centralizadas en `docs/ops/ASIGNACIONES.md`.
  Solo el gestor asigna rama/base, OL, bitacora y propiedad. Autonomia dentro del
  encargo; no autoasignacion ni cambios paralelos sobre una rama en revision.

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
3. No vigilar avances intermedios: esperar aviso del operador de entrega completa
   lista para integrar/revision final. Entonces revisar SHA y evidencia, devolver
   hallazgos consolidados si existen y esperar otra entrega completa.
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
- 2026-09-18, directoriosffff3ad: delta de codigo revisado, hallazgos anteriores
  cerrados; QA visual aun pendiente. Gestor comprobo que worktree carece de .env
  y .env.local: se autoriza enlace privado ignorado .env.local a .env del proyecto
  principal y reinicio solo del servidor propio. Nunca imprimir/subir secretos,
  ni usar esta configuracion para escrituras/envios en prod durante el smoke.
  En futuras asignaciones comprobar configuracion local antes de gastar pruebas
  visuales contra pantallas vacias; una ausencia de datos no equivale a QA pasado.
- 2026-09-18, validacion expresa del founder en Gestor de cambios:
  "Te firmo y acepto Editar un evento tuyo y buscar una direccion. Funciona bien".
  Recorrido de edicion y busqueda de direccion aceptado por el founder tras
  publicacion de PR104. No extender esta firma a otros recorridos ni a activar
  correo/push/cron; esa autorizacion sigue pendiente.
- 2026-09-18, Pincel: founder precisa zona tactil superior visible, sin enlace
  alternativo de dedo; color y tipo como dropdowns a extremos del control central.
  Boton de pintar mas alto, con espacio inferior para sostener el telefono sin
  cambiar agarre. Terra high informado; validar pantallas cortas/altas, comodidad
  fisica pendiente del founder. Misma rama/OL084/bit118, solo prototipo local.
- 2026-09-18, directorios31a2236: gestor inspecciono capturas390/1280 y delta
  b0abc31. Solapamiento del indice sobre fotos corregido al convertirlo en fila
  horizontal sticky. Sigue candidato local, no aprobado por founder ni publicado:
  cambia la referencia de indice tipo Contactos y requiere revisar tamano tactil.
  No repetir suite global por este ajuste. Operador de avisos informado de que su
  codigo ya esta integrado en PR104/prod; entrega externa sigue sin autorizar.
- 2026-09-18, founder detecta operadores detenidos esperando al gestor. Se adopta
  protocolo de entregas sin espera indefinida en GESTION_DE_CAMBIOS: cada entrega
  recibe decision, responsable y siguiente accion; revision tecnica del gestor
  separada de aprobacion de producto/envios. Sincronizar cierres con operadores
  y conciliar entregas antes de terminar turno, sin promesas de fondo no activas.
  Operador de direccion debe conocer PR104/prod y firma del founder de edicion
  y busqueda; no repetir pruebas ni extender la firma a otros recorridos.
- 2026-09-18, ajuste expreso de costo y coordinacion: founder rechaza
  micromanagement. No sondear cada paso ni revisar diffs/capturas en progreso;
  operador ejecuta y verifica autonomamente, gestor revisa solo cuando entregue
  terminado. Hallazgos en un lote, no instrucciones continuas. Pincel informado.
  Directorios26acb39 tiene PR105/CI35407104372 verde y preview Ready, revisada
  por gestor; pendiente aprobacion del founder de presentacion/publicacion.
  Pincel sigue local: operador debe consolidar correccion responsive/superficie
  y QA antes de avisar listo. No aprobado para integrar ni publicar.
- 2026-09-18, founder aclara que la referencia Claude busca colaboracion y
  eficiencia, no competencia. Autonomia con continuidad por entregas: aviso del
  operador dispara revision del gestor; pruebas pertinentes, hallazgos en lote,
  correccion y nueva entrega hasta integrar/publicar lo autorizado. Atender otras
  entregas independientes mientras hay correcciones; no vigilar pasos ni esperar
  que founder reactive cada chat. Protocolo detallado en GESTION_DE_CAMBIOS.
- 2026-09-18, autorizacion operativa verificada en tarea de avisos
  01a0b694-ed57-7700-b717-a4e56dbd1c31: founder responde "autorizo, coordina con
  gestor de cambios para que te entregue reglas de operacion y que no interfieras
  con otra entrega" a activar entregar=true, cron y primer envio/transicion.
  Sustituye pendiente de permiso anterior, NO significa activacion ya ejecutada.
  Operador Terra high recibe propiedad exclusiva de configuracion avisos/cron/Vault
  y transicion conforme113, con rollback y evidencia final. No merge/deploy de
  PR105 durante esa ventana; Pincel sigue local. Mantener corte/captura existentes,
  no reenvio historico ni cambios Auth/Storage/planes. Gestor revisa entrega final;
  bloqueo real de frontera legado requiere entrega especifica, no activacion ciega.
- 2026-09-18, founder solicita revision puntual de operadores y nuevo flujo de
  VoBo: propuestas se muestran y notifican en la tarea del operador, se iteran
  alli hasta aceptacion y despues se entregan al gestor. Comprobacion puntual:
  avisos activo; Pincel inactivo con correcciones pendientes, reactivado para
  terminar antes de presentar; directorios inactivo con propuesta sin VoBo,
  informado de CI/preview ya listos y encargado de solicitar aprobacion alli.
  No reactivar tareas cerradas ni vigilar progreso; esperar entrega/bloqueo.
  Avisos libera ventana operativa con evidencia aunque firma de recepcion siga
  pendiente. No prometer avisos del sistema operativo: usar solicitudes en tarea.
- 2026-09-18, correccion de producto recibida desde tarea de directorios:
  referencia Contactos exige indice VERTICAL lateral sin boton Todos. Artistas
  semanal conserva tarjetas CIRCULARES; solo Destacados usa2xrectangular. PR105
  convertido a draft y retenido; horizontal26acb39 no tiene VoBo y no se publica.
  Operador muestra propuesta visual al founder antes de cambios funcionales y
  remite a gestor solo despues de su aprobacion. Sustituye criterio anterior;
  CIverde previo no valida una nueva propuesta. No cambios en produccion.
- 2026-09-18, relectura solicitada por founder de chats rescatados: contrastados
  transcriptClaude c45c6c9f y memoria project-gestion-de-cambios. Se recupera
  asignacion previa obligatoria, propuesta aislada antes de implementar, base
  explicita y candidato congelado al revisar. Registro ASIGNACIONES creado.
  Pincel conserva OL084/118; directorios OL085/119; activacion avisos se asigna
  formalmente a rama existente codex/avisos-operacion desdeeb2f80e, OL086/120
  (comprobador arrojo siguiente086/120). No se renombra ni mueve trabajo actual.
- 2026-09-21, llamado de atención del founder tras probar la Fase 1 de Pincel en su iPhone (los
  campos de «Crear obra aquí» se salían de su tarjeta): «llama la atención de los operadores y tu
  mismo en tus revisiónes establece que se debe de poner especial atención en maquetar sin sobre
  anidación, maquetas limpias y código optimizado». Regla para toda revisión del gestor de una
  pieza con pantalla, además de lo ya vigente: (1) leer el CSS y el marcado nuevos, no solo la
  lógica: rejillas con columnas acotadas (`minmax(0, 1fr)`), `min-width: 0` en hijos de rejilla o
  flex que llevan texto o controles, sin contenedores que solo envuelven; preferir los componentes
  y estilos del canon (`ui/Campo`, `ui/FormularioCanon`, `ui/Ficha`, `ui/Hoja`) a estilos propios;
  (2) exigir al operador una comprobación medida, no «se ve bien»: con datos que rompan (nombres
  al tope de longitud, listas largas) a 320, 375 y 390 px, ningún hijo con el borde derecho más
  allá de su contenedor y la página sin scroll horizontal, con los números en la entrega; (3) cada
  encargo con pantalla lo dice explícito. Una captura con datos cortos no prueba la maquetación.
- 2026-09-21, SEGUNDO llamado de atención del founder por maquetación, el mismo día: la hoja «Es en
  otro sitio» de OL-100 llegó rota a producción (campos en dos columnas, uno fuera de pantalla)
  aunque el operador había reportado «medido a 320/375/390, cero desbordes» y el gestor lo aceptó
  sin ver la pantalla. Causa: una clase del canon con `grid-area: cuerpo` usada dentro de otra
  rejilla que no define esa área; el navegador crea una columna implícita. Regla dura desde hoy,
  que sustituye a «las capturas las saca el gestor después»: NINGUNA pieza con pantalla se acepta
  sin capturas PNG reales a 390×844 de la app corriendo (respaldo local + Chrome headless por CDP,
  como hizo OL-095; no hace falta instalar nada), con los datos reales del caso y con datos al
  tope, que el gestor ABRE y mira antes de aceptar. Una medición reportada en texto no sustituye a
  la imagen. Además: una clase del canon solo se reutiliza dentro de la rejilla para la que fue
  escrita (mirar si lleva `grid-area`); las listas de sugerencias flotan sobre el layout, no lo
  empujan (founder: «deben de "flotar" siempre sobre el layout no recorrer los campos debajo»).

**Ver la app en local para capturas (OL-109, 2026-09-21).** Dos tropiezos medidos por el operador de OL-109, para decírselos a quien monte un respaldo local: (1) con `next dev` (Turbopack) la app puede no hidratarse nunca en estas carpetas (ningún clic ni tecla responde, aunque el campo acepte texto y la captura «parezca» buena): usar `next build && next start`, y comprobar que un clic real cambia algo antes de dar por buena una captura; (2) el respaldo local no debe decidir «una sola fila» por la cabecera `Accept: application/vnd.pgrst.object+json`: en el servidor de Next llega `Accept: */*`; devolver siempre un arreglo. Y una regla de producto que salió de la misma pieza: `capture` en un `<input type="file">` fuerza la cámara y quita el carrete en el teléfono; nunca se añade «para ofrecer la cámara».

- 2026-09-24, TERCER llamado de atención del founder por maquetación («Te llamo nuevamente la atención respecto a la
  atención al detalle en maquetación»): el botón «Compartir» de la ficha de lugar salía con un envolvente rectangular
  de bordes redondeados alrededor del círculo y el letrero. Causa: `Ficha.module.css .accion` se escribió para `<a>`
  y `BotonCompartir` es un `<button>`, que conserva borde, fondo y `appearance` nativos; la corrección de OL-163
  reseteó solo el `<span>` del círculo, no el botón. Es la tercera vez que muerde el borde nativo del `<button>`
  (OL-159, OL-163, ahora). Regla dura de revisión: toda clase que se aplique a un `<button>` lleva
  `appearance: none; border: 0; background: none; padding: 0; font: inherit` o hereda de `ui/Boton`; al revisar
  una ficha o formulario, buscar `<button` y `<BotonCompartir` con clases de `Ficha.module.css` y mirarlos en la
  captura uno por uno. Y no se acepta una captura con menos de dos y más de cuatro acciones a la vista: los
  tres estados del reparto se capturan.
- 2026-09-24, regla del founder para todos los formularios: «si sugieres algo sea debajo del campo que estoy
  usando». Una lista de sugerencias flota justo debajo del campo con el foco, nunca debajo de otro campo ni
  empujando el layout (ya decidido el 2026-09-21); si el teclado tapa las acciones que siguen a la lista, las
  acciones van pegadas sobre el teclado. Cuando el flujo no cabe en una hoja, va a pantalla completa (patrón de
  «Texto largo», OL-147).
