"""Crea bricolage-logo.ttf (peso 800, ancho 75, tamaño óptico 96) a partir de la fuente variable de Google Fonts (licencia OFL)."""
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
f = TTFont("BricolageGrotesque[opsz,wdth,wght].ttf")
instancer.instantiateVariableFont(f, {"opsz": 96, "wdth": 75, "wght": 800}).save("bricolage-logo.ttf")
