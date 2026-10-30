"use server";

import type { ReactNode } from "react";
import hoja from "@/components/ui/Hoja.module.css";
import { diaLocal } from "@/lib/fechas";
import { indicadorAvisos, indicadores, indicadoresAportes, indicadoresFichas, notaFichas, notaSemana } from "@/lib/panel";
import { usuarioActual } from "@/lib/supabase/servidor";
import CapoComoVa from "./CapoComoVa";
import { cargarCapo } from "./capo-consultas";
import ComunidadComoVa from "./ComunidadComoVa";
import { cargarAportes, cargarAvisos, cargarComunidad, cargarSoloResumen, cargarVinculadas } from "./consultas";
import Indicadores from "./Indicadores";
import styles from "./admin.module.css";

/** Un bloque que no se pudo leer: la causa en su sitio (la hoja ofrece «Intentar de nuevo» abajo). */
const NoSePudo = ({ texto }: { texto: string }) => (
  <p className={styles.error} role="alert">
    {texto}
  </p>
);

/**
 * La hoja «Todos los números» de Administración (OL-494, variante C firmada del prototipo OL-493, bitácora 525): lo que salió de la portada, sin
 * borrar nada. Los siete indicadores de «Últimos 7 días» con su línea de tendencia, «Cómo va la comunidad», «Fichas» y «Campañas pasadas» (el
 * CAPO con su medición entera). Se arma en el servidor al abrir la hoja, con la sesión de quien mira: la portada ya no lee el embudo, las fichas
 * ni el CAPO al entrar. `fallos`: cuántos bloques no se pudieron leer (la hoja ofrece volver a pedirlos). null sin la administración.
 */
export async function abrirTodosLosNumeros(): Promise<{ cuerpo: ReactNode; fallos: number } | null> {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return null;
  const [resumen, aportes, avisos, comunidad, vinculadas, capo] = await Promise.all([cargarSoloResumen(), cargarAportes(), cargarAvisos(), cargarComunidad(), cargarVinculadas(), cargarCapo()]);
  const lista = resumen ? [...indicadores(resumen, diaLocal(new Date())), ...(aportes ? indicadoresAportes(aportes) : []), ...(avisos ? [indicadorAvisos(avisos)] : [])] : [];
  const fichas = vinculadas ? indicadoresFichas(vinculadas) : [];
  const fallos = [resumen, comunidad, vinculadas, capo].filter((x) => !x).length + (resumen && (!aportes || !avisos) ? 1 : 0);
  const cuerpo = (
    <>
      <p className={hoja.nota}>Toca un número para ver qué cuenta y de dónde sale.</p>
      <h2 className={resumen ? `${styles.grupo} ${styles.conNota}` : styles.grupo}>Últimos 7 días</h2>
      {resumen ? <Indicadores lista={lista} nota={notaSemana(lista)} desglose="desglose-hoja" /> : <NoSePudo texto="No pudimos leer los indicadores." />}
      {resumen && !aportes && <NoSePudo texto="No pudimos leer Voy y Me interesa ni las primeras publicaciones." />}
      {resumen && !avisos && <NoSePudo texto="No pudimos leer los avisos abiertos." />}

      <h2 className={styles.grupo}>Cómo va la comunidad</h2>
      {comunidad ? <ComunidadComoVa comunidad={comunidad} /> : <NoSePudo texto="No pudimos leer el embudo de la comunidad." />}

      <h2 className={vinculadas ? `${styles.grupo} ${styles.conNota}` : styles.grupo}>Fichas</h2>
      {vinculadas ? <Indicadores lista={fichas} nota={notaFichas(fichas)} desglose="desglose-fichas" /> : <NoSePudo texto="No pudimos leer las fichas vinculadas." />}

      <h2 className={`${styles.grupo} ${styles.conNota}`}>Campañas pasadas</h2>
      <p className={styles.nota}>Invitaciones por correo a las fichas del catálogo del CAPO. Ya no se mandan; su medición se queda.</p>
      {capo ? <CapoComoVa metricas={capo} /> : <NoSePudo texto="No pudimos leer los resultados de las invitaciones CAPO." />}
    </>
  );
  return { cuerpo, fallos };
}
