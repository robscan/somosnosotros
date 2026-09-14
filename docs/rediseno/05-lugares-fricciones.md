# Lugares · lista de fricciones (v1, para corrección del founder)

**Fecha:** 2026-09-14 · **Pantallas:** `/lugares` (lista y mapa) y `/lugares/[id]` (ficha de lugar) · **Mirada:** capturas 390×844 sin sesión; medidas del DOM · **Carta:** [PRINCIPIOS_UX.md](../PRINCIPIOS_UX.md) · **Base:** lo ya firmado en el inicio ([02](02-inicio-flujo-y-estados.md)) y en la ficha de evento ([04](04-ficha-evento-flujo-y-estados.md)): renglones con icono, acciones secundarias como botones de icono, barra inferior pegajosa con la acción primaria, menú "···", tinta como primario · **Quién decide:** el founder corrige, tacha y firma.

## Diagnóstico

Lugares quedó con las piezas viejas: la lista usa tarjetas grises con una inicial inventada y una dirección larga recortada; el mapa navega de golpe al tocar un pin; la ficha de lugar no dice la dirección, tiene "Seguir" suelto a media pantalla, "Publicar un evento aquí" compitiendo en el encabezado y los eventos en tarjetas de otro estilo. Propuesta de fondo: aplicar el mismo lenguaje ya firmado (renglones con icono, botones de icono, barra pegajosa, menú ···), que el mapa muestre antes de llevar, y que la lista y la ficha digan si el lugar tiene vida (próximo evento).

## Resumen por severidad

| # | Pantalla | Fricción | Ley | Severidad | Propuesta en una línea |
|---|---|---|---|---|---|
| F1 | Lista | Tarjetas grises con inicial inventada, dirección con código postal y ciudad recortada | Evidencia · Similitud | Alta | Mismo renglón que la agenda: foto o cuadro discreto, nombre, tipo · calle, y "Próximo: hoy 19:30" o "Sin eventos próximos" |
| F2 | Mapa | Tocar un pin navega de golpe | El gesto gana · Progressive disclosure | Alta | Tarjeta flotante con nombre, tipo y próximo evento; "Ver" o segundo toque navega |
| F3 | Mapa | Los pins no dicen cuáles tienen eventos | Evidencia | Media | Pin lleno con eventos próximos, pin hueco sin ellos; la tarjeta lo confirma |
| F4 | Lista y mapa | Sin "cerca de mí" ni orden con sentido | Hick · Evidencia | Media | Chip "Cerca de mí" que pide la ubicación con un botón (como en Agenda) y ordena; por defecto, con eventos primero y luego alfabético |
| F5 | Ficha | No dice la dirección; tipo y datos sueltos | Evidencia · Similitud | Alta | Renglones con icono: pin (dirección) · personas (N lo siguen) · calendario (próximo evento); tipo como etiqueta bajo el título |
| F6 | Ficha | "Seguir" como botón suelto a media pantalla | Von Restorff · Fitts | Alta | Barra inferior pegajosa con Seguir como acción primaria; con decisión, estado "✓ Sigues" + "Dejar de seguir" |
| F7 | Ficha | Cómo llegar y redes sin sitio claro | Hick · Fitts | Media | Fila de botones de icono: Cómo llegar · Compartir · Instagram/Facebook/WhatsApp/Sitio (los que existan) |
| F8 | Ficha | "Publicar un evento aquí" compite en el encabezado de Eventos | Serial position · Hick | Media | Botón secundario al final de la lista de eventos; el encabezado dice "Próximos eventos · 2" |
| F9 | Ficha | Eventos en tarjetas de otro estilo | Similitud | Media | Mismos renglones de la agenda, agrupados por día |
| F10 | Ficha | Portada ausente o a ancho completo alto | Serial position | Baja | Banda de 220 px en cover, como el cartel; sin portada, nada |
| F11 | Ficha | Reportar, Editar, Borrar como enlaces al pie | Progressive disclosure | Media | Menú "···" en la barra, igual que en la ficha de evento |
| F12 | Ficha | Seguir sin decir qué pasa después | Evidencia, nunca promesa | Media | Al seguir: "Te avisamos por correo de sus eventos nuevos" si ya hay consentimiento; si no, la misma hoja de avisos que tras un Voy |

## Detalle por fricción

