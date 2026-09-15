# 038 · Ajustes aparte y Mi perfil con resumen en números

**Fecha:** 2026-09-15 · **Rama:** `ajustes-y-perfil` → [PR #39](https://github.com/robscan/somosnosotros/pull/39), fusionado y en producción el mismo día · **Pieza:** OL-019, PR B (diseño firmado en [13](../../rediseno/13-novedades-perfil-alta-flujo-y-estados.md), decisiones 5 a 7)

## Qué pidió el founder
Separar la configuración del perfil de su actividad, porque la ficha se comparte y va a tener tráfico; en los perfiles, un resumen con números (Va a · Sigue · Van a lo mismo) que haga de pestañas; Compartir arriba a la derecha junto al nombre; Ajustes donde estaba Editar y Editar dentro de Ajustes; Ajustes con grupos separados (región común, proximidad, conectividad uniforme); iconos en vez de letreros.

## Qué se hizo
- **`/ajustes`** (`app/ajustes/page.tsx`, `ajustes.module.css`): cuatro grupos en tarjetas con rótulo en mayúsculas chicas y aire entre ellos: **Tu ficha** (Editar → hoja ya firmada; Perfil · Público/Reservado → hoja), **Avisos** (Por correo y En el teléfono con el interruptor en la fila, guardan al tocar; la hoja de instalar en iPhone sin instalar), **Cuenta** (Entras con ro…@; Cerrar sesión), **Somos Nosotros** (Invita a tus amigos; Administración solo admin; Aviso de privacidad; Reglas de uso). "Borrar mi cuenta" suelto al final, en rojo, con la confirmación de dos pasos. Todas las filas con el mismo dibujo (icono | etiqueta / detalle | acción); la fila entera se toca (botón, enlace o formulario según lo que hace).
- **Mi perfil** = la ficha que ven los demás: Compartir arriba a la derecha junto al nombre; el engrane de Ajustes bajo la colonia; el aviso "Falta tu colonia…" con Completar (lleva a Ajustes con la hoja Editar abierta). Sin menú ···, sin renglones de configuración. Al pie, "Así te ven los demás".
- **Resumen en números como pestañas** (`components/PestanasPersona`, cliente): "3 Voy a", "2 Sigo" y, en la ficha ajena con sesión, "1 Van a lo mismo" (eventos a los que vamos los dos; lo calcula la página); "Me interesa" solo en la mía y si hay. Tocar un número muestra su lista; un solo control para leer y para navegar. Las listas llegan pintadas desde el servidor.
- Los componentes de perfil (`EditarPerfil`, `ReservaPerfil`, `AvisosPerfil`) pasan a ser filas de Ajustes; `?editar=1` vive en `/ajustes`; Novedades enlaza a `/ajustes` para activar el teléfono; borrar cuenta con error vuelve a `/ajustes`.
- Iconos nuevos: persona, engrane, lápiz, ojo, salir, escudo, libro, chevron derecha, correo.

## Verificación
Lint, typecheck, 134 pruebas y build en verde. Mirado a 390×844 con un usuario desechable (borrado al terminar): Mi perfil con Compartir junto al nombre, engrane bajo la colonia y "3 Voy a · 2 Sigo"; Ajustes con los cuatro grupos y los interruptores; la ficha del founder vista por el usuario de prueba con "2 Va a · 6 Sigue · 1 Van a lo mismo". Maquetación: cabecera en grid con areas (foto, nombre, compartir, colonia, ajustes), filas de Ajustes como hijos directos de la tarjeta.

## Pendiente
- PR C: alta de lugar con el canon (cierra el PR 3 de OL-010).
- Firma del founder en el iPhone.
