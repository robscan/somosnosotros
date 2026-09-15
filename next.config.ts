import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad (revisión 2026-09-14, M1). Sin CSP completa todavía: Next y Mapbox exigen
 * 'unsafe-inline'/'unsafe-eval' y blob:, y una CSP mal afinada rompe el mapa en producción sin avisar;
 * `frame-ancestors` sola sí es segura y evita que otra página nos meta en un iframe (clickjacking sobre Voy, Seguir, borrar cuenta).
 */
const CABECERAS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: CABECERAS }];
  },
};

export default nextConfig;
