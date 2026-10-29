"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import CampoLargo from "@/components/ui/CampoLargo";
import Casilla from "@/components/ui/Casilla";
import { Chip, Chips } from "@/components/ui/Chip";
import Grupo from "@/components/ui/Grupo";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import { IconoFacebook, IconoInstagram, IconoOjo, IconoPersonas, IconoPin } from "@/components/ui/Iconos";
import Renglon from "@/components/ui/Renglon";
import renglonCss from "@/components/ui/Renglon.module.css";
import admin from "@/app/admin/admin.module.css";
import {
  avisadoDia,
  cambiarDia,
  candidatosDia,
  dijoQueNoDia,
  guardarDia,
  ponerLugarDia,
  prepararDia,
  publicarDiaAhora,
  quitarDia,
  volverAProgramarDia,
  type Candidatos,
  type Hecho,
  type PreparadoDia,
} from "@/app/admin/instagram/accionesSemana";
import { textoArtista, textoLugar } from "@/lib/instagram/destacado";
import { armarTexto, CUENTA_INSTAGRAM, etiquetasDeLaFoto, TOPE_CARACTERES } from "@/lib/instagram/texto";
import { horaDeReloj } from "@/lib/fechas";
import { REFRESCO_MS } from "@/lib/redes/reglas";
import propia from "./HojaInstagram.module.css";
import styles from "./HojaDia.module.css";

type Vista = "dia" | "cambiar" | "avisar" | "dijoNo";
const NO_SE_PUDO: Hecho = { ok: false, mensaje: "No se pudo guardar. Intenta de nuevo en un momento." };

/**
 * La hoja de un día de la semana de Instagram (OL-479; firmada en el prototipo de OL-477, bitácora 509, pantallas 3 a 6). Es la hoja de hoy
 * («Publicar en Instagram») con tres cambios: el título dice el día, la hora y qué toca; una línea dice por qué lo eligió el sistema, con
 * «Cambiar»; y el botón es «Publicar ahora» (si no se toca, sale solo a su hora), con «Quitar de la semana» abajo. Un artista o un lugar con
 * Instagram lleva su aviso previo («Avisar» → el mensaje listo y «Copiar y abrir su Instagram»; luego «Dijo que no», que pide confirmar). Lo
 * que se cambia (el texto, la etiqueta, Facebook) se guarda al cerrar: sale así a su hora. Ya publicado, dice dónde y lo que dio (visitas y
 * «van»). «Cambiar», «Avisar» y «Dijo que no» se muestran dentro de la misma hoja (filtrar no es navegar: nada se apila en el historial).
 */
