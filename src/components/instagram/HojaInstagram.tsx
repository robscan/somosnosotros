"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import CampoLargo from "@/components/ui/CampoLargo";
import Casilla from "@/components/ui/Casilla";
import { Chip, Chips } from "@/components/ui/Chip";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import { IconoCerrar, IconoChevronDerecha, IconoChevronIzquierda, IconoFacebook, IconoInstagram, IconoPin } from "@/components/ui/Iconos";
import admin from "@/app/admin/admin.module.css";
import { prepararInstagram, publicarEnFacebook, publicarEnInstagram, type Espejo, type Preparado, type Publicado } from "@/app/admin/instagram/acciones";
import { elegirImagenes, PORTADA, resumenCarrusel, textoImagenes } from "@/lib/instagram/carrusel";
import { ESTADO_FACEBOOK, FRASES_FACEBOOK } from "@/lib/instagram/frases";
import { armarTexto, CUENTA_INSTAGRAM, etiquetasDeLaFoto, etiquetasQueNoCaben, TOPE_CARACTERES, TOPE_ETIQUETAS_FOTO } from "@/lib/instagram/texto";
import styles from "./HojaInstagram.module.css";

type Formato = "4x5" | "9x16";

/** La última elección de «También en Facebook», en la sesión del navegador (OL-461). Sin almacenamiento, marcada. */
const RECUERDO_FACEBOOK = "sn:instagram:facebook";
function leerConFacebook(): boolean {
  try {
    return window.sessionStorage.getItem(RECUERDO_FACEBOOK) !== "0";
  } catch {
    return true;
  }
}
function guardarConFacebook(si: boolean) {
  try {
    window.sessionStorage.setItem(RECUERDO_FACEBOOK, si ? "1" : "0");
  } catch {
    // sin almacenamiento: vale solo mientras la hoja está abierta
  }
}

/**
 * La hoja «Publicar en Instagram» (OL-458, prototipo firmado `admin-instagram.html`, pantallas C y D; bitácora 490). La abren la lista de
 * Administración › Instagram y el «···» de la ficha de un evento. Arriba, Publicación 4:5 o Historia 9:16 (los chips de «Así queda» de Crear
 * cartel); la imagen tal cual saldrá; lo que se hizo con el cartel (completo con margen, o «Recortar»; sin cartel, un diseño de Crear cartel y
 * «Otro diseño»); a quién se etiqueta (chips con ✕); la ubicación; el texto ya armado (`ui/CampoLargo`, contador siempre a la vista); y un solo
 * botón. Publicando, el botón espera y la hoja no se cierra; publicado, la imagen y lo hecho con «Ver en Instagram»; un error, en una frase.
 * Las historias no llevan texto ni ubicación (Instagram no los publica en historias).
 * OL-461 (bitácora 493): la casilla «También en Facebook» (marcada; recuerda la última elección en la sesión) y un solo botón «Publicar» que manda
 * a las dos redes. El resultado, en dos líneas: «Instagram: publicado · Ver» y «Facebook: publicado · Ver» o su error llano; si Instagram falla
 * no se intenta Facebook, y si Facebook falla Instagram queda publicado y el botón ofrece «Reintentar en Facebook».
 * OL-464 (bitácora 496): un festival con carteles en sus actos es un carrusel. Bajo la imagen (la primera del carrusel), «Carrusel de N
 * imágenes, en este orden:» y una tira horizontal con las miniaturas, cada una con ✕ para quitarla y flechas para moverla antes o después; si
 * hay más de 10, las últimas quedan fuera y se dice cuáles; «Volver a poner» lo deshace. Con una sola imagen la hoja queda como siempre, y la
 * historia lleva solo la portada.
 */
