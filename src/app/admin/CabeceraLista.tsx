"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CampoBuscar } from "@/components/ui/Buscador";
import Cabecera from "@/components/ui/Cabecera";
import { Chip, Chips, Cuenta } from "@/components/ui/Chip";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import HojaFiltros, { BloqueFiltro } from "@/components/ui/HojaFiltros";
import { IconoAyuda, IconoCaret, IconoEncuadrar, IconoFiltros, IconoOk, IconoPin } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import ciudadCss from "@/components/Ciudad.module.css";
import { normalizarNombre } from "@/lib/lugares";
import { FILTROS, GALLETA_CIUDAD, hrefLista, type Lista, type SeccionPanel } from "@/lib/panel";
import type { CiudadPanel } from "./consultas";

/** Cómo se dice cada sección en la hoja de ciudades y en el botón de Filtros: una, varias y lo que cuenta su hoja. */
const PALABRAS: Record<SeccionPanel, { una: string; varias: string; nota: string }> = {
  personas: { una: "persona", varias: "personas", nota: "La ciudad de cada persona es la que más se repite en lo que lleva, publica y marca «Voy»." },
  lugares: { una: "lugar", varias: "lugares", nota: "Cuenta todos los lugares de cada ciudad, también los ocultos." },
  eventos: { una: "evento", varias: "eventos", nota: "Cuenta los eventos próximos de cada ciudad." },
  artistas: { una: "artista", varias: "artistas", nota: "Cuenta todas las fichas de artista de cada ciudad." },
};

/** «Ver 14 lugares», «Ver 1 lugar», «Sin lugares». */
const cuantos = (s: SeccionPanel, n: number) => (n === 0 ? `Sin ${PALABRAS[s].varias}` : n === 1 ? `Ver 1 ${PALABRAS[s].una}` : `Ver ${n} ${PALABRAS[s].varias}`);

/** Recuerda la ciudad elegida en las cuatro listas mientras la app está abierta: una galleta sin fecha (de sesión); «todas» la borra. */
function recordarCiudad(slug: string | null) {
  document.cookie = slug ? `${GALLETA_CIUDAD}=${slug}; path=/admin; SameSite=Lax` : `${GALLETA_CIUDAD}=; path=/admin; max-age=0; SameSite=Lax`;
}

type Props = {
  seccion: SeccionPanel;
  lista: Lista;
  /** Cuántas da cada filtro en la ciudad elegida (null si no se pudieron leer: los chips van sin cuenta). */
  conteos: Record<string, number> | null;
  /** Las ciudades de la hoja, de la que más tiene a la que menos (la elegida va aunque aquí no tenga nada). */
  ciudades: CiudadPanel[];
};

/**
 * La cabecera de las listas de Administración (OL-456): la de Lugares del front (`ui/Cabecera`): el chip de la ciudad, que abre la hoja de
 * ciudades (la de la app, con «Todas las ciudades» arriba y, en Personas, «Sin ciudad» al final), el chip Filtros, que abre `ui/HojaFiltros`
 * con cada filtro y su cuenta, y el filtro puesto con su ✕. Filtrar no es navegar: todo reemplaza la entrada del historial y vuelve a la
 * primera página.
 */
export default function CabeceraLista({ seccion, lista, conteos, ciudades }: Props) {
  const router = useRouter();
  const [abierta, setAbierta] = useState<"ciudad" | "filtros" | null>(null);
  const porDefecto = FILTROS[seccion][0].valor;
  const puesto = FILTROS[seccion].find((f) => f.valor === lista.filtro && f.valor !== porDefecto);
  const ir = (cambios: Partial<Lista>) => router.replace(hrefLista(seccion, { q: lista.q, filtro: lista.filtro, ciudad: lista.ciudad, ...cambios }), { scroll: false });
  const nombre = lista.ciudad ? (ciudades.find((c) => c.slug === lista.ciudad)?.nombre ?? lista.ciudad) : "Todas las ciudades";

  return (
    <Cabecera
      contexto={
        <>
          <Chip variante="contexto" activo={!!lista.ciudad} icono={<IconoPin width={16} height={16} />} fin={<IconoCaret width={12} height={12} />} onClick={() => setAbierta("ciudad")}>
            {nombre}
          </Chip>
          <Chip variante="contexto" icono={<IconoFiltros width={16} height={16} />} cuenta={puesto ? 1 : 0} onClick={() => setAbierta("filtros")}>
            Filtros
          </Chip>
          {puesto && (
            <Chip variante="quitar" onClick={() => ir({ filtro: porDefecto })}>
              {puesto.etiqueta}
            </Chip>
          )}
          {abierta === "ciudad" && (
            <HojaCiudades
              seccion={seccion}
              ciudades={ciudades}
              elegida={lista.ciudad}
              onElegir={(slug) => {
                setAbierta(null);
                recordarCiudad(slug);
                if (slug !== lista.ciudad) ir({ ciudad: slug });
              }}
              onCerrar={() => setAbierta(null)}
            />
          )}
          {abierta === "filtros" && (
            <HojaDeFiltros
              seccion={seccion}
              filtro={lista.filtro}
              conteos={conteos}
              onVer={(filtro) => {
                setAbierta(null);
                if (filtro !== lista.filtro) ir({ filtro });
              }}
              onCerrar={() => setAbierta(null)}
            />
          )}
        </>
      }
    />
  );
}

