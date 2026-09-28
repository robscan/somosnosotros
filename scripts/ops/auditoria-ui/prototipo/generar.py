# -*- coding: utf-8 -*-
"""Prototipo de la reestructura (OL-227, doc 50): genera docs/rediseno/prototipos/restructura-ui.html.
Uso: python3 generar.py <raíz del repo>. Assets al lado (logo.svg, mapa-base.svg, sn.txt, iconos.txt) y carteles de ../respaldo-local/imagenes.json.
v2: barra tipo Instagram («+» · logo · lupa · campana), perfil en la barra inferior, filtros en hoja,
mapa con la lista en hoja inferior, alta con tira de modos, Voy/Seguir con un solo glifo sobre círculo elevado."""
import json, re, sys, os
S = os.path.dirname(os.path.abspath(__file__))
RAIZ = sys.argv[1]
logo_crudo = open(f'{S}/logo.svg').read()
logo_path = re.search(r'<path.*?/>', logo_crudo, re.S).group(0)
logo_simbolo = f'<symbol id="logotipo" viewBox="-59 -770 3903 790">{logo_path}</symbol>'
logo = '<svg class="logotipo" viewBox="0 0 3903 790" aria-label="Somos Nosotros"><use href="#logotipo" width="3903" height="790"/></svg>'
logo_chico = logo.replace('class="logotipo"', 'class="logotipo chico"')
mapa_base = open(f'{S}/mapa-base.svg').read()
sn = open(f'{S}/sn.txt').read().strip()
im = json.load(open(f'{S}/../respaldo-local/imagenes.json'))
E = im['eventos']; L = im['lugares']

extra = {
  'persona-mas': '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 7.5v6M16 10.5h6"/>',
  'filtros': '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  'crear': '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/>',
  'estrella-llena': '<path fill="currentColor" stroke="none" d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z"/>',
}
nombres = {
 'IconoCasa':'casa','IconoCalendario':'calendario','IconoPin':'pin','IconoEstrella':'estrella','IconoBuscar':'buscar','IconoCampana':'campana','IconoMas':'mas','IconoOk':'ok','IconoPersona':'persona','IconoPersonas':'personas','IconoCompartir':'compartir','IconoRuta':'ruta','IconoBoleto':'boleto','IconoReloj':'reloj','IconoChevronIzquierda':'chevron-izq','IconoChevronDerecha':'chevron-der','IconoCerrar':'cerrar','IconoPuntos':'puntos','IconoLista':'lista','IconoMapa':'mapa','IconoUbicacion':'ubicacion','IconoCalendarioAgregar':'calendario-agregar','IconoEnlace':'enlace','IconoInstagram':'instagram','IconoFacebook':'facebook','IconoEngrane':'engrane','IconoLapiz':'lapiz','IconoSitio':'sitio','IconoCamara':'camara','IconoTexto':'texto','IconoEtiqueta':'etiqueta','IconoSalir':'salir','IconoAyuda':'ayuda','IconoEscudo':'escudo','IconoLibro':'libro','IconoCorreo':'correo','IconoOjo':'ojo','IconoBloquear':'bloquear','IconoInstalar':'instalar','IconoPinMas':'pin-mas','IconoEstrellaMas':'estrella-mas','IconoCaret':'caret','IconoYouTube':'youtube','IconoTikTok':'tiktok'}
simbolos = []
for linea in open(f'{S}/iconos.txt'):
    nombre, attrs, inner = linea.rstrip('\n').split(' | ', 2)
    if nombre in nombres:
        simbolos.append(f'<symbol id="i-{nombres[nombre]}" viewBox="0 0 24 24">{inner}</symbol>')
for k, v in extra.items():
    simbolos.append(f'<symbol id="i-{k}" viewBox="0 0 24 24">{v}</symbol>')
sprite = '\n'.join(simbolos) + logo_simbolo

def i(nombre, cls='i'):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{nombre}"/></svg>'

def foto(url, alt='', cls=''):
    if not url:
        return f'<span class="{cls} sn" role="img" aria-label="Sin foto"></span>'
    return f'<img class="{cls}" src="{url}" alt="{alt}" loading="lazy">'

# ---------- datos ----------
ev = {
 'sinfonica': dict(t='Concierto de la Orquesta Sinfónica de San Luis Potosí', img=E.get('concierto-de-la-orquesta-sinfonica-de-san-luis-potosi'), cuando='hoy · 18:00', hora='18:00', sitio='Templo de San Francisco', precio='Gratis', van=0),
 'macario': dict(t='Macario, Xantolo camino al Mictlán', img=None, cuando='hoy · 19:00', hora='19:00', sitio='Teatro del IPBA Raúl Gamboa', precio='Gratis', van=0),
 'cristiada': dict(t='Charla: San Luis Potosí en la Cristiada, con Joserra Ortiz', img=E.get('charla-san-luis-potosi-en-la-cristiada-con-joserra-ortiz'), cuando='mañana · 19:30', hora='19:30', sitio='Casa de Cultura de San Miguelito', precio='Gratis', van=1),
 'fellini': dict(t='Cine de barrio: ciclo Fellini', img=E.get('cine-de-barrio-ciclo-fellini-2026-09-30'), cuando='mié 30 sep · 10:00', hora='10:00', sitio='Casa de Cultura de San Miguelito', precio='Gratis', van=0),
 'pimpolina': dict(t='Delirium Pollum, clown y pantomima con Pimpolina', img=E.get('delirium-pollum-clown-y-pantomima-con-pimpolina'), cuando='jue 1 oct · 18:00', hora='18:00', sitio='Teatro de la Paz', precio='$150', van=4),
 'colocaos': dict(t='LXS COLOCAOS: La última fogueada', img=E.get('lxs-colocaos-la-ultima-fogueada'), cuando='vie 2 oct · 19:00', hora='19:00', sitio='MUNI Museo Universitario', precio='Gratis', van=2),
 'arttoy': dict(t='Inauguración de Uno de Uno · Custom Art Toy', img=E.get('inauguracion-de-uno-de-uno-custom-art-toy-2026'), cuando='sáb 3 oct · 18:00', hora='18:00', sitio='ACHE Galería', precio='Gratis', van=3),
 'susurros': dict(t='Susurros del inconsciente', img=E.get('susurros-del-inconsciente'), cuando='dom 4 oct · 20:00', hora='20:00', sitio='Aether', precio='Cooperación', van=0),
 'feleal': dict(t='Feleal: un viaje por el mundo en acordeón', img=E.get('feleal-un-viaje-por-el-mundo-en-acordeon'), cuando='lun 5 oct · 19:00', hora='19:00', sitio='Teatro de la Paz', precio='$120 a $250', van=6),
 'master': dict(t='Master Class · 9° Festival de Cine UASLP', img=E.get('master-class-9-festival-de-cine-uaslp'), cuando='mar 6 oct · 12:00', hora='12:00', sitio='Centro Cultural Bicentenario', precio='Gratis', van=9),
 'leonora': dict(t='Leonora in the morning light', img=E.get('leonora-in-the-morning-light'), cuando='mié 7 oct · 17:00', hora='17:00', sitio='Centro Cultural Bicentenario', precio='Gratis', van=1),
 'oca': dict(t='OCA', img=E.get('oca'), cuando='jue 8 oct · 19:00', hora='19:00', sitio='Museo Nacional de la Máscara', precio='Gratis', van=0),
 'desierto': dict(t='DESIERTO: Observación y Espacio', img=E.get('desierto-observacion-y-espacio'), cuando='vie 9 oct · 20:00', hora='20:00', sitio='Aether', precio='Gratis', van=1),
 'juana': dict(t='9° Festival de Cine UASLP: Apertura · Juana', img=E.get('9-festival-de-cine-uaslp-apertura-juana'), cuando='lun 5 oct · 18:00', hora='18:00', sitio='Centro Cultural Bicentenario', precio='Gratis', van=2),
}
lu = {
 'miguelito': dict(n='Casa de Cultura del Barrio de San Miguelito', img=L.get('casa-de-cultura-del-barrio-de-san-miguelito'), tipo='Casa de cultura', dir='5 de Mayo 1225, San Miguelito', prox='mañana · 19:30', km='0,8 km'),
 'paz': dict(n='Teatro de la Paz', img=L.get('teatro-de-la-paz'), tipo='Foro', dir='Villerías 205, Centro', prox='jue 1 oct · 18:00', km='1,1 km'),
 'ferro': dict(n='Museo del Ferrocarril Jesús García Corona', img=L.get('museo-del-ferrocarril-jesus-garcia-corona'), tipo='Museo', dir='Manuel José Othón s/n esq. Chico Sein, Centro', prox='vie 2 oct · 17:00', km='1,4 km'),
 'muni': dict(n='MUNI Museo Universitario UASLP', img=L.get('muni-museo-universitario-uaslp'), tipo='Museo', dir='Av. Manuel Nava 101, Zona Universitaria', prox='vie 2 oct · 19:00', km='3,2 km'),
 'mascara': dict(n='Museo Nacional de la Máscara', img=L.get('museo-nacional-de-la-mascara'), tipo='Museo', dir='Villerías 2, Centro', prox='jue 8 oct · 19:00', km='1,0 km'),
 'ache': dict(n='ACHE Galería', img=L.get('ache-galeria'), tipo='Galería', dir='Valentín Gama 840, Centro', prox='sáb 3 oct · 18:00', km='1,6 km'),
 'archivo': dict(n='Archivo Histórico del Estado', img=L.get('archivo-historico-del-estado-de-san-luis-potosi'), tipo='Biblioteca', dir='Mariano Arista 400, Centro', prox=None, km='1,2 km'),
 'aether': dict(n='Aether', img=None, tipo='Galería', dir='Graciano Sánchez 220-A, Centro', prox='dom 4 oct · 20:00', km='1,3 km'),
 'poeta': dict(n='Casa del Poeta Ramón López Velarde', img=L.get('casa-del-poeta-ramon-lopez-velarde'), tipo='Museo', dir='Vallejo 150, Centro', prox=None, km='1,1 km'),
 'rafael': dict(n='Auditorio Rafael Nieto', img=L.get('auditorio-rafael-nieto'), tipo='Foro', dir='Álvaro Obregón 64, Centro', prox=None, km='1,2 km'),
 'biblioteca': dict(n='Biblioteca Central del Estado', img=L.get('biblioteca-central-del-estado'), tipo='Biblioteca', dir='Av. Universidad 1100, Centro', prox=None, km='1,9 km'),
}
ar = [
 ('0Backside0','Rock, metal y alternativo · Grupo'),('A83','Rock, metal y alternativo · Grupo'),('Aaron Cadena','Artes visuales · Solista'),('Abdiel El Andromeda','Pop, urbano y electrónica · Solista'),('Abraham Delgadillo','Pintura · Solista'),('Abril Merlot','Música académica y clásica · Solista'),('Acorde-ón','Tradicional, folclore y canto nuevo · Grupo'),('Adriana Cortés','Danza contemporánea · Solista'),('Ale Pizarro','Teatro · Solista'),
]

def boton_accion(decidido, seguir=False, etiqueta=None):
    ic = 'ok' if decidido else ('persona-mas' if seguir else 'ok')
    lab = etiqueta or ('Sigues' if (decidido and seguir) else 'Seguir' if seguir else 'Ya vas' if decidido else 'Voy')
    return f'<button type="button" class="boton-icono elevado{" decidido" if decidido else ""}" data-accion="{"seguir" if seguir else "voy"}" aria-pressed="{"true" if decidido else "false"}" aria-label="{lab}">{i(ic)}</button>'

def tarjeta(clave, sello=None, decidido=False, nombre=None, meta=None, img=None, ir='evento', seguir=False):
    d = ev.get(clave) if clave in ev else None
    titulo = nombre or d['t']; m = meta or d['cuando'] + ' · ' + d['sitio']
    src = img if img is not None else (d['img'] if d else None)
    s = f'<span class="sello">{sello}</span>' if sello else ''
    return f'<li><a class="tarjeta" href="#" data-ir="{ir}">{foto(src, "", "foto")}{s}<b>{titulo}</b><small>{m}</small></a>{boton_accion(decidido, seguir)}</li>'

def carril(titulo, items, tam='mediana', ir='agenda'):
    return (f'<section class="seccion-carril"><a class="titulo-seccion" href="#" data-ir="{ir}">{titulo}{i("chevron-der","i chevron")}</a>'
            f'<ul class="carril {tam}">{"".join(items)}</ul></section>')

def renglon_evento(clave, decidido=False, interesa=False, tipo_meta=None):
    d = ev[clave]
    estado = '<span class="estado">Vas</span>' if decidido else ('<span class="estado">Te interesa</span>' if interesa else '')
    precio = '' if d['precio']=='Gratis' else f' · {d["precio"]}'
    van = f' · {d["van"]} van' if d['van'] else ''
    segunda = tipo_meta if tipo_meta else f'{("Gratis" if d["precio"]=="Gratis" else d["precio"])}{van}{estado}'
    return (f'<li class="renglon lista"><a class="frente" href="#" data-ir="evento">{foto(d["img"],"","foto")}<b>{d["t"]}</b>'
            f'<small>{d["hora"]} · {d["sitio"]}{precio}</small><small class="segundo">{segunda}</small></a>{boton_accion(decidido)}</li>')

def renglon_lugar(clave, sigue=False, ir='lugar'):
    d = lu[clave]
    prox = f'<small class="segundo">{i("calendario","i chico")} Próximo: {d["prox"]}</small>' if d['prox'] else ''
    return (f'<li class="renglon lista"><a class="frente" href="#" data-ir="{ir}">{foto(d["img"],"","foto")}<b>{d["n"]}</b>'
            f'<small>{d["tipo"]} · {d["dir"]} · {d["km"]}</small>{prox}</a>{boton_accion(sigue, seguir=True)}</li>')