export default function HojaInstagram({ eventoId, onCerrar, onPublicado }: { eventoId: string; onCerrar: () => void; onPublicado?: () => void }) {
  const [prep, setPrep] = useState<Preparado | null>(null);
  const [formato, setFormato] = useState<Formato>("4x5");
  const [recorte, setRecorte] = useState(false);
  const [diseno, setDiseno] = useState(0);
  const [quitadas, setQuitadas] = useState<string[]>([]);
  const [propio, setPropio] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Publicado | null>(null);
  const [publicando, empezar] = useTransition();
  // La elección de esta vez; sin ella, la última de la sesión. Se lee al pintar: la casilla solo sale con la hoja ya preparada en el teléfono
  // (nunca en lo que pinta el servidor), así que no cambia nada al hidratar.
  const [elegido, setConFacebook] = useState<boolean | null>(null);
  const conFacebook = elegido ?? leerConFacebook();
  const [espejo, setEspejo] = useState<Espejo | null>(null);
  const [reintentando, reintentar] = useTransition();
  // El carrusel (OL-464): el orden que dejó la hoja (null: el suyo) y las imágenes quitadas.
  const [orden, setOrden] = useState<string[] | null>(null);
  const [fuera, setFuera] = useState<string[]>([]);

  useEffect(() => {
    let vivo = true;
    prepararInstagram(eventoId).then((p) => vivo && setPrep(p), () => vivo && setPrep({ ok: false, mensaje: "No se pudo preparar. Intenta de nuevo." }));
    return () => {
      vivo = false;
    };
  }, [eventoId]);

  const listo = prep?.ok ? prep : null;
  // El texto que arma el sistema (el mismo código que el servidor), con lo que se quitó; lo escrito a mano manda.
  const armado = useMemo(() => (listo ? armarTexto(listo.evento, new Date(listo.ahora), quitadas) : ""), [listo, quitadas]);
  const texto = propio ?? armado;
  const etiquetas = listo ? etiquetasDeLaFoto(listo.evento, quitadas) : [];
  // Un festival con más de 20 cuentas (OL-463): se dice cuántas no caben en la foto.
  const sobran = listo ? etiquetasQueNoCaben(listo.evento, quitadas) : 0;
  const publicado = resultado?.ok ? resultado : null;
  // Sin `carrusel` (una respuesta de antes) es una imagen, como siempre.
  const opciones = listo?.carrusel ?? [];
  const carrusel = listo && formato === "4x5" && opciones.length > 1 ? elegirImagenes(opciones, { orden, quitadas: fuera }) : null;
  const resumen = carrusel ? resumenCarrusel(carrusel.van, carrusel.fuera) : null;
  const primera = carrusel?.van[0]?.clave ?? PORTADA;
  const nombreDe = (i: { clave: string; titulo: string }) => (i.clave === PORTADA ? `la portada (${i.titulo})` : i.titulo);
  const mover = (clave: string, paso: -1 | 1) => {
    if (!carrusel) return;
    const claves = [...carrusel.van, ...carrusel.fuera].map((i) => i.clave);
    const n = claves.indexOf(clave);
    if (n < 0 || !claves[n + paso]) return;
    [claves[n], claves[n + paso]] = [claves[n + paso], claves[n]];
    setOrden(claves);
  };
  const error = resultado && !resultado.ok ? resultado : null;
  const empezo = !!listo && (!listo.sePuede || error?.error === "empezo");
  const cerrar = () => {
    if (!publicando && !reintentando) onCerrar();
  };

  const publicar = () =>
    empezar(async () => {
      if (!listo) return;
      const r = await publicarEnInstagram({ eventoId: listo.id, formato, recorte, diseno, texto: formato === "4x5" ? texto : null, quitadas, facebook: conFacebook, imagenes: carrusel?.van.map((i) => i.clave) }).catch((): Publicado => ({ ok: false, error: "otro", mensaje: "No se pudo publicar. Vuelve a intentar en un momento; no se publicó nada." }));
      setResultado(r);
      if (r.ok) {
        setEspejo(r.facebook);
        onPublicado?.();
      }
    });

  const reintentarFacebook = () =>
    reintentar(async () => {
      if (!listo) return;
      const r = await publicarEnFacebook(listo.id, formato === "4x5" ? texto : null).catch((): Espejo => ({ ok: false, error: "otro", mensaje: FRASES_FACEBOOK.otro }));
      setEspejo(r);
      if (r.ok) onPublicado?.();
    });

  // La imagen: la portada (con su recorte o su diseño) o el cartel de un acto (OL-464); `mini`, la de la tira.
  const imagenDe = (clave: string, mini = false) =>
    !listo ? null : clave === PORTADA ? `/api/instagram/${listo.id}?formato=${formato}&recorte=${recorte && formato === "4x5" ? 1 : 0}&diseno=${diseno % 2}${mini ? "&mini=1" : ""}` : `/api/instagram/${listo.id}?formato=4x5&imagen=${clave}${mini ? "&mini=1" : ""}`;
  const src = imagenDe(primera);
  const linea = !listo
    ? null
    : formato === "9x16"
      ? { texto: `Las historias no llevan texto y duran 24 horas.${opciones.length > 1 ? " Lleva solo la portada." : ""}`, opcion: listo.conCartel ? null : "Otro diseño" }
      : primera !== PORTADA
        ? { texto: "Va completo, con margen de su color.", opcion: null }
        : listo.conCartel
        ? listo.recortar
          ? recorte
            ? { texto: "Recortado a 4:5: se pierde un poco arriba y abajo.", opcion: "Usar el cartel completo" }
            : { texto: "Va completo, con margen de su color.", opcion: "Recortar" }
          : null
        : { texto: "Sin cartel: un diseño de Crear cartel.", opcion: "Otro diseño" };
  const alOpcion = () => (listo?.conCartel ? setRecorte((r) => !r) : setDiseno((d) => d + 1));

  let pie;
  if (publicado && espejo && !espejo.ok && espejo.error !== "empezo") {
    pie = (
      <Boton type="button" onClick={reintentarFacebook} disabled={reintentando} aria-busy={reintentando || undefined}>
        {reintentando ? "Publicando en Facebook…" : "Reintentar en Facebook"}
      </Boton>
    );
  } else if (publicado) {
    pie = (
      <Boton type="button" variante="secundario" onClick={onCerrar}>
        Listo
      </Boton>
    );
  } else if (listo) {
    const quieto = empezo || publicando || error?.error === "cupo";
    pie = (
      <Boton type="button" onClick={publicar} disabled={quieto} aria-busy={publicando || undefined}>
        {empezo ? "Ya empezó" : publicando ? "Publicando…" : error?.error === "cupo" ? "Se puede otra vez mañana" : listo.publicado ? "Publicar otra vez" : "Publicar"}
      </Boton>
    );
  }

  return (
    <Hoja etiqueta="Publicar en Instagram" titulo="Publicar en Instagram" pie={pie} onCerrar={cerrar}>
      {!prep ? (
        <span className={styles.vista} data-formato="4x5" aria-label="Preparando la vista previa" role="img" />
      ) : !listo ? (
        <p className="aviso-error" role="alert">
          {prep.ok ? null : prep.mensaje}
        </p>
      ) : (
        <>
          {!publicado && (
            <Chips ariaLabel="Formato">
              <Chip activo={formato === "4x5"} onClick={() => !publicando && setFormato("4x5")}>
                Publicación 4:5
              </Chip>
              <Chip activo={formato === "9x16"} onClick={() => !publicando && setFormato("9x16")}>
                Historia 9:16
              </Chip>
            </Chips>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element -- la imagen la dibuja el servidor a 720 de ancho, ya JPEG */}
          <img key={src} className={styles.vista} data-formato={formato} src={src!} alt={`Vista previa de la ${formato === "4x5" ? "publicación" : "historia"}: ${listo.titulo}`} width={720} height={formato === "4x5" ? 900 : 1280} />
          {!publicado && linea && (
            <p className={`${hoja.nota} ${styles.linea}`}>
              {linea.texto}
              {linea.opcion && !publicando && (
                <>
                  {" "}
                  <button type="button" className={admin.enlace} onClick={alOpcion}>
                    {linea.opcion}
                  </button>
                </>
              )}
            </p>
          )}
          {!publicado && carrusel && resumen && (
            <>
              <p className={`${hoja.nota} ${styles.linea}`}>
                {resumen.resumen}
                {fuera.length > 0 && !publicando && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className={admin.enlace}
                      onClick={() => {
                        setFuera([]);
                        setOrden(null);
                      }}
                    >
                      Volver a poner
                    </button>
                  </>
                )}
              </p>
              <ol className={styles.tira} aria-label="Imágenes del carrusel">
                {carrusel.van.map((i, n) => (
                  <li key={i.clave} className={styles.lamina}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- la miniatura la dibuja el servidor a 240 de ancho, ya JPEG */}
                    <img className={styles.miniatura} src={imagenDe(i.clave, true)!} alt={`${n + 1}: ${nombreDe(i)}`} width={240} height={300} />
                    <BotonIcono aria-label={`Mover antes: ${nombreDe(i)}`} disabled={n === 0 || publicando} onClick={() => mover(i.clave, -1)}>
                      <IconoChevronIzquierda width={20} height={20} />
                    </BotonIcono>
                    <BotonIcono aria-label={`Quitar del carrusel: ${nombreDe(i)}`} disabled={carrusel.van.length === 1 || publicando} onClick={() => setFuera((q) => [...q, i.clave])}>
                      <IconoCerrar width={20} height={20} />
                    </BotonIcono>
                    <BotonIcono aria-label={`Mover después: ${nombreDe(i)}`} disabled={n === carrusel.van.length - 1 || publicando} onClick={() => mover(i.clave, 1)}>
                      <IconoChevronDerecha width={20} height={20} />
                    </BotonIcono>
                  </li>
                ))}
              </ol>
              {resumen.fuera && <p className={`${hoja.nota} ${styles.linea}`}>{resumen.fuera}</p>}
            </>
          )}
          {!publicado && !empezo && (
            <>
              <p className={`${hoja.nota} ${styles.linea}`}>
                {listo.etiquetas.length === 0 ? "Ni el lugar ni sus artistas tienen Instagram en su ficha: sin etiquetas." : etiquetas.length ? (formato === "4x5" ? "Se etiqueta en la foto y se menciona en el texto:" : "Se etiqueta en la historia:") : "Sin etiquetas."}
                {quitadas.length > 0 && (
                  <>
                    {" "}
                    <button type="button" className={admin.enlace} onClick={() => setQuitadas([])}>
                      Volver a etiquetar
                    </button>
                  </>
                )}
              </p>
              {etiquetas.length > 0 && (
                <Chips ariaLabel="Etiquetas en la foto" envuelve>
                  {etiquetas.map((u) => (
                    <Chip key={u} variante="quitar" onClick={() => setQuitadas((q) => [...q, u])}>
                      {`@${u}`}
                    </Chip>
                  ))}
                </Chips>
              )}
              {sobran > 0 && <p className={`${hoja.nota} ${styles.linea}`}>Instagram deja etiquetar a {TOPE_ETIQUETAS_FOTO}: van primero las de más actividades y {sobran === 1 ? "1 cuenta queda" : `${sobran} cuentas quedan`} fuera.</p>}
              {formato === "4x5" && (
                <p className={`${hoja.nota} ${styles.ubicacion}`}>
                  <IconoPin width={16} height={16} />
                  <span>{listo.ubicacion ? `Ubicación: ${listo.ubicacion.nombre}` : `Sin ubicación: falta la de ${listo.ciudad.nombre} en Ciudades.`}</span>
                  {!listo.ubicacion && listo.ciudad.slug && (
                    <a className={admin.enlace} href={`/admin/ciudades/${listo.ciudad.slug}`}>
                      Ponerla
                    </a>
                  )}
                </p>
              )}
              {formato === "4x5" && (
                <CampoLargo id="campo-texto-instagram" name="texto" etiqueta="Texto de la publicación" value={texto} onChange={(e) => setPropio(e.target.value)} maxLength={TOPE_CARACTERES} mostrarContador contadorSiempre />
              )}
            </>
          )}
          {empezo && (
            <p className="aviso-error" role="alert">
              {listo.titulo} ya empezó mientras lo preparabas: ya no se publica. Aquí solo se publica lo que está por venir.
            </p>
          )}
          {error && error.error !== "empezo" && (
            <p className="aviso-error" role="alert">
              {error.mensaje}
            </p>
          )}
          {publicado ? (
            <div role="status">
              <p className={admin.hecho}>
                <IconoInstagram width={22} height={22} />
                <span>Instagram: {formato === "9x16" ? "historia publicada" : publicado.imagenes > 1 ? `carrusel publicado, ${textoImagenes(publicado.imagenes)}` : "publicado"}</span>
                {publicado.permalink && (
                  <a className={admin.enlace} href={publicado.permalink} target="_blank" rel="noopener noreferrer" aria-label="Ver en Instagram">
                    Ver
                  </a>
                )}
              </p>
              {espejo?.ok && (
                <p className={admin.hecho}>
                  <IconoFacebook width={22} height={22} />
                  <span>Facebook: {formato === "9x16" ? "historia publicada" : publicado.imagenes > 1 ? `publicado, ${publicado.imagenes} fotos` : "publicado"}</span>
                  {espejo.permalink && (
                    <a className={admin.enlace} href={espejo.permalink} target="_blank" rel="noopener noreferrer" aria-label="Ver en Facebook">
                      Ver
                    </a>
                  )}
                </p>
              )}
              {espejo && !espejo.ok && (
                <>
                  <p className={`${admin.hecho} ${styles.falla}`}>
                    <IconoFacebook width={22} height={22} />
                    <span>
                      Facebook: <em>{ESTADO_FACEBOOK[espejo.error]}</em>
                    </span>
                  </p>
                  <p className={hoja.nota}>{espejo.mensaje}</p>
                </>
              )}
              {publicado.sinEtiquetas && <p className={hoja.nota}>Instagram no dejó etiquetar o poner la ubicación: salió sin ellas.</p>}
            </div>
          ) : (
            <>
              {listo.publicado && !empezo && <p className={hoja.nota}>Ya se publicó: {{ "4x5": "publicación", "9x16": "historia", carrusel: "carrusel" }[listo.publicado.formato]}, {listo.publicado.cuando}.</p>}
              {!empezo && (
                <Casilla
                  titulo="También en Facebook"
                  detalle={formato === "4x5" ? "En la página Somos Nosotrxs, con el enlace a la ficha del evento." : "En las historias de la página Somos Nosotrxs."}
                  marcada={conFacebook}
                  disabled={publicando}
                  onCambio={(si) => {
                    setConFacebook(si);
                    guardarConFacebook(si);
                  }}
                />
              )}
              {!empezo && <p className={`${hoja.nota} ${styles.trasCasilla}`}>Se publica en @{CUENTA_INSTAGRAM}{conFacebook ? " y en su página de Facebook" : ""}.</p>}
            </>
          )}
        </>
      )}
    </Hoja>
  );
}
