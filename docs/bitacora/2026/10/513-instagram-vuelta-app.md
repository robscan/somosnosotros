# 513 · OL-481 · «Conectar Instagram» desde la app del iPhone: la vuelta no exige la galleta

**Fecha:** 2026-10-29. **Rama:** `instagram-vuelta-app` (desde `origin/main` `bbd2099f`, con OL-471 ya unida). **Quién:** Gestor VII, sin agentes.

## Lo que pasó
El founder probó «Conectar Instagram» (OL-471, bitácora 503) desde la app del App Store en su iPhone: «Sí me lleva a pedir las credenciales, las ingreso, al terminar el proceso regreso a esta ventana que me sigue notificando que el enlace para conectar caducó». Su captura muestra el aviso «El enlace para conectar caducó. Vuelve a tocar «Conectar Instagram»» y «Sin conexión propia · Usa el token de respaldo», con «◀ Safari» arriba a la izquierda.

## Causa
`/api/instagram/conectar` dejaba el `state` firmado en una galleta (`sn_ig_conectar`, 10 min) y `/api/instagram/vuelta` exigía que el `state` de la dirección fuera **el mismo que el de la galleta**. En la app del iPhone el inicio de sesión de Meta no se abre dentro de la app (Meta no admite su diálogo en un WebView; «Embedded browser OAuth login» está en No): iOS lo abre en **Safari**, que no comparte las galletas del WebView de la app. La vuelta llegaba a Safari sin la galleta → clave `estado` → la frase de «caducó». En Safari de escritorio o en la web del iPhone el flujo sí cerraba, porque ahí sí es el mismo navegador.

## Arreglo
`atenderVuelta` (`src/lib/instagram/conexion.ts`) ya no exige la galleta: el `state` tiene que ser nuestro (firma HMAC con la llave derivada de `CRON_SECRET`), estar dentro de sus 10 minutos y ser **de quien tiene la sesión** (el id de la administración firmado dentro del `state` debe ser el de la sesión que recibe la vuelta). La galleta, cuando viene, se sigue borrando en la vuelta. Lo que evitaba la galleta (que alguien le haga abrir a la administración una vuelta con un `code` ajeno) sigue cubierto: para eso haría falta un `state` firmado por nosotros, para esa misma cuenta y con menos de 10 minutos, que solo existe en la dirección que esa persona acaba de abrir.

Pruebas: `conexion.test.ts` separa «sin galleta o con otra galleta → conectado» (los dos casos que antes daban `estado`) de «caducado, de otra cuenta o tocado → estado, sin llamar a Meta». 20 pruebas en verde; typecheck y lint sin errores.

## Lo que sigue dependiendo del navegador
La vuelta exige sesión de administración **en el navegador donde cae** (Safari, en el caso de la app). El founder la tiene; si algún día no, Safari mostraría «Solo la administración conecta Instagram» (403). Si se repite, la salida es terminar la vuelta sin sesión: con el id firmado del `state` como identidad, sin leer la galleta de sesión. Queda anotado, no hecho.

## Comprobación en producción (gestor)
Tras unir y desplegar: el founder toca «Conectar Instagram» en Administración › Instagram desde la app; en Safari entra y acepta; al volver, el bloque dice «Instagram quedó conectado» con la cuenta y la fecha. Después, desde la base, comprobar que `instagram_conexion` tiene una fila y que Business Discovery responde con el token guardado (bitácora 503 §prueba del gestor).
