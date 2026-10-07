"""
Letras del creador de cartel (OL-324, bitácora 353): instancias fijas de Bricolage Grotesque y su tabla de anchos.

satori (el que arma el cartel en el servidor) no lee fuentes variables ni woff2: hacen falta TTF fijos, uno por combinación de
peso, ancho y tamaño óptico. Se sacan de la fuente variable de Google Fonts (licencia OFL, la misma de la app; `OFL.txt` va al lado)
y se recortan a latín, latín-1 y latín extendido A (los acentos, la ñ y la ü del español, y el resto de Europa occidental).

La tabla de anchos (`anchos.json`) es lo que mide el texto antes de dibujar (`src/lib/carteles/medir.ts`): el avance de cada letra
en unidades del diseño. Así el largo del título se resuelve con cálculo, sin dibujar a ciegas.

Uso (una vez, cuando cambie la lista de instancias):
    python3 -m venv venv && ./venv/bin/pip install fonttools
    curl -L -o "BricolageGrotesque[opsz,wdth,wght].ttf" \
      "https://github.com/google/fonts/raw/main/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz%2Cwdth%2Cwght%5D.ttf"
    ./venv/bin/python scripts/carteles/instancias.py "BricolageGrotesque[opsz,wdth,wght].ttf"
"""
import json
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

RAIZ = Path(__file__).resolve().parents[2]
DESTINO = RAIZ / "src/lib/carteles/fuentes"

# Nombre → ejes. Los nombres son los de `FUENTES` en src/lib/carteles/tokens.ts.
INSTANCIAS = {
    "condensada-negra": {"opsz": 96, "wdth": 75, "wght": 800},
    "ancha-negra": {"opsz": 96, "wdth": 100, "wght": 800},
    "ligera": {"opsz": 96, "wdth": 100, "wght": 300},
    "media": {"opsz": 24, "wdth": 100, "wght": 600},
    "regular": {"opsz": 14, "wdth": 100, "wght": 400},
}
UNICODES = "U+0020-007E,U+00A0-017F,U+2010-2027,U+2030-203A,U+20AC,U+2122"


def main(variable: str) -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    anchos = {}
    for nombre, ejes in INSTANCIAS.items():
        ruta = DESTINO / f"bricolage-{nombre}.ttf"
        instancer.instantiateVariableFont(TTFont(variable), ejes).save(ruta)
        opciones = subset.Options()
        opciones.layout_features = ["kern", "liga", "ccmp", "locl", "mark", "mkmk"]
        opciones.name_IDs = ["*"]
        opciones.notdef_outline = True
        fuente = TTFont(ruta)
        recorte = subset.Subsetter(opciones)
        recorte.populate(unicodes=subset.parse_unicodes(UNICODES))
        recorte.subset(fuente)
        fuente.save(ruta)
        fuente = TTFont(ruta)
        hmtx = fuente["hmtx"]
        anchos[nombre] = {
            "upm": fuente["head"].unitsPerEm,
            "anchos": {chr(c): hmtx[g][0] for c, g in sorted(fuente.getBestCmap().items())},
        }
    (RAIZ / "src/lib/carteles/anchos.json").write_text(json.dumps(anchos, ensure_ascii=False, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "BricolageGrotesque[opsz,wdth,wght].ttf")
