# Gestión de cambios — para que todo llegue a producción sin perder nada

Hay varios chats trabajando a la vez sobre la misma carpeta. Este documento dice cómo se reparte el trabajo para que ningún ajuste se pierda y nada llegue a producción sin verificar. Lo aplica cada chat; lo vigila el chat encargado de gestión de cambios (bitácora [061](../bitacora/2026/09/061-gestion-de-cambios.md)).

## Las reglas (para cada chat)

Las reservas vivas de rama/base, OL, bitacora y propiedad se consultan en
[ASIGNACIONES.md](ASIGNACIONES.md). Solo las emite el gestor. Trabajar con
autonomia dentro del encargo no autoriza elegir otra rama, reutilizar un OL
cerrado ni ampliar archivos compartidos. Una entrega queda congelada durante
su revision; no hay dos escritores sobre el mismo candidato.

0. **Informar y esperar instrucciones** (regla del founder, 2026-09-17: «informa siempre de lo que haces al chat de gestión de cambios y espera instrucciones»). Antes de crear una rama, tocar archivos o aplicar algo, cada chat le cuenta al encargado qué va a hacer y espera su respuesta; al terminar, avisa con "listo". El encargado responde con rama, números, nombre de migración y choques con otras piezas.
1. **Cada pieza en su rama.** Código nunca se escribe sobre `main`. Se abre un árbol de trabajo (worktree) o una rama con nombre de la pieza. Un PR por pieza.
2. **Lo que se escribe se guarda.** Antes de cerrar el chat, todo queda en un commit local (código en su rama; documentos de cierre pueden ir en `main` si son solo documentos). Un commit local no publica nada: el push y el merge siguen siendo del founder.
3. **`git add` por nombre, nunca `git add -A`.** Otros chats tienen archivos sin commit en la misma carpeta.
4. **Los números los reserva el encargado; el script es la comprobación.** Al empezar una pieza, el chat pide su bitácora, su OL y, si trae migración, el nombre de archivo de la migración al encargado, que los reserva en orden (el 2026-09-16 dos chats tomaron la 072 con 29 s de diferencia, y otro iba a tomar la 075 que ya tenía reservada una pieza sin archivos). Las migraciones se nombran en el orden en que se aplicarán: `supabase db push` rechaza una más vieja que la última aplicada. Antes de crear la bitácora o una entrada nueva en OPEN_LOOPS, comprobar:
   ```
   scripts/ops/siguiente-bitacora.sh
   ```
   Mira todas las ramas, los árboles de trabajo y lo que está sin commit. Si otro chat ya tomó el número, se toma el siguiente.
5. **OPEN_LOOPS: una línea propia y nada más.** Cada chat añade su entrada OL al inicio de "Ahora" y actualiza el resumen de "Last updated"; si el founder decidió algo, también su línea en "Decidido"; no reescribe entradas de otros chats. Los choques al mezclar los resuelve el encargado, conservando todo lo que cada rama añadió: antes de resolver, mirar **todos** los trozos de `git diff <base>..<rama> -- docs/ops/OPEN_LOOPS.md`, no solo el de arriba (el 2026-09-17 se perdió así una línea de "Decidido" y hubo que reponerla).
   Tres comprobaciones que ese mismo día evitaron perder texto, y que ahora son obligatorias al resolver el archivo:
   - **Ninguna línea de `main` puede desaparecer.** Comparar línea por línea contra `git show origin/main:docs/ops/OPEN_LOOPS.md`; lo que falte, reponerlo.
   - **La entrada más larga manda.** Si la misma entrada OL existe en las dos ramas, se parte de la más larga y solo se cambia lo que quedó desactualizado. Quedarse con la "más limpia" borra la historia de la pieza.
   - **La cabecera "Last updated" no se duplica.** Es una cadena de trozos separados por "; antes, ": van los trozos nuevos arriba y detrás la cadena de `main` tal cual. Contar los trozos: ninguno puede salir dos veces.
   Y siempre con `git fetch` justo antes de comitear: `main` se mueve solo, porque la tarea programada del founder deja cada día la línea de la tanda de invitaciones del CAPO en la bitácora 056.
6. **Antes de abrir el PR:** traer `main` a la rama (`git merge main`), correr `npm run lint && npm run typecheck && npm test`, build en verde y captura móvil (390×844). El PR dice qué migraciones trae, qué variables de entorno pide y qué debe hacer el founder en Supabase o Vercel.
7. **Decisiones del founder (CLAUDE.md, DEFINICION, PLAN):** las edita solo el chat donde el founder decidió, con la fecha y sus palabras. Si dos chats registran decisiones opuestas en el mismo día, vale la última que dijo el founder y la anterior queda tachada en "Decidido" con su fecha.
8. **Push y merge solo cuando el founder lo pida.** El orden de los merges lo propone el encargado (primero lo que otros PR necesitan; los PR con migración, con el founder aplicándola antes de que se use). Después de cada merge: despliegue de Vercel en verde y OPEN_LOOPS diciendo "en producción".

## Tablero

### Ajuste de pruebas por costo (founder, 2026-09-18)

Esta regla actualiza el punto 6: durante el trabajo se ejecutan pruebas
focalizadas por comportamiento y riesgo, no una suite completa por cada objeto.
No hay una cuota de pruebas por archivo. La suite completa se reserva para el
candidato integrado de publicacion o cambios transversales. Reutilizar resultados
del mismo codigo/base y entorno entre operador, gestor y CI, sin duplicarlos por
rutina ni omitir checks obligatorios. Una revision independiente no exige volver
a ejecutar toda la suite: comprueba evidencia y prueba los riesgos identificados.
Documentacion sola requiere revisar el diff, no build ni unitarias; cambios de
UI requieren comprobar el recorrido visual afectado. Cada encargo especifica
pruebas focalizadas y condicion para ampliar la verificacion.

