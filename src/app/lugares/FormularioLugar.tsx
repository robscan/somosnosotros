"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import { useAbrirConError } from "@/components/ui/abrirConError";
import { useTerminar } from "@/components/ui/Atras";
import SelectorEnlaces from "@/components/SelectorEnlaces";
import HojaDonde from "@/components/HojaDonde";
import Boton from "@/components/ui/Boton";
import BotonPublicar from "@/components/ui/BotonPublicar";
import Campo from "@/components/ui/Campo";
import ContadorCaracteres from "@/components/ui/ContadorCaracteres";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import { Chip } from "@/components/ui/Chip";
import { IconoEtiqueta, IconoLapiz, IconoMas, IconoPin, IconoReloj } from "@/components/ui/Iconos";
import { ciudadParaPunto, type Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { normalizarRedes } from "@/lib/enlaces";
import { faltaEnLugar } from "@/lib/formulario";
import type { Punto } from "@/lib/geo";
import { lugarDesdePunto } from "@/lib/geocodificar";
import { horarioParaEnviar, type Franja } from "@/lib/horarioLugar";
import { etiquetaTipo, LIMITES_LUGAR, TIPOS, type Lugar, type LugarResumen, type Tipo } from "@/lib/lugares";
import { apartarGuardia, reponerGuardia } from "@/lib/guardiaSalida";
import { subirFoto } from "@/lib/subirFoto";
import FotoSubida from "@/components/ui/FotoSubida";
import useSubidaDeFoto from "@/components/ui/useSubidaDeFoto";
import { leerUbicacion } from "@/lib/ubicacion";
import { esteAparatoInicial } from "@/lib/plataforma";
import { usePlataforma } from "@/lib/useAvisosTelefono";
import type { ResultadoLugar } from "./acciones";
import { HojaHorario } from "./Horario";
import TextoHorario from "./TextoHorario";
import canon from "@/components/ui/FormularioCanon.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import styles from "./FormularioLugar.module.css";

type Props = {
  accion: (previo: ResultadoLugar | null, formData: FormData) => Promise<ResultadoLugar>;
  /** El lugar que se edita (todo resuelto de entrada). */
  lugar: Lugar;
  /** Su horario guardado, en franjas (OL-315); vacío si no lo dijo. */
  horario: Franja[];
  usuarioId: string;
  /** El administrador puede pegar la dirección de una imagen y marcar el lugar como privado (mapeo personal). */
  esAdmin?: boolean;
  /** Lugares ya registrados y visibles (sin el propio): pines de "¿Dónde está?" (OL-211) para avisar "ya existe" sin ofrecerlos para elegir. */
  lugares: LugarResumen[];
  /** La ciudad del propio lugar: misma cascada de contexto que el alta (OL-100) para la búsqueda de "¿Dónde está?". */
  ciudadContexto?: Ciudad | null;
};

/**
 * Editar un lugar, el canon de formulario (docs/rediseno/13, decisiones 8 a 12): el nombre arriba y debajo los renglones resueltos: Dónde (la
 * hoja del mapa), Tipo (chips al abrir; con Otro, qué es), Horario (la hoja de franjas del alta por pasos, OL-315) y Más (descripción, redes,
 * foto). El alta es ahora por pasos (`/nuevo/lugar`, OL-315): este formulario solo edita (el de evento se retiró en OL-319: editar un evento también es por pasos). El horario solo
 * viaja si se tocó: guardar lo demás no lo cambia.
 */
export default function FormularioLugar({ accion, lugar, horario: horarioInicial, usuarioId, esAdmin = false, lugares, ciudadContexto }: Props) {
  const plataforma = usePlataforma();
  const [resultado, enviar, enviando] = useActionState<ResultadoLugar | null, FormData>(accion, null);
  // Guardado: la tarea termina sin quedarse en el historial; mientras vuelve, el botón sigue ocupado.
  const terminar = useTerminar();
  const terminado = resultado?.ok === true;
  useEffect(() => {
    if (resultado?.ok) terminar(resultado.volver);
  }, [resultado, terminar]);
  // Si el servidor no guardó, lo escrito sigue en pantalla: la guardia que apartó «Guardar» vuelve (OL-296).
  useEffect(() => {
    if (resultado && !resultado.ok) reponerGuardia();
  }, [resultado]);
  const errores = resultado && !resultado.ok ? resultado.errores : {};

  const [nombre, setNombre] = useState(lugar.nombre);
  const [tipo, setTipo] = useState<Tipo>(lugar.tipo);
  const [detalle, setDetalle] = useState(lugar.detalle ?? "");
  const [direccion, setDireccion] = useState(lugar.direccion ?? "");
  const [punto, setPunto] = useState<Punto>({ lat: lugar.lat, lng: lugar.lng });
  const [ciudad, setCiudad] = useState(lugar.ciudad);
  const [tipoAbierto, setTipoAbierto] = useState(false);
  const [masAbierto, setMasAbierto] = useState(true);
  const [hoja, setHoja] = useState<"donde" | "horario" | null>(null);
  // null: el horario no se tocó y no viaja (guardar lo demás no lo cambia).
  const [horario, setHorario] = useState<Franja[] | null>(null);
  const franjas = horario ?? horarioInicial;
  // Sin el propio lugar: su pin no debe avisarse a sí mismo "ya existe" (OL-211).
  const lugaresParaMapa = lugares.filter((l) => l.id !== lugar.id);
  const [yo, setYo] = useState<(Punto & { vez: number }) | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  const [portada, setPortada] = useState<string | null>(lugar.portada ?? null);
  const subida = useSubidaDeFoto();
  const subiendo = !!subida.subiendo;
  const [errorPortada, setErrorPortada] = useState<string | null>(null);
  const [privado, setPrivado] = useState(!!lugar.privado);
  const formRef = useRef<HTMLFormElement>(null);
  // Los avisos de estos campos viven dentro de "Más": si llega uno con el renglón cerrado, se abre solo.
  useAbrirConError(formRef, setMasAbierto, errores.descripcion, errores.enlaces, errores.portada, errorPortada);

  /** Lee la ubicación y la entrega a la hoja "¿Dónde está?" abierta (con su propio `moverPin`, que muestra "Ubicando…" mientras llega la
   *  dirección; mismo contrato que `onEstoyAqui` en `HojaDonde` del alta de evento, OL-211). */
  async function estoyAqui(poner: (p: Punto) => void) {
    setUbicando(true);
    setAvisoUbicacion(null);
    try {
      const p = await leerUbicacion(true);
      setYo((y) => ({ ...p, vez: (y?.vez ?? 0) + 1 }));
      poner(p);
    } catch (e) {
      setAvisoUbicacion(e === "sin-soporte" ? `${esteAparatoInicial(plataforma)} no da su ubicación. Busca la dirección o toca el mapa.` : "No se pudo leer tu ubicación. Busca la dirección o toca el mapa.");
    } finally {
      setUbicando(false);
    }
  }

  // Sin ciudad para el punto movido, el servidor no guarda: se vuelve a preguntar al mapa por él, para que el siguiente intento la lleve (OL-299).
  function deducirCiudad(p: Punto) {
    const { mapboxToken } = configPublica();
    if (!mapboxToken) return;
    lugarDesdePunto(p, mapboxToken).then((r) => {
      if (r?.direccion) setDireccion(r.direccion);
      setCiudad(r?.ciudad ?? "");
    });
  }

  // La portada se sube con la espera de toda la app (`useSubidaDeFoto`, OL-353): la foto elegida late en su hueco hasta que la subida se ve.
  const subirPortada = (e: React.ChangeEvent<HTMLInputElement>) =>
    subida.subir(e, async (archivo) => {
      setErrorPortada(null);
      const r = await subirFoto("lugares", usuarioId, "portada", archivo);
      if ("error" in r) return setErrorPortada(r.error);
      setPortada(r.url);
      return r.url;
    });

  // Lo único que dice qué falta es la nota bajo el botón.
  const falta = faltaEnLugar({ nombre, ubicado: true });
  // La ciudad que se guarda: la del mapa para el punto o, si no dio ninguna, la de contexto cercana (sin ninguna y con el punto movido, el
  // servidor no guarda; con el mismo punto conserva la guardada, OL-299).
  const ciudadEnviada = ciudadParaPunto(punto, ciudad, ciudadContexto) ?? "";
  const errorDonde = errores.ubicacion ?? errores.ciudad ?? errores.direccion;

  return (
    <>
      <form
        ref={formRef}
        action={(fd) => {
          if (falta) return;
          if (!ciudadEnviada) deducirCiudad(punto);
          apartarGuardia();
          enviar(fd);
        }}
        noValidate
      >
        {/* 1. El nombre. */}
        <label className={canon.campo}>
          <IconoLapiz width={20} height={20} />
          <input name="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={LIMITES_LUGAR.nombre} placeholder="Nombre del lugar" aria-label="Nombre del lugar" aria-invalid={!!errores.nombre} autoComplete="off" required />
          <Limpiar visible={!!nombre} />
          <ContadorCaracteres valor={nombre} tope={LIMITES_LUGAR.nombre} error={errores.nombre} />
        </label>
        {errores.nombre && (
          <p className={canon.error} role="alert">
            {errores.nombre}
          </p>
        )}

        <ul className={renglon.renglones}>
          {/* 2. Dónde: la hoja del mapa. */}
          <li className={`${renglon.resuelto} ${renglon.sinClave}`}>
            <IconoPin width={20} height={20} />
            <small>Dónde</small>
            <b>{direccion || "Pin en el mapa"}</b>
            <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setHoja("donde")}>
              Cambiar
            </Boton>
            {errorDonde ? (
              <p className={renglon.nota} role="alert">
                {errorDonde}
              </p>
            ) : (
              avisoUbicacion && <p className={renglon.nota}>{avisoUbicacion}</p>
            )}
          </li>

          {/* 3. Tipo: chips al abrir; con Otro, qué es (opcional). */}
          <li className={`${renglon.resuelto} ${renglon.sinClave} ${tipoAbierto ? renglon.abierto : ""}`}>
            <IconoEtiqueta width={20} height={20} />
            <small>Tipo</small>
            <b>{`${etiquetaTipo(tipo)}${tipo === "otro" && detalle.trim() ? ` · ${detalle.trim()}` : ""}`}</b>
            <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setTipoAbierto((a) => !a)} aria-expanded={tipoAbierto}>
              {tipoAbierto ? "Listo" : "Cambiar"}
            </Boton>
            {tipoAbierto && (
              <div className={renglon.cuerpo}>
                <div className={canon.chips}>
                  {TIPOS.map((t) => (
                    <Chip
                      key={t.valor}
                      activo={tipo === t.valor}
                      onClick={() => {
                        setTipo(t.valor);
                        if (t.valor !== "otro") setTipoAbierto(false);
                      }}
                    >
                      {t.etiqueta}
                    </Chip>
                  ))}
                </div>
                {tipo === "otro" && (
                  <span className={limpiar.caja}>
                    <input type="text" name="detalle" value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={LIMITES_LUGAR.detalle} placeholder="¿Qué es? Ej. taller de cerámica (opcional)" aria-label="Qué es" className={canon.entrada} autoComplete="off" />
                    <Limpiar visible={!!detalle} />
                    <ContadorCaracteres valor={detalle} tope={LIMITES_LUGAR.detalle} error={errores.detalle} />
                  </span>
                )}
                {errores.detalle && (
                  <p className={canon.error} role="alert">
                    {errores.detalle}
                  </p>
                )}
              </div>
            )}
          </li>

          {/* 4. Horario (OL-315): la misma hoja que el alta; opcional. */}
          <li className={`${renglon.resuelto} ${renglon.sinClave} ${franjas.length ? "" : renglon.opcional}`}>
            <IconoReloj width={20} height={20} />
            <small>Horario</small>
            {franjas.length ? (
              <b>
                <TextoHorario franjas={franjas} />
              </b>
            ) : (
              <b className={renglon.falta}>Horario</b>
            )}
            <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setHoja("horario")} aria-label={franjas.length ? "Cambiar el horario" : "Agregar el horario"}>
              {franjas.length ? "Cambiar" : "Agregar"}
            </Boton>
            {errores.horario && (
              <p className={renglon.nota} role="alert">
                {errores.horario}
              </p>
            )}
          </li>

          {/* 5. Más: descripción, redes, foto (y lo del administrador). */}
          <li className={`${renglon.resuelto} ${renglon.sinClave} ${masAbierto ? renglon.abierto : renglon.opcional}`}>
            <IconoMas width={20} height={20} />
            <small>Más</small>
            <b className={renglon.falta}>Más detalles</b>
            <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setMasAbierto((a) => !a)} aria-expanded={masAbierto}>
              {masAbierto ? "Listo" : "Agregar"}
            </Boton>
            {/* Se esconde, no se desmonta: lo escrito y los enlaces se quedan aunque se cierre. */}
            <div className={renglon.cuerpo} hidden={!masAbierto}>
              <Campo etiqueta="Descripción corta" name="descripcion" multilinea defaultValue={lugar.descripcion ?? ""} maxLength={LIMITES_LUGAR.descripcion} placeholder="Qué es y qué pasa ahí" error={errores.descripcion} mostrarContador />
              <SelectorEnlaces inicial={normalizarRedes(lugar.redes)} error={errores.enlaces} />
              <FotoSubida src={portada} vista={subida.vista} className={styles.portada} />
              <label className={canon.subir} aria-busy={subiendo || undefined}>
                <input type="file" accept="image/*" onChange={subirPortada} disabled={subiendo} />
                {subiendo ? "Subiendo…" : portada ? "Cambiar la foto" : "Poner una foto de portada"}
              </label>
              {(errorPortada || errores.portada) && (
                <p className={canon.error} role="alert">
                  {errorPortada ?? errores.portada}
                </p>
              )}
              {esAdmin && <CampoImagenUrl valor={portada} onCambio={setPortada} />}
              {esAdmin && (
                <label className={styles.interruptor}>
                  <input type="checkbox" checked={privado} onChange={(e) => setPrivado(e.target.checked)} />
                  <strong>Solo yo lo veo</strong>
                  <small>Mapeo privado: no sale en el mapa, la lista ni la búsqueda para nadie más.</small>
                </label>
              )}
            </div>
          </li>
        </ul>

        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="direccion" value={direccion} />
        <input type="hidden" name="lat" value={punto.lat} />
        <input type="hidden" name="lng" value={punto.lng} />
        <input type="hidden" name="portada" value={portada ?? ""} />
        <input type="hidden" name="ciudad" value={ciudadEnviada} />
        <input type="hidden" name="privado" value={privado ? "1" : ""} />
        {horario && <input type="hidden" name="horario" value={horarioParaEnviar(horario)} />}
        {!(tipoAbierto && tipo === "otro") && <input type="hidden" name="detalle" value={detalle} />}

        {resultado && !resultado.ok && resultado.general && (
          <p className="aviso-error" role="alert">
            {resultado.general}
          </p>
        )}
        <BotonPublicar id="falta-lugar" falta={falta} ocupado={enviando || terminado || subiendo}>
          {enviando || terminado ? "Guardando…" : "Guardar cambios"}
        </BotonPublicar>
      </form>
      {hoja === "donde" && (
        <HojaDonde
          para="lugar"
          lugares={lugaresParaMapa}
          nombreForm={nombre}
          conFoco={false}
          punto={punto}
          direccion={direccion}
          ciudad={ciudad}
          ciudadContexto={ciudadContexto}
          yo={yo}
          ubicando={ubicando}
          avisoUbicacion={avisoUbicacion}
          onEstoyAqui={estoyAqui}
          onListo={({ punto: p, direccion: d, ciudad: c }) => {
            // Confirmar el mismo punto no lo cambia: si el mapa no dio ciudad, se queda la que ya tenía (OL-299).
            const mismo = punto.lat === p.lat && punto.lng === p.lng;
            setPunto(p);
            setDireccion(d);
            setCiudad(c ?? (mismo ? ciudad : ""));
          }}
          onCerrar={() => setHoja(null)}
        />
      )}
      {hoja === "horario" && (
        <HojaHorario
          franjas={franjas}
          onListo={(f) => {
            setHorario(f);
            setHoja(null);
          }}
          onCerrar={() => setHoja(null)}
        />
      )}
    </>
  );
}
