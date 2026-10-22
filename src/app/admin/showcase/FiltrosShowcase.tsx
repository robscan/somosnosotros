"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { Chip, Chips, Cuenta } from "@/components/ui/Chip";
import Hoja from "@/components/ui/Hoja";
import hojaCss from "@/components/ui/Hoja.module.css";
import HojaFiltros, { BloqueFiltro } from "@/components/ui/HojaFiltros";
import { IconoCaret, IconoFiltros, IconoMarcador } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { hrefShowcase, type Vista } from "@/lib/showcase";
import {
  BLOQUES,
  faltaNombreGrupo,
  filtrosDe,
  filtrosPuestos,
  grupoPuesto,
  LIMITE_NOMBRE_GRUPO,
  mismosFiltros,
  nombreGrupo,
  opcionesConCuenta,
  pasa,
  puesto,
  puestos,
  resumenFiltros,
  SIN_FILTROS,
  textoPuesto,
  type ClaveFiltro,
  type Filtros,
  type Grupo,
  type Hechos,
} from "@/lib/showcaseFiltros";
import { borrarGrupo, guardarGrupo, renombrarGrupo } from "./accionesGrupos";
import admin from "../admin.module.css";
import s from "./showcase.module.css";

const artistas = (n: number) => `${n} ${n === 1 ? "artista" : "artistas"}`;

/** Lo que cambia la URL al poner otros filtros: sin la página (vuelve a la primera) y sin apilar historial. */
function useAplicar(vista: Vista) {
  const router = useRouter();
  return (f: Filtros) => router.replace(hrefShowcase({ ...vista, ...f, n: undefined }), { scroll: false });
}

/**
 * La hoja Filtros del Showcase (OL-446; lo firmado en OL-443): la de Artistas de la app (`ui/HojaFiltros`). «Tus grupos» primero; a la vista
 * Puntaje, Actividad en redes, Cuenta en la app, Circulación este año y Disciplina; «Más filtros» (chevron abajo, se abre solo si algo de ahí está
 * puesto) guarda Estado, Investigación y Solista o grupo. Cada chip dice cuántos quedarían con lo demás puesto y los que darían 0 se esconden. Lo
 * elegido es un borrador: «Ver N artistas» lo pone en la URL (sin apilar historial); la ✕ o tocar fuera no aplica nada.
 */
export function HojaFiltrosShowcase({ vista, hechos, grupos, hoy, onCerrar }: { vista: Vista; hechos: Hechos[]; grupos: Grupo[]; hoy: string; onCerrar: () => void }) {
  const aplicar = useAplicar(vista);
  const [f, setF] = useState<Filtros>(() => filtrosDe(vista));
  const [mas, setMas] = useState(false);
  const conInvestigacion = hechos.some((h) => h.inv !== null);
  const bloques = BLOQUES.filter((b) => b.clave !== "inv" || conInvestigacion);
  const masAbierto = mas || bloques.some((b) => b.mas && puesto(f, b.clave));
  const total = hechos.filter((h) => pasa(h, f, hoy, vista.q)).length;
  const poner = (clave: ClaveFiltro, valor: string | number) => setF((x) => ({ ...x, [clave]: valor }));

  const bloque = (clave: ClaveFiltro, rotulo: string) => (
    <BloqueFiltro key={clave} rotulo={rotulo}>
      <Chips ariaLabel={rotulo} envuelve>
        {opcionesConCuenta(hechos, f, clave, hoy, vista.q).map((o) => (
          <Chip key={String(o.valor)} activo={o.activo} onClick={() => poner(clave, o.valor)}>
            {o.etiqueta}
            <Cuenta n={o.n} />
          </Chip>
        ))}
      </Chips>
    </BloqueFiltro>
  );
  return (
    <HojaFiltros
      titulo="Filtros"
      resultado={total ? `Ver ${artistas(total)}` : "Nadie con estos filtros"}
      sinResultados={!total}
      onLimpiar={() => setF({ ...SIN_FILTROS })}
      onVer={() => {
        onCerrar();
        aplicar(f);
      }}
      onCerrar={onCerrar}
    >
      {grupos.length > 0 && (
        <BloqueFiltro rotulo="Tus grupos">
          <Chips ariaLabel="Tus grupos" envuelve>
            {grupos.map((g) => (
              <Chip key={g.id} activo={mismosFiltros(g.filtros, f)} onClick={() => setF({ ...g.filtros })}>
                {g.nombre}
                <Cuenta n={hechos.filter((h) => pasa(h, g.filtros, hoy, vista.q)).length} />
              </Chip>
            ))}
          </Chips>
        </BloqueFiltro>
      )}
      {bloques.filter((b) => !b.mas).map((b) => bloque(b.clave, b.rotulo))}
      <button type="button" className={s.mas} aria-expanded={masAbierto} onClick={() => setMas(!masAbierto)}>
        <IconoFiltros width={18} height={18} />
        <b>Más filtros</b>
        <small>{conInvestigacion ? "Estado, investigación, solista o grupo" : "Estado, solista o grupo"}</small>
        <IconoCaret width={16} height={16} />
      </button>
      {masAbierto && bloques.filter((b) => b.mas).map((b) => bloque(b.clave, b.rotulo))}
    </HojaFiltros>
  );
}

