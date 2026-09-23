import { describe, expect, it } from "vitest";
import { videoEmbedDe } from "./video";

describe("videoEmbedDe", () => {
  it("YouTube: watch, youtu.be, shorts y embed dan el mismo id validado, embebido en youtube-nocookie.com", () => {
    expect(videoEmbedDe({ red: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })).toEqual({ proveedor: "youtube", id: "dQw4w9WgXcQ", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
    expect(videoEmbedDe({ red: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" })?.src).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(videoEmbedDe({ red: "youtube", url: "https://www.youtube.com/shorts/dQw4w9WgXcQ" })?.id).toBe("dQw4w9WgXcQ");
    expect(videoEmbedDe({ red: "youtube", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" })?.id).toBe("dQw4w9WgXcQ");
    expect(videoEmbedDe({ red: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s" })?.id).toBe("dQw4w9WgXcQ");
  });

  it("Vimeo: vimeo.com/<id> y player.vimeo.com/video/<id> dan el id numérico embebido en player.vimeo.com", () => {
    expect(videoEmbedDe({ red: "vimeo", url: "https://vimeo.com/123456789" })).toEqual({ proveedor: "vimeo", id: "123456789", src: "https://player.vimeo.com/video/123456789" });
    expect(videoEmbedDe({ red: "vimeo", url: "https://player.vimeo.com/video/123456789" })?.id).toBe("123456789");
    expect(videoEmbedDe({ red: "vimeo", url: "https://vimeo.com/channels/staffpicks/123456789" })?.id).toBe("123456789");
  });

  it("una red que no es video devuelve null sin mirar la URL", () => {
    expect(videoEmbedDe({ red: "instagram", url: "https://www.instagram.com/losvecinos/" })).toBeNull();
    expect(videoEmbedDe({ red: "sitio", url: "https://casa1100.mx" })).toBeNull();
  });

  it("enlaces de video con forma irreconocible quedan como enlace de texto (null)", () => {
    expect(videoEmbedDe({ red: "youtube", url: "https://www.youtube.com/channel/UC1234567890" })).toBeNull();
    expect(videoEmbedDe({ red: "youtube", url: "https://www.youtube.com/watch" })).toBeNull(); // sin ?v=
    expect(videoEmbedDe({ red: "youtube", url: "https://www.youtube.com/@artista" })).toBeNull();
    expect(videoEmbedDe({ red: "vimeo", url: "https://vimeo.com/cineastaslp" })).toBeNull(); // id no numérico
    expect(videoEmbedDe({ red: "vimeo", url: "https://vimeo.com/" })).toBeNull();
  });

  it("intentos de inyección: el id se valida por regex y el dominio nunca sale de un tercero", () => {
    // dominio ajeno con "youtube.com" solo en la ruta o como subdominio falso
    expect(videoEmbedDe({ red: "youtube", url: "https://evil.com/youtube.com/watch?v=dQw4w9WgXcQ" })).toBeNull();
    expect(videoEmbedDe({ red: "youtube", url: "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ" })).toBeNull();
    // id con HTML/script embebido en vez de un id de 11 caracteres
    expect(videoEmbedDe({ red: "youtube", url: "https://www.youtube.com/watch?v=%3Cscript%3E" })).toBeNull();
    expect(videoEmbedDe({ red: "youtube", url: 'https://www.youtube.com/watch?v="><script>alert(1)</script>' })).toBeNull();
    // esquema no http(s)
    expect(videoEmbedDe({ red: "youtube", url: "javascript:alert(1)" })).toBeNull();
    // id demasiado largo (querer colar más que el id)
    expect(videoEmbedDe({ red: "youtube", url: "https://youtu.be/dQw4w9WgXcQ/../../admin" })).toBeNull();
    // Vimeo con letras coladas en el id
    expect(videoEmbedDe({ red: "vimeo", url: "https://vimeo.com/123<script>456" })).toBeNull();
    // URL malformada
    expect(videoEmbedDe({ red: "youtube", url: "no es una url" })).toBeNull();
  });

  it("el src armado nunca contiene la URL original, solo el id validado", () => {
    const v = videoEmbedDe({ red: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=algo&otro=<script>" });
    expect(v?.src).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(v?.src).not.toContain("<script>");
    expect(v?.src).not.toContain("list=");
  });
});
