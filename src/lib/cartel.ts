import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CIUDAD_INICIAL } from "./ciudad";
import type { LecturaCartel } from "./eventos";
import { ZONA_INICIAL } from "./fechas";

/** La lectura de carteles se activa cuando hay llave de API de Anthropic en el servidor. */
export function lecturaDeCartelActiva(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const Lectura = z.object({
  titulo: z.string().nullable().describe("Nombre del evento tal como aparece en el cartel"),
  fecha: z.string().nullable().describe("Fecha de inicio en formato YYYY-MM-DD; null si no aparece"),
  hora: z.string().nullable().describe("Hora de inicio en formato HH:MM de 24 horas; null si no aparece"),
  hora_fin: z.string().nullable().describe("Hora de fin en formato HH:MM de 24 horas; null si no aparece"),
  lugar: z.string().nullable().describe("Nombre del lugar o recinto donde es (si el cartel lo dice o trae su logotipo como sede); null si solo da la dirección"),
  direccion: z.string().nullable().describe("Dirección si aparece: calle y número tal como vienen (ej. '5 de mayo 1100, Centro Histórico'), aunque el cartel no diga el nombre del lugar"),
  gratis: z.boolean().nullable().describe("true si dice gratis o entrada libre; false si hay precio; null si no se sabe"),
  precio: z.string().nullable().describe("Precio tal como aparece, ej. '$150' o '$100 estudiantes'"),
  descripcion: z.string().nullable().describe("Una o dos frases con lo que se anuncia (quiénes, qué; si la noche tiene varias actividades como concierto, cortometraje, charla, nómbralas aquí); sin repetir título, fecha ni lugar"),
  enlace: z.string().nullable().describe("Enlace, usuario de redes o teléfono de contacto si aparece"),
  artistas: z
    .array(z.string())
    .nullable()
    .describe("Nombres de quienes se presentan (artistas, grupos, sonidos, DJ, compañías, ponentes), tal como aparecen. Aquí va la alineación de una noche o de un festival de un día en un solo lugar, aunque cada quien tenga su hora. No pongas actividades ('Concierto', 'Charla', 'Cócteles') ni rellenos ('Sorpresas'). null si no se nombra a nadie"),
  // Cómo ocurre (OL-321, doc 55 §2): el cartel propone la clase y, si los trae, el periodo de visita, los días de las sesiones o el programa.
  // OL-413 (definición aprobada por el founder el 18 de octubre): un festival es un nombre que reúne varias presentaciones; el programa es opcional.
  clase: z
    .enum(["puntual", "exposicion", "taller", "festival"])
    .nullable()
    .describe("Cómo ocurre: 'exposicion' si se visita varios días (exposición, muestra), 'taller' si son varias sesiones con una inscripción (taller, curso, diplomado), 'festival' solo si el cartel se presenta como festival (dice festival, fest, encuentro, jornadas), aunque sea un solo día en un solo lugar; 'puntual' si es un evento, también una noche con varias actividades o varios artistas que no se presenta como festival; null si no se sabe"),
  visita: z
    .object({
      desde: z.string().nullable().describe("Primer día en que se puede visitar, YYYY-MM-DD"),
      hasta: z.string().nullable().describe("Último día en que se puede visitar (el cierre), YYYY-MM-DD"),
    })
    .nullable()
    .describe("Solo para una exposición: del primer al último día de visita; null si no es exposición o no lo dice. La inauguración va en fecha y hora, no aquí"),
  sesiones: z.array(z.string()).nullable().describe("Solo para un taller o curso: cada día con sesión, YYYY-MM-DD; null si no los dice"),
  actos: z
    .array(
      z.object({
        titulo: z.string().nullable().describe("Nombre de ese evento del programa"),
        fecha: z.string().nullable().describe("Su día, YYYY-MM-DD"),
        hora: z.string().nullable().describe("Su hora de inicio, HH:MM de 24 horas"),
        lugar: z.string().nullable().describe("Su sede, si el cartel la dice"),
      }),
    )
    .nullable()
    .describe("Solo para un programa con días distintos o sedes distintas (un festival de varios días, o con escenarios en varios lugares): cada presentación con su día y su sede. Una alineación de una sola noche en un solo lugar NO es un programa: sus nombres van en artistas y su hora general en hora. null si no hay programa"),
  // OL-323: el festival del que este evento forma parte, para reconocer a los otros actos que se publiquen por separado (H4).
  festival: z
    .string()
    .nullable()
    .describe("Si el cartel dice que este evento forma parte de un festival, su nombre con la edición tal como aparece (ej. 'Festival de Cine UASLP 2026', '9º Festival Internacional de Danza'); null si no lo dice o si solo lo menciona como premio, antecedente o patrocinio"),
});

/**
 * Lee un cartel (imagen pública en Storage) y devuelve los datos del evento.
 * Devuelve null si no hay llave, si el modelo declina, o si la respuesta no se pudo interpretar.
 */
export async function leerCartel(urlImagen: string, ahora: Date = new Date()): Promise<LecturaCartel | null> {
  if (!lecturaDeCartelActiva()) return null;
  const client = new Anthropic();
  const hoy = new Intl.DateTimeFormat("es-MX", { timeZone: ZONA_INICIAL, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(ahora);
  try {
    const respuesta = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      output_config: { effort: "low", format: zodOutputFormat(Lectura) },
      system: `Lees carteles de eventos culturales de ${CIUDAD_INICIAL.nombre}, México, y sacas los datos para publicarlos en una agenda. Hoy es ${hoy}. Si el cartel da el día sin año, usa la próxima fecha que caiga en ese día a partir de hoy. Si no aparece un dato, devuelve null: no lo inventes. Las horas van en formato de 24 horas; si termina de madrugada («8 pm–2 am»), hora_fin es la de la madrugada. Di también cómo ocurre: una exposición que se visita varios días (con su periodo de visita y, si la hay, su inauguración en fecha y hora), un taller o curso con varias sesiones (con sus días), un festival (lo es solo si el cartel se presenta como festival; un festival de un día en un lugar es un solo evento con su alineación en artistas, y solo lleva actos si trae un programa de días o sedes distintas) o un evento (también una noche con varias actividades: una sola entrada, con sus actividades en la descripción y quienes se presentan en artistas).`,
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
