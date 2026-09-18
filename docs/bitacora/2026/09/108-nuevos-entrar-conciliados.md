# 108 - Nuevos y Entrar conciliados

Fecha: 2026-09-18. OL-074, continuidad de OL-068 y OL-061.
Rama: `codex/cierre-pendientes`.

- Recuperadas las piezas pendientes de Nuevos por publicacion y texto con icono
  de Entrar. Se conserva el arreglo posterior de Atrás de main.
- Nuevos recibe un sello anterior a la consulta del servidor, no la hora de
  hidratacion del navegador. Una consulta fallida no avanza la marca.
- La marca de lectura queda separada por ciudad; una pestaña con una lista vieja
  no retrocede una marca valida mas reciente.
- La memoria de pantalla sigue usando el mecanismo del proyecto, por URL.
  Al cambiar de ciudad se monta la agenda con su propio contexto.
- Pruebas unitarias: 459 aprobadas. Typecheck y lint sin errores; persiste el
  warning previo de iconos-sn.mjs. Capturas locales a 390x844 revisadas: grupos
  por publicacion y fecha del evento en Nuevos; escudo y texto en Entrar.
- Sin firma de iPhone ni produccion. El founder autorizo push de ramas y PR,
  pero exige otra aprobacion para main y migraciones remotas.

## Diagnostico de despliegue

Supabase remoto tiene 33 migraciones, hasta 20260917150000, y PostgreSQL 17.6.
Consulta en transaccion READ ONLY y TLS verificado con el certificado oficial
referenciado por el codigo de Supabase Studio. Seis suscripciones push.
No se cambiaron datos ni configuracion remota.

Respaldo local de public/auth/storage/supabase_migrations creado con pg_dump;
su indice se lee con pg_restore. No incluye los bytes de objetos de Storage
ni equivale a una restauracion ensayada de todo Supabase.

`next dev` agrego automaticamente un bloque de instrucciones a CLAUDE.md.
No se incluye con estos cambios de producto ni se elimina a la fuerza.

## Revision del founder: conservar Entrar de produccion (2026-09-18)

- Decision vigente: "Deja el entrar de prod." Se retira del lote el escudo y
  la region explicativa; FormularioEntrar.tsx y su CSS vuelven a coincidir con
  origin/main. No se cambian proveedores, rutas OAuth ni configuracion remota.
- La preview sin Apple/Google no era evidencia equivalente a produccion:
  botonesProveedor los oculta en dominios Vercel no registrados. Esta regla
  ya existia y se conserva. No se afirma que se haya probado OAuth completo.
- Las entradas anteriores y las bitacoras 092/099 quedan como historia, no
  como autorizacion para publicar el ajuste de Entrar. Produccion no cambia.
- Peticion nueva: limitar Nuevos ante cargas masivas. Propuesta pendiente:
  maximo 20 eventos, ventana de siete dias y corte por ultima visita; sin
  scroll infinito. Actualmente comparte la consulta de hasta 300 eventos con
  Todos: recortar en cliente no reduce esa consulta. La propuesta de servidor
  requiere consulta acotada al abrir Nuevos, orden estable e indice evaluado,
  sin duplicar la carga general. No implementada en esta revision.
- Verificacion de la retirada: diff de los dos archivos de Entrar contra
  origin/main vacio; 411 unitarias aprobadas, typecheck y build aprobados,
  lint sin errores (solo el warning previo de iconos-sn.mjs). No equivale a
  validacion visual del nuevo limite ni a prueba de OAuth en dispositivo.

## Nuevos: limite aceptado y autorizacion de produccion (2026-09-18)

El founder respondio: "acepto limite propuesto. Vamos a prod con eso, que mas tienes?".
La autorizacion cubre este lote y su base de verificacion (#100/#101), no los
pendientes de mapa, guardado atomico, cuotas, avisos, seguridad, CAPO ni Pincel.
Entrar se conserva igual a produccion, sin cambios de Auth ni proveedores.

- Maximo 20 eventos consultados en la base al abrir Nuevos, no un recorte de
  los 300 que ya usa Todos. Publicados desde la ultima visita, con ventana
  maxima de siete dias, vigentes y visibles en la ciudad elegida.
- Orden estable por creado_en descendente, inicio, titulo e id. Sello del
  servidor anterior a la consulta, conservado al volver de una ficha.
- El limite es un resumen: los eventos fuera de los 20 siguen en Todos. No
  hay scroll infinito; Ver todos devuelve a la agenda sin filtro ni busqueda.
- Cambiar de pestana durante la carga reutiliza la peticion; buscar filtra
  esos 20 localmente. Error o tiempo agotado no avanza la marca de visita.
- No se consultan catalogos de miles de ciudades/eventos para resolver un
  nombre: la igualdad de ciudad va parametrizada y la RLS sigue vigente.
- La revision independiente encontro un P2 al mezclar asistencias parciales:
  una ausencia en Todos podia resucitar un Voy viejo de Nuevos. Se mantienen
  las fuentes independientes con el hook existente y un solo canal de avisos.
  Una revalidacion obliga a refrescar Nuevos antes de mostrarlo; las respuestas
  anteriores se ignoran. No se modifica el hook comun de asistencias.
- Verificacion: 468 unitarias, 33 migraciones existentes/19 comprobaciones PG,
  6 recorridos de componentes en Chrome a 390 y 1280 (hook de asistencia real,
  transporte simulado). Tipos y build aprobados. No se escriben datos remotos.
- Build Next real con datos publicos: 20 enlaces (2 ayer, 18 esta semana),
  mismo orden de IDs tras ficha/Atras, Ver todos funcional, sin overflow en
  390 y 1280. Capturas antes/despues inspeccionadas; no prueba de Safari fisico.
- EXPLAIN en transaccion READ ONLY y rol anon: usa el indice existente
  eventos_ciudad_termina_idx y ordena candidatos (29 filas estimadas, coste
  total 16.51 en este catalogo). No es benchmark de carga ni garantia de leer
  solo 20 filas. No se agrega/aplica migracion. El indice por publicacion y la
  consulta general de ciudades quedan para evaluar antes de cargas grandes.
- Rollback: revertir el commit de merge del PR #101 conserva el esquema y el
  acceso vigente. La base de verificacion #100 no cambia el producto.

Pendiente en este registro: CI/preview del commit final, integracion autorizada
y comprobacion del despliegue. No considerar publicado hasta registrar esas
evidencias; la aprobacion funcional en el telefono sigue correspondiendo al founder.
