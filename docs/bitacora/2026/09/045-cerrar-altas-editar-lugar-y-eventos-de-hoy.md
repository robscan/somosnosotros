# 045 · Cerrar en las altas, sugerencias al editar un lugar y los eventos de hoy

**Fecha:** 2026-09-16 (mañana) · **Base:** tres observaciones del founder tras firmar OL-022 · **PR:** por abrir.

## Lo que pidió el founder
1. Al editar un lugar aparece la lista de lugares sugeridos debajo del nombre. No tiene sentido.
2. En el alta de evento, quitar Atrás y poner una ✕ de cerrar en el extremo derecho de la barra; la misma ✕ en todos los formularios de alta. Pidió opinión.
3. Los eventos del día se quedan a la vista hasta que termine el día o termine el evento: "estás ocultando los eventos de hoy y son las 10 am".

## Qué se hizo
- **Sin sugerencias al editar** (`lugares/FormularioLugar`). La búsqueda por nombre (Mapbox y lugares ya registrados) corría también al abrir la edición, porque el nombre ya venía lleno. Ahora solo corre en el alta: al editar, el lugar ya está ubicado y con nombre; cambiar dónde está sigue siendo Cambiar en el renglón Dónde.
- **Cerrar en las altas** (`ui/Cerrar`, `ui/Barra` con `cerrar`, `ui/Atras` comparte la lógica en `useVolver`). Publicar un evento, Registrar un lugar y Registrar artista ya no tienen Atrás: la barra lleva SMSNSTRS al centro y una ✕ redonda a la derecha. La ✕ vuelve igual que Atrás (a la pantalla anterior de verdad o a la pantalla madre) y respeta la guardia de salida: con algo escrito en el alta de evento abre "¿Salir sin publicar?". Editar (evento, lugar, artista, perfil) conserva Atrás: ahí no se empieza una tarea, se corrige algo que ya existe.
- **Los eventos de hoy se quedan todo el día** (`lib/fechas`: `eventoPaso`, `filtroSinPasar`, `tramo`, `inicioDelDia`). Regla nueva: un evento pasó cuando terminó (si tiene hora de fin) o cuando acabó su día en la hora de la ciudad (si no la tiene). Antes, sin hora de fin, se ocultaba 3 h después de empezar. Vale para la agenda, Lugares, la ficha de lugar y de artista, Personas, Novedades, la ficha del evento, compartir y el archivo de calendario, porque todos usan las mismas dos funciones.
- **Hallazgo:** hoy 16 de septiembre no hay ningún evento en la base (tampoco el 15): es fiesta y las instituciones no programaron nada. Lo que el founder vio a las 10:00 era un día sin eventos, no eventos ocultos. La regla nueva se hizo de todos modos porque era mejor que la de 3 h (una feria de 10:00 a 20:00 sin hora de fin desaparecía a las 13:00).

## Evidencia
- lint, typecheck y 145 pruebas en verde (las de `eventoPaso`, `filtroSinPasar` y `tramo` reescritas con la regla nueva).
- Navegador integrado a 390×844 con usuario desechable: ✕ en Publicar un evento, Registrar un lugar y Registrar artista; con un nombre escrito, la ✕ abre "¿Salir sin publicar?" y Salir y borrar vuelve a la agenda. Editar un lugar (uno de prueba, registrado y borrado en la misma sesión) abre sin la lista de sugerencias.

## Queda
- Firma del founder en el iPhone.
- Visto al pasar, sin tocar: en la hoja "Dónde está", buscar "Plaza de Armas" trae calles de Querétaro, Zacatecas y Saltillo antes que la de San Luis; la búsqueda de dirección no está acotada a la ciudad.
