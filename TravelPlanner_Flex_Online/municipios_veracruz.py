"""Catálogo estático de 212 municipios veracruzanos, búsqueda de puntos OSM
bajo demanda y resultados trazables. Las fuentes OSM pueden estar incompletas.

Fuentes de nombres: Catálogo Único de Claves Geoestadísticas de INEGI
https://www.inegi.org.mx/servicios/catalogounico/
Contraste del listado: https://plataforma.gobiernodigitaleinnovacion.com/datos/veracruz-de-ignacio-de-la-llave

NO son 212 municipios con atractivos verificados. El selector cubre los 212;
el contenido se consulta bajo demanda a OpenStreetMap y puede ser vacío.
"""
from __future__ import annotations
import math
import re
import unicodedata
from urllib.parse import urlencode

_MUNICIPIOS = """
Acajete
Acatlán
Acayucan
Actopan
Acula
Acultzingo
Agua Dulce
Álamo Temapache
Alpatláhuac
Alto Lucero de Gutiérrez Barrios
Altotonga
Alvarado
Amatitlán
Amatlán de los Reyes
Ángel R. Cabada
Apazapan
Aquila
Astacinga
Atlahuilco
Atoyac
Atzacan
Atzalan
Ayahualulco
Banderilla
Benito Juárez
Boca del Río
Calcahualco
Camarón de Tejeda
Camerino Z. Mendoza
Carlos A. Carrillo
Carrillo Puerto
Castillo de Teayo
Catemaco
Cazones de Herrera
Cerro Azul
Chacaltianguis
Chalma
Chiconamel
Chiconquiaco
Chicontepec
Chinameca
Chinampa de Gorostiza
Chocamán
Chontla
Chumatlán
Citlaltépetl
Coacoatzintla
Coahuitlán
Coatepec
Coatzacoalcos
Coatzintla
Coetzala
Colipa
Comapa
Córdoba
Cosamaloapan de Carpio
Cosautlán de Carvajal
Coscomatepec
Cosoleacaque
Cotaxtla
Coxquihui
Coyutla
Cuichapa
Cuitláhuac
El Higo
Emiliano Zapata
Espinal
Filomeno Mata
Fortín
Gutiérrez Zamora
Hidalgotitlán
Huatusco
Huayacocotla
Hueyapan de Ocampo
Huiloapan de Cuauhtémoc
Ignacio de la Llave
Ilamatlán
Isla
Ixcatepec
Ixhuacán de los Reyes
Ixhuatlán de Madero
Ixhuatlán del Café
Ixhuatlán del Sureste
Ixhuatlancillo
Ixmatlahuacan
Ixtaczoquitlán
Jalacingo
Jalcomulco
Jáltipan
Jamapa
Jesús Carranza
Jilotepec
José Azueta
Juan Rodríguez Clara
Juchique de Ferrer
La Antigua
La Perla
Landero y Coss
Las Choapas
Las Minas
Las Vigas de Ramírez
Lerdo de Tejada
Los Reyes
Magdalena
Maltrata
Manlio Fabio Altamirano
Mariano Escobedo
Martínez de la Torre
Mecatlán
Mecayapan
Medellín de Bravo
Miahuatlán
Minatitlán
Misantla
Mixtla de Altamirano
Moloacán
Nanchital de Lázaro Cárdenas del Río
Naolinco
Naranjal
Naranjos Amatlán
Nautla
Nogales
Oluta
Omealca
Orizaba
Otatitlán
Oteapan
Ozuluama de Mascareñas
Pajapan
Pánuco
Papantla
Paso de Ovejas
Paso del Macho
Perote
Platón Sánchez
Playa Vicente
Poza Rica de Hidalgo
Pueblo Viejo
Puente Nacional
Rafael Delgado
Rafael Lucio
Río Blanco
Saltabarranca
San Andrés Tenejapan
San Andrés Tuxtla
San Juan Evangelista
San Rafael
Santiago Sochiapan
Santiago Tuxtla
Sayula de Alemán
Sochiapa
Soconusco
Soledad Atzompa
Soledad de Doblado
Soteapan
Tamalín
Tamiahua
Tampico Alto
Tancoco
Tantima
Tantoyuca
Tatahuicapan de Juárez
Tatatila
Tecolutla
Tehuipango
Tempoal
Tenampa
Tenochtitlán
Teocelo
Tepatlaxco
Tepetlán
Tepetzintla
Tequila
Texcatepec
Texhuacán
Texistepec
Tezonapa
Tierra Blanca
Tihuatlán
Tlachichilco
Tlacojalpan
Tlacolulan
Tlacotalpan
Tlacotepec de Mejía
Tlalixcoyan
Tlalnelhuayocan
Tlaltetela
Tlapacoyan
Tlaquilpa
Tlilapan
Tomatlán
Tonayán
Totutla
Tres Valles
Tuxpan
Tuxtilla
Úrsulo Galván
Uxpanapa
Vega de Alatorre
Veracruz
Villa Aldama
Xalapa
Xico
Xoxocotla
Yanga
Yecuatla
Zacualpan
Zaragoza
Zentla
Zongolica
Zontecomatlán de López y Fuentes
Zozocolco de Hidalgo
"""
MUNICIPIOS = tuple(s.strip() for s in _MUNICIPIOS.splitlines() if s.strip())
assert len(MUNICIPIOS) == 212 and len(set(MUNICIPIOS)) == 212, 'Verificar el padrón de 212 municipios'

