import { cache } from "react";
import { usuarioActual } from "@/lib/supabase/servidor";

/**
 * Quién es la persona con sesión, para la barra de la app y para la navegación, que se arman aparte en el layout:
 * una sola lectura por petición, no una por cada una.
 */
export const usuarioDeLaBarra = cache(usuarioActual);
