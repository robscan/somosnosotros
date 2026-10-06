# 334 · Prototipo: el cartel se sube siempre; la lectura automática es una casilla con contador

**OL-306 · 2026-10-06 · Gestor de cambios IV (Fable 5.1) · rama `prototipo-cartel-sin-lectura` · prototipo `docs/rediseno/prototipos/cartel-sin-lectura.html`**

## Qué encontró el founder

Probó en su iPhone el camino con cartel (OL-302) y descubrió que la lectura y el cartel iban pegados: sin llave de IA el recuadro «Sube el cartel» ni aparece; sin cupo el recuadro se vuelve «Se acabaron tus lecturas del mes · Pedir más lecturas»; y en los dos casos la única salida es «No tengo cartel», falso cuando sí lo tiene. Pidió «algo similar a la creación del cartel, que active lectura cuando esté disponible», con prototipo, y que lo analizara y cuestionara.

## Las vueltas (seis, la misma mañana)

1. Primera propuesta: el recuadro siempre, y su segunda línea explicando si se lee o no («Hoy lo llenas tú: se acabaron tus lecturas», «Pedir más lecturas» debajo, contador «te quedan 2» para cuentas de pago, variante «Subir sin leer»). **Rechazada:** «el flujo natural es subir cartel sin importar si tengo créditos o no, y es un valor agregado que el sistema lo lea; aquí se ve como si el sistema tuviera la obligación de leerlo y me queda mal».
2. Segunda: la primera pantalla idéntica siempre («Sube el cartel · Será la imagen del evento»), la lectura como extra silencioso; cupo y «Pedir más» fuera del flujo. El founder dudó: «tal vez sí sea prudente agregar un límite y decirlo con el contador, pero sí eliminar el pedir más, que se entienda como el paquete freemium».
3. Decisión del founder: **no decir «gratis»; «lectura automática»; la persona decide qué cartel se lee y cuál no; 6 lecturas al mes por cuenta.** → casilla «Lectura automática» marcada de entrada, con el contador dentro; agotada, apagada con «Se renueva el 1 de nov»; sin servicio, no aparece; sin «Pedir más lecturas».
4. Texto de la casilla: sin enumerar qué se lee («nombre, fecha, lugar y precio»; faltaban artistas) para no prometer nada que el cartel no traiga o la lectura no logre; «Será la **portada** del evento».
5. **Región común y conectividad uniforme:** un solo marco punteado reúne el recuadro y, pegada debajo como su última fila, la casilla; «No tengo cartel» fuera del marco, con aire, como opción que avanza (texto a la izquierda, ángulo a la derecha).
6. La casilla vuelve al canon tras dos intentos míos de ponerla en una línea («me estás siguiendo literal»): nombre arriba (17 px, negrita) y contador debajo (14 px), los dos a la izquierda.

**Firmado por el founder:** «listo, ahora sí, lo firmo».

## Lo firmado, para construir (OL-307)

- Primera pantalla, igual en todos los casos: marco punteado con el recuadro «Sube el cartel · Será la portada del evento» y, como su última fila, la casilla **«Lectura automática» / «Quedan N este mes»** (marcada de entrada; apagada con «Se renueva el 1 de <mes>» cuando N = 0; ausente sin servicio de lectura). Fuera del marco, con aire, **«No tengo cartel ›»**.
- El cartel se sube siempre. Se lee solo si la casilla está marcada y quedan lecturas. Sin lectura (desmarcada, agotada o sin servicio) o si la lectura falla, se sigue directo a «¿Cómo se llama?» con una fila chica arriba —miniatura y sello «Cartel guardado» («· no pude leerlo» si falló)— solo en esa primera pregunta.
- **6 lecturas al mes** por cuenta; una lectura fallida **no se descuenta**; sin «Pedir más lecturas» (subir el tope a una cuenta queda en la administración). Nunca la palabra «gratis».
- «Revisa»: la miniatura siempre que haya cartel; el sello verde «Leído del cartel» solo cuando de él salieron datos.
- El contador también en el perfil («Lectura automática de carteles · Quedan N este mes»).

## Datos

Producción, 2026-10-06 (solo lectura): 48 lecturas desde el 19 de septiembre, 9 personas; 40 son del founder y las otras 8 personas hicieron 1 cada una. Con 6 al mes, hoy nadie salvo el founder se acercaría al límite. La llave de la IA está solo en Production en Vercel: en las vistas previas no hay lectura, lo que servirá para probar el caso «sin servicio».