def renglon_artista(n, m, sigue=False):
    return (f'<li class="renglon lista"><a class="frente" href="#" data-ir="artista">{foto(None,"","foto redonda")}<b>{n}</b><small>{m}</small></a>{boton_accion(sigue, seguir=True)}</li>')

def barra_raiz():
    return (f'<div class="barra">'
            f'<button type="button" class="boton-icono plano" data-publicar aria-label="Publicar">{i("crear")}</button>'
            f'<a class="logotipo-enlace" href="#" data-ir="inicio" aria-label="Inicio">{logo}</a>'
            f'<button type="button" class="boton-icono plano" data-ir="buscar" aria-label="Buscar">{i("buscar")}</button>'
            f'<button type="button" class="boton-icono plano" aria-label="Novedades">{i("campana")}<span class="punto"></span></button>'
            f'</div>')

def chip_ciudad():
    return f'<button type="button" class="chip contexto">{i("pin","i chico")}<span>San Luis Potosí</span>{i("caret","i chico")}</button>'

def chip_filtros(hoja, n=0):
    cuenta = f'<span class="cuenta-filtros">{n}</span>' if n else ''
    return f'<button type="button" class="chip filtro" data-hoja="{hoja}">{i("filtros","i chico")}Filtros{cuenta}</button>'

def chip_activo(texto):
    return f'<button type="button" class="chip activo quitar" aria-label="Quitar {texto}">{texto}{i("cerrar","i chico")}</button>'

def cabecera(filtros='', extra='', contexto=''):
    return f'''<header class="cabecera">
      {barra_raiz()}
      {f'<div class="contexto">{contexto}</div>' if contexto else ''}
      {f'<div class="filtros">{filtros}</div>' if filtros else ''}
      {extra}
    </header>'''

def barra_interior(tarea=False, campo=None):
    if campo:
        return f'<header class="barra-interior tarea con-campo"><label class="campo buscar-campo">{i("buscar")}<input type="search" placeholder="{campo}" aria-label="{campo}"></label><button type="button" class="boton-icono plano" data-atras aria-label="Cerrar">{i("cerrar")}</button></header>'
    if tarea:
        return f'<header class="barra-interior tarea"><a class="logotipo-enlace" href="#" data-ir="inicio">{logo_chico}</a><button type="button" class="boton-icono contorno" data-atras aria-label="Cerrar">{i("cerrar")}</button></header>'
    return f'<header class="barra-interior"><button type="button" class="boton-icono contorno" data-atras aria-label="Atrás">{i("chevron-izq")}</button><a class="logotipo-enlace" href="#" data-ir="inicio">{logo_chico}</a><button type="button" class="boton-icono plano" aria-label="Más opciones">{i("puntos")}</button></header>'

letras = '<div class="letras" role="group" aria-label="Ir a la letra">' + ''.join('<button type="button"' + (' aria-current="true"' if l == '#' else '') + '>' + l + '</button>' for l in '#ABCDEFGHIJKLMNOPQRSTUVWXYZ') + '</div>'

# ---------- mapa ----------
def punto(x, y, nombre, clase='', dia=None):
    if dia:
        return f'<g class="lugar con-evento {clase}" transform="translate({x} {y})"><circle r="11"/><text class="dia" y="4">{dia}</text><text class="nombre" y="26">{nombre}</text></g>'
    return f'<g class="lugar {clase}" transform="translate({x} {y})"><circle r="5"/><text class="nombre" y="20">{nombre}</text></g>'
puntos = ''.join([
  punto(188, 402, 'MUNI Museo Universitario', 'seguido', 'Vie'),
  punto(232, 392, 'ACHE Galería'),
  punto(262, 348, 'Aether', '', 'Dom'),
  punto(300, 470, 'Centro Cultural Alemán'),
  punto(232, 460, 'ARTERIA Casa Cultural'),
  punto(395, 300, 'Casa de Cultura de Tlaxcala'),
  punto(432, 364, 'Museo del Ferrocarril', 'destacado', 'Vie'),
  punto(455, 392, ''), punto(441, 402, ''), punto(470, 350, ''),
  punto(468, 430, 'Museo de la Máscara', '', 'Jue'),
  punto(405, 418, 'Casa del Poeta'),
  punto(352, 430, 'Teatro de la Paz', '', 'Jue'),
  punto(478, 478, 'Casa Bauen'),
  punto(430, 520, 'Casa de Cultura de San Miguelito', 'seguido', 'Mar'),
  punto(372, 500, 'Archivo Histórico'),
  punto(318, 548, 'La Carrilla'),
  punto(280, 600, ''),
  punto(300, 650, 'Museo Laberinto'),
])
mapa = f'''<svg class="lienzo" viewBox="120 262 390 440" preserveAspectRatio="xMidYMid slice" aria-label="Mapa de San Luis Potosí"><use href="#base" x="0" y="0" width="640" height="900"/>{puntos}<g class="persona" transform="translate(330 585)"><circle class="halo" r="20"/><circle class="yo" r="7"/></g></svg>'''
minimapa = '<svg class="minimapa" viewBox="300 330 300 132" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><use href="#base" x="0" y="0" width="640" height="900"/><g class="lugar" transform="translate(450 396)"><circle r="7"/></g></svg>'

# ---------- pantallas ----------
inicio = f'''<section class="pantalla raiz" data-id="inicio">
  {cabecera(contexto=chip_ciudad().replace('class="chip contexto"', 'class="chip contexto texto"'))}
  {carril('Tus planes', [tarjeta('cristiada', sello='1 va', decidido=True), tarjeta('colocaos', sello='2 van', decidido=True), tarjeta('leonora', sello='Te interesa')])}
  {carril('Destacados', [tarjeta('colocaos', sello='2 van', decidido=True), tarjeta('master', sello='9 van'), tarjeta('leonora', sello='Recién agregado'), tarjeta('desierto', sello='1 va')], 'grande')}
  {carril('Esta semana', [tarjeta('sinfonica', sello='Hoy'), tarjeta('macario', sello='Hoy'), tarjeta('cristiada', sello='1 va', decidido=True), tarjeta('fellini'), tarjeta('pimpolina', sello='4 van')])}
  {carril('Nuevos eventos', [tarjeta('juana', sello='Recién agregado'), tarjeta('arttoy', sello='3 van'), tarjeta('susurros', sello='Recién agregado'), tarjeta('oca')])}
  {carril('Lugares con eventos', [tarjeta('x', nombre=lu[k]['n'], meta=lu[k]['prox'] or '', img=lu[k]['img'], ir='lugar', seguir=True, decidido=(k=='miguelito')) for k in ('miguelito','paz','ferro','muni','ache')], 'chica', 'lugares')}
  {carril('Artistas destacados', [tarjeta('x', nombre=n, meta=m, img=None, ir='artista', seguir=True) for n, m in ar[2:6]], 'grande', 'artistas')}
</section>'''

esqueleto = lambda redonda=False: '<ul class="lista esqueleto" aria-hidden="true">' + ''.join(f'<li class="renglon lista"><span class="foto{" redonda" if redonda else ""} respira"></span><span class="linea titulo respira"></span><span class="linea meta respira"></span></li>' for _ in range(6)) + '</ul>'

agenda = f'''<section class="pantalla raiz" data-id="agenda">
  {cabecera(chip_filtros('filtros-agenda') + chip_ciudad())}
  {esqueleto()}
  <h2 class="grupo">Hoy <span>· 2</span></h2>
  <ul class="lista">{renglon_evento('sinfonica')}{renglon_evento('macario')}</ul>
  <h2 class="grupo">Mañana</h2>
  <ul class="lista">{renglon_evento('cristiada', decidido=True)}</ul>
  <h2 class="grupo">mié 30 de sep</h2>
  <ul class="lista">{renglon_evento('fellini')}</ul>
  <h2 class="grupo">jue 1 de oct</h2>
  <ul class="lista">{renglon_evento('pimpolina')}</ul>
  <h2 class="grupo">vie 2 de oct</h2>
  <ul class="lista">{renglon_evento('colocaos', decidido=True)}</ul>
  <h2 class="grupo">sáb 3 de oct</h2>
  <ul class="lista">{renglon_evento('arttoy')}</ul>
  <h2 class="grupo">dom 4 de oct</h2>
  <ul class="lista">{renglon_evento('susurros')}</ul>
  <h2 class="grupo">lun 5 de oct</h2>
  <ul class="lista">{renglon_evento('juana')}{renglon_evento('feleal')}</ul>
  <h2 class="grupo">mié 7 de oct</h2>
  <ul class="lista">{renglon_evento('leonora', interesa=True)}</ul>
</section>'''

lugares = f'''<section class="pantalla raiz" data-id="lugares" data-hoja-estado="asoma">
  {cabecera(chip_filtros('filtros-lugares', 1) + chip_ciudad() + chip_activo('Museo'))}
  <div class="mapa">{mapa}<button type="button" class="boton-icono elevado ubicacion" aria-label="Mi ubicación">{i("ubicacion")}</button><span class="atribucion">© Mapbox © OpenStreetMap</span></div>
  <div class="hoja-lugares" role="region" aria-label="Lugares">
    <button type="button" class="asa" aria-label="Mostrar u ocultar la lista"></button>
    <b class="resumen">62 lugares <small>· los más cercanos primero</small></b>
    <div class="pin-tarjeta" hidden>{renglon_lugar('ferro').replace('<li class="renglon lista">','<div class="renglon lista">').replace('</li>','</div>')}<button type="button" class="boton primario completo" data-ir="lugar">Ver la ficha</button><button type="button" class="boton texto" data-volver-lista>Volver a la lista</button></div>
    <ul class="lista panel">{''.join(renglon_lugar(k, sigue=(k=='miguelito')) for k in ('miguelito','paz','ferro','mascara','poeta','ache','aether','archivo','rafael','biblioteca','muni'))}</ul>
  </div>
</section>'''

artistas = f'''<section class="pantalla raiz" data-id="artistas" style="--alto-extra: 36px">
  {cabecera(chip_filtros('filtros-artistas', 1) + chip_ciudad() + chip_activo('Música'), extra=letras)}
  {esqueleto(True)}
  <h2 class="grupo">#</h2>
  <ul class="lista">{renglon_artista(*ar[0])}</ul>
  <h2 class="grupo">A</h2>
  <ul class="lista">{''.join(renglon_artista(n, m, sigue=(n=='Aaron Cadena')) for n, m in ar[1:])}</ul>
</section>'''

perfil = f'''<section class="pantalla raiz" data-id="perfil">
  {cabecera()}
  <div class="perfil-cabecera"><span class="avatar grande">A</span><b>Ana Rentería</b><small>Barrio de San Miguelito</small><button type="button" class="boton-icono contorno" data-ir="ajustes" aria-label="Ajustes">{i("engrane")}</button></div>
  <ul class="kpis">
    <li><a href="#">{i("ok")}<b>2</b><small>Voy</small></a></li>
    <li><a href="#">{i("estrella")}<b>1</b><small>Me interesa</small></a></li>
    <li><a href="#">{i("persona-mas")}<b>2</b><small>Sigo</small></a></li>
  </ul>
  <div class="filtros"><button type="button" class="chip activo">Voy</button><button type="button" class="chip">Me interesa</button><button type="button" class="chip">Sigo</button></div>
  <h2 class="grupo">Mañana</h2>
  <ul class="lista">{renglon_evento('cristiada', decidido=True)}</ul>
  <h2 class="grupo">vie 2 de oct</h2>
  <ul class="lista">{renglon_evento('colocaos', decidido=True)}</ul>
  <a class="boton texto enlace-perfil" href="#">Así te ven los demás</a>
</section>'''

evento = f'''<section class="pantalla ficha" data-id="evento">
  {barra_interior()}
  <figure class="portada" style="--tono:#4a3d3a">{foto(ev['colocaos']['img'], 'Cartel de LXS COLOCAOS', 'cartel')}<button type="button" class="boton-icono elevado lupa" aria-label="Ver el cartel entero">{i("buscar")}</button></figure>
  <h1 class="titulo-ficha">LXS COLOCAOS: La última fogueada</h1>
  <ul class="kpis">
    <li><a href="#">{i("calendario")}<b>vie 2 oct<br>19:00</b><small>Fecha</small></a></li>
    <li><a href="#">{i("boleto")}<b>Gratis</b><small>Costo</small></a></li>
    <li><a href="#">{i("personas")}<b>2</b><small>Van</small></a></li>
  </ul>
  <div class="acciones">
    <button type="button" class="accion"><span class="boton-icono grande elevado">{i("compartir")}</span>Compartir</button>
    <button type="button" class="accion"><span class="boton-icono grande elevado">{i("calendario-agregar")}</span>A mi calendario</button>
    <a class="accion" href="#"><span class="boton-icono grande elevado">{i("ruta")}</span>Cómo llegar</a>
  </div>
  <section class="tarjeta-dato">
    <h2>Dónde</h2>
    {minimapa}
    <a class="renglon dato" href="#" data-ir="lugar">{i("pin")}<b>MUNI Museo Universitario UASLP</b><small>Av. Manuel Nava 101, Zona Universitaria · 3,2 km</small>{i("chevron-der","i chevron")}</a>
  </section>
  <section class="bloque con">
    <h2>Artistas</h2>
    <a class="renglon dato" href="#" data-ir="artista">{foto(None,'','foto redonda chica')}<b>Colectivo Lxs Colocaos</b><small>Cerámica · Colectivo</small>{i("chevron-der","i chevron")}</a>
  </section>
  <section class="bloque sobre">
    <h2>Sobre el evento</h2>
    <p>Inauguración de la exposición colectiva de cerámica LXS COLOCAOS. Paulina Lucciotto, Marilú Juárez, Arantxa Zoé Hernández, Jesús Orlando Acosta, Sayuri Álvarez, Flora Moreno y Samantha Méndez. Entrada libre.</p>
  </section>
  <section class="bloque quien">
    <h2>Quién va</h2>
    <a class="renglon dato" href="#"><span class="pila"><span class="avatar chico">M</span><span class="avatar chico">A</span></span><b>Marcos Ledesma y Ana Rentería</b><small>Y 1 persona más tiene interés</small>{i("chevron-der","i chevron")}</a>
  </section>
  <p class="pie">Publicado por MUNI Museo Universitario · <a href="#">Reportar</a></p>
  <div class="barra-acciones">
    <button type="button" class="boton secundario">{i("estrella")}Me interesa</button>
    <button type="button" class="boton primario decidido" aria-pressed="true">{i("ok")}Vas<small>Ya estás en la lista</small></button>
  </div>
</section>'''