```
scripts/ops/estado-cambios.sh
```
Dice qué hay sin commit, qué árboles y ramas tienen commits que `main` no tiene, qué PR están abiertos y con qué CI, las últimas migraciones y los números que siguen. Solo lee.

## Cómo cierra el encargado un día

### Entregas sin espera indefinida (founder, 2026-09-18)

Actualizacion posterior del founder: "revisa solo cuando el chat te avise que
termino y esta listo para integrar, no vigiles cada paso". Esta regla sustituye
el seguimiento intermedio: no sondear tareas, commits, diffs o capturas mientras
el operador trabaja. El operador completa implementacion, pruebas focalizadas y
QA visual autonomamente y envia una entrega consolidada. El gestor revisa al
recibir "listo para integrar" (o "listo para revision final" en prototipos locales).
Si hay hallazgos, devolverlos juntos y esperar la nueva entrega completa, sin
dirigir cada arreglo. Solo interrumpir por bloqueo real, riesgo urgente o nueva
decision del founder. Las aprobaciones y limites de publicacion se conservan.

Aclaracion posterior del founder: autonomia no significa dejar detenidas las
tareas. La colaboracion debe ser dinamica y orientada al cierre, sin obligarlo a
reactivar chats. Cada operador notifica la entrega completa al gestor mediante
send_message_to_thread, con SHA, alcance, resultados de pruebas y limites. Ese
aviso inicia la revision; no es un estado final de espera indefinida. El gestor
atiende entregas independientes en paralelo cuando las herramientas lo permitan,
reutiliza evidencia y ejecuta solo pruebas faltantes justificadas por riesgo.
Devuelve hallazgos consolidados al operador, que corrige y vuelve a notificar;
mientras tanto atiende otras entregas listas, sin sondear pasos intermedios.
Tras aceptar: PR, CI, preview, aprobacion de produccion si falta, integracion,
verificacion del dominio y cierre comunicado al operador. No confundir entrega
de codigo con activacion operativa ni pedir nuevamente permisos ya concedidos
para el mismo alcance. Solo dejar espera por una dependencia, decision o bloqueo
concreto, con responsable y accion de salida. No requiere vigilancia periodica
ni automatizaciones de pago adicionales: se coordina mediante avisos de entrega.

El founder precisa despues el punto de revision de propuestas: el operador
presenta en su propia tarea una propuesta comprobada, con captura/enlace y una
solicitud accionable de VoBo (request_user_input_async cuando este lista). Itera
directamente con el founder y remite al gestor la entrega consolidada junto con
su aprobacion. No obligar al founder a pedir "donde lo veo" ni a copiar mensajes
entre chats. El VoBo visual no sustituye revision tecnica ni autoriza publicar
un prototipo local. En operaciones remotas ya autorizadas, no pedir otra vez el
permiso: comunicar resultado y solicitar firma de validacion si falta; notificar
al gestor la liberacion de la ventana operativa sin esperar esa firma. No afirmar
"sigo trabajando" cuando la tarea esta inactiva. Estas solicitudes son avisos en
la tarea; no garantizan notificaciones del sistema operativo ni crean vigilancia.

- Toda entrega incluye commit, alcance, evidencia reutilizable y limites. Al
  recibirla, el gestor decide: aceptada, devuelta con hallazgos concretos o
  pendiente de una decision expresa del founder. "Pendiente del gestor" por si
  solo no es un estado suficiente: registrar accion siguiente y responsable.
- La revision tecnica es responsabilidad del gestor; no pedir al founder que
  la sustituya. Si falta una decision de producto o autorizacion, formular la
  pregunta concreta y continuar las piezas independientes ya autorizadas.
- Tras integrar/publicar o recibir la firma del founder, comunicar el cierre
  al operador correspondiente con commit/PR y pendientes operativos separados.
  No dejar que una rama antigua siga informando el estado previo a integracion.
- Antes de terminar un turno de coordinacion, conciliar las entregas recibidas
  y el tablero: estado, responsable, siguiente accion y bloqueo real. No dejar
  una entrega recibida sin respuesta ni prometer continuidad en segundo plano
  sin un mecanismo activo. Usar espera acotada de operadores mientras corresponda.
- No despertar operadores solo para pedir estatus ni repetir pruebas aprobadas.
  Una comunicacion de cierre no requiere nuevo commit en su rama ni otra suite.

1. Correr el tablero.
2. Guardar en commit lo que quedó sin commit en `main` (por nombre).
3. Por cada PR abierto: traer `main`, resolver OPEN_LOOPS, CI en verde.
4. Proponer al founder el orden de merge y lo que él debe aplicar (migraciones, variables).
5. Bitácora del encargado y OPEN_LOOPS al día.

## Por qué existe (16 de septiembre de 2026)

Esa noche tres chats escribieron sobre `main` sin commit (bitácoras 057, 058 y 059, tres documentos de decisión y OPEN_LOOPS), dos de ellos con decisiones opuestas sobre la app de la tienda en la misma noche, y un PR (#65) tocaba el mismo lugar de OPEN_LOOPS que esos cambios. Nada se perdió, pero por poco. Ver bitácora [061](../bitacora/2026/09/061-gestion-de-cambios.md).