### F1 · Renglón de lugar como el de la agenda
**Qué se ve.** Tarjeta gris, cuadrado con "C" o "L", nombre en negrita, "Colectivo · C. 5 de Mayo 1100, 78339 San Lui…".
**Propuesta.** Foto de portada a la izquierda (64 px); sin foto, el cuadro vacío discreto de la agenda. Nombre (19 px, 700). Debajo, con icono: pin y la calle sin código postal ni ciudad (siempre es la misma ciudad); calendario y "Próximo: hoy 19:30" o "Sin eventos próximos" en gris. Separación por línea fina, sin fondo gris. *Evidencia (no se inventa una inicial; se dice si hay vida), Similitud (misma forma que la agenda).*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F2 · El mapa muestra antes de llevar
**Qué se ve.** Tocar un pin abre la ficha del lugar de inmediato.
**Propuesta.** Tocar un pin abre una tarjeta flotante sobre el mapa (abajo, encima de la nav): foto, nombre, tipo, próximo evento y "Ver". Un toque fuera la cierra; "Ver" o tocar la tarjeta navega. *El gesto gana (un toque de exploración no te saca de la pantalla), Progressive disclosure.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F3 · Pins que dicen algo
**Propuesta.** Pin lleno en tinta para lugares con eventos próximos; pin hueco (borde) para los que no tienen. En la tarjeta flotante, el próximo evento lo confirma. *Evidencia.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F4 · Cerca de mí y orden
**Propuesta.** Un chip "Cerca de mí" en la cabecera pegajosa de Lugares (junto a Lista · Mapa) que pide la ubicación con un botón y con motivo, como en Agenda; con ella, la lista se ordena por distancia y muestra "a 600 m", y el mapa centra en la persona. Sin ella, orden: primero los lugares con eventos próximos, luego el resto en alfabético. La búsqueda por nombre sigue apareciendo a partir de 8 lugares. *Hick, Evidencia (la ubicación se pide con un botón y no se guarda).*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F5 · Renglones con icono en la ficha
**Qué se ve.** "Casa 1100", "Casa de cultura", dos botones, Eventos. No aparece la dirección.
**Propuesta.** Título (26 px). Etiqueta del tipo debajo, en gris. Renglones con icono: pin (dirección completa, con "Cómo llegar" como icono al final o en la fila de acciones), personas ("12 personas lo siguen"), calendario ("Próximo: hoy 19:30" o "Sin eventos próximos"). Descripción en cuatro líneas y "más", si la hay. *Evidencia, Similitud con la ficha de evento.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F6 · Seguir como acción primaria pegada abajo
**Propuesta.** Barra inferior pegajosa: "Seguir" lleno en tinta a lo ancho. Con decisión, estado seleccionado "✓ Sigues · Te avisamos de sus eventos" y "Dejar de seguir" como botón secundario. Sin sesión, lleva a entrar y se aplica al volver (ya funciona así). *Von Restorff, Fitts, Similitud con Voy.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F7 · Acciones secundarias como botones de icono
**Propuesta.** Fila de botones iguales (icono y etiqueta): Cómo llegar · Compartir · y las redes que el lugar tenga (Instagram, Facebook, WhatsApp, Sitio). Si son más de tres, la fila se desplaza a lo ancho. *Fitts, Hick, patrón firmado en la ficha de evento.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F8 · Publicar aquí, al final
**Propuesta.** El encabezado de la lista dice "Próximos eventos · 2". Al final de la lista, un botón secundario "Publicar un evento aquí" (lleva al alta con el lugar ya elegido). Sin eventos: "Aún no hay eventos aquí. ¿Organizas algo? Publícalo." con el mismo botón. *Serial position, Hick.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F9 · Eventos del lugar como en la agenda
**Propuesta.** Los mismos renglones (foto, título, hora, asistentes, costo), agrupados por día con títulos pegajosos, sin fondo gris. *Similitud.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F10 · Portada en banda
**Propuesta.** Con portada, banda de 220 px en cover con lupa, como el cartel. Sin portada, nada (el título sube). *Serial position, Evidencia.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F11 · Menú ···
**Propuesta.** Reportar; para el autor, Editar y Borrar; para el admin, Ocultar. "Publicado por X" queda al pie. *Progressive disclosure.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### F12 · Seguir dice qué pasa
**Propuesta.** Al seguir, si ya hay consentimiento de correo o teléfono, el estado lo dice ("Te avisamos por correo de sus eventos nuevos"). Si aún no se ha preguntado, emerge la misma hoja de avisos que tras un Voy ("¿Te avisamos de sus eventos?" Por correo · En el teléfono · No, gracias). Seguir reutiliza el consentimiento; no lo pide dos veces. *Evidencia, nunca promesa; Progressive disclosure.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

## Niveles de atención

| Nivel | Lugares (lista y mapa) | Ficha de lugar |
|---|---|---|
| 1 · Lo que importa | Nombre, tipo, calle, próximo evento | Portada, nombre, tipo, dirección, próximo evento |
| 2 · Lo accionable | Tocar un renglón o un pin; Publicar (flotante) | Seguir (barra pegajosa) |
| 3 · Prueba social | Pins llenos con eventos | Cuántas personas lo siguen; próximos eventos |
| 4 · Lo demás | Cerca de mí (chip), buscar (por umbral), tarjeta del pin | Acciones de icono, descripción plegada, menú ··· |

## Qué sigue

1. Tú corriges la lista y firmas.
2. Flujo, estados y decisiones numeradas; prototipo navegable con las dos pantallas.
3. PR con captura y tu firma en el iPhone.
