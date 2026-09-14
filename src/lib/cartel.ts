import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CIUDAD_INICIAL } from "./ciudad";
import type { LecturaCartel } from "./eventos";
import { ZONA } from "./fechas";

/** La lectura de carteles se activa cuando hay llave de API de Anthropic en el servidor. */
export function lecturaDeCartelActiva(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const Lectura = z.object({
  titulo: z.string().nullable().describe("Nombre del evento tal como aparece en el cartel"),
  fecha: z.string().nullable().describe("Fecha de inicio en formato YYYY-MM-DD; null si no aparece"),
  hora: z.string().nullable().describe("Hora de inicio en formato HH:MM de 24 horas; null si no aparece"),
  hora_fin: z.string().nullable().describe("Hora de fin en formato HH:MM de 24 horas; null si no aparece"),
  lugar: z.string().nullable().describe("Nombre del lugar o recinto"),
  direccion: z.string().nullable().describe("Dirección si aparece"),
  gratis: z.boolean().nullable().describe("true si dice gratis o entrada libre; false si hay precio; null si no se sabe"),
  precio: z.string().nullable().describe("Precio tal como aparece, ej. '$150' o '$100 estudiantes'"),
  descripcion: z.string().nullable().describe("Una o dos frases con lo que se anuncia (quiénes, qué); sin repetir título, fecha ni lugar"),
  enlace: z.string().nullable().describe("Enlace, usuario de redes o teléfono de contacto si aparece"),
  artistas: z.array(z.string()).nullable().describe("Nombres de los artistas, grupos o compañías que se presentan, tal como aparecen; null si no se nombra a nadie"),
});

/**
 * Lee un cartel (imagen pública en Storage) y devuelve los datos del evento.
 * Devuelve null si no hay llave, si el modelo declina, o si la respuesta no se pudo interpretar.
 */
export async function leerCartel(urlImagen: string, ahora: Date = new Date()): Promise<LecturaCartel | null> {
  if (!lecturaDeCartelActiva()) return null;
  const client = new Anthropic();
  const hoy = new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(ahora);
  try {
    const respuesta = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4096,
      output_config: { effort: "low", format: zodOutputFormat(Lectura) },
      system: `Lees carteles de eventos culturales de ${CIUDAD_INICIAL.nombre}, México, y sacas los datos para publicarlos en una agenda. Hoy es ${hoy}. Si el cartel da el día sin año, usa la próxima fecha que caiga en ese día a partir de hoy. Si no aparece un dato, devuelve null: no lo inventes. Las horas van en formato de 24 horas.`,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: urlImagen } },
            { type: "text", text: "Saca los datos del evento de este cartel." },
          ],
        },
      ],
    });
    if (respuesta.stop_reason === "refusal") return null;
    return (respuesta.parsed_output as LecturaCartel | null) ?? null;
  } catch (e) {
    console.error("leerCartel:", e instanceof Error ? e.message : e);
    return null;
  }
}
