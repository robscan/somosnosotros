import type { Red } from "@/lib/enlaces";
import { IconoAppleMusic, IconoBandcamp, IconoEnlace, IconoFacebook, IconoInstagram, IconoLinktree, IconoSoundCloud, IconoSpotify, IconoThreads, IconoTikTok, IconoVimeo, IconoWhatsApp, IconoX, IconoYouTube } from "./Iconos";

/** El icono de cada red reconocida; un sitio cualquiera lleva el genérico. */
export default function IconoRed({ red, size = 24 }: { red: Red; size?: number }) {
  const p = { width: size, height: size };
  switch (red) {
    case "instagram":
      return <IconoInstagram {...p} />;
    case "facebook":
      return <IconoFacebook {...p} />;
    case "tiktok":
      return <IconoTikTok {...p} />;
    case "youtube":
      return <IconoYouTube {...p} />;
    case "vimeo":
      return <IconoVimeo {...p} />;
    case "spotify":
      return <IconoSpotify {...p} />;
    case "soundcloud":
      return <IconoSoundCloud {...p} />;
    case "bandcamp":
      return <IconoBandcamp {...p} />;
    case "applemusic":
      return <IconoAppleMusic {...p} />;
    case "whatsapp":
      return <IconoWhatsApp {...p} />;
    case "x":
      return <IconoX {...p} />;
    case "threads":
      return <IconoThreads {...p} />;
    case "linktree":
      return <IconoLinktree {...p} />;
    default:
      return <IconoEnlace {...p} />;
  }
}
