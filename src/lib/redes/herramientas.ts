import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarParaHoja } from "@/app/admin/instagram/datos";
import { cargarParaCartel } from "../carteles/cargar";
import { publicarEnPagina } from "../facebook/api";
import { cupo, publicar, publicarCarrusel } from "../instagram/api";
import { PORTADA, type ImagenCarrusel } from "../instagram/carrusel";
import { armarImagen, bajarCartel, encajarCartel } from "../instagram/imagen";
import { enviarPush, marcarDireccionMuerta, pushActivo, type AvisoPush } from "../push";
import type { ClienteServidor } from "../supabase/servidor";
import type { Herramientas } from "./trabajar";

/**
 * Las herramientas de verdad del trabajador de la cola de redes (OL-465): la carga de la hoja, el dibujo de las imágenes (lo mismo que hacía la
 * acción de publicar: el cartel encajado o el diseño de Crear cartel, y el cartel de cada acto de un carrusel), Storage, las APIs de Instagram y
 * de la página de Facebook, y el aviso al teléfono. Todo con la llave de servicio: el trabajador no tiene sesión.
 */

/** La carga de la hoja con la llave de servicio (las mismas consultas: la llave ve lo que ve la administración). */
const comoServidor = (db: SupabaseClient) => db as unknown as ClienteServidor;

export async function avisarAlTelefono(db: SupabaseClient, usuarioId: string | null, aviso: AvisoPush): Promise<void> {
  if (!usuarioId) return;
  try {
    const { data: perfil } = await db.from("perfiles").select("avisos_push").eq("id", usuarioId).maybeSingle<{ avisos_push: boolean | null }>();
    // Quien apagó los avisos al teléfono no recibe este tampoco; sin la llave de Web Push, solo los de la app de iPhone.
    if (perfil && perfil.avisos_push === false) return;
    const [web, apns] = await Promise.all([
      // Sin las direcciones que el proveedor ya dio por muertas (OL-476).
      pushActivo() ? db.from("suscripciones_push").select("endpoint, p256dh, auth").eq("usuario_id", usuarioId).is("muerta_en", null).limit(10) : Promise.resolve({ data: [] as unknown[] }),
      db.from("dispositivos_apns").select("token, entorno").eq("usuario_id", usuarioId).is("muerta_en", null).limit(10),
    ]);
    const cuerpo = JSON.stringify(aviso);
    const envios = [
      ...((web.data ?? []) as { endpoint: string; p256dh: string; auth: string }[]).map((s) => ({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })),
      ...((apns.data ?? []) as { token: string; entorno: "sandbox" | "produccion" }[]).map((d) => ({ apns: { token: d.token, entorno: d.entorno } })),
    ];
    await Promise.allSettled(envios.map(async (s) => marcarDireccionMuerta(s, await enviarPush(s, cuerpo, 3600))));
  } catch {
    console.warn("redes: no se pudo mandar el aviso al teléfono");
  }
}

export function herramientasReales(): Herramientas {
  return {
    cargar: (db, eventoId, ahora) => cargarParaHoja(comoServidor(db), eventoId, ahora),
    dibujar: async (db, h, o) => {
      const [cartel, datos] = await Promise.all([bajarCartel(h.imagen), o.perfilId ? cargarParaCartel(comoServidor(db), h.id, { perfilId: o.perfilId }) : null]);
      const portada = async () => {
        if (!cartel && !datos) throw new Error("sin datos para el diseño");
        return armarImagen({ cartel: cartel?.bytes ?? null, datos: datos!, formato: o.formato, recorte: o.recorte, diseno: o.diseno });
      };
      if (!o.items.length) return [{ item: null, bytes: await portada() }];
      const dibujar = async (i: ImagenCarrusel): Promise<Buffer | null> => {
        if (i.clave === PORTADA || !i.imagen) return portada();
        const suyo = await bajarCartel(i.imagen);
        return suyo ? encajarCartel(suyo.bytes, "4x5", false) : null;
      };
      const hechas = await Promise.all(o.items.map(async (item) => ({ item, bytes: await dibujar(item) })));
      return hechas.filter((x): x is { item: ImagenCarrusel; bytes: Buffer } => !!x.bytes);
    },
    subir: async (db, carpeta, bytes) => {
      const ruta = `lugares/${carpeta}/instagram-${crypto.randomUUID()}.jpg`;
      const subida = await db.storage.from("fotos").upload(ruta, bytes, { contentType: "image/jpeg", upsert: false });
      return subida.error ? null : db.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
    },
    cupo: () => cupo(),
    publicar: (p) => publicar(p),
    publicarCarrusel: (p) => publicarCarrusel(p),
    publicarEnPagina: (p) => publicarEnPagina(p),
    avisar: avisarAlTelefono,
  };
}
