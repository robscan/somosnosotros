# Invitación por correo · artistas del CAPO

Plantilla para invitar a los artistas y grupos que llegaron del Catálogo de Artistas Potosinos (CAPO)
a reclamar su ficha con "Soy yo / es mi grupo". Un solo llamado, sin jerga, español de tú.
Se llena con el nombre del artista y la liga a su ficha (`https://somosnosotros.org/artistas/<id>`).

Por confirmar con el founder antes de mandar nada: el texto y cuál de las dos variantes de asunto.

## Asunto (dos variantes, a elegir)

- A: `{{nombre}}, tu ficha ya está en Somos Nosotros`
- B: `¿Eres {{nombre}}? Tu ficha te espera en Somos Nosotros`

## Cuerpo (texto llano)

```
Hola,

Tomamos tu ficha del Catálogo de Artistas Potosinos (el catálogo de la Dirección de Cultura Municipal)
para armar el directorio de Somos Nosotros, donde la gente de San Luis Potosí encuentra centros
culturales y eventos.

Tu ficha está aquí: {{url}}

Ábrela y toca "Soy yo / es mi grupo" para hacerla tuya: le pones foto, la editas y publicas tus
próximas fechas.

Si prefieres que no aparezcas, ábrela y toca "Soy yo / es mi grupo" también: ahí puedes pedir que
se quite.

Somos Nosotros
```

## Notas para quien la mande

- Un correo, una acción: no hay más botones ni enlaces que la ficha.
- No se manda dos veces a la misma persona (lo controla `scripts/capo/invitar.ts` con la tabla
  `invitaciones_enviadas`).
- Si Resend marca un rebote o una queja, esa persona no se vuelve a intentar (el webhook de
  `src/app/api/resend/route.ts` ya apaga sus avisos; aquí basta con no reintentar sobre un envío que
  falló).