CATEGORIAS = ('Naturaleza', 'Cultura', 'Gastronomía', 'Todas')
INTERESES = ('Todos', 'Agua y lagunas', 'Selva y senderos', 'Fauna', 'Historia', 'Museos', 'Comida local', 'Parques')
OSM_URL = 'https://overpass-api.de/api/interpreter'


def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFKD',str(s or '').lower()) if not unicodedata.combining(c))


def overpass_query(municipio):
    """Búsqueda delimitada por el área administrativa municipal de OSM.
    Se usa el estado identificado por ISO3166-2, evitando homónimos.
    """
    if municipio not in MUNICIPIOS: raise ValueError('Municipio inválido')
    escaped = re.escape(municipio).replace('"', '\\"')
    # El nombre se usa como expresión exacta (^...$) para el área municipal.
    return ('''[out:json][timeout:16];
(
 area["ISO3166-2"="MX-VER"]["admin_level"="4"];
 area["name"="Veracruz de Ignacio de la Llave"]["admin_level"="4"];
 area["name"="Veracruz"]["admin_level"="4"];
)->.estado;
relation(area.estado)["boundary"="administrative"]["admin_level"="6"]["name"~"^%s$"]->.mun;
.mun out center;
.mun map_to_area -> .area_mun;
(
 nwr(area.area_mun)["name"]["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|picnic_site)$"];
 nwr(area.area_mun)["name"]["natural"~"^(beach|waterfall|peak|cave_entrance|water|spring)$"];
 nwr(area.area_mun)["name"]["leisure"~"^(park|garden|nature_reserve)$"];
 nwr(area.area_mun)["name"]["amenity"~"^(restaurant|cafe|marketplace|arts_centre)$"];
 nwr(area.area_mun)["name"]["historic"];
);
out center 90;''' % escaped)


def nearby_query(lat, lon, km=15):
    """Consulta radio de 15 km desde centro APROXIMADO del municipio; no es trayecto vial.
    Nunca atribuir los resultados al municipio seleccionado.
    """
    lat,lon = float(lat),float(lon)
    if not (17 <= lat <= 23 and -99 <= lon <= -92):
        raise ValueError('Coordenadas fuera del ámbito de Veracruz')
    return f'''[out:json][timeout:16];
(
 nwr(around:{km*1000},{lat:.5f},{lon:.5f})["name"]["tourism"~"^(attraction|museum|viewpoint|gallery|zoo)$"];
 nwr(around:{km*1000},{lat:.5f},{lon:.5f})["name"]["natural"~"^(beach|waterfall|peak|cave_entrance|water)$"];
 nwr(around:{km*1000},{lat:.5f},{lon:.5f})["name"]["leisure"~"^(park|garden|nature_reserve)$"];
 nwr(around:{km*1000},{lat:.5f},{lon:.5f})["name"]["amenity"~"^(restaurant|cafe|marketplace|arts_centre)$"];
);
out center 75;'''