lugar = f'''<section class="pantalla ficha" data-id="lugar">
  {barra_interior()}
  <figure class="portada" style="--tono:#7a4a2e">{foto(lu['ferro']['img'], 'Museo del Ferrocarril', 'cartel')}<button type="button" class="boton-icono elevado lupa" aria-label="Ver la foto entera">{i("buscar")}</button></figure>
  <h1 class="titulo-ficha">Museo del Ferrocarril Jesús García Corona<span class="tipo">Museo</span></h1>
  <ul class="kpis">
    <li><a href="#">{i("pin")}<b>1,4 km</b><small>Distancia</small></a></li>
    <li><a href="#">{i("calendario")}<b>3 próximos</b><small>Eventos</small></a></li>
    <li><a href="#">{i("personas")}<b>48</b><small>Seguidores</small></a></li>
  </ul>
  <div class="acciones">
    <a class="accion" href="#"><span class="boton-icono grande elevado">{i("ruta")}</span>Cómo llegar</a>
    <button type="button" class="accion"><span class="boton-icono grande elevado">{i("compartir")}</span>Compartir</button>
    <a class="accion" href="#"><span class="boton-icono grande elevado">{i("sitio")}</span>Sitio web</a>
    <a class="accion" href="#"><span class="boton-icono grande elevado">{i("facebook")}</span>Facebook</a>
    <a class="accion" href="#"><span class="boton-icono grande elevado">{i("instagram")}</span>Instagram</a>
  </div>
  <section class="bloque proximos">
    <h2>Próximos eventos</h2>
    <ul class="lista">{renglon_evento('colocaos').replace('MUNI Museo Universitario','Museo del Ferrocarril')}{renglon_evento('oca').replace('Museo Nacional de la Máscara','Museo del Ferrocarril')}{renglon_evento('feleal').replace('Teatro de la Paz','Museo del Ferrocarril')}</ul>
  </section>
  <section class="tarjeta-dato">
    <h2>Dónde</h2>
    {minimapa}
    <a class="renglon dato" href="#">{i("pin")}<b>Manuel José Othón s/n esq. Chico Sein</b><small>Centro Histórico, 78000, San Luis Potosí</small>{i("chevron-der","i chevron")}</a>
  </section>
  <section class="bloque sobre">
    <h2>Sobre el lugar</h2>
    <p>Antigua estación de ferrocarril convertida en museo, con locomotoras, salas de exposición y un foro para conciertos. Martes a domingo de 10:00 a 18:00.</p>
  </section>
  <p class="pie">Ficha de la institución · <a href="#">Reportar</a></p>
  <div class="barra-acciones">
    <button type="button" class="boton primario">{i("persona-mas")}Seguir</button>
  </div>
</section>'''


artista = f'''<section class="pantalla ficha" data-id="artista">
  {barra_interior()}
  <div class="perfil-cabecera"><span class="foto redonda grande sn" role="img" aria-label="Sin foto"></span><b>Aaron Cadena</b><small>Artes visuales · Fotografía · Solista · San Luis Potosí</small><button type="button" class="boton-icono elevado" aria-label="Compartir">{i("compartir")}</button></div>
  <ul class="kpis">
    <li><a href="#">{i("calendario")}<b>2 próximas</b><small>Fechas</small></a></li>
    <li><a href="#">{i("personas")}<b>120</b><small>Seguidores</small></a></li>
    <li><a href="#">{i("pin")}<b>4</b><small>Lugares</small></a></li>
  </ul>
  <div class="acciones">
    <a class="accion" href="#"><span class="boton-icono grande elevado">{i("instagram")}</span>Instagram</a>
    <a class="accion" href="#"><span class="boton-icono grande elevado">{i("sitio")}</span>Sitio web</a>
    <a class="accion" href="#"><span class="boton-icono grande elevado">{i("youtube")}</span>YouTube</a>
  </div>
  <section class="bloque proximos">
    <h2>Próximas fechas</h2>
    <ul class="lista">{renglon_evento('arttoy')}{renglon_evento('desierto')}</ul>
  </section>
  <section class="bloque sobre">
    <h2>Sobre</h2>
    <p>Artista visual, fotoperiodista y fotógrafo documental originario de San Luis Potosí. Su trabajo explora temas sociales, el cruce de géneros y narrativas personales.</p>
  </section>
  <section class="bloque lugares">
    <h2>Se presenta en</h2>
    <a class="renglon dato" href="#" data-ir="lugar">{foto(lu['ache']['img'],'','foto chica')}<b>ACHE Galería</b><small>Galería · Centro</small>{i("chevron-der","i chevron")}</a>
    <a class="renglon dato" href="#" data-ir="lugar">{foto(None,'','foto chica')}<b>Aether</b><small>Galería · Centro</small>{i("chevron-der","i chevron")}</a>
  </section>
  <p class="pie">Ficha reclamada por el artista · <a href="#">Reportar</a></p>
  <div class="barra-acciones">
    <button type="button" class="boton primario">{i("persona-mas")}Seguir</button>
  </div>
</section>'''

def renglon_resuelto(icono, clave, valor, accion, pendiente=False, opciones=None):
    acc = opciones or f'<button type="button" class="boton texto">{accion}</button>'
    clase_p = ' pendiente' if pendiente else ''
    clase_b = ' class="falta"' if pendiente else ''
    return f'<li class="renglon resuelto{clase_p}">{i(icono)}<small>{clave}</small><b{clase_b}>{valor}</b>{acc}</li>'

alta = f'''<section class="pantalla tarea" data-id="alta" data-tipo="evento">
  {barra_interior(tarea=True)}
  <form class="alta evento" action="#">
    <h1 class="titulo-pagina">Publicar un evento</h1>
    <label class="tarjeta-cartel"><span class="boton-icono elevado primario">{i("camara")}</span><b>Sube el cartel</b><small>Leemos la fecha, el lugar y el título por ti.</small><input type="file" accept="image/*"></label>
    <label class="campo">{i("buscar")}<input type="text" placeholder="Nombre del evento"></label>
    <ul class="renglones">
      {renglon_resuelto('reloj','Cuándo','Hoy · 19:00','Cambiar')}
      {renglon_resuelto('pin','Dónde','Falta','', pendiente=True, opciones=f'<span class="opciones"><button type="button" class="boton-icono contorno" aria-label="Estoy aquí">{i("ubicacion")}</button><button type="button" class="boton-icono contorno" aria-label="Buscar el lugar">{i("buscar")}</button></span>')}
      {renglon_resuelto('personas','Quién','Sin artista','Agregar')}
      {renglon_resuelto('boleto','Cuánto','Gratis','Cambiar')}
      {renglon_resuelto('mas','Más','Descripción, enlace, foto','Agregar', pendiente=True)}
    </ul>
    <button type="button" class="boton primario completo" disabled>Publicar evento</button>
    <p class="nota-boton">Falta el nombre y dónde es.</p>
  </form>
  <form class="alta lugar" action="#" hidden>
    <h1 class="titulo-pagina">Registrar un lugar</h1>
    <label class="campo">{i("buscar")}<input type="text" placeholder="Nombre del lugar"></label>
    <ul class="renglones">
      {renglon_resuelto('pin','Dónde','Falta','', pendiente=True, opciones=f'<span class="opciones"><button type="button" class="boton-icono contorno" aria-label="Estoy aquí">{i("ubicacion")}</button><button type="button" class="boton-icono contorno" aria-label="Buscar la dirección">{i("buscar")}</button></span>')}
      {renglon_resuelto('etiqueta','Tipo','Por el nombre','Cambiar')}
      {renglon_resuelto('mas','Más','Descripción, redes, foto','Agregar', pendiente=True)}
    </ul>
    <button type="button" class="boton primario completo" disabled>Publicar lugar</button>
    <p class="nota-boton">Falta el nombre y dónde está.</p>
  </form>
  <form class="alta artista" action="#" hidden>
    <h1 class="titulo-pagina">Registrar un artista</h1>
    <label class="campo">{i("buscar")}<input type="text" placeholder="Nombre del artista o grupo"></label>
    <ul class="renglones">
      {renglon_resuelto('estrella','Disciplina','Falta','', pendiente=True, opciones='<button type="button" class="boton texto">Elegir</button>')}
      {renglon_resuelto('camara','Foto','Sin foto','', pendiente=True, opciones=f'<button type="button" class="boton-icono contorno" aria-label="Tomar o subir foto">{i("camara")}</button>')}
      {renglon_resuelto('enlace','Enlaces','Instagram, YouTube, Spotify…','Agregar', pendiente=True)}
      {renglon_resuelto('mas','Más','Descripción, ciudad','Agregar', pendiente=True)}
    </ul>
    <button type="button" class="boton primario completo" disabled>Publicar artista</button>
    <p class="nota-boton">Falta el nombre y la disciplina.</p>
  </form>
  <div class="modos" role="tablist" aria-label="Qué publicar">
    <button type="button" role="tab" data-tipo="evento" aria-selected="true">Evento</button>
    <button type="button" role="tab" data-tipo="lugar" aria-selected="false">Lugar</button>
    <button type="button" role="tab" data-tipo="artista" aria-selected="false">Artista</button>
  </div>
</section>'''

buscar = f'''<section class="pantalla tarea" data-id="buscar">
  {barra_interior(campo='Buscar un evento, lugar o artista')}
  <button type="button" class="chip contexto texto en-busqueda">{i("pin","i chico")}<span>En San Luis Potosí</span>{i("caret","i chico")}</button>
  <h2 class="rotulo-grupo">Recientes</h2>
  <ul class="lista">
    <li class="renglon lista"><a class="frente" href="#" data-ir="evento">{foto(ev['colocaos']['img'],'','foto')}<b>LXS COLOCAOS: La última fogueada</b><small>Evento · vie 2 oct · MUNI</small></a></li>
    <li class="renglon lista"><a class="frente" href="#" data-ir="lugar">{foto(lu['ferro']['img'],'','foto')}<b>Museo del Ferrocarril</b><small>Lugar · Museo · Centro</small></a></li>
    <li class="renglon lista"><a class="frente" href="#">{foto(None,'','foto redonda')}<b>Aaron Cadena</b><small>Artista · Artes visuales</small></a></li>
  </ul>
  <h2 class="rotulo-grupo">Esta semana</h2>
  <div class="chips en-busqueda"><button type="button" class="chip">Cine</button><button type="button" class="chip">Gratis</button><button type="button" class="chip">Fin de semana</button><button type="button" class="chip">Centro</button></div>
</section>'''

def fila_ajuste(icono, etiqueta, detalle='', valor='', palanca=None, ir=None):
    if palanca is not None:
        accion = f'<button type="button" class="palanca" role="switch" aria-checked="{"true" if palanca else "false"}" aria-label="{etiqueta}"></button>'
    else:
        accion = f'<span class="valor">{valor}{i("chevron-der","i chevron")}</span>' if valor else i("chevron-der","i chevron")
    det = f'<small>{detalle}</small>' if detalle else ''
    tag = 'a' if palanca is None else 'div'
    href = ' href="#"' if tag == 'a' else ''
    irr = f' data-ir="{ir}"' if ir else ''
    return f'<li><{tag} class="renglon ajuste"{href}{irr}>{i(icono)}<b>{etiqueta}</b>{det}{accion}</{tag}></li>'

ajustes = f'''<section class="pantalla ficha" data-id="ajustes">
  {barra_interior()}
  <h1 class="titulo-pagina">Ajustes</h1>
  <h2 class="rotulo-grupo">Tu ficha</h2>
  <ul class="tarjeta-lista">{fila_ajuste('lapiz','Editar','Foto, nombre, colonia, sobre ti')}{fila_ajuste('ojo','Perfil','Tu ficha y tu nombre en «quién va» se ven','Público')}{fila_ajuste('estrella','Mis artistas','Fichas que administras','1')}</ul>
  <h2 class="rotulo-grupo">Avisos</h2>
  <ul class="tarjeta-lista">{fila_ajuste('correo','Por correo','Cada correo trae su baja',palanca=True)}{fila_ajuste('campana','En el teléfono','Cambios en lo que sigues y a lo que vas',palanca=False)}</ul>
  <h2 class="rotulo-grupo">Cuenta</h2>
  <ul class="tarjeta-lista">{fila_ajuste('persona','Entras con an…@example.com','Sin contraseña: cada vez te mandamos un código')}{fila_ajuste('bloquear','Personas bloqueadas','Dejaste de ver lo que publican')}{fila_ajuste('salir','Cerrar sesión')}</ul>
  <h2 class="rotulo-grupo">Somos Nosotros</h2>
  <ul class="tarjeta-lista">{fila_ajuste('instalar','Instalar la app','5 toques en Safari')}{fila_ajuste('compartir','Invita a tus amigos','Se comparte el enlace del sitio')}{fila_ajuste('enlace','Avisar al salir del sitio','Boletos, redes y sitios de artistas y lugares',palanca=True)}{fila_ajuste('ayuda','Ayuda')}{fila_ajuste('escudo','Aviso de privacidad')}{fila_ajuste('libro','Reglas de uso')}</ul>
  <button type="button" class="boton texto peligro">Borrar mi cuenta</button>
</section>'''

