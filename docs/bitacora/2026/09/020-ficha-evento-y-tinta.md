# 020 · Ficha de evento nueva y tinta como color primario (2026-09-14)

Rama `ficha-evento-y-tinta`. Implementa la ficha firmada por el founder ([04-ficha-evento-flujo-y-estados.md](../../../rediseno/04-ficha-evento-flujo-y-estados.md), prototipo v1.4) y el cambio de color primario en toda la app. El founder pidió, además, maquetación simple sin sobreanidación.

## Color primario: tinta

- Tokens nuevos en `globals.css`: `--primario` (el negro del texto), `--primario-texto`, `--primario-suave` (fondo del estado seleccionado). `--acento` queda como alias obsoleto de `--primario` para que ningún módulo se rompa; el rojo (`--error`) es solo para errores y borrar; el verde (`--ok`) solo para confirmaciones.
- Los enlaces pasan a color de texto subrayado. Los 16 módulos que usaban `--acento` usan `--primario`. El pin del mapa pasa a tinta. En la ficha no queda ningún elemento rojo (medido: 0).

## Ficha de evento

- **Barra interior** con regreso, logotipo al centro y el menú "···" a la derecha (`MenuFicha`: reportar; para el autor, editar, duplicar, borrar; para el admin, ocultar). `Barra` admite `derecha` también en modo interior.
- **Cartel** (`Cartel`): banda de 220 px a ancho completo en cover con lupa; un toque lo abre entero a pantalla completa.
- **Título y renglones con icono** (reloj, pin, personas, boleto), mismos iconos que la agenda. La fecha larga ya no lleva coma y trae el fin: "domingo 22 de agosto de 2027 · 20:00 a 23:00" (`formatearLargo` con fin; `fraseCuando` lo reutiliza; pruebas actualizadas). El sitio reservado va en un renglón con candado y una línea.
- **Acciones secundarias** como tres botones de icono con etiqueta: Compartir, Calendario, Cómo llegar (deshabilitado mientras la dirección reservada no se revela).
- **Descripción** en cuatro líneas y "más" (`Desplegable`); "Más información" como renglón discreto.
- **Quién va** compacto (`QuienVa`): avatares apilados y "Van 12: Ana, Luis y 10 más", despliegue en el sitio; la persona con sesión va al frente de la lista.
- **Barra inferior pegajosa** (`Asistencia`): "Me interesa" en texto y "Voy" lleno; con decisión pasa a estado: "✓ Voy · Ya estás en la lista" + Cancelar, o "✓ Me interesa · Guardado en Mi perfil" + Voy. Sin sesión, los botones llevan a entrar y la decisión se aplica al volver.
- **Hoja de avisos** (`ui/Hoja`, reutilizable): tras el primer Voy emerge desde abajo con la pregunta por canal; se cierra sola al terminar.
- **Recién publicado**: el aviso trae el botón Compartir dentro.
- **Mi perfil**: lista "Me interesa" además de "Voy a" (decisión 15).
- **Maquetación plana**: `main` tiene como hijos directos barra, cartel, título, lista de datos, acciones, descripción, quién va, autor y la barra inferior; cada renglón de dato es un grid con áreas (icono, principal, secundario, acción) sin envoltorios.

## Verificación (390×844, servidor local, base real, usuario desechable borrado)

- Sin sesión: cartel, título, cuatro renglones, tres acciones, descripción, quién va, barra con Me interesa y Voy. Cero elementos rojos. Hijos directos de `main`: 9.
- Con sesión: Voy → estado "✓ Voy · Ya estás en la lista" y la hoja de avisos; "Por correo" guarda el consentimiento; menú "···" con Reportar.
- Lint, typecheck, 59 pruebas y build en verde.
