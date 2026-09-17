"""Insignia de los avisos en Android (public/icono-aviso.png): la silueta del SN en blanco sobre transparente, 96 px.

Android pinta el icono chico de un aviso solo con su canal alfa; con el icono entero (fondo hueso) salía un cuadro
(fricción C3 de docs/rediseno/16). Sale de public/icono-512.png: lo que es tinta queda opaco y lo demás transparente.
Uso, desde la raíz del repo: python3 docs/diseno/logotipo/insignia.py  (necesita Pillow)
"""
from PIL import Image

src = Image.open("public/icono-512.png").convert("RGBA")
gris = src.convert("L")
# Tinta (oscuro) opaca, hueso (claro) transparente, con el borde suavizado entre los dos.
alfa = gris.point(lambda v: 255 if v < 110 else (0 if v > 200 else int((200 - v) * 255 / 90)))
alfa = Image.composite(alfa, Image.new("L", src.size, 0), src.getchannel("A"))
blanco = Image.new("RGBA", src.size, (255, 255, 255, 0))
blanco.putalpha(alfa)
recorte = blanco.crop(blanco.getbbox())
lado = max(recorte.size)
margen = int(lado * 0.08)
final = Image.new("RGBA", (lado + 2 * margen, lado + 2 * margen), (255, 255, 255, 0))
final.paste(recorte, (margen + (lado - recorte.width) // 2, margen + (lado - recorte.height) // 2))
final.resize((96, 96), Image.LANCZOS).save("public/icono-aviso.png", optimize=True)
print("public/icono-aviso.png 96×96")
