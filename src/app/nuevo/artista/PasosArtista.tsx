"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import { PiePaso } from "@/components/PorPasos";
import SelectorEnlaces from "@/components/SelectorEnlaces";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import Campo from "@/components/ui/Campo";
import { Chip } from "@/components/ui/Chip";
import ContadorCaracteres from "@/components/ui/ContadorCaracteres";
import { IconoBuscar, IconoCerrar, IconoEncuadrar, IconoEtiqueta, IconoOk, IconoPersona, IconoPersonas } from "@/components/ui/Iconos";
import Limpiar from "@/components/ui/Limpiar";
import ListaFlotante from "@/components/ui/ListaFlotante";
import Opcion from "@/components/ui/Opcion";
import useAlto from "@/components/ui/useAlto";
import canon from "@/components/ui/FormularioCanon.module.css";
import sug from "@/components/ui/Sugerencia.module.css";
import { DISCIPLINAS, etiquetaDisciplina, hrefArtista, LIMITES_ARTISTA, SUBCATEGORIAS_A_LA_VISTA, subcategoriaParecida, type Disciplina, type ErroresArtista, type Subcategoria } from "@/lib/artistas";
import type { Enlace } from "@/lib/enlaces";
import { subirFoto } from "@/lib/subirFoto";
import FotoSubida from "@/components/ui/FotoSubida";
import useSubidaDeFoto from "@/components/ui/useSubidaDeFoto";
import type { Candidato } from "./useArtistasConNombre";
import type { Respuestas } from "./pasos";
import evento from "../evento/AltaEvento.module.css";
import styles from "./AltaArtista.module.css";

/**
 * Los pasos del alta de artista (OL-316; prototipo firmado `lugar-artista-por-pasos.html`, casos 5 a 7): cada uno pinta lo suyo dentro de
 * `PorPasos`, que pone la barra y la pregunta. Cuando la respuesta es un toque (una disciplina, una subcategoría) elegir avanza; cuando hay
 * que escribir, el botón del pie dice qué falta.
 */

/** Intro en el teclado del teléfono hace lo mismo que el botón del pie. */
const conIntro = (seguir: (() => void) | null) => (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter" && seguir) seguir();
};

/**
 * ¿Cómo se llama? El campo con lupa, ✕ y contador; con 3 letras o más, una lista flotante bajo él con los artistas del directorio cuyo nombre
 * lo contiene («Ya tiene ficha · Ir a su ficha»: la salida es ir a esa ficha, no publicar otra; en otra ciudad lo dice, porque allí el mismo
 * nombre es otro artista). «Siguiente» sigue: el nombre ya dijo qué hace o se pregunta. Al pie, bajo «Siguiente», la tira Evento · Lugar ·
 * Artista (`tira`), solo en este paso.
 */
export function PasoNombre({ nombre, ciudad, candidatos, tira, onNombre, onSeguir }: { nombre: string; ciudad: string; candidatos: Candidato[]; tira: ReactNode; onNombre: (nombre: string) => void; onSeguir: () => void }) {
  const ancla = useRef<HTMLLabelElement>(null);
  const pie = useRef<HTMLElement>(null);
  const altoPie = useAlto(pie);
  // La lista se cierra con un toque fuera y se abre sola en cuanto el texto cambia: se guarda PARA QUÉ texto se cerró.
  const [cerradaPara, setCerradaPara] = useState<string | null>(null);
  const texto = nombre.trim();
  const listo = !!texto;
  const conFicha = texto.length >= 3 ? candidatos : [];
  const abierta = cerradaPara !== nombre && conFicha.length > 0;
  return (
    <>
      <label className={`${canon.campo} ${listo ? "" : canon.campoFalta}`} ref={ancla}>
        <IconoBuscar width={20} height={20} />
        <input
          type="text"
          value={nombre}
          onChange={(e) => onNombre(e.target.value)}
          onKeyDown={conIntro(listo ? onSeguir : null)}
          maxLength={LIMITES_ARTISTA.nombre}
          placeholder="Nombre de artista o grupo"
          aria-label="Nombre de artista o grupo"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="next"
          role="combobox"
          aria-expanded={abierta}
          aria-controls="lista-artista"
          aria-autocomplete="list"
          autoFocus
        />
        <Limpiar visible={!!nombre} />
        <ContadorCaracteres valor={nombre} tope={LIMITES_ARTISTA.nombre} />
      </label>
      <ListaFlotante abierta={abierta} onCerrar={() => setCerradaPara(nombre)} ancla={ancla} id="lista-artista" etiqueta="Artistas con ese nombre" reservaAbajo={altoPie}>
        {conFicha.map((a) => (
          <li key={a.id}>
            <Link href={hrefArtista(a)} replace role="option" aria-selected={false} className={`${sug.renglon} ${sug.conFicha}`}>
              {a.tipo === "solista" ? <IconoPersona width={20} height={20} /> : <IconoPersonas width={20} height={20} />}
              <b>{a.nombre}</b>
              <small>{a.ciudad === ciudad ? "Ya tiene ficha · Ir a su ficha" : `Ya tiene ficha en ${a.ciudad} · Ir a su ficha`}</small>
            </Link>
          </li>
        ))}
      </ListaFlotante>
      <PiePaso ref={pie}>
        <Boton type="button" aria-disabled={listo ? undefined : true} onClick={listo ? onSeguir : undefined}>
          {listo ? "Siguiente" : "Falta el nombre"}
        </Boton>
        {tira}
      </PiePaso>
    </>
  );
}