nav = f'''<nav class="navegacion" aria-label="Secciones">
  <a class="marca" href="#" data-ir="inicio" aria-label="Inicio">{logo_chico}</a>
  <a class="destino" href="#" data-ir="inicio" aria-current="page"><span class="pildora">{i("casa")}</span><span>Inicio</span></a>
  <a class="destino" href="#" data-ir="agenda"><span class="pildora">{i("calendario")}</span><span>Agenda</span></a>
  <a class="destino" href="#" data-ir="lugares"><span class="pildora">{i("pin")}</span><span>Lugares</span></a>
  <a class="destino" href="#" data-ir="artistas"><span class="pildora">{i("estrella")}</span><span>Artistas</span></a>
  <a class="destino" href="#" data-ir="perfil"><span class="pildora"><span class="avatar chico">A</span></span><span>Perfil</span></a>
  <button type="button" class="destino publicar" data-publicar><span class="pildora">{i("crear")}</span><span>Publicar</span></button>
  <button type="button" class="destino" data-ir="buscar"><span class="pildora">{i("buscar")}</span><span>Buscar</span></button>
  <button type="button" class="destino" aria-label="Novedades"><span class="pildora">{i("campana")}<span class="punto"></span></span><span>Novedades</span></button>
</nav>'''

def hoja_filtros(id_, titulo, bloques, resultado):
    cuerpo = ''
    for rotulo, contenido in bloques:
        cuerpo += f'<h4>{rotulo}</h4>{contenido}'
    return f'''<div class="hoja-fondo" data-hoja="{id_}" hidden>
  <div class="hoja" role="dialog" aria-label="{titulo}">
    <button type="button" class="boton-icono plano cerrar" data-cerrar aria-label="Cerrar">{i("cerrar")}</button>
    <h3>{titulo}</h3>
    {cuerpo}
    <div class="pie-hoja"><button type="button" class="boton texto">Limpiar</button><button type="button" class="boton primario" data-cerrar>{resultado}</button></div>
  </div>
</div>'''
chips_multi = lambda items: '<div class="chips multi envuelve">' + ''.join(f'<button type="button" class="chip{" activo" if a else ""}" aria-pressed="{"true" if a else "false"}">{t}{f" <small>{n}</small>" if n else ""}</button>' for t, n, a in items) + '</div>'
palanca_fila = lambda etiqueta, detalle, on: f'<div class="renglon ajuste sola">{i("persona-mas")}<b>{etiqueta}</b><small>{detalle}</small><button type="button" class="palanca" role="switch" aria-checked="{"true" if on else "false"}" aria-label="{etiqueta}"></button></div>'
ciudad_fila = f'<a class="renglon ajuste sola" href="#">{i("pin")}<b>San Luis Potosí</b><small>La ciudad ordena, no limita</small><span class="valor">Cambiar{i("chevron-der","i chevron")}</span></a>'
hojas = (
  hoja_filtros('filtros-agenda', 'Filtros', [('Cuándo', chips_multi([('Hoy',0,False),('Mañana',0,False),('Fin de semana',0,False),('Elegir fecha',0,False)])), ('Cuánto', chips_multi([('Gratis',0,False),('Cooperación',0,False)])), ('Siguiendo', palanca_fila('Solo lo que sigo','Lugares y artistas que sigues', False)), ('Dónde', ciudad_fila)], 'Ver 23 eventos')
  + hoja_filtros('filtros-lugares', 'Filtros', [('Tipo', chips_multi([('Casa de cultura',16,False),('Museo',13,True),('Foro',10,False),('Galería',4,False),('Escuela',9,False),('Colectivo',3,False),('Biblioteca',3,False)])), ('Cuándo', chips_multi([('Con eventos esta semana',0,False),('Hoy',0,False)])), ('Siguiendo', palanca_fila('Solo los que sigo','Tus lugares', False)), ('Dónde', ciudad_fila)], 'Ver 13 lugares')
  + hoja_filtros('filtros-artistas', 'Filtros', [('Disciplina', chips_multi([('Música',310,True),('Teatro',56,False),('Danza',28,False),('Artes visuales',93,False),('Letras',31,False),('Cine',13,False),('Artes circenses',7,False)])), ('Con fechas', chips_multi([('Con fechas próximas',0,False)])), ('Siguiendo', palanca_fila('Solo los que sigo','Tus artistas', False)), ('Dónde', ciudad_fila)], 'Ver 310 artistas')
  + '<output class="toast" hidden></output>'
)

html = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Somos Nosotros · Reestructura de la interfaz, v2 (OL-227)</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&display=swap">
<style>
/* ==========================================================================
   0. La sala de prototipos (no es la app)
   ========================================================================== */
