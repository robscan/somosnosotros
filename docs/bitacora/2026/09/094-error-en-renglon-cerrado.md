# 094 · El error que no se veía: un aviso dentro de un renglón cerrado

**Fecha:** 2026-09-17 · **Rama:** `error-en-renglon-cerrado` · **OL:** OL-063 · **PR:** pendiente

## De dónde sale

Salió de paso al arreglar la cámara del cartel (bitácora [093](093-toques-en-el-alta-de-evento.md), PR #93). Al publicar, la validación rechazaba el evento y pintaba el aviso rojo **dentro del renglón "Más", que estaba cerrado**: se toca "Publicar evento" y no pasa nada. Nadie ve por qué.

## Dónde estaba

En los tres formularios del canon, no solo en el de evento. El cuerpo de "Más" se esconde (`hidden={!masAbierto}`) con los avisos dentro:

| Formulario | Avisos que quedaban escondidos |
|---|---|
| `FormularioEvento.tsx` | descripción, **enlace**, imagen (y el error de subida de la imagen) |
| `FormularioLugar.tsx` | descripción, **enlaces (redes)**, portada (y el error de subida de la portada) |
| `FormularioArtista.tsx` | descripción, **enlaces (redes)** |

Los renglones "Cuándo" y "Cuánto" ya lo tenían resuelto: cuando están cerrados pintan el aviso en el renglón (`cuerpoNota`). "Más" no.

## ¿Pasaba en producción? Sí, pero no por la imagen

**Por la imagen, no.** `eventos.ts:151` exige que la imagen sea `https`, y en producción siempre lo es: lo que sube al bucket devuelve una dirección `https` de Storage, y el campo donde el administrador pega una dirección (`CampoImagenUrl`) ya rechaza lo que no empiece por `https://` antes de guardarlo. En los datos importados (CAPO, instituciones) las direcciones `http://` que hay son de sitios web, que van en enlaces, no en la imagen. Ese aviso lo topé solo porque mi respaldo local sirve por `http`.

**Por el enlace, sí.** El campo "Enlace" del evento no tiene tope de longitud en la pantalla, pero el servidor rechaza más de 500 caracteres («Demasiado largo.»). Cualquiera que pegue una dirección larga de boletos —con sus parámetros de campaña— se queda tocando "Publicar evento" sin respuesta. Es el caso que se reprodujo y con el que se verificó el arreglo. Lo mismo vale para las redes mal escritas en el alta de lugar.

## El arreglo

`src/components/ui/abrirConError.ts`, un solo sitio con la regla, usado por los tres formularios:

1. **El renglón se abre solo** cuando llega un error de los campos que viven en su cuerpo. Solo al aparecer el error, no mientras dure: la persona puede volver a cerrarlo.
2. **El aviso se pone a la vista.** Abrir no bastaba: el cuerpo de "Más" es alto (descripción, enlace, la imagen puesta) y el aviso quedaba fuera de la pantalla. Se acerca al centro el primer aviso del formulario, que es el que toca arreglar. Si ya se veía entero, nada se mueve.

## La prueba

`src/lib/renglones.test.ts`: lee el JSX de todas las pantallas y exige que todo cuerpo que se esconde (`hidden={!algo}`) y pinta avisos —propios (`role="alert"`) o de un campo del canon (`error={…}`)— se abra solo con `useAbrirConError`. Falla con el código anterior, señalando los tres formularios:

```
app/artistas/FormularioArtista.tsx: el cuerpo de "masAbierto" esconde avisos y no usa useAbrirConError
app/eventos/FormularioEvento.tsx: el cuerpo de "masAbierto" esconde avisos y no usa useAbrirConError
app/lugares/FormularioLugar.tsx: el cuerpo de "masAbierto" esconde avisos y no usa useAbrirConError
```

Pura lógica en Node, sin infraestructura de React en el repo.

## Verificado

- `npm run lint` (solo el aviso viejo de `docs/diseno/logotipo/iconos-sn.mjs`), `npm run typecheck`, **340 pruebas en 37 archivos**, `npm run build` en verde.
- Simulador FLOWYA iPhone SE (iOS 26.3), con el dedo, contra el respaldo local: evento con nombre, lugar y un enlace de 523 caracteres escondido en "Más" cerrado. Antes: se toca "Publicar evento" y no pasa nada. Ahora: "Más" se abre solo, la pantalla se mueve al aviso y el campo queda en rojo con «Demasiado largo.» debajo.
- Captura a 390×844 del estado.

## Lo que queda

Los campos que el servidor acota pero la pantalla no (el enlace del evento, 500 caracteres) siguen dejando escribir de más para avisar después. Ponerles el mismo tope que el servidor sería mejor que avisar al final, pero eso es otra pieza.