/** La hoja de ciudades de la app (`components/Ciudad.tsx`): un renglón por ciudad con su cuenta y ✓ en la elegida; con más de 8, su campo con ✕. */
function HojaCiudades({ seccion, ciudades, elegida, onElegir, onCerrar }: { seccion: SeccionPanel; ciudades: CiudadPanel[]; elegida: string | null; onElegir: (slug: string | null) => void; onCerrar: () => void }) {
  const [texto, setTexto] = useState("");
  const { una, varias, nota } = PALABRAS[seccion];
  const titulo = `Ciudades con ${varias}`;
  const buscado = normalizarNombre(texto);
  const filas = ciudades.filter((c) => normalizarNombre(c.nombre).includes(buscado));
  const total = ciudades.reduce((t, c) => t + c.n, 0);
  const cuenta = (n: number) => (n === 1 ? `1 ${una}` : n ? `${n.toLocaleString("es-MX")} ${varias}` : `Sin ${varias} todavía`);
  const fila = (slug: string | null, nombre: string, n: number) => {
    const actual = slug === elegida;
    return (
      <li key={slug ?? "todas"}>
        <button type="button" className={renglon.ajuste} onClick={() => onElegir(slug)} aria-current={actual ? "true" : undefined}>
          {slug === null ? <IconoEncuadrar width={20} height={20} /> : slug === "sin" ? <IconoAyuda width={20} height={20} /> : <IconoPin width={20} height={20} />}
          <b>{nombre}</b>
          <small>{cuenta(n)}</small>
          {actual && <IconoOk />}
        </button>
      </li>
    );
  };
  return (
    <Hoja etiqueta={titulo} titulo={titulo} plano onCerrar={onCerrar}>
      <p className={hoja.nota}>{nota}</p>
      <div className={buscado ? `${ciudadCss.opciones} ${ciudadCss.buscando}` : ciudadCss.opciones}>
        {ciudades.length > 8 && <CampoBuscar valor={texto} onCambiar={setTexto} placeholder="Nombre de la ciudad" ariaLabel="Nombre de la ciudad" />}
        {buscado && !filas.length ? (
          <p className={hoja.nota}>Nada con «{texto.trim()}».</p>
        ) : (
          <ul className={`${renglon.tarjeta} ${ciudadCss.lista}`}>
            {!buscado && fila(null, "Todas las ciudades", total)}
            {filas.map((c) => fila(c.slug, c.nombre, c.n))}
          </ul>
        )}
      </div>
    </Hoja>
  );
}

/** Filtros: los de la lista, cada uno con cuántas da en la ciudad elegida; el botón dice cuántas y solo él aplica. */
function HojaDeFiltros({ seccion, filtro, conteos, onVer, onCerrar }: { seccion: SeccionPanel; filtro: string; conteos: Record<string, number> | null; onVer: (filtro: string) => void; onCerrar: () => void }) {
  const [borrador, setBorrador] = useState(filtro);
  const n = conteos?.[borrador] ?? null;
  return (
    <HojaFiltros
      titulo="Filtros"
      resultado={n === null ? "Ver" : cuantos(seccion, n)}
      sinResultados={n === 0}
      onLimpiar={() => setBorrador(FILTROS[seccion][0].valor)}
      onVer={() => onVer(borrador)}
      onCerrar={onCerrar}
    >
      <BloqueFiltro rotulo="Mostrar">
        <Chips ariaLabel="Mostrar" envuelve>
          {FILTROS[seccion].map((f) => (
            <Chip key={f.valor} activo={borrador === f.valor} onClick={() => setBorrador(f.valor)}>
              {f.etiqueta}
              {conteos && <Cuenta n={conteos[f.valor] ?? 0} />}
            </Chip>
          ))}
        </Chips>
      </BloqueFiltro>
    </HojaFiltros>
  );
}