:root {{ color-scheme: light; --estudio: #ebeae6; --estudio-texto: #3b3a37; --estudio-suave: #8a8883; --fuente: "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; --ancho-titulo: "wdth" 75; --ancho-texto: "wdth" 80; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ background: var(--estudio); color: var(--estudio-texto); font-family: var(--fuente); font-variation-settings: var(--ancho-texto); font-optical-sizing: auto; font-variant-numeric: tabular-nums; -webkit-font-smoothing: antialiased; }}
button, input {{ font: inherit; color: inherit; }}
a {{ color: inherit; text-decoration: none; }}
ul {{ list-style: none; }}
.sprite {{ display: none; }}
.estudio {{ display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; align-items: center; max-width: 1320px; margin: 0 auto; padding: 16px 16px 8px; }}
.estudio strong {{ font-variation-settings: var(--ancho-titulo); font-size: 18px; }}
.estudio .nota {{ grid-column: 1 / -1; font-size: 14px; color: var(--estudio-suave); }}
.modos-estudio {{ display: flex; gap: 4px; padding: 3px; border-radius: 999px; background: #dedcd6; }}
.modos-estudio button {{ min-height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: none; color: var(--estudio-texto); font-weight: 600; cursor: pointer; }}
.modos-estudio button[aria-pressed="true"] {{ background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.12); }}
.escenario {{ display: grid; justify-items: center; padding: 8px 16px 40px; }}
.aparato {{ container: app / inline-size; position: relative; display: grid; background: #111; border-radius: 40px; padding: 12px; box-shadow: 0 20px 60px rgba(0,0,0,.25); }}
.aparato[data-modo="telefono"] {{ width: 414px; height: 868px; }}
.aparato[data-modo="tableta"] {{ width: 844px; height: 1204px; border-radius: 28px; }}
.aparato[data-modo="escritorio"] {{ width: 1304px; height: 824px; border-radius: 14px; }}
.aparato .estado-ios {{ position: absolute; inset: 12px 12px auto; height: 48px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 28px; color: #1a1a1a; font-size: 15px; font-weight: 600; z-index: 70; pointer-events: none; }}
.aparato .estado-ios .isla {{ width: 118px; height: 34px; border-radius: 17px; background: #000; }}
.aparato .estado-ios .derecha {{ justify-self: end; display: flex; gap: 6px; align-items: center; }}
.aparato .estado-ios .bateria {{ width: 24px; height: 12px; border: 1.5px solid #1a1a1a; border-radius: 4px; background: linear-gradient(#1a1a1a, #1a1a1a) no-repeat 2px 2px / 16px 6px; }}
.aparato:not([data-modo="telefono"]) .estado-ios {{ display: none; }}
.aparato .indicador {{ position: absolute; left: 50%; bottom: 20px; width: 134px; height: 5px; border-radius: 3px; background: #1a1a1a; transform: translateX(-50%); z-index: 70; pointer-events: none; opacity: .9; }}
.aparato:not([data-modo="telefono"]) .indicador {{ display: none; }}

/* ==========================================================================
   1. Tokens canónicos (doc 50, 5.1): un solo :root para la app
   ========================================================================== */
.app {{
  --fondo: #ffffff; --fondo-suave: #f4f4f2; --fondo-contenido: #f6f5f1; --fondo-miniatura: #e6e6e2; --fondo-mapa: #eef0ec;
  --texto: #1a1a1a; --texto-suave: #5c5c5c; --borde: #dcdcd8;
  --primario: #6d34c8; --primario-texto: #fff; --primario-suave: color-mix(in srgb, #6d34c8 12%, white);
  --ok: #1f6f43; --ok-suave: color-mix(in srgb, #1f6f43 12%, white); --error: #b3261e; --error-suave: #fdf3f2;
  --destacado: #d35400; --destacado-texto: #a94400; --vidrio: rgba(255,255,255,.92); --sistema-azul: #1a73e8;
  --sombra: 0 2px 12px rgba(0,0,0,.08); --sombra-panel: 0 -2px 16px rgba(0,0,0,.1); --sombra-flotante: 0 6px 20px rgba(0,0,0,.22);
  --espacio-1: 4px; --espacio-2: 8px; --espacio-3: 12px; --espacio-4: 16px; --espacio-5: 20px; --espacio-6: 24px; --espacio-7: 32px; --espacio-8: 40px;
  --radio-chico: 8px; --radio: 12px; --radio-grande: 16px; --radio-pildora: 999px;
  --control: 44px; --toque: 48px; --boton-icono: 48px; --boton-icono-grande: 56px; --toque-min: 44px;
  --alto-barra: 56px; --alto-filtros: 48px; --alto-nav: 60px; --alto-barra-acciones: 72px; --alto-modos: 56px; --ancho-carril-nav: 88px;
  --tope: 0px; --piso: 0px;
  --z-pegajoso: 10; --z-flotante: 20; --z-barra: 30; --z-hoja: 40; --z-capa: 50; --z-encima: 60;
  --letra-2xs: .75rem; --letra-xs: .875rem; --letra-sm: .9375rem; --letra-md: 1.0625rem; --letra-lg: 1.125rem; --letra-xl: 1.1875rem; --letra-2xl: 1.625rem; --letra-3xl: 1.875rem;
  --gutter: 20px; --columna: 600px; --columna-ancha: 960px; --panel: 400px;
  --tarjeta-mediana: 220px; --tarjeta-mediana-foto: 132px; --tarjeta-grande: 165px; --tarjeta-grande-foto: 248px; --tarjeta-chica: 104px; --foto-renglon: 56px;
  --hoja-asoma: 176px;
  --duracion: 200ms; --duracion-ficha: 220ms; --curva: cubic-bezier(.22,.61,.36,1);
}}

/* ==========================================================================
   2. El armazón: rejilla de dos áreas (pantalla, nav); en tableta y escritorio la nav pasa a columna lateral
   ========================================================================== */
.app {{ position: relative; display: grid; grid-template: "pantalla" 1fr "nav" auto / 1fr; width: 100%; height: 100%; overflow: hidden; border-radius: 30px; background: var(--fondo-contenido); color: var(--texto); font-family: var(--fuente); font-variation-settings: var(--ancho-texto); font-size: var(--letra-md); line-height: 1.4; }}
.aparato[data-modo="telefono"] .app {{ --tope: 48px; --piso: 34px; }}
.aparato[data-modo="tableta"] .app {{ --tope: 24px; --piso: 20px; border-radius: 18px; }}
.aparato[data-modo="escritorio"] .app {{ border-radius: 6px; }}
.pantalla {{ grid-area: pantalla; position: relative; display: grid; grid-template-columns: minmax(0, 1fr); grid-auto-rows: max-content; align-content: start; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }}
.pantalla::-webkit-scrollbar {{ display: none; }}
.pantalla[hidden] {{ display: none; }}
.pantalla.raiz {{ padding-bottom: var(--espacio-8); }}
.pantalla.tarea {{ background: var(--fondo); }}
.pantalla[data-id="alta"] {{ grid-template-rows: auto 1fr auto; }}
h1, h2, h3, h4 {{ font-variation-settings: var(--ancho-titulo); font-weight: 700; line-height: 1.15; text-wrap: balance; }}
.i {{ width: 22px; height: 22px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }}
.i.chico {{ width: 16px; height: 16px; }}
.i.chevron {{ width: 18px; height: 18px; color: var(--texto-suave); }}
.bloque, .tarjeta-dato, .seccion-carril > .titulo-seccion, .grupo, .kpis, .acciones, .titulo-ficha, .titulo-pagina, .pie, .campo, .renglones, .tarjeta-cartel, .nota-boton, .rotulo-grupo, .tarjeta-lista, .perfil-cabecera, .boton.completo, .boton.texto.peligro, .en-busqueda, .enlace-perfil {{ margin-inline: var(--gutter); }}

/* ---- navegación: abajo en teléfono (cinco destinos, el perfil incluido); lateral desde 792 ---- */
.navegacion {{ grid-area: nav; position: relative; z-index: var(--z-barra); display: grid; grid-template-columns: repeat(5, 1fr); height: calc(var(--alto-nav) + var(--piso)); padding: 0 var(--espacio-1) var(--piso); background: var(--fondo); border-top: 1px solid var(--borde); box-shadow: var(--sombra-panel); }}
.navegacion .marca, .navegacion button.destino {{ display: none; }}
.destino {{ display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; border: 0; background: none; color: var(--texto-suave); font-size: var(--letra-2xs); font-weight: 600; letter-spacing: .02em; cursor: pointer; }}
.destino .pildora {{ position: relative; display: grid; place-items: center; width: 60px; height: 32px; border-radius: 16px; transition: background-color 150ms; }}
.destino .pildora .i {{ width: 26px; height: 26px; }}
.destino .pildora .avatar.chico {{ width: 26px; height: 26px; border: 0; }}
.destino[aria-current="page"] {{ color: var(--primario); }}
.destino[aria-current="page"] .pildora {{ background: var(--primario); color: var(--primario-texto); }}
.destino[aria-current="page"] .pildora .avatar.chico {{ box-shadow: 0 0 0 2px var(--primario-texto); }}
.destino[aria-current="page"] span:last-child {{ font-weight: 700; }}
.punto {{ position: absolute; top: 3px; right: 14px; width: 9px; height: 9px; border-radius: 50%; background: var(--primario); box-shadow: 0 0 0 2px var(--fondo); }}
.barra .punto {{ top: 8px; right: 8px; }}
.app:has(> .pantalla.ficha:not([hidden])) .navegacion, .app:has(> .pantalla.tarea:not([hidden])) .navegacion {{ display: none; }}

/* ==========================================================================
   3. Cabecera única de las raíces (tipo Instagram): «+» · logotipo · lupa · campana, y debajo una sola fila de filtros.
      Pegajosa; al bajar se guarda la barra (fila 0fr) y quedan los filtros (48). Sin márgenes negativos.
   ========================================================================== */
.cabecera {{ position: sticky; top: 0; z-index: var(--z-pegajoso); display: grid; grid-template-rows: minmax(0, 1fr) auto auto; padding-top: var(--tope); background: var(--fondo); box-shadow: inset 0 -1px 0 var(--borde); transition: grid-template-rows var(--duracion) var(--curva); }}
.cabecera[data-compacta] {{ grid-template-rows: minmax(0, 0fr) auto auto; }}
.cabecera > * {{ min-height: 0; overflow: hidden; transition: padding var(--duracion) var(--curva); }}
.cabecera[data-compacta] > .barra {{ padding-block: 0; }}
.barra {{ display: grid; grid-template-columns: var(--control) var(--control) 1fr var(--control) var(--control); align-items: center; padding: calc((var(--alto-barra) - var(--control)) / 2) calc(var(--gutter) - var(--espacio-2)); }}
.barra > :nth-child(1) {{ grid-column: 1; }}
.barra > :nth-child(2) {{ grid-column: 3; justify-self: center; }}
.barra > :nth-child(3) {{ grid-column: 4; }}
.barra > :nth-child(4) {{ grid-column: 5; }}
.barra .i {{ width: 26px; height: 26px; }}
.logotipo-enlace {{ display: grid; align-items: center; min-height: var(--control); }}
.logotipo {{ display: block; height: 28px; width: auto; aspect-ratio: 3903 / 790; }}
.logotipo.chico {{ height: 24px; }}
.contexto {{ display: flex; align-items: center; gap: var(--espacio-2); min-height: 40px; padding: 0 var(--gutter) var(--espacio-2); }}
.filtros {{ display: flex; align-items: center; gap: var(--espacio-2); min-height: var(--alto-filtros); padding: 0 var(--gutter) var(--espacio-2); overflow-x: auto; scrollbar-width: none; scroll-padding-inline: var(--gutter); }}
.filtros::-webkit-scrollbar {{ display: none; }}
.avatar {{ display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 50%; background: var(--fondo-miniatura); color: var(--texto-suave); font-size: var(--letra-sm); font-weight: 700; cursor: pointer; }}
.avatar.chico {{ width: 28px; height: 28px; font-size: var(--letra-2xs); border: 2px solid var(--fondo); }}
.avatar.grande {{ width: 72px; height: 72px; font-size: var(--letra-2xl); }}

/* ---- barra interior (fichas), de tarea (altas) y de búsqueda (campo): la misma pieza, tres columnas ---- */
.barra-interior {{ position: sticky; top: 0; z-index: var(--z-pegajoso); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--espacio-2); height: calc(var(--alto-barra) + var(--tope)); padding: var(--tope) var(--gutter) 0; background: var(--fondo); border-bottom: 1px solid var(--borde); margin-bottom: var(--espacio-4); }}
.barra-interior > :first-child {{ justify-self: start; }}
.barra-interior > :last-child {{ justify-self: end; }}
.barra-interior.tarea > :first-child {{ grid-column: 2; justify-self: center; }}
.barra-interior.tarea > :last-child {{ grid-column: 3; }}
.barra-interior.con-campo {{ grid-template-columns: minmax(0, 1fr) auto; }}
.barra-interior.con-campo > :first-child {{ grid-column: 1; justify-self: stretch; margin: 0; }}
.barra-interior.con-campo > :last-child {{ grid-column: 2; }}

/* ==========================================================================
   4. Controles canónicos: Boton, BotonIcono, Chip, Palanca
   ========================================================================== */
.boton {{ display: inline-flex; align-items: center; justify-content: center; gap: var(--espacio-2); min-height: var(--toque); padding: 0 var(--espacio-4); border: 1px solid transparent; border-radius: var(--radio); font-size: var(--letra-lg); font-weight: 700; cursor: pointer; -webkit-tap-highlight-color: transparent; }}
.boton.primario {{ background: var(--primario); color: var(--primario-texto); }}
.boton.secundario {{ background: var(--fondo); color: var(--texto); border-color: var(--borde); }}
.boton.texto {{ min-height: var(--control); padding: 0 var(--espacio-2); background: none; color: var(--primario); font-size: var(--letra-sm); }}
.boton.texto.peligro {{ color: var(--error); justify-self: center; margin-top: var(--espacio-4); }}
.boton.chico {{ min-height: 36px; padding: 0 var(--espacio-3); font-size: var(--letra-sm); border-radius: var(--radio-pildora); }}
.boton.completo {{ width: auto; display: flex; }}
.boton:disabled {{ opacity: .55; cursor: default; }}
.boton.decidido {{ display: inline-grid; grid-template-columns: auto 1fr; grid-template-areas: "icono texto" "icono nota"; column-gap: var(--espacio-2); text-align: left; line-height: 1.1; background: var(--ok-suave); border-color: var(--ok); color: var(--ok); font-size: var(--letra-md); }}
.boton.decidido > .i {{ grid-area: icono; }}
.boton.decidido > small {{ grid-area: nota; color: var(--texto-suave); font-size: var(--letra-xs); font-weight: 500; }}
.boton-icono {{ display: inline-grid; place-items: center; width: var(--control); height: var(--control); border: 0; border-radius: 50%; background: none; color: var(--texto); cursor: pointer; -webkit-tap-highlight-color: transparent; }}
.boton-icono.contorno {{ border: 1px solid var(--borde); background: var(--fondo); }}
.boton-icono.elevado {{ width: var(--boton-icono); height: var(--boton-icono); background: var(--fondo); color: var(--primario); box-shadow: var(--sombra); }}
.boton-icono.grande {{ width: var(--boton-icono-grande); height: var(--boton-icono-grande); }}
.boton-icono.grande .i {{ width: 26px; height: 26px; }}
.boton-icono.primario {{ background: var(--primario); color: var(--primario-texto); }}
/* Decidido: verde lleno con el glifo en blanco. Va al final y con la misma especificidad que las variantes: nada lo pisa. */
.boton-icono.decidido, .boton-icono.decidido.elevado, .boton-icono.decidido.contorno {{ background: var(--ok); border-color: var(--ok); color: #fff; }}
.boton-icono.plano {{ position: relative; }}
.chip {{ position: relative; flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 var(--espacio-3); border: 1px solid var(--borde); border-radius: var(--radio-pildora); background: var(--fondo); color: var(--texto); font-size: var(--letra-sm); white-space: nowrap; cursor: pointer; }}
.chip::before {{ content: ""; position: absolute; inset: -4px 0; }}
.chip small {{ color: var(--texto-suave); font-size: var(--letra-xs); font-weight: 500; }}
.chip.activo {{ background: var(--primario); border-color: var(--primario); color: var(--primario-texto); font-weight: 600; }}
.chip.activo small {{ color: inherit; opacity: .85; }}
.chip.activo .i {{ color: inherit; }}
.chip.quitar {{ padding-right: var(--espacio-2); }}
.chip.filtro {{ font-weight: 600; }}
.cuenta-filtros {{ display: grid; place-items: center; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px; background: var(--primario); color: var(--primario-texto); font-size: var(--letra-2xs); font-weight: 700; }}
.chip.contexto {{ font-weight: 600; min-height: 36px; }}
.chip.contexto > span {{ overflow: hidden; text-overflow: ellipsis; }}
.chip.contexto.texto {{ border: 0; padding: 0 var(--espacio-1); background: none; }}
.chip.persona {{ padding: 4px var(--espacio-3) 4px 4px; }}
.chips {{ display: flex; gap: var(--espacio-2); overflow-x: auto; scrollbar-width: none; scroll-padding-inline: var(--gutter); }}
.chips::-webkit-scrollbar {{ display: none; }}
.chips.envuelve {{ flex-wrap: wrap; overflow: visible; }}
.letras {{ display: flex; gap: 2px; padding-inline: calc(var(--gutter) - 8px); overflow-x: auto; scrollbar-width: none; }}
.letras button {{ flex: none; width: 34px; height: 36px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--texto); font-size: var(--letra-md); font-weight: 700; font-variation-settings: var(--ancho-titulo); cursor: pointer; }}
.letras button[aria-current="true"] {{ color: var(--primario); border-bottom-color: var(--primario); }}
.palanca {{ position: relative; width: 51px; height: 31px; border: 0; border-radius: var(--radio-pildora); background: var(--borde); cursor: pointer; transition: background-color 150ms; }}
.palanca::after {{ content: ""; position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 50%; background: var(--fondo); box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: transform 150ms; }}
.palanca[aria-checked="true"] {{ background: var(--primario); }}
.palanca[aria-checked="true"]::after {{ transform: translateX(20px); }}

/* ==========================================================================
   5. Renglón único con cuatro pieles: lista, dato, ajuste, resuelto
   ========================================================================== */
.renglon {{ display: grid; grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: "foto titulo accion" "foto meta accion" "foto segundo accion"; column-gap: var(--espacio-3); align-items: center; align-content: center; width: 100%; color: var(--texto); text-align: left; }}
.renglon > .foto, .renglon > .i:first-child {{ grid-area: foto; align-self: start; }}
.renglon > b {{ grid-area: titulo; min-width: 0; overflow-wrap: anywhere; }}
.renglon > small {{ grid-area: meta; min-width: 0; color: var(--texto-suave); font-size: var(--letra-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }}
.renglon > small.segundo {{ grid-area: segundo; display: flex; align-items: center; gap: 4px; }}
.renglon > .chevron, .renglon > .valor, .renglon > .palanca, .renglon > .boton.texto, .renglon > .boton-icono, .renglon > .opciones {{ grid-area: accion; }}
.renglon.lista {{ grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "frente accion"; padding: var(--espacio-3) var(--gutter); border-bottom: 1px solid var(--borde); column-gap: var(--espacio-3); }}
.renglon.lista > .frente {{ grid-area: frente; display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "foto titulo" "foto meta" "foto segundo"; column-gap: var(--espacio-3); align-content: center; min-height: var(--foto-renglon); min-width: 0; }}
.renglon.lista > .frente > .foto {{ grid-area: foto; align-self: start; }}
.renglon.lista > .frente > b {{ grid-area: titulo; font-size: var(--letra-xl); font-weight: 700; font-variation-settings: var(--ancho-titulo); line-height: 1.15; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }}
.renglon.lista > .frente > small {{ grid-area: meta; margin-top: 3px; color: var(--texto-suave); font-size: var(--letra-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }}
.renglon.lista > .frente > small.segundo {{ grid-area: segundo; display: flex; align-items: center; gap: 6px; margin-top: 2px; }}
.renglon.lista > .boton-icono {{ grid-area: accion; }}
.foto {{ width: var(--foto-renglon); height: var(--foto-renglon); border-radius: 10px; object-fit: cover; background: var(--fondo-miniatura); }}
.foto.redonda {{ border-radius: 50%; }}
.foto.chica {{ width: 40px; height: 40px; }}
.foto.grande {{ width: 96px; height: 96px; }}
.perfil-cabecera > .foto {{ grid-area: avatar; }}
.sn {{ display: block; background: var(--fondo-miniatura) url("SNURI") center / 44% no-repeat; }}
.estado {{ display: inline-flex; align-items: center; padding: 0 var(--espacio-2); border-radius: var(--radio-pildora); background: var(--primario-suave); color: var(--primario); font-size: var(--letra-xs); font-weight: 700; }}
.lista > .renglon:last-child {{ border-bottom: 0; }}
.renglon.dato {{ min-height: var(--control); padding: var(--espacio-2) 0; }}
.renglon.dato > .i:first-child {{ color: var(--texto-suave); align-self: center; }}
.renglon.dato > b {{ font-weight: 600; }}
.renglon.dato > .pila {{ grid-area: foto; display: grid; grid-auto-flow: column; grid-auto-columns: 20px; padding-right: 8px; }}
.pila .avatar {{ position: relative; }}
.pila .avatar + .avatar {{ z-index: 1; }}
.tarjeta-lista {{ border: 1px solid var(--borde); border-radius: var(--radio); background: var(--fondo); overflow: hidden; }}
.tarjeta-lista > li + li {{ border-top: 1px solid var(--borde); }}
.renglon.ajuste {{ grid-template-columns: 24px minmax(0, 1fr) auto; grid-template-areas: "foto titulo accion" "foto meta accion"; min-height: 52px; padding: var(--espacio-2) 14px; border: 0; background: none; cursor: pointer; }}
.renglon.ajuste.sola {{ padding-inline: 0; cursor: default; }}
.renglon.ajuste > .i:first-child {{ color: var(--texto-suave); align-self: center; }}
.renglon.ajuste > b {{ font-weight: 600; }}
.renglon.ajuste > small {{ white-space: normal; line-height: 1.3; }}
.renglon.ajuste > .valor {{ display: inline-flex; align-items: center; gap: 4px; color: var(--texto-suave); font-size: var(--letra-sm); }}
.rotulo-grupo {{ margin-top: var(--espacio-5); margin-bottom: var(--espacio-2); padding-left: 4px; color: var(--texto-suave); font-size: var(--letra-xs); font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }}
.renglones {{ display: grid; gap: var(--espacio-2); margin-bottom: var(--espacio-4); }}
.renglon.resuelto {{ grid-template-columns: 24px minmax(0, 1fr) auto; grid-template-areas: "foto meta accion" "foto titulo accion"; min-height: 60px; padding: 10px 14px; border: 1px solid var(--borde); border-radius: var(--radio); background: var(--fondo); }}
.renglon.resuelto.pendiente {{ border-style: dashed; }}
.renglon.resuelto > .i:first-child {{ color: var(--texto-suave); align-self: center; }}
.renglon.resuelto > small {{ grid-area: meta; font-size: var(--letra-xs); font-weight: 500; letter-spacing: .04em; text-transform: uppercase; }}
.renglon.resuelto > b {{ grid-area: titulo; font-weight: 600; line-height: 1.2; }}
.renglon.resuelto > b.falta {{ color: var(--texto-suave); font-weight: 500; }}
.renglon.resuelto > .opciones {{ display: flex; gap: 6px; align-items: center; }}

/* ==========================================================================
   6. Carriles y tarjetas (Inicio)
   ========================================================================== */
.seccion-carril {{ display: grid; gap: 0; padding-top: var(--espacio-4); }}
.titulo-seccion {{ display: inline-flex; align-items: center; gap: 2px; justify-self: start; min-height: var(--control); padding-right: var(--espacio-2); font-size: var(--letra-xl); font-weight: 700; font-variation-settings: var(--ancho-titulo); }}
.titulo-seccion > .chevron {{ width: 20px; height: 20px; }}
.carril {{ display: grid; grid-auto-flow: column; grid-auto-columns: var(--tarjeta-mediana); gap: var(--espacio-3); padding: var(--espacio-1) var(--gutter) var(--espacio-2); overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: var(--gutter); scrollbar-width: none; }}
.carril::-webkit-scrollbar {{ display: none; }}
.carril > li {{ position: relative; min-width: 0; scroll-snap-align: start; }}
.carril > li > .boton-icono {{ position: absolute; top: var(--espacio-2); right: var(--espacio-2); }}
.tarjeta {{ display: grid; grid-template-rows: var(--tarjeta-mediana-foto) auto auto; grid-template-areas: "foto" "titulo" "meta"; row-gap: var(--espacio-1); }}
.tarjeta > .foto {{ grid-area: foto; width: 100%; height: 100%; border-radius: var(--radio); }}
.tarjeta > .sello {{ grid-area: foto; align-self: end; justify-self: start; margin: 0 0 var(--espacio-2) var(--espacio-2); padding: 3px var(--espacio-2); border-radius: var(--radio-pildora); background: var(--vidrio); font-size: var(--letra-xs); font-weight: 700; }}
.tarjeta > b {{ grid-area: titulo; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-weight: 700; font-variation-settings: var(--ancho-titulo); line-height: 1.15; }}
.tarjeta > small {{ grid-area: meta; overflow: hidden; color: var(--texto-suave); font-size: var(--letra-sm); text-overflow: ellipsis; white-space: nowrap; }}
.carril.grande {{ grid-auto-columns: var(--tarjeta-grande); }}
.carril.grande .tarjeta {{ grid-template-rows: var(--tarjeta-grande-foto) auto auto; }}
.carril.chica {{ grid-auto-columns: var(--tarjeta-chica); }}
.carril.chica .tarjeta {{ grid-template-rows: var(--tarjeta-chica) auto auto; text-align: center; }}
.carril.chica .foto {{ border-radius: 50%; }}
.carril.chica > li > .boton-icono {{ top: 0; right: 0; }}
.carril.chica .tarjeta > .sello {{ display: none; }}

/* ==========================================================================
   7. Listas: títulos de grupo pegajosos bajo los filtros; esqueleto con los mismos tokens
   ========================================================================== */
.grupo {{ position: sticky; top: calc(var(--tope) + var(--alto-filtros) + var(--alto-extra, 0px)); z-index: calc(var(--z-pegajoso) - 1); padding: 14px 0 6px; background: var(--fondo-contenido); border-bottom: 1px solid var(--borde); font-size: var(--letra-xl); }}
.grupo > span {{ color: var(--texto-suave); font-weight: 500; }}
.esqueleto[hidden] {{ display: none; }}
.esqueleto .renglon.lista {{ grid-template-columns: var(--foto-renglon) minmax(0, 1fr); grid-template-areas: "foto titulo" "foto meta"; row-gap: 8px; }}
.esqueleto .foto {{ grid-area: foto; }}
.esqueleto .linea {{ display: block; height: 19px; border-radius: var(--radio-chico); }}
.esqueleto .linea.titulo {{ grid-area: titulo; width: 65%; align-self: end; }}
.esqueleto .linea.meta {{ grid-area: meta; width: 45%; height: 15px; align-self: start; }}
.respira {{ background: var(--fondo-miniatura); animation: respirar 1.2s ease-in-out infinite; }}
@keyframes respirar {{ 50% {{ opacity: .55; }} }}

/* ==========================================================================
   8. Lugares: mapa a pantalla completa y la lista en una hoja inferior que se arrastra (asoma · media · llena)
   ========================================================================== */
.pantalla[data-id="lugares"] {{ grid-template-rows: auto minmax(0, 1fr); overflow: hidden; padding-bottom: 0; }}
.mapa {{ position: relative; min-height: 0; background: var(--fondo-mapa); overflow: hidden; }}
.lienzo {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
.lienzo text {{ font-family: var(--fuente); font-variation-settings: var(--ancho-texto); font-weight: 700; font-size: 12.5px; paint-order: stroke; stroke: #fff; stroke-width: 3px; stroke-linejoin: round; text-anchor: middle; fill: var(--texto); }}
#base text {{ display: none; }}
.lienzo .lugar circle {{ fill: var(--texto); }}
.lienzo .lugar.con-evento circle {{ fill: var(--primario); }}
.lienzo .lugar.con-evento .nombre {{ fill: var(--primario); }}
.lienzo .lugar.destacado circle {{ fill: var(--destacado); }}
.lienzo .lugar.destacado .nombre {{ fill: var(--destacado-texto); }}
.lienzo .lugar.seguido circle {{ fill: var(--ok); }}
.lienzo .lugar.seguido .nombre {{ fill: var(--ok); }}
.lienzo .dia {{ font-size: 9px; fill: #fff; stroke: none; font-weight: 800; }}
.lienzo .lugar {{ cursor: pointer; }}
.lienzo .persona .halo {{ fill: rgba(26,115,232,.18); }}
.lienzo .persona .yo {{ fill: var(--sistema-azul); stroke: #fff; stroke-width: 2.5px; }}
.ubicacion {{ position: absolute; right: var(--gutter); top: var(--espacio-3); z-index: 2; color: var(--texto); }}
.atribucion {{ position: absolute; left: var(--espacio-2); top: calc(var(--espacio-3) + 14px); font-size: 10px; color: var(--texto-suave); opacity: .8; }}
.hoja-lugares {{ position: absolute; left: 0; right: 0; bottom: 0; z-index: var(--z-flotante); display: grid; grid-template-rows: auto auto minmax(0, 1fr); height: var(--hoja-asoma); background: var(--fondo); border-radius: var(--radio-grande) var(--radio-grande) 0 0; box-shadow: var(--sombra-panel); transition: height 250ms var(--curva); touch-action: none; }}
.pantalla[data-id="lugares"][data-pin][data-hoja-estado="asoma"] .hoja-lugares {{ height: auto; }}
.pantalla[data-id="lugares"][data-hoja-estado="media"] .hoja-lugares {{ height: 56%; }}
.pantalla[data-id="lugares"][data-hoja-estado="llena"] .hoja-lugares {{ height: calc(100% - var(--tope) - var(--alto-barra) - var(--alto-filtros)); }}
.hoja-lugares.arrastrando {{ transition: none; }}
.asa {{ width: 100%; height: 28px; border: 0; background: none; cursor: grab; }}
.asa::before {{ content: ""; display: block; width: 36px; height: 4px; margin: 8px auto 0; border-radius: 2px; background: #d9d9d9; }}
.resumen {{ padding: 0 var(--gutter) var(--espacio-2); font-size: var(--letra-xl); font-variation-settings: var(--ancho-titulo); }}
.resumen small {{ color: var(--texto-suave); font-size: var(--letra-sm); font-weight: 500; font-variation-settings: var(--ancho-texto); }}
.hoja-lugares > .lista.panel {{ overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; touch-action: pan-y; }}
.hoja-lugares > .lista.panel::-webkit-scrollbar {{ display: none; }}
.pin-tarjeta {{ display: grid; gap: var(--espacio-2); padding: 0 var(--gutter) var(--espacio-3); }}
.pin-tarjeta[hidden] {{ display: none; }}
.pin-tarjeta > .renglon.lista {{ padding-inline: 0; border: 0; }}
.pin-tarjeta > .boton.completo {{ margin-inline: 0; }}
.pantalla[data-id="lugares"][data-pin] .hoja-lugares > .lista.panel {{ display: none; }}
.pantalla[data-id="lugares"][data-pin] .hoja-lugares > .resumen {{ display: none; }}

/* ==========================================================================
   9. Ficha, alta con tira de modos, búsqueda, perfil
   ========================================================================== */
.portada {{ position: relative; margin: 0; aspect-ratio: 4 / 3; background: var(--tono, var(--fondo-miniatura)); overflow: hidden; }}
.portada > .cartel {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; view-transition-name: cartel; }}
.pantalla.ficha > .barra-interior {{ margin-bottom: 0; }}
.pantalla.ficha > .perfil-cabecera {{ margin-top: var(--espacio-5); }}
.portada > .sn {{ position: absolute; inset: 0; background-size: 30%; }}
.portada > .lupa {{ position: absolute; right: var(--espacio-3); bottom: var(--espacio-3); color: var(--texto); }}
.titulo-ficha {{ display: grid; gap: var(--espacio-1); margin-top: var(--espacio-4); font-size: var(--letra-2xl); }}
.titulo-ficha > .tipo {{ justify-self: start; padding: 2px var(--espacio-2); border-radius: var(--radio-pildora); background: var(--primario-suave); color: var(--primario); font-size: var(--letra-xs); font-weight: 700; font-variation-settings: var(--ancho-texto); letter-spacing: .02em; text-transform: uppercase; }}
.kpis {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--espacio-2); margin-top: var(--espacio-4); }}
.kpis li {{ display: grid; }}
.kpis a {{ display: grid; gap: 2px; align-content: start; height: 100%; min-height: 84px; padding: 10px var(--espacio-3); border: 1px solid var(--borde); border-radius: var(--radio); background: var(--fondo); }}
.kpis .i {{ width: 20px; height: 20px; color: var(--texto-suave); }}
.kpis b {{ font-size: 1rem; font-weight: 700; font-variation-settings: var(--ancho-titulo); line-height: 1.15; overflow-wrap: anywhere; text-wrap: balance; }}
.kpis small {{ color: var(--texto-suave); font-size: var(--letra-2xs); font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }}
.pantalla[data-id="perfil"] .kpis b {{ font-size: var(--letra-2xl); }}
.pantalla[data-id="perfil"] .filtros {{ padding-top: var(--espacio-4); }}
.acciones {{ display: flex; gap: var(--espacio-4); margin-top: var(--espacio-5); }}
.accion {{ display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 56px; border: 0; background: none; color: var(--texto); font-size: var(--letra-xs); font-weight: 600; text-align: center; cursor: pointer; }}
.accion > span {{ color: var(--primario); }}
.tarjeta-dato {{ display: grid; gap: var(--espacio-2); margin-top: var(--espacio-6); padding: var(--espacio-3) var(--espacio-4) var(--espacio-2); border: 1px solid var(--borde); border-radius: var(--radio-grande); background: var(--fondo); }}
.tarjeta-dato > h2, .bloque > h2 {{ font-size: var(--letra-xl); }}
.minimapa {{ width: 100%; height: 132px; border-radius: var(--radio); background: var(--fondo-mapa); }}
.minimapa .lugar circle {{ fill: var(--primario); stroke: #fff; stroke-width: 2px; }}
.bloque {{ display: grid; gap: var(--espacio-2); margin-top: var(--espacio-6); }}
.bloque > p {{ line-height: 1.45; }}
.bloque > .lista > .renglon.lista {{ padding-inline: 0; }}
.pie {{ margin-top: var(--espacio-6); padding-top: var(--espacio-3); border-top: 1px solid var(--borde); color: var(--texto-suave); font-size: var(--letra-sm); }}
.pie a {{ text-decoration: underline; }}
.barra-acciones {{ position: sticky; bottom: 0; z-index: var(--z-barra); margin-top: var(--espacio-4); display: grid; grid-template-columns: auto 1fr; gap: var(--espacio-3); align-items: center; min-height: var(--alto-barra-acciones); padding: var(--espacio-3) var(--gutter) calc(var(--espacio-3) + var(--piso)); background: var(--fondo); border-top: 1px solid var(--borde); }}
.barra-acciones:has(> :only-child) {{ grid-template-columns: 1fr; }}
.alta {{ display: grid; align-content: start; }}
.alta[hidden] {{ display: none; }}
.tarjeta-cartel {{ position: relative; display: grid; grid-template-columns: 48px minmax(0, 1fr); grid-template-areas: "icono titulo" "icono nota"; column-gap: 14px; align-items: center; margin-bottom: var(--espacio-6); padding: 12px 16px; border: 1px solid var(--primario); border-radius: var(--radio); background: var(--primario-suave); cursor: pointer; }}
.tarjeta-cartel > .boton-icono {{ grid-area: icono; }}
.tarjeta-cartel > b {{ grid-area: titulo; }}
.tarjeta-cartel > small {{ grid-area: nota; color: var(--texto-suave); font-size: var(--letra-sm); }}
.tarjeta-cartel > input {{ position: absolute; inset: 0; opacity: 0; cursor: pointer; }}
.titulo-pagina {{ margin-bottom: var(--espacio-4); font-size: var(--letra-2xl); }}
.campo {{ display: grid; grid-template-columns: auto 1fr; align-items: center; gap: var(--espacio-2); min-height: var(--toque); margin-bottom: var(--espacio-3); padding: 0 14px; border: 1px solid var(--borde); border-radius: var(--radio); background: var(--fondo); color: var(--texto-suave); }}
.campo:focus-within {{ border-color: var(--texto); }}
.campo input {{ min-width: 0; border: 0; background: none; outline: none; color: var(--texto); }}
.campo.buscar-campo {{ min-height: var(--control); border-radius: var(--radio-pildora); background: var(--fondo-suave); border-color: transparent; }}
.nota-boton {{ margin-top: var(--espacio-2); color: var(--texto-suave); font-size: var(--letra-sm); text-align: center; }}
.modos {{ position: sticky; bottom: 0; z-index: var(--z-barra); margin-top: var(--espacio-4); display: flex; justify-content: center; gap: var(--espacio-7); height: calc(var(--alto-modos) + var(--piso)); padding-bottom: var(--piso); background: var(--fondo); border-top: 1px solid var(--borde); }}
.modos button {{ min-width: 64px; border: 0; background: none; color: var(--texto-suave); font-size: var(--letra-sm); font-weight: 600; letter-spacing: .02em; text-transform: uppercase; cursor: pointer; }}
.modos button[aria-selected="true"] {{ color: var(--texto); font-weight: 800; }}
.modos button[aria-selected="true"]::after {{ content: ""; display: block; width: 6px; height: 6px; margin: 2px auto 0; border-radius: 50%; background: var(--texto); }}
.perfil-cabecera {{ display: grid; grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: "avatar nombre editar" "avatar meta editar"; column-gap: var(--espacio-4); align-items: center; margin-top: var(--espacio-4); }}
.perfil-cabecera > .avatar {{ grid-area: avatar; }}
.perfil-cabecera > b {{ grid-area: nombre; font-size: var(--letra-2xl); font-variation-settings: var(--ancho-titulo); line-height: 1.1; }}
.perfil-cabecera > small {{ grid-area: meta; color: var(--texto-suave); font-size: var(--letra-sm); }}
.perfil-cabecera > .boton, .perfil-cabecera > .boton-icono {{ grid-area: editar; }}
.enlace-perfil {{ justify-self: start; text-decoration: underline; color: var(--texto); margin-top: var(--espacio-4); }}
.en-busqueda {{ justify-self: start; margin-top: var(--espacio-1); }}
.chips.en-busqueda {{ justify-self: stretch; }}

/* ==========================================================================
   10. Hoja, aviso y transiciones
   ========================================================================== */
.hoja-fondo {{ position: absolute; inset: 0; z-index: var(--z-hoja); display: grid; align-items: end; background: rgba(0,0,0,.32); }}
.hoja-fondo[hidden] {{ display: none; }}
.hoja {{ position: relative; display: grid; gap: var(--espacio-3); justify-self: center; width: 100%; max-width: var(--columna); max-height: calc(100% - 48px); padding: var(--espacio-3) var(--espacio-5) calc(var(--espacio-4) + var(--piso)); border-radius: var(--radio-grande) var(--radio-grande) 0 0; background: var(--fondo); box-shadow: var(--sombra-panel); overflow-y: auto; animation: subir 250ms var(--curva); }}
.hoja::before {{ content: ""; display: block; width: 36px; height: 4px; margin: 0 auto; border-radius: 2px; background: #d9d9d9; }}
.hoja > h3 {{ padding-right: var(--control); font-size: var(--letra-xl); }}
.hoja > h4 {{ margin-top: var(--espacio-2); color: var(--texto-suave); font-size: var(--letra-xs); font-weight: 600; letter-spacing: .04em; text-transform: uppercase; font-variation-settings: var(--ancho-texto); }}
.hoja > .cerrar {{ position: absolute; top: var(--espacio-2); right: var(--espacio-2); color: var(--texto-suave); }}
.pie-hoja {{ position: sticky; bottom: calc(-1 * var(--espacio-4) - var(--piso)); display: grid; grid-template-columns: auto 1fr; gap: var(--espacio-3); margin-top: var(--espacio-2); padding: var(--espacio-3) 0 0; background: var(--fondo); border-top: 1px solid var(--borde); }}
.toast {{ position: absolute; left: var(--gutter); right: var(--gutter); bottom: calc(var(--alto-nav) + var(--piso) + var(--espacio-4)); z-index: var(--z-encima); display: grid; grid-template-columns: 1fr auto; align-items: center; gap: var(--espacio-3); padding: var(--espacio-3) var(--espacio-4); border-radius: var(--radio); background: var(--texto); color: var(--fondo); font-size: var(--letra-sm); box-shadow: var(--sombra-flotante); animation: subir 200ms var(--curva); }}
.toast[hidden] {{ display: none; }}
.toast button {{ border: 0; background: none; color: #d8c6ff; font-weight: 700; cursor: pointer; }}
@keyframes subir {{ from {{ transform: translateY(24px); opacity: 0; }} }}
@keyframes fundir {{ from {{ opacity: 0; }} }}
@keyframes entrar-lado {{ from {{ transform: translateX(28px); opacity: 0; }} }}
@keyframes entrar-abajo {{ from {{ transform: translateY(40px); opacity: 0; }} }}
.pantalla.entra-seccion {{ animation: fundir var(--duracion) var(--curva); }}
.pantalla.entra-ficha {{ animation: entrar-lado var(--duracion-ficha) var(--curva); }}
.pantalla.entra-tarea {{ animation: entrar-abajo 250ms var(--curva); }}
::view-transition-old(root), ::view-transition-new(root) {{ animation-duration: 200ms; }}
html[data-transicion="tarea"]::view-transition-new(root) {{ animation: entrar-abajo 250ms var(--curva); }}
html[data-transicion="ficha"]::view-transition-new(root) {{ animation: entrar-lado 220ms var(--curva); }}
::view-transition-group(cartel) {{ animation-duration: 220ms; animation-timing-function: var(--curva); }}
@media (prefers-reduced-motion: reduce) {{
  .pantalla, .hoja, .toast, .cabecera, .palanca, .palanca::after, .destino .pildora, .hoja-lugares {{ animation: none !important; transition: none !important; }}
  .respira {{ animation: none; }}
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) {{ animation: none !important; }}
}}

/* ==========================================================================
   11. Reglas responsivas (consultas de contenedor sobre el aparato; en la app serán @media con los mismos números)
   ========================================================================== */
@container app (min-width: 624px) {{
  .app {{ --gutter: max(20px, calc((100cqw - 24px - var(--columna)) / 2)); }}
}}
@container app (min-width: 792px) {{
  .app {{ grid-template: "nav pantalla" 1fr / var(--ancho-carril-nav) minmax(0, 1fr); --gutter: max(24px, calc((100cqw - 24px - var(--ancho-carril-nav) - var(--columna)) / 2)); }}
  .app:has(> .pantalla.ficha:not([hidden])) .navegacion, .app:has(> .pantalla.tarea:not([hidden])) .navegacion {{ display: grid; }}
  .navegacion {{ grid-template-columns: 1fr; grid-template-rows: auto repeat(5, auto) auto 1fr auto auto; align-content: start; justify-items: center; gap: var(--espacio-2); height: auto; padding: calc(var(--tope) + var(--espacio-4)) var(--espacio-2) calc(var(--espacio-4) + var(--piso)); border-top: 0; border-right: 1px solid var(--borde); box-shadow: none; }}
  .navegacion .marca {{ display: grid; place-items: center; width: 56px; height: 56px; margin-bottom: var(--espacio-2); }}
  .navegacion .marca .logotipo {{ height: 16px; }}
  .navegacion button.destino {{ display: flex; }}
  .navegacion .publicar {{ grid-row: 7; }}
  .navegacion .publicar .pildora {{ width: 48px; height: 48px; border-radius: 50%; background: var(--primario); color: var(--primario-texto); box-shadow: var(--sombra); }}
  .navegacion > [data-ir="buscar"] {{ grid-row: 9; }}
  .navegacion > [aria-label="Novedades"] {{ grid-row: 10; }}
  .destino {{ width: 72px; padding: 6px 0; border-radius: var(--radio); }}
  .barra, .barra-interior > .logotipo-enlace {{ display: none; }}
  .cabecera, .cabecera[data-compacta] {{ grid-template-rows: auto auto auto; }}
  .contexto, .filtros {{ padding-top: var(--espacio-3); }}
  .barra-interior {{ grid-template-columns: auto 1fr auto; }}
  .barra-interior.tarea > :first-child {{ display: none; }}
  .barra-interior.tarea > :last-child {{ grid-column: 3; }}
  .barra-interior.con-campo > :first-child {{ display: grid; max-width: 520px; }}
  .pantalla[data-id="lugares"] {{ grid-template-columns: var(--panel) minmax(0, 1fr); grid-template-areas: "cabecera cabecera" "hoja mapa"; }}
  .pantalla[data-id="lugares"] > .cabecera {{ grid-area: cabecera; }}
  .pantalla[data-id="lugares"] > .mapa {{ grid-area: mapa; }}
  .pantalla[data-id="lugares"] .hoja-lugares, .pantalla[data-id="lugares"][data-hoja-estado] .hoja-lugares {{ position: static; grid-area: hoja; height: auto; min-height: 0; border-radius: 0; box-shadow: none; border-right: 1px solid var(--borde); background: var(--fondo-contenido); }}
  .hoja-lugares > .asa {{ display: none; }}
  .hoja-lugares > .resumen, .hoja-lugares > .pin-tarjeta {{ padding-inline: var(--espacio-5); }}
  .hoja-lugares > .resumen {{ padding-top: var(--espacio-3); font-size: var(--letra-lg); }}
  .pantalla[data-id="lugares"] .renglon.lista {{ padding-inline: var(--espacio-5); }}
  .barra-acciones > * {{ max-width: 320px; }}
  .barra-acciones:has(> :only-child) {{ justify-content: start; }}
  .toast {{ left: calc(var(--ancho-carril-nav) + var(--gutter)); right: auto; width: 420px; bottom: var(--espacio-6); }}
  .hoja {{ align-self: center; border-radius: var(--radio-grande); padding-bottom: var(--espacio-4); animation: fundir 200ms var(--curva); }}
  .hoja-fondo {{ align-items: center; }}
}}
@container app (min-width: 1048px) {{
  .app {{ --gutter: max(32px, calc((100cqw - 24px - var(--ancho-carril-nav) - var(--columna-ancha)) / 2)); }}
  .pantalla.ficha {{ grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); column-gap: var(--espacio-7); grid-template-areas: "barra barra" "portada titulo" "portada kpis" "portada acciones" "portada donde" ". con" ". sobre" ". quien" ". pie"; align-content: start; }}
  .pantalla.ficha > .barra-interior {{ grid-area: barra; }}
  .pantalla.ficha > .portada {{ grid-area: portada; margin-left: var(--gutter); border-radius: var(--radio-grande); aspect-ratio: 5 / 3; align-self: start; }}
  .pantalla.ficha > .perfil-cabecera {{ grid-area: portada; margin-right: 0; align-self: start; }}
  .pantalla.ficha > .titulo-ficha {{ grid-area: titulo; margin-left: 0; margin-top: 0; font-size: var(--letra-3xl); }}
  .pantalla.ficha > .kpis {{ grid-area: kpis; margin-left: 0; }}
  .pantalla.ficha > .acciones {{ grid-area: acciones; margin-left: 0; margin-right: 0; }}
  .pantalla[data-id="artista"] > .acciones {{ margin-left: var(--gutter); }}
  .pantalla.ficha > .tarjeta-dato {{ grid-area: donde; margin-left: 0; }}
  .pantalla.ficha > .con {{ grid-area: con; margin-left: 0; }}
  .pantalla.ficha > .sobre {{ grid-area: sobre; margin-left: 0; }}
  .pantalla.ficha > .quien {{ grid-area: quien; margin-left: 0; }}
  .pantalla.ficha > .proximos {{ grid-area: proximos; margin-left: 0; }}
  .pantalla.ficha > .pie {{ grid-area: pie; margin-left: 0; }}
  .pantalla.ficha > .barra-acciones {{ grid-column: 1 / -1; }}
  .pantalla[data-id="lugar"] {{ grid-template-areas: "barra barra" "portada titulo" "portada kpis" "portada acciones" "portada proximos" ". donde" ". sobre" ". pie"; }}
  .pantalla[data-id="artista"] {{ grid-template-areas: "barra barra" "portada kpis" "acciones proximos" ". sobre" ". lugares" ". pie"; }}
  .pantalla[data-id="artista"] > .lugares {{ grid-area: lugares; margin-left: 0; }}
  .pantalla[data-id="ajustes"] {{ grid-template-columns: minmax(0, 1fr); grid-template-areas: none; }}
  .pantalla[data-id="ajustes"] > * {{ grid-area: auto; }}
  .pantalla[data-id="ajustes"] > :not(.barra-interior) {{ max-width: var(--columna); }}
  .pantalla.tarea > :not(.barra-interior):not(.modos) {{ width: 100%; max-width: var(--columna); justify-self: center; }}
  .carril.grande {{ grid-auto-columns: 190px; }}
  .carril.grande .tarjeta {{ grid-template-rows: 285px auto auto; }}
}}
</style>
</head>
<body>
<header class="estudio">
  <strong>Somos Nosotros · reestructura de la interfaz (OL-227) · prototipo v2</strong>
  <div class="modos-estudio" role="group" aria-label="Tamaño">
    <button type="button" data-modo="telefono" aria-pressed="true">Teléfono 390</button>
    <button type="button" data-modo="tableta" aria-pressed="false">Tableta 820</button>
    <button type="button" data-modo="escritorio" aria-pressed="false">Escritorio 1280</button>
  </div>
  <p class="nota">Mismo marcado en los tres tamaños. Toca «+» desde cada sección, la lupa, Filtros, un punto del mapa, arrastra la hoja de Lugares, abre una tarjeta; baja en Agenda.</p>
</header>
<svg class="sprite" xmlns="http://www.w3.org/2000/svg"><defs>{sprite}{mapa_base}</defs></svg>
<div class="escenario">
  <div class="aparato" data-modo="telefono">
    <div class="estado-ios"><span>10:46</span><span class="isla"></span><span class="derecha"><span>●●●●</span><span class="bateria"></span></span></div>
    <div class="app" id="app">
      {nav}
      {inicio}
      {agenda}
      {lugares}
      {artistas}
      {perfil}
      {evento}
      {lugar}
      {artista}
      {alta}
      {buscar}
      {ajustes}
      {hojas}
    </div>
    <div class="indicador"></div>
  </div>
</div>
<script>
(() => {{
  const app = document.getElementById("app");
  const aparato = document.querySelector(".aparato");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pantallas = [...app.querySelectorAll(":scope > .pantalla")];
  const raices = ["inicio", "agenda", "lugares", "artistas", "perfil"];
  const tipoPorSeccion = {{ inicio: "evento", agenda: "evento", lugares: "lugar", artistas: "artista", perfil: "evento" }};
  const pila = [];
  const scrollDe = new Map();
  let actual = pantallas.find((p) => !p.hidden);
  const de = (id) => pantallas.find((p) => p.dataset.id === id);

  function pintarNav() {{
    app.querySelectorAll(".navegacion .destino[data-ir]").forEach((d) => {{
      if (d.dataset.ir === actual.dataset.id) d.setAttribute("aria-current", "page"); else d.removeAttribute("aria-current");
    }});
  }}
  function cambiar(destino, tipo) {{
    scrollDe.set(actual.dataset.id, actual.scrollTop);
    actual.hidden = true;
    destino.hidden = false;
    destino.scrollTop = tipo === "atras" ? scrollDe.get(destino.dataset.id) || 0 : 0;
    actual = destino;
    pintarNav();
    if (destino.dataset.id === "agenda" || destino.dataset.id === "artistas") esqueleto(destino);
    if (destino.dataset.id === "buscar") setTimeout(() => destino.querySelector("input")?.focus(), 250);
  }}
  function esqueleto(p) {{
    if (p.dataset.cargada) return;
    p.dataset.cargada = "1";
    const esq = p.querySelector(".esqueleto");
    const reales = [...p.querySelectorAll(":scope > .grupo, :scope > .lista:not(.esqueleto)")];
    reales.forEach((e) => (e.hidden = true));
    esq.hidden = false;
    setTimeout(() => {{ esq.hidden = true; reales.forEach((e) => (e.hidden = false)); }}, reduce ? 0 : 600);
  }}
  function ir(id, tipo, origen) {{
    const destino = de(id);
    if (!destino || destino === actual) return;
    if (tipo !== "atras") pila.push(actual.dataset.id);
    const cartel = origen?.querySelector?.("img") || null;
    if (cartel && tipo === "ficha") cartel.style.viewTransitionName = "cartel";
    document.documentElement.dataset.transicion = tipo;
    const hacer = () => cambiar(destino, tipo);
    // Secciones y Atrás: cambio inmediato con fundido en CSS (no dependen de un cuadro de captura). Ficha y tarea: View Transitions.
    if (!reduce && document.startViewTransition && (tipo === "ficha" || tipo === "tarea")) {{
      const t = document.startViewTransition(hacer);
      const seguro = setTimeout(() => t.skipTransition(), 700);
      t.ready.catch(() => {{}});
      t.finished.catch(() => {{}}).finally(() => {{ clearTimeout(seguro); if (cartel) cartel.style.viewTransitionName = ""; delete document.documentElement.dataset.transicion; }});
    }} else {{
      hacer();
      if (!reduce) {{ const c = "entra-" + (tipo === "atras" ? "seccion" : tipo); destino.classList.add(c); destino.addEventListener("animationend", () => destino.classList.remove(c), {{ once: true }}); }}
    }}
  }}
  function atras() {{ ir(pila.pop() || "inicio", "atras"); }}
  function aviso(texto) {{
    const t = app.querySelector(".toast");
    t.innerHTML = texto + ' <button type="button">Deshacer</button>';
    t.hidden = false;
    clearTimeout(t.temporizador);
    t.temporizador = setTimeout(() => (t.hidden = true), 3500);
    t.querySelector("button").onclick = () => (t.hidden = true);
  }}
  function abrirAlta(tipo) {{
    const alta = de("alta");
    alta.dataset.tipo = tipo;
    alta.querySelectorAll(".modos [data-tipo]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tipo === tipo ? "true" : "false"));
    alta.querySelectorAll(":scope > .alta").forEach((f) => (f.hidden = !f.classList.contains(tipo)));
    ir("alta", "tarea");
  }}
  app.addEventListener("click", (e) => {{
    const publicar = e.target.closest("[data-publicar]");
    if (publicar) {{ e.preventDefault(); abrirAlta(tipoPorSeccion[actual.dataset.id] || "evento"); return; }}
    const modo = e.target.closest(".modos [data-tipo]");
    if (modo) {{ const alta = de("alta"); alta.dataset.tipo = modo.dataset.tipo; alta.querySelectorAll(".modos [data-tipo]").forEach((b) => b.setAttribute("aria-selected", b === modo ? "true" : "false")); alta.querySelectorAll(":scope > .alta").forEach((f) => (f.hidden = !f.classList.contains(modo.dataset.tipo))); alta.scrollTop = 0; return; }}
    const cerrar = e.target.closest("[data-cerrar]");
    if (cerrar) {{ cerrar.closest(".hoja-fondo").hidden = true; return; }}
    if (e.target.classList.contains("hoja-fondo")) {{ e.target.hidden = true; return; }}
    const hoja = e.target.closest("[data-hoja]:not(.hoja-fondo)");
    if (hoja) {{ e.preventDefault(); app.querySelector(`.hoja-fondo[data-hoja="${{hoja.dataset.hoja}}"]`).hidden = false; return; }}
    const accion = e.target.closest("[data-accion]");
    if (accion) {{
      e.preventDefault();
      const decidido = accion.getAttribute("aria-pressed") === "true";
      const seguir = accion.dataset.accion === "seguir";
      accion.setAttribute("aria-pressed", decidido ? "false" : "true");
      accion.classList.toggle("decidido", !decidido);
      accion.innerHTML = `<svg class="i" aria-hidden="true"><use href="#i-${{decidido ? (seguir ? "persona-mas" : "ok") : "ok"}}"/></svg>`;
      accion.setAttribute("aria-label", decidido ? (seguir ? "Seguir" : "Voy") : (seguir ? "Sigues" : "Ya vas"));
      const que = accion.closest("li, .renglon")?.querySelector("b")?.textContent || "esto";
      aviso(decidido ? (seguir ? `Ya no sigues a «${{que}}»` : `Ya no vas a «${{que}}»`) : (seguir ? `Sigues a «${{que}}»` : `Vas a «${{que}}»`));
      return;
    }}
    const quitar = e.target.closest(".chip.quitar");
    if (quitar) {{ quitar.remove(); const c = actual.querySelector(".cuenta-filtros"); if (c) c.remove(); return; }}
    const lugarMapa = e.target.closest(".lienzo .lugar");
    if (lugarMapa) {{ const p = de("lugares"); p.dataset.pin = "1"; p.querySelector(".pin-tarjeta").hidden = false; p.dataset.hojaEstado = "asoma"; return; }}
    const volver = e.target.closest("[data-volver-lista]");
    if (volver) {{ const p = de("lugares"); delete p.dataset.pin; p.querySelector(".pin-tarjeta").hidden = true; return; }}
    const asa = e.target.closest(".asa");
    if (asa && !asa.dataset.arrastro) {{ const p = de("lugares"); p.dataset.hojaEstado = {{ asoma: "media", media: "llena", llena: "asoma" }}[p.dataset.hojaEstado]; return; }}
    const at = e.target.closest("[data-atras]");
    if (at) {{ e.preventDefault(); atras(); return; }}
    const ir_ = e.target.closest("[data-ir]");
    if (ir_) {{
      e.preventDefault();
      const id = ir_.dataset.ir;
      const enHoja = ir_.closest(".hoja-fondo");
      if (enHoja) enHoja.hidden = true;
      const tipo = raices.includes(id) ? "seccion" : id === "buscar" ? "tarea" : "ficha";
      if (raices.includes(id) && raices.includes(actual.dataset.id)) pila.length = 0;
      ir(id, tipo, ir_);
      return;
    }}
    const chip = e.target.closest(".chips .chip, .filtros .chip:not(.filtro):not(.contexto):not(.quitar), .letras button");
    if (chip) {{
      const grupo = chip.parentElement;
      if (grupo.classList.contains("multi")) {{ chip.classList.toggle("activo"); chip.setAttribute("aria-pressed", chip.classList.contains("activo") ? "true" : "false"); return; }}
      if (grupo.classList.contains("letras")) {{ grupo.querySelectorAll("button").forEach((b) => b.toggleAttribute("aria-current", b === chip)); return; }}
      if (grupo.classList.contains("filtros")) {{ chip.classList.toggle("activo"); return; }}
      grupo.querySelectorAll(".chip").forEach((b) => b.classList.toggle("activo", b === chip));
    }}
    const palanca = e.target.closest(".palanca");
    if (palanca) palanca.setAttribute("aria-checked", palanca.getAttribute("aria-checked") === "true" ? "false" : "true");
  }});
  // Cabecera compacta: al bajar más de una barra se guarda la barra; al subir un poco vuelve. Con reposo tras cada cambio.
  pantallas.forEach((p) => {{
    const cab = p.querySelector(":scope > .cabecera");
    if (!cab) return;
    let antes = 0, quietaHasta = 0;
    p.addEventListener("scroll", () => {{
      const y = p.scrollTop, paso = y - antes; antes = y;
      if (Date.now() < quietaHasta) return;
      const compacta = cab.hasAttribute("data-compacta");
      if ((y < 60 || paso < -6) && compacta) {{ cab.removeAttribute("data-compacta"); quietaHasta = Date.now() + 300; }}
      else if (paso > 6 && y > 120 && !compacta) {{ cab.setAttribute("data-compacta", ""); quietaHasta = Date.now() + 300; }}
    }}, {{ passive: true }});
  }});
  // La hoja de Lugares se arrastra desde el asa o el resumen y suelta en el estado más cercano.
  const lugaresP = de("lugares");
  const hojaL = lugaresP.querySelector(".hoja-lugares");
  let arr = null;
  const alturaEstado = (estado) => {{ const h = lugaresP.querySelector(".mapa").getBoundingClientRect().height + hojaL.getBoundingClientRect().height * 0; const total = lugaresP.getBoundingClientRect().height; return {{ asoma: 176, media: total * 0.56, llena: total - 48 - 56 - 48 }}[estado]; }};
  hojaL.addEventListener("pointerdown", (e) => {{
    if (!e.target.closest(".asa, .resumen")) return;
    arr = {{ y0: e.clientY, h0: hojaL.getBoundingClientRect().height, movido: false }};
    hojaL.classList.add("arrastrando");
    hojaL.setPointerCapture(e.pointerId);
  }});
  hojaL.addEventListener("pointermove", (e) => {{
    if (!arr) return;
    const k = parseFloat(aparato.style.zoom || "1");
    const h = Math.max(120, arr.h0 + (arr.y0 - e.clientY) / k);
    if (Math.abs(arr.y0 - e.clientY) > 4) arr.movido = true;
    hojaL.style.height = h + "px";
  }});
  const soltar = (e) => {{
    if (!arr) return;
    hojaL.classList.remove("arrastrando");
    const h = hojaL.getBoundingClientRect().height / parseFloat(aparato.style.zoom || "1");
    hojaL.style.height = "";
    if (arr.movido) {{
      const estados = ["asoma", "media", "llena"];
      let mejor = "asoma", d = Infinity;
      for (const s of estados) {{ const dd = Math.abs(alturaEstado(s) - h); if (dd < d) {{ d = dd; mejor = s; }} }}
      lugaresP.dataset.hojaEstado = mejor;
      const asa = hojaL.querySelector(".asa"); asa.dataset.arrastro = "1"; setTimeout(() => delete asa.dataset.arrastro, 50);
    }}
    arr = null;
  }};
  hojaL.addEventListener("pointerup", soltar);
  hojaL.addEventListener("pointercancel", soltar);
  // Tamaños del aparato (las consultas de contenedor hacen el resto).
  const modos = document.querySelectorAll(".modos-estudio button");
  function ajustar() {{ const ancho = {{ telefono: 414, tableta: 844, escritorio: 1304 }}[aparato.dataset.modo]; aparato.style.zoom = Math.min(1, (document.documentElement.clientWidth - 32) / ancho); }}
  modos.forEach((b) => b.addEventListener("click", () => {{ modos.forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false")); aparato.dataset.modo = b.dataset.modo; ajustar(); }}));
  addEventListener("resize", ajustar);
  ajustar();
  // El mapa se dibuja 1:1 en cualquier tamaño: el viewBox sigue a la caja.
  const lienzo = app.querySelector(".mapa .lienzo");
  const centrar = () => {{ const caja = lienzo.parentElement.getBoundingClientRect(); const k = parseFloat(aparato.style.zoom || "1"); const w = Math.max(320, caja.width / k), h = Math.max(320, caja.height / k); lienzo.setAttribute("viewBox", `${{Math.round(330 - w / 2)}} ${{Math.round(450 - h / 2)}} ${{Math.round(w)}} ${{Math.round(h)}}`); }};
  new ResizeObserver(centrar).observe(lienzo.parentElement);
  centrar();
}})();
</script>
</body>
</html>
'''
html = html.replace('SNURI', sn)
html = re.sub(r'<section class="pantalla ([a-z]+)" data-id="(?!inicio)([a-z]+)"', r'<section class="pantalla \1" data-id="\2" hidden', html)
salida = os.path.join(RAIZ, 'docs/rediseno/prototipos/restructura-ui.html')
open(salida, 'w', encoding='utf-8').write(html)
print('escrito', salida, len(html), 'bytes', html.count('\n'), 'líneas')