export default function HojaDia({ id, onCerrar, onCambio }: { id: string; onCerrar: () => void; onCambio?: () => void }) {
  const [prep, setPrep] = useState<PreparadoDia | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const [vista, setVista] = useState<Vista>("dia");
  const [formato, setFormato] = useState<"4x5" | "9x16">("4x5");
  const [quitadas, setQuitadas] = useState<string[] | null>(null);
  const [propio, setPropio] = useState<string | null>(null);
  const [conFacebook, setConFacebook] = useState<boolean | null>(null);
  const [cand, setCand] = useState<Candidatos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, enviar] = useTransition();

  useEffect(() => {
    let vivo = true;
    prepararDia(id).then(
      (p) => vivo && setPrep(p),
      () => vivo && setPrep({ ok: false, mensaje: "No se pudo preparar. Intenta de nuevo." }),
    );
    return () => {
      vivo = false;
    };
  }, [id, vuelta]);

  const listo = prep?.ok ? prep : null;
  // Mientras se publica: preguntar cada 20 s (si la pantalla se ve) y al volver a la app.
  const publicando = listo?.estado === "publicando";
  const alCambiar = useRef(onCambio);
  useEffect(() => {
    alCambiar.current = onCambio;
  });
  useEffect(() => {
    if (!publicando) return;
    const otraVez = () => {
      if (document.visibilityState !== "visible") return;
      setVuelta((n) => n + 1);
      alCambiar.current?.();
    };
    document.addEventListener("visibilitychange", otraVez);
    const reloj = window.setInterval(otraVez, REFRESCO_MS);
    return () => {
      document.removeEventListener("visibilitychange", otraVez);
      window.clearInterval(reloj);
    };
  }, [publicando]);

  const q = quitadas ?? listo?.guardado.quitadas ?? [];
  const fb = conFacebook ?? listo?.guardado.facebook ?? true;
  const c = listo?.contenido;
  const cuenta = c && (c.tipo === "artista" || c.tipo === "lugar") ? c.cuenta : null;
  const ahora = listo ? new Date(listo.ahora) : null;
  // El texto que arma el sistema (el mismo código que el trabajador), con lo que se quitó; lo escrito a mano manda.
  const armado = !c || !ahora
    ? ""
    : c.tipo === "artista"
      ? textoArtista(cuenta && q.includes(cuenta) ? { ...c.datos, redes: [] } : c.datos, ahora)
      : c.tipo === "lugar"
        ? textoLugar(cuenta && q.includes(cuenta) ? { ...c.datos, redes: [] } : c.datos, ahora)
        : c.tipo === "evento"
          ? armarTexto(c.evento, ahora, q)
          : c.tipo === "semana"
            ? c.texto
            : "";
  const texto = propio ?? listo?.guardado.texto ?? armado;
  const etiquetas = !c ? [] : c.tipo === "evento" ? etiquetasDeLaFoto(c.evento, q) : cuenta && !q.includes(cuenta) ? [cuenta] : [];
  const todas = !c ? [] : c.tipo === "evento" ? etiquetasDeLaFoto(c.evento) : cuenta ? [cuenta] : [];
  const cambio = propio !== null || quitadas !== null || conFacebook !== null;
  const pedido = () => ({ texto: texto === armado ? null : texto, quitadas: q, facebook: fb });
  const programado = !!listo && listo.abierto && (listo.estado === "programado" || listo.estado === "hoy");

  const otraVez = () => {
    setQuitadas(null);
    setPropio(null);
    setConFacebook(null);
    setError(null);
    setVista("dia");
    setVuelta((n) => n + 1);
    onCambio?.();
  };
  const hacer = (accion: () => Promise<Hecho>, despues: (r: Hecho) => void = (r) => (r.ok ? otraVez() : setError(r.mensaje))) =>
    enviar(async () => {
      setError(null);
      despues(await accion().catch(() => NO_SE_PUDO));
    });

  const cerrar = () => {
    if (enviando) return;
    // Lo que se cambió en un día que sale solo a su hora se guarda (sale así).
    if (cambio && programado) void guardarDia(id, pedido()).then(() => onCambio?.(), () => undefined);
    onCerrar();
  };
  const publicarAhora = () =>
    hacer(
      () => publicarDiaAhora(id, pedido()),
      (r) => {
        if (!r.ok) return setError(r.mensaje);
        onCambio?.();
        onCerrar();
      },
    );
  const abrirCambiar = () => {
    setVista("cambiar");
    setCand(null);
    candidatosDia(id).then(setCand, () => setCand({ ok: false, mensaje: "No se pudieron leer los candidatos." }));
  };
  const copiarYAbrir = () => {
    if (!listo?.aviso) return;
    const { mensaje, abrir } = listo.aviso;
    // El portapapeles y la otra app, con el mismo toque (Safari lo pide así); pegar y mandar es de la persona.
    navigator.clipboard?.writeText(mensaje).catch(() => undefined);
    window.open(abrir, "_blank", "noopener,noreferrer");
    hacer(() => avisadoDia(id));
  };

  // La tarjeta lleva en su dirección de qué ficha es (`f`): tras «Cambiar», el teléfono no enseña la que guardó de la anterior.
  const deQuien = c?.tipo === "artista" || c?.tipo === "lugar" ? c.datos.slug : c?.tipo === "semana" ? String(c.imagenes) : "";
  const src = !listo || !c ? null : c.tipo === "evento" ? `/api/instagram/${c.eventoId}?formato=4x5&recorte=0&diseno=0` : c.tipo === "descanso" ? null : `/api/instagram/semana/${id}?formato=${formato}&f=${encodeURIComponent(deQuien)}`;
  const ficha = c?.tipo === "artista" || c?.tipo === "lugar";

  // ----- Las vistas de «Cambiar», «Avisar» y «Dijo que no».
  if (listo && vista === "cambiar") {
    return (
      <Hoja etiqueta={cand?.ok ? cand.titulo : "Cambiar"} titulo={cand?.ok ? cand.titulo : "Cambiar"} onCerrar={cerrar}>
        {!cand ? (
          <p className={hoja.nota} role="status">
            Buscando quién puede salir…
          </p>
        ) : !cand.ok ? (
          <p className="aviso-error" role="alert">
            {cand.mensaje}
          </p>
        ) : (
          <>
            <p className={hoja.nota}>{cand.nota}</p>
            {cand.lista.length ? (
              <Grupo>
                {cand.lista.map((x) => (
                  <Renglon
                    key={x.id}
                    href={x.href}
                    foto={x.foto}
                    redonda={x.redonda}
                    titulo={x.nombre}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!enviando) hacer(() => cambiarDia(id, x.id));
                    }}
                  >
                    <span className={renglonCss.envuelve}>{x.linea}</span>
                  </Renglon>
                ))}
              </Grupo>
            ) : (
              <p className={hoja.nota}>Nadie más puede salir ese día por ahora.</p>
            )}
            {cand.fuera && <p className={hoja.nota}>{cand.fuera}</p>}
          </>
        )}
        {error && (
          <p className="aviso-error" role="alert">
            {error}
          </p>
        )}
        <p className={hoja.nota}>
          <button type="button" className={admin.enlace} onClick={() => setVista("dia")} disabled={enviando}>
            Volver al día
          </button>
        </p>
      </Hoja>
    );
  }
  if (listo?.aviso && vista === "avisar") {
    return (
      <Hoja
        etiqueta={`Avisar a ${listo.nombre}`}
        titulo={`Avisar a ${listo.nombre}`}
        onCerrar={cerrar}
        pie={
          <Boton type="button" onClick={copiarYAbrir} disabled={enviando} aria-busy={enviando || undefined}>
            Copiar y abrir su Instagram
          </Boton>
        }
      >
        <p className={hoja.nota}>
          Sale {listo.cuandoSale}. Instagram no deja que la app mande el primer mensaje: se manda desde @{CUENTA_INSTAGRAM}, en tu teléfono o en el Chrome. El texto ya está listo.
        </p>
        <pre className={styles.texto}>{listo.aviso.mensaje}</pre>
        <p className={hoja.nota}>
          Si contesta que no,{" "}
          <button type="button" className={admin.enlace} onClick={() => setVista("dijoNo")}>
            Dijo que no
          </button>
          : sale de la semana y de la rotación, y su ficha lo recuerda.
        </p>
        {error && (
          <p className="aviso-error" role="alert">
            {error}
          </p>
        )}
      </Hoja>
    );
  }
  if (listo?.aviso && vista === "dijoNo") {
    return (
      <Hoja
        etiqueta={`¿Sacar a ${listo.nombre} de Instagram?`}
        titulo={`¿Sacar a ${listo.nombre} de Instagram?`}
        onCerrar={cerrar}
        pie={
          <Boton type="button" variante="secundario" onClick={() => hacer(() => dijoQueNoDia(id))} disabled={enviando} aria-busy={enviando || undefined}>
            Sí, sacarlo de Instagram
          </Boton>
        }
      >
        <p className={hoja.nota}>No vuelve a salir en la semana. Su lugar {listo.cuandoSale.startsWith("el ") ? `del ${listo.cuandoSale.slice(3)}` : `de ${listo.cuandoSale}`} lo toma la siguiente ficha de la rotación. Se puede volver a poner desde el «···» de su ficha.</p>
        <p className={hoja.nota}>
          ¿Te equivocaste?{" "}
          <button type="button" className={admin.enlace} onClick={() => setVista("dia")} disabled={enviando}>
            Mejor no
          </button>
        </p>
        {error && (
          <p className="aviso-error" role="alert">
            {error}
          </p>
        )}
      </Hoja>
    );
  }

  // ----- El día.
  const titulo = listo?.titulo ?? "Un día de la semana";
  let pie;
  if (listo && listo.tipo === "descanso") {
    pie = (
      <Boton type="button" variante="secundario" onClick={() => hacer(() => ponerLugarDia(id))} disabled={enviando} aria-busy={enviando || undefined}>
        Poner un lugar este día
      </Boton>
    );
  } else if (listo && listo.abierto) {
    pie = (
      <Boton type="button" onClick={publicarAhora} disabled={enviando} aria-busy={enviando || undefined}>
        {enviando ? "Publicando…" : "Publicar ahora"}
      </Boton>
    );
  }
  const sale = listo?.hora ? `${listo.cuandoSale === "hoy" ? "hoy" : listo.cuandoSale} a las ${horaDeReloj(listo.hora)}` : listo?.cuandoSale;
  const pub = listo?.publicado;

  return (
    <Hoja etiqueta={titulo} titulo={titulo} pie={pie} onCerrar={cerrar}>
      {!prep ? (
        <span className={propia.vista} data-formato="4x5" aria-label="Preparando la vista previa" role="img" />
      ) : !listo ? (
        <p className="aviso-error" role="alert">
          {prep.ok ? null : prep.mensaje}
        </p>
      ) : listo.tipo === "descanso" ? (
        <>
          <p className={hoja.nota}>{listo.por ?? "Los domingos la cuenta descansa: así la semana lleva seis publicaciones y ninguna se pisa con otra."}</p>
          <p className={hoja.nota}>Si quieres, ese día puede salir un lugar más (el siguiente de la rotación).</p>
        </>
      ) : (
        <>
          {ficha && !pub && (
            <Chips ariaLabel="Formato">
              <Chip activo={formato === "4x5"} onClick={() => setFormato("4x5")}>
                Publicación 4:5
              </Chip>
              <Chip activo={formato === "9x16"} onClick={() => setFormato("9x16")}>
                Historia 9:16
              </Chip>
            </Chips>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element -- la imagen la dibuja el servidor a 720 de ancho, ya JPEG */}
          {src && <img key={src} className={propia.vista} data-formato={formato} src={src} alt={`${formato === "4x5" ? "Tarjeta" : "Historia"}: ${listo.nombre}`} width={720} height={formato === "4x5" ? 900 : 1280} />}
          {pub && !pub.fallo ? (
            <>
              <div role="status">
                <p className={admin.hecho}>
                  <IconoInstagram width={22} height={22} />
                  <span>Instagram: publicado{pub.cuando ? `, ${pub.cuando}` : ""}</span>
                  {pub.instagram && (
                    <a className={`${admin.enlace} ${styles.ver}`} href={pub.instagram} target="_blank" rel="noopener noreferrer" aria-label="Ver en Instagram">
                      Ver
                    </a>
                  )}
                </p>
                {pub.facebook && (
                  <p className={admin.hecho}>
                    <IconoFacebook width={22} height={22} />
                    <span>Facebook: publicado</span>
                    <a className={`${admin.enlace} ${styles.ver}`} href={pub.facebook} target="_blank" rel="noopener noreferrer" aria-label="Ver en Facebook">
                      Ver
                    </a>
                  </p>
                )}
                {pub.historia && (
                  <p className={admin.hecho}>
                    <IconoInstagram width={22} height={22} />
                    <span>Historia: publicada</span>
                    <a className={`${admin.enlace} ${styles.ver}`} href={pub.historia} target="_blank" rel="noopener noreferrer" aria-label="Ver la historia en Instagram">
                      Ver
                    </a>
                  </p>
                )}
                {listo.medida && (
                  <>
                    <p className={admin.hecho}>
                      <IconoOjo width={22} height={22} />
                      <span>
                        {listo.medida.visitas === 1 ? "1 visita" : `${listo.medida.visitas} visitas`} a su ficha desde Instagram
                      </span>
                    </p>
                    <p className={admin.hecho}>
                      <IconoPersonas width={22} height={22} />
                      <span>
                        {listo.medida.van === 1 ? "1 dio" : `${listo.medida.van} dieron`} «Voy» a {listo.tipo === "evento" ? "este evento" : "una de sus fechas"} después de verla
                      </span>
                    </p>
                  </>
                )}
              </div>
              {pub.sinCoautor && <p className={hoja.nota}>Instagram no aceptó invitar a su cuenta como coautora (no es una cuenta profesional): salió solo en la nuestra.</p>}
              <p className={hoja.nota}>
                Cuenta las visitas que llegan con la marca de Instagram (la página del enlace de la bio y la historia) y quién, con cuenta, da «Voy» en los 7 días siguientes. Sin datos de nadie: solo las cifras.
              </p>
            </>
          ) : (
            <>
              {listo.por && (
                <p className={`${hoja.nota} ${propia.linea}`}>
                  {listo.por}
                  {listo.abierto && listo.tipo !== "semana" && listo.estado !== "quitado" && (
                    <>
                      {" "}
                      <button type="button" className={admin.enlace} onClick={abrirCambiar} disabled={enviando}>
                        Cambiar
                      </button>
                    </>
                  )}
                </p>
              )}
              {listo.reemplaza && <p className={`${hoja.nota} ${propia.linea}`}>En lugar de {listo.reemplaza}, que dijo que no.</p>}
              {listo.estado === "publicando" && (
                <p className={`${admin.hecho} ${propia.enCamino}`} role="status">
                  <IconoInstagram width={22} height={22} />
                  <span>Instagram: publicando…</span>
                </p>
              )}
              {listo.estado === "quitado" && (
                <p className={hoja.nota}>
                  Quitado: este día no se publica.
                  {listo.tipo !== "semana" && (
                    <>
                      {" "}
                      <button type="button" className={admin.enlace} onClick={() => hacer(() => volverAProgramarDia(id))} disabled={enviando}>
                        Volver a programar
                      </button>
                    </>
                  )}
                </p>
              )}
              {pub?.fallo && (
                <p className="aviso-error" role="alert">
                  {pub.fallo}
                </p>
              )}
              {listo.aviso && listo.abierto && listo.estado !== "quitado" && (
                <>
                  <p className={`${admin.hecho} ${propia.enCamino}`}>
                    <IconoInstagram width={22} height={22} />
                    <span>
                      Aviso a @{listo.aviso.cuenta}: {listo.aviso.en ? `avisado ${cuandoAviso(listo.aviso.en, listo.ahora, listo.zona)} · sin respuesta` : "falta mandarlo"}
                    </span>
                    {!listo.aviso.en && (
                      <button type="button" className={`${admin.enlace} ${styles.ver}`} onClick={() => setVista("avisar")}>
                        Avisar
                      </button>
                    )}
                  </p>
                  {listo.aviso.en && (
                    <p className={hoja.nota}>
                      Si contesta que no,{" "}
                      <button type="button" className={admin.enlace} onClick={() => setVista("dijoNo")}>
                        Dijo que no
                      </button>
                    </p>
                  )}
                </>
              )}
              {formato === "9x16" ? (
                <p className={hoja.nota}>La historia sale con la publicación y dura 24 horas: no lleva texto.</p>
              ) : (
                <>
                  {todas.length > 0 ? (
                    <>
                      <p className={`${hoja.nota} ${propia.linea}`}>
                        {etiquetas.length ? (listo.tipo === "artista" ? "Se etiqueta en la foto, se menciona en el texto y se invita a su cuenta como coautora:" : "Se etiqueta en la foto y se menciona en el texto:") : "Sin etiquetas."}
                        {q.length > 0 && (
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
                            <Chip key={u} variante="quitar" onClick={() => setQuitadas([...q, u])}>
                              {`@${u}`}
                            </Chip>
                          ))}
                        </Chips>
                      )}
                    </>
                  ) : listo.tipo === "lugar" ? (
                    <p className={`${hoja.nota} ${propia.linea}`}>Este lugar no tiene Instagram en su ficha: sale sin etiqueta y sin crédito.</p>
                  ) : listo.tipo === "semana" ? (
                    <p className={`${hoja.nota} ${propia.linea}`}>Cada cartel lleva etiquetado su lugar, si tiene Instagram.</p>
                  ) : null}
                  <p className={`${hoja.nota} ${propia.ubicacion}`}>
                    <IconoPin width={16} height={16} />
                    <span>{listo.ubicacion ? `Ubicación: ${listo.ubicacion.nombre}` : `Sin ubicación: falta la de ${listo.ciudad.nombre} en Ciudades.`}</span>
                  </p>
                  <CampoLargo id="campo-texto-dia" name="texto" etiqueta="Texto de la publicación" value={texto} onChange={(e) => setPropio(e.target.value)} maxLength={TOPE_CARACTERES} mostrarContador contadorSiempre disabled={!listo.abierto} />
                </>
              )}
              {listo.abierto && (
                <Casilla titulo="También en Facebook" detalle="En la página Somos Nosotrxs, con el enlace a su ficha." marcada={fb} disabled={enviando} onCambio={setConFacebook} />
              )}
              {programado && (
                <p className={`${hoja.nota} ${propia.trasCasilla}`}>
                  Sale sola {sale} en @{CUENTA_INSTAGRAM}
                  {fb ? " y en su página de Facebook" : ""}. Te avisamos en el teléfono cuando salga.
                </p>
              )}
              {error && (
                <p className="aviso-error" role="alert">
                  {error}
                </p>
              )}
              {listo.abierto && listo.estado !== "quitado" && (
                <p className={hoja.nota}>
                  <button type="button" className={admin.enlace} onClick={() => hacer(() => quitarDia(id))} disabled={enviando}>
                    Quitar de la semana
                  </button>
                </p>
              )}
            </>
          )}
        </>
      )}
    </Hoja>
  );
}

/** «hoy, 10:05 am» o «el lun 5». */
function cuandoAviso(iso: string, ahoraIso: string, zona: string): string {
  const dia = (d: string) => new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(new Date(d));
  if (dia(iso) === dia(ahoraIso)) {
    const h = new Intl.DateTimeFormat("en-GB", { timeZone: zona, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
    return `hoy, ${horaDeReloj(h)}`;
  }
  return `el ${new Intl.DateTimeFormat("es-MX", { timeZone: zona, weekday: "short", day: "numeric" }).format(new Date(iso)).replace(/[.,]/g, "")}`;
}
