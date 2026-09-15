# 035 · Compartir el perfil y el sitio

**Fecha:** 2026-09-15 · **Rama:** `compartir-perfil-y-sitio` → [PR #35](https://github.com/robscan/somosnosotros/pull/35), fusionado y en producción el mismo día · **Pieza:** OL-018 (7)

## Qué pidió el founder
"Necesitamos una acción de compartir para perfil y otra para el sitio completo." Aceptó la recomendación: compartir el perfil junto a Editar (y como única acción en la ficha ajena), y la invitación al sitio donde la persona ya recibió valor, no en la barra ni en la nav.

## Qué se hizo
- **Compartir el perfil** (`components/FichaPersona`): botón "Compartir" con la hoja nativa del teléfono (`BotonCompartir`, el mismo de eventos, lugares y artistas), junto a Editar en Mi perfil y solo en la ficha ajena. Texto (`lib/perfil · textoCompartirPersona`, con prueba): "Voy a 2 eventos próximos en San Luis Potosí. Mira cuáles:" en la mía; "Rosa va a 2 eventos próximos…" en la ajena; sin eventos, "está en Somos Nosotros, la agenda cultural de San Luis Potosí". Comparte el enlace público `/personas/<id>`.
- **Vista previa de la ficha de persona** (`personas/[id] · generateMetadata`): nombre, foto y "Va a N eventos próximos · San Luis Potosí" (Open Graph y Twitter), para que el enlace pegado en WhatsApp se vea.
- **Invitar al sitio**: renglón discreto al pie de Mi perfil, "Invita a tus amigos a Somos Nosotros · Se comparte el enlace del sitio", con el texto fijo `TEXTO_INVITAR` ("Agenda cultural y directorio de lugares de San Luis Potosí. Gratis, sin cuenta para mirar:") y la raíz.
- **Vista previa del sitio** (`layout.tsx`): `metadataBase`, Open Graph y Twitter con `public/portada.png` (1200×630): el logotipo con manos y pies sobre hueso y "Agenda cultural y lugares de San Luis Potosí" en Bricolage. Se genera con Chrome sin ventana a partir de `docs/diseno/logotipo/portada.html` (el venv de skia del logotipo no está en esta máquina).

## Verificación
Lint, typecheck, 129 pruebas y build en verde. Mirado a 390×844 con un usuario desechable (borrado al terminar): Mi perfil con "Editar · Compartir" bajo el nombre y el renglón "Invita a tus amigos a Somos Nosotros" al pie, antes de "Así te ven los demás"; la ficha ajena con solo "Compartir". La imagen de portada mirada a tamaño real.

## Pendiente
- Firma del founder en el iPhone: la hoja nativa al tocar Compartir e Invitar, y cómo se ve el enlace pegado en WhatsApp (la vista previa del sitio la lee WhatsApp la primera vez; si cambia, tarda en refrescar).