/** ¿Qué hace? Las disciplinas, una por renglón con el icono de etiqueta (clasificación: no solo hablamos de música); elegir avanza. */
export function PasoHace({ onElegir }: { onElegir: (disciplina: Disciplina) => void }) {
  return (
    <div className={evento.opciones} role="group" aria-label="Qué hace">
      {DISCIPLINAS.map((d) => (
        <Opcion key={d.valor} compacta icono={<IconoEtiqueta width={20} height={20} />} titulo={d.etiqueta} onClick={() => onElegir(d.valor)} />
      ))}
    </div>
  );
}

/** La pregunta del paso de la subcategoría: con el nombre propio de la disciplina; «Otro» no tiene tipos, se dice en pocas palabras. */
export const preguntaSub = (d: Disciplina) => (d === "otro" ? "¿Qué hace, en pocas palabras?" : `¿Qué tipo de ${etiquetaDisciplina(d).toLowerCase()}?`);

/**
 * ¿Qué tipo de …? (decisión 5 del acta): solo tras elegir la disciplina. Debajo de la pregunta, la disciplina y para qué sirve; luego los chips
 * con las subcategorías ya usadas en el directorio, las más usadas primero (`SUBCATEGORIAS_A_LA_VISTA`), y «Otra…», que abre un campo corto
 * con ✕ y el tope de siempre, y avisa si ya hay una parecida («Usar esa»). Sin subcategorías conocidas (y en «Otro») el campo ya está abierto,
 * como en el formulario de siempre. Un chip avanza a «Revisa»; lo escrito, con «Siguiente»; «Seguir sin especificar», quieto al pie, sin nada.
 */
export function PasoSub({ disciplina, detalle, subcategorias, error, onElegir }: { disciplina: Disciplina; detalle: string; subcategorias: Subcategoria[]; error?: string; onElegir: (detalle: string) => void }) {
  const chips = disciplina === "otro" ? [] : subcategorias.slice(0, SUBCATEGORIAS_A_LA_VISTA);
  const enChips = chips.some((s) => s.detalle === detalle);
  // Lo que ya se había escrito (al volver desde «Revisa») vuelve al campo abierto.
  const [otra, setOtra] = useState(chips.length === 0 || (!!detalle && !enChips));
  const [texto, setTexto] = useState(enChips ? "" : detalle);
  const escrito = texto.trim();
  const parecida = subcategoriaParecida(subcategorias, texto);
  return (
    <>
      <p className={evento.aviso}>{etiquetaDisciplina(disciplina)} · así se verá en el directorio y en sus filtros.</p>
      {chips.length > 0 && (
        <div className={evento.grupo} role="group" aria-label={preguntaSub(disciplina)}>
          {chips.map((s) => (
            <Chip key={s.detalle} activo={detalle === s.detalle} onClick={() => onElegir(s.detalle)}>
              {s.detalle}
            </Chip>
          ))}
          <Chip activo={otra} onClick={() => setOtra(true)}>
            Otra…
          </Chip>
        </div>
      )}
      {otra && (
        <label className={canon.campo}>
          <IconoEtiqueta width={20} height={20} />
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={conIntro(escrito ? () => onElegir(escrito) : null)}
            maxLength={LIMITES_ARTISTA.detalle}
            placeholder="Ej. son huasteco, jazz"
            aria-label="Qué tipo, en pocas palabras"
            aria-invalid={!!error}
            autoComplete="off"
            enterKeyHint="next"
            autoFocus
          />
          <Limpiar visible={!!texto} />
          <ContadorCaracteres valor={texto} tope={LIMITES_ARTISTA.detalle} error={error} />
        </label>
      )}
      {error && (
        <p className={canon.error} role="alert">
          {error}
        </p>
      )}
      {/* Antes de crear una subcategoría nueva, ¿ya existe una parecida? (OL-101, docs/rediseno/27). */}
      {otra && parecida && (
        <p className={canon.existe} role="status">
          <IconoOk width={20} height={20} />
          <span>
            Ya hay <b>{parecida.artistas}</b> {parecida.artistas === 1 ? "artista" : "artistas"} con «<b>{parecida.detalle}</b>».{" "}
            <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => onElegir(parecida.detalle)}>
              Usar esa
            </Boton>
          </span>
        </p>
      )}
      <PiePaso>
        {escrito && (
          <Boton type="button" onClick={() => onElegir(escrito)}>
            Siguiente
          </Boton>
        )}
        <Boton type="button" variante="quieto" onClick={() => onElegir("")}>
          Seguir sin especificar
        </Boton>
      </PiePaso>
    </>
  );
}