def extract_osm(payload,mun,nearby=False,center=None):
    """Sólo mapea datos OSM realmente devueltos, sin nombres inventados."""
    records = (payload or {}).get('elements', [])
    match = next((x for x in records if x.get('type')=='relation' and x.get('tags',{}).get('boundary')=='administrative'), None)
    if not nearby and not match: return [], None, False
    center = center or ((match.get('center',{}).get('lat'), match.get('center',{}).get('lon')) if match else None)
    found=[];names=set()
    for obj in records:
        tags=obj.get('tags') or {}
        nombre=tags.get('name','').strip()
        if not nombre or not (tags.get('tourism') or tags.get('natural') or tags.get('leisure') or tags.get('amenity') or tags.get('historic')):
            continue
        lat=obj.get('lat') or (obj.get('center') or {}).get('lat')
        lon=obj.get('lon') or (obj.get('center') or {}).get('lon')
        if not lat or not lon: continue
        if nearby and center and lat and lon and haversine(center[0],center[1],lat,lon) < 0.5: pass
        key = (norm(nombre),round(lat,3),round(lon,3))
        if key in names:continue
        names.add(key)
        category = classify(tags)
        found.append({'id_lugar':f'osm_{obj["type"]}_{obj["id"]}', 'nombre':nombre,
          'estado':'Veracruz','municipio':mun if not nearby else 'alrededores (sin municipio verificado)',
          'categoria':category,'actividad':category, 'lat':lat,'lon':lon,
          'descripcion':tags.get('description') or 'Punto de interés registrado en OpenStreetMap; verifica servicios y acceso antes de visitarlo.',
          'etiquetas':[t for t in (tags.get('tourism'),tags.get('natural'),tags.get('leisure'),tags.get('amenity'),tags.get('historic')) if t],
          'tipo_fuente':'OpenStreetMap: colaborativo, sin verificación turística',
          'fuente':f'https://www.openstreetmap.org/{obj["type"]}/{obj["id"]}',
          'informacion':{'horario':tags.get('opening_hours'), 'web':tags.get('website') or tags.get('contact:website'), 'telefono':tags.get('phone')},
          'cerca':nearby, 'distancia_km':round(haversine(center[0],center[1],lat,lon),1) if nearby and center else None})
    return found, center, bool(match or nearby)


def haversine(a,b,c,d):
    from math import radians,sin,cos,asin,sqrt
    a,b,c,d=map(radians,[float(a),float(b),float(c),float(d)])
    h=sin((c-a)/2)**2+cos(a)*cos(c)*sin((d-b)/2)**2
    return 6371*2*asin(min(1,sqrt(h)))


def classify(t):
    if t.get('amenity') in ('restaurant','cafe','marketplace'):return 'Gastronomía'
    if t.get('historic') or t.get('tourism') in ('museum','gallery') or t.get('amenity')=='arts_centre':return 'Cultura'
    return 'Naturaleza'


def score(item,actividad,interes):
    cat=item.get('categoria','Naturaleza')
    act=40 if actividad=='Todas' or cat==actividad else 0
    if act==0:return None
    inside=not item.get('cerca',False)
    municipio=25 if inside else 7
    tags=' '.join([norm(item.get('nombre')),norm(item.get('descripcion'))]+[norm(x) for x in item.get('etiquetas',[])])
    matching={
      'Agua y lagunas':('water','beach','lagun','lago','river','waterfall','cascada','rio','mar'),
      'Selva y senderos':('forest','hiking','sender','selva','reserva','nature_reserve'),
      'Fauna':('zoo','animal','fauna','observ','bird'),
      'Historia':('historic','histori','archaeolog','monument'),
      'Museos':('museum','museo','gallery'),
      'Comida local':('restaurant','cafe','marketplace','mercado','comida'),
      'Parques':('park','parque','garden','jardin')}.get(interes,())
    afinidad=8 if interes=='Todos' else (15 if any(s in tags for s in matching) else 0)
    documentacion=8 if item.get('tipo_fuente','').startswith('OpenStreetMap') else 15
    ficha=sum(bool(item.get(k)) for k in ('nombre','lat','lon'))+min(2,sum(bool(v) for v in item.get('informacion',{}).values()))
    ficha=min(ficha,5)
    breakdown=[{'criterio':'Coincidencia con actividad','puntos':act,'maximo':40},
               {'criterio':'Ubicación: '+('dentro de municipio' if inside else 'zona cercana, municipio por comprobar'), 'puntos':municipio,'maximo':25},
               {'criterio':'Interés declarado','puntos':afinidad,'maximo':15},
               {'criterio':'Fuente de referencia (no valoración)','puntos':documentacion,'maximo':15},
               {'criterio':'Datos disponibles en ficha','puntos':ficha,'maximo':5}]
    return sum(x['puntos'] for x in breakdown),breakdown