/**
 * Lo puesto, debajo de las filas de arriba (OL-446): cada filtro de la hoja con su ✕ (Disciplina no: tiene su fila a la vista, respuesta 1) y al
 * final «Guardar como grupo». Con un grupo puesto, un solo chip con su nombre (su ✕ quita todo) y «Editar grupo», que abre su hoja: cambiar el
 * nombre o borrarlo. Quitar no apila historial.
 */
export function FiltrosPuestos({ vista, grupos, hechos, hoy }: { vista: Vista; grupos: Grupo[] | null; hechos: Hechos[]; hoy: string }) {
  const aplicar = useAplicar(vista);
  const [hoja, setHoja] = useState<"guardar" | "editar" | null>(null);
  const f = filtrosDe(vista);
  const g = grupoPuesto(grupos ?? [], f);
  const lista = puestos(f).filter((b) => b.clave !== "disciplina");
  if (!g && !puestos(f).length) return null;
  return (
    <>
      <Chips ariaLabel="Filtros puestos" envuelve>
        {g ? (
          <Chip variante="quitar" onClick={() => aplicar({ ...SIN_FILTROS })}>
            {g.nombre}
          </Chip>
        ) : (
          lista.map((b) => (
            <Chip key={b.clave} variante="quitar" onClick={() => aplicar({ ...f, [b.clave]: SIN_FILTROS[b.clave] })}>
              {textoPuesto(f, b.clave)}
            </Chip>
          ))
        )}
        {grupos && (
          <Chip icono={<IconoMarcador width={18} height={18} />} onClick={() => setHoja(g ? "editar" : "guardar")}>
            {g ? "Editar grupo" : "Guardar como grupo"}
          </Chip>
        )}
      </Chips>
      {hoja && <HojaGrupo f={f} grupo={hoja === "editar" ? g : null} n={hechos.filter((h) => pasa(h, f, hoy)).length} onCerrar={() => setHoja(null)} />}
    </>
  );
}

/**
 * La hoja de un grupo (OL-446; respuesta 3 del gestor: un grupo es un filtro con nombre). Nuevo: resume lo puesto («hoy, 7 artistas») y propone el
 * nombre en un campo con su ✕; sin nombre, el botón lo dice. Ya guardado: el mismo campo para cambiar el nombre y «Borrar el grupo» (se borra el
 * filtro con nombre; los filtros siguen puestos).
 */
function HojaGrupo({ f, grupo, n, onCerrar }: { f: Filtros; grupo: Grupo | null; n: number; onCerrar: () => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(grupo?.nombre ?? nombreGrupo(f));
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const falta = faltaNombreGrupo(nombre);
  function guardar() {
    if (falta) return;
    setError(null);
    iniciar(async () => {
      const r = grupo ? await renombrarGrupo(grupo.id, nombre) : await guardarGrupo(nombre, filtrosPuestos(f));
      if (!r.ok) return setError(r.error);
      onCerrar();
      router.refresh();
    });
  }
  function borrar() {
    if (!grupo) return;
    setError(null);
    iniciar(async () => {
      const r = await borrarGrupo(grupo.id);
      if (!r.ok) return setError(r.error);
      onCerrar();
      router.refresh();
    });
  }
  const titulo = grupo ? "Editar grupo" : "Guardar como grupo";
  return (
    <Hoja
      etiqueta={titulo}
      titulo={titulo}
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="secundario" disabled={enCamino} onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton disabled={enCamino} aria-busy={enCamino} onClick={guardar}>
            {enCamino ? "Guardando…" : (falta ?? (grupo ? "Guardar el nombre" : "Guardar el grupo"))}
          </Boton>
        </>
      }
    >
      <p className={hojaCss.nota}>Guarda los filtros, no a las personas: quien los cumpla después entra solo. Sale primero en la hoja Filtros.</p>
      <ul className={`${renglon.tarjeta} ${s.resumen}`}>
        <li>
          <div className={admin.fila}>
            <IconoFiltros width={20} height={20} />
            <b>{resumenFiltros(f)}</b>
            <small>Hoy, {artistas(n)}</small>
          </div>
        </li>
      </ul>
      <Campo
        etiqueta="Nombre del grupo"
        name="nombre-grupo"
        value={nombre}
        maxLength={LIMITE_NOMBRE_GRUPO}
        autoComplete="off"
        enterKeyHint="done"
        onChange={(e) => {
          setNombre(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          guardar();
        }}
        ayuda={grupo ? "Cámbialo si quieres; los filtros no cambian." : "Lo propone el sistema con lo que pusiste; cámbialo si quieres."}
      />
      {grupo && (
        <Boton variante="peligro" ancho="contenido" disabled={enCamino} onClick={borrar}>
          Borrar el grupo
        </Boton>
      )}
      {error && (
        <p className="aviso-error" role="alert">
          {error}
        </p>
      )}
    </Hoja>
  );
}