type Mas = Pick<Respuestas, "foto" | "portada" | "descripcion" | "redes">;

/**
 * Foto, portada, redes o descripción: lo opcional que ya tenía el formulario de siempre, igual que ahí (la foto redonda, la portada 3:2 de la
 * cabecera, cada una con su ✕ para quitarla; la descripción con su tope; enlaces y redes; y, para la administración, la dirección de una
 * imagen). «Listo» vuelve a «Revisa».
 */
export function PasoMas({ r, usuarioId, esAdmin, errores, onCambio, onListo }: { r: Mas; usuarioId: string; esAdmin: boolean; errores: ErroresArtista; onCambio: (cambios: Partial<Mas>) => void; onListo: () => void }) {
  const subida = useSubidaDeFoto<"foto" | "portada">();
  const subiendo = subida.subiendo;
  const [error, setError] = useState<{ cual: "foto" | "portada"; texto: string } | null>(null);
  // La espera es la de toda la app (`useSubidaDeFoto`, OL-353): la imagen elegida late en su hueco hasta que la subida se ve.
  const subir = (e: React.ChangeEvent<HTMLInputElement>, cual: "foto" | "portada") =>
    subida.subir(
      e,
      async (archivo) => {
        setError(null);
        const hecho = await subirFoto("artistas", usuarioId, cual, archivo, cual);
        if ("error" in hecho) return setError({ cual, texto: hecho.error });
        onCambio({ [cual]: hecho.url });
        return hecho.url;
      },
      cual,
    );
  const errorDe = (cual: "foto" | "portada") => (error?.cual === cual ? error.texto : errores[cual]);
  return (
    <>
      <div className={styles.imagen} aria-busy={subiendo === "foto" || undefined}>
        {r.foto || subida.vistaDe("foto") ? (
          <FotoSubida src={r.foto} vista={subida.vistaDe("foto")} />
        ) : (
          <span aria-hidden="true">
            <IconoPersona width={28} height={28} />
          </span>
        )}
        <label className={canon.subir} aria-disabled={subiendo ? true : undefined}>
          <input type="file" accept="image/*" onChange={(e) => subir(e, "foto")} disabled={!!subiendo} aria-label={r.foto ? "Cambiar la foto" : "Poner una foto"} />
          {subiendo === "foto" ? "Subiendo…" : r.foto ? "Cambiar la foto" : "Poner una foto"}
        </label>
        {r.foto && (
          <BotonIcono relieve="contorno" onClick={() => onCambio({ foto: null })} title="Quitar la foto" aria-label="Quitar la foto">
            <IconoCerrar width={22} height={22} />
          </BotonIcono>
        )}
      </div>
      {errorDe("foto") && (
        <p className={canon.error} role="alert">
          {errorDe("foto")}
        </p>
      )}
      {esAdmin && <CampoImagenUrl etiqueta="O pega la dirección de la foto" valor={r.foto} onCambio={(foto) => onCambio({ foto })} />}
      <div className={`${styles.imagen} ${styles.portada}`} aria-busy={subiendo === "portada" || undefined}>
        {r.portada || subida.vistaDe("portada") ? (
          <FotoSubida src={r.portada} vista={subida.vistaDe("portada")} />
        ) : (
          <span aria-hidden="true">
            <IconoEncuadrar width={28} height={28} />
          </span>
        )}
        <label className={canon.subir} aria-disabled={subiendo ? true : undefined}>
          <input type="file" accept="image/*" onChange={(e) => subir(e, "portada")} disabled={!!subiendo} aria-label={r.portada ? "Cambiar la portada" : "Poner una portada"} />
          {subiendo === "portada" ? "Subiendo…" : r.portada ? "Cambiar la portada" : "Poner una portada"}
        </label>
        {r.portada && (
          <BotonIcono relieve="contorno" onClick={() => onCambio({ portada: null })} title="Quitar la portada" aria-label="Quitar la portada">
            <IconoCerrar width={22} height={22} />
          </BotonIcono>
        )}
      </div>
      {errorDe("portada") && (
        <p className={canon.error} role="alert">
          {errorDe("portada")}
        </p>
      )}
      {esAdmin && <CampoImagenUrl etiqueta="O pega la dirección de la portada" valor={r.portada} onCambio={(portada) => onCambio({ portada })} />}
      <Campo etiqueta="Descripción" name="descripcion" multilinea value={r.descripcion} onChange={(e) => onCambio({ descripcion: e.target.value })} maxLength={LIMITES_ARTISTA.descripcion} placeholder="Qué hace y dónde suele estar" error={errores.descripcion} mostrarContador />
      <SelectorEnlaces inicial={r.redes} error={errores.enlaces} onCambio={(redes: Enlace[]) => onCambio({ redes })} />
      <PiePaso>
        <Boton type="button" aria-disabled={subiendo ? true : undefined} aria-busy={subiendo ? true : undefined} onClick={subiendo ? undefined : onListo}>
          {subiendo ? `Subiendo la ${subiendo}…` : "Listo"}
        </Boton>
      </PiePaso>
    </>
  );
}

