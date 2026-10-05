# 312 · Aviso de cambio de ciudad

App Next compilada sobre `3519a899`, con el código final de OL-284.
Respaldo inventado: una o tres asistencias globales, León con un evento futuro
y un lugar. Auth, ubicación, mapa y servicios simulados; no se escribe en
producción. Chrome local a 320/390×844, no prueba física de Safari/iPhone.

Cada PNG final se miró entero después de generar el último build. Se ve:

- Inicio conserva los mismos planes, su orden y su encabezado al pasar de San
  Luis Potosí a León. Con uno, la tarjeta grande ocupa buena parte de la pantalla;
  con tres, el carril permite ver más pronto el contenido local.
- «Más adelante» reemplaza el contenido local de San Luis Potosí. El chip dice
  León y abajo aparece «Ciudad cambiada a León», completo y sin botón.
- Lugares muestra el mismo aviso con su hoja, un lugar y la navegación existente.
  El mapa es un estilo vacío de prueba, con su atribución; no es un mapa geográfico
  real. La captura final ya no muestra el indicador transitorio de carga.
- El aviso usa el `Hecho` existente: x20/y720, 52px de alto, ancho350 a390 y280
  a320, sobre la navegación. No se añadió CSS ni un control.

Después de observar los PNG se midió el fondo del aviso. Valores y contratos
del recorrido en [qa.json](qa.json).

| Estado | 390 | 320 |
|---|---|---|
| Un plan, San Luis Potosí | [PNG](312-1-planes-slp-390.png) | [PNG](312-1-planes-slp-320.png) |
| Un plan, León + aviso | [PNG](312-1-planes-leon-390.png) | [PNG](312-1-planes-leon-320.png) |
| Tres planes, San Luis Potosí | [PNG](312-3-planes-slp-390.png) | [PNG](312-3-planes-slp-320.png) |
| Tres planes, León + aviso | [PNG](312-3-planes-leon-390.png) | [PNG](312-3-planes-leon-320.png) |
| Lugares, León + aviso | [PNG](312-lugares-leon-390.png) | [PNG](312-lugares-leon-320.png) |

En la app compilada se comprobaron aviso único, ausencia de botón, identidad
del texto de Tus planes antes/después, caducidad canónica, recarga sin aviso y
Atrás en Lugares sin conservar el aviso de León. Cero errores JavaScript.
El script de esta ejecución y los logs quedan en `/tmp/sn-cambio-ciudad/`;
las regresiones duraderas viven en `Ciudad.componentes.test.mjs`.
