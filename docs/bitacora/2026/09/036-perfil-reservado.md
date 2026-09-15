# 036 · Perfil reservado

**Fecha:** 2026-09-15 · **Rama:** `perfil-reservado` → [PR #36](https://github.com/robscan/somosnosotros/pull/36), fusionado y en producción el mismo día · **Pieza:** OL-018 (8)

## Qué pidió el founder
"Permitir a los usuarios decidir si restringir su perfil." Aceptó la propuesta: un solo interruptor con dos estados, aplicado en la base y no solo en pantalla.

## Qué se hizo
- **Base** (`20260915130000_perfil_reservado.sql`, aplicada a producción): columna `perfiles.reservado` (default false). Las políticas de lectura de `asistencias` y `seguimientos` dejan ver las filas de un perfil reservado solo a esa persona y al administrador. Los conteos siguen contando a todos: `van_por_evento` pasa a `security definer` y nace `cuenta_seguidores(p_lugar, p_artista)`.
- **Mi perfil**: renglón "Perfil · Público / Reservado" bajo Avisos (`perfil/ReservaPerfil`, mismo dibujo y hoja que los avisos) con Cambiar → hoja con un interruptor que se guarda al tocar (`perfil/acciones · elegirReserva`). Texto: "Tu ficha muestra solo nombre, foto y colonia. En “quién va” cuentas en el número, sin nombre ni foto. Sigues recibiendo avisos."
- **Ficha ajena reservada**: cabecera (foto, nombre, colonia, sobre mí, Compartir) y la línea "Perfil reservado: solo se ve el nombre"; sin "Va a" ni "Sigue".
- **Quién va**: el total sale de `van_por_evento` (también los reservados); los nombres, de lo que la política deja ver. `resumenAsistentes(asistentes, máximo, total)`: "Van 3: Ana y 2 más", "Van 2", "Va 1 persona" (con pruebas). Al desplegar, "Y N personas con perfil reservado." El aviso de borrar evento usa el total.
- **Seguidores** de lugar y artista contados con `cuenta_seguidores` (antes `count` sobre la tabla, que ahora se quedaría corto).

## Verificación
Lint, typecheck, 130 pruebas y build en verde. Mirado a 390×844 con un usuario desechable (borrado al terminar): renglón "Perfil · Público" bajo Avisos; hoja con el interruptor; al activarlo el renglón dice "Perfil · Reservado · Solo tú ves a qué vas y qué sigues" y la propia persona sigue viendo su "Voy a" y su "Sigo". Sin sesión (curl al servidor local): la ficha solo dice "Perfil reservado: solo se ve el nombre"; el evento al que va dice "Va 1 persona" sin nombre; el lugar que sigue dice "1 persona lo sigue".

## Pendiente
- Firma del founder en el iPhone.
