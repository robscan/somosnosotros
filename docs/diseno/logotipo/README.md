# Logotipo SMSNSTRS con manos y pies

**Estado: aprobado por el founder el 2026-09-15 (borrador 3) y en la app:** barra superior, favicon e icono de instalación. Reglas de uso en [LINEA_GRAFICA.md](../LINEA_GRAFICA.md).

Historia: el borrador 1 (círculos y rectángulos pegados a las letras) se rechazó por calidad. El borrador 2 (manos y zapatos iguales) le pareció bien al founder, que pidió rasgos más orgánicos: manos distintas, algunas haciendo señas, terminaciones que se doblan para dar dirección y pies más claros, con tenis o zapatos.

## Qué hace cada letra

- **Primera S:** saluda; el brazo de abajo se dobla hacia fuera con la mano abierta.
- **Segunda S:** pulgar arriba, con un puño de frente.
- **N:** hace la paz por encima de la línea de las letras. Lleva zapatos de tacón bajo.
- **Tercera S:** mano alzada compacta.
- **T:** manos que cuelgan sobre el hombro de la tercera S y sobre la R. Lleva tenis de bota.
- **Última S:** señala hacia delante con el brazo doblado y hace la seña de te quiero con la otra mano.
- **M y R:** tenis; los de empeine largo llevan dos trazos de cordón. Los pies no llevan líneas horizontales (pedido del founder).
- Las manos de arriba de las S descansan, cada una con otra posición de dedos. Las manos de dentro de las S son compactas para no tapar el hueco de la letra.

## Archivos

- `smsnstrs.svg` — dibujo completo, para 28 px de altura de mayúscula o más.
- `smsnstrs-chico.svg` — dedos más gruesos y calzado sin cordones, para tamaños menores. Mismas posiciones de letra.
- `cabecera.py` — exporta `public/logotipo.svg` y `public/logotipo-chico.svg` (coordenadas enteras, tinta fija, 17 y 14 KB).
- `iconos.py` — favicon SN liso (16, 32 y 48 px) e iconos de instalación con el SN dibujado (180, 192, 512 y 512 adaptable).
- `gestos.py` (manos con dedos independientes: base, ángulo, largo, grosor y curvatura), `calzado.py` (tenis, tenis de bota, zapato), `terminal.py` (brazos que nacen del trazo y se doblan), `piezas6.py` (cada letra), `espaciado.py` y `espaciado2.py` (espaciado medido sobre el contorno real), `lt.py` (curvas, booleanas, render), `generar.py`, `instancia.py`.

## Regenerar

```
python3 -m venv venv && ./venv/bin/pip install fonttools skia-pathops skia-python numpy
curl -L -o "BricolageGrotesque[opsz,wdth,wght].ttf" "https://github.com/google/fonts/raw/main/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz%2Cwdth%2Cwght%5D.ttf"
./venv/bin/python instancia.py && ./venv/bin/python generar.py
```

## Lo que todavía está áspero

- A 21 px las señas no se distinguen; ahí funciona como textura y va la versión simplificada.
- Las señas de dentro de las S se leen bien en grande, no en la barra.
- La T sigue más ancha que la letra original.
- No está probado dentro de la app ni como ícono de la app instalada.
