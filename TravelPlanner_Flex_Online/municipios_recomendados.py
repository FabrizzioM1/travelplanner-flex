"""Catálogo municipal inicial para recomendaciones explicables.

Primera cobertura: Naturaleza en el municipio Catemaco, Veracruz.
No es una clasificación por visitantes, valoraciones ni ventas. La evidencia
son fuentes públicas que respaldan la existencia/ubicación aproximada del sitio.
Nunca se presentan precios, disponibilidad o distancias viales ficticias.
"""
from urllib.parse import quote

MUNICIPIOS_CON_COBERTURA = {'Veracruz': ['Catemaco']}
ACTIVIDADES_CON_COBERTURA = ['Naturaleza']
PREFERENCIAS_NATURALEZA = ['Todas', 'Agua y lagunas', 'Selva y senderos', 'Fauna y observación']

FUENTE_GOB = 'https://www.veracruz.mx/destino.php?Municipio=32'
FUENTE_RESERVAS = 'https://www.veracruz.mx/atractivos.php?Municipio=32'
FUENTE_VISITMX = 'https://visitmexico.com/es/destino/17943/escatemaco'
FUENTE_SONTE = 'https://veracruz.mx/atractivo.php?idnota=19'
FUENTE_CONANP = 'https://descubreanp.conanp.gob.mx/es/conanp/ANP?suri=104'
FUENTE_TUXTLAS = 'https://www.veracruz.gob.mx/2025/03/05/un-viaje-inolvidable-a-los-tuxtlas-biodiversidad-cultura-y-sabores-autenticos/'


def commons(nombre, autor, licencia):
    archivo = quote(nombre.replace(' ', '_'), safe='()!.,_-')
    return {'imagen': 'https://commons.wikimedia.org/wiki/Special:FilePath/' + archivo + '?width=960',
            'fuente': 'https://commons.wikimedia.org/wiki/File:' + archivo,
            'credito': autor, 'licencia': licencia}

FOTOS_CATEMACO = {
 'mun23_lago': [
    commons('Lake Catemaco.jpg', 'Bozotexino', 'CC BY 3.0'),
    commons('Lago de Catemaco, Veracruz 010.jpg','Isaacvp','CC BY-SA 4.0'),
    commons('Lago de Catemaco, Veracruz 008.jpg','Isaacvp','CC BY-SA 4.0')
 ],
 'mun23_nanciyaga': [
    commons('Nanciyaga76.JPG','AlejandroLinaresGarcia','CC BY-SA 3.0'),
    commons('Nanciyaga62.JPG','AlejandroLinaresGarcia','CC BY-SA 3.0'),
    commons('Nanciyaga27.JPG','AlejandroLinaresGarcia','CC BY-SA 3.0')
 ],
}

# id, nombre, subactividad, breve, por qué visitar, fuente, tipo de fuente,
# nivel de datos (5 con coordenadas de fotografía/documentación; 3 en otro caso),
# foto, lat, lon, duración orientativa en minutos.
SITIOS_CATEMACO = [
 {
  'id':'mun23_nanciyaga','nombre':'Reserva Ecológica Nanciyaga','subactividades':['Selva y senderos','Agua y lagunas','Fauna y observación'],
  'resumen':'Senderos de selva tropical y paisaje de lago en el entorno de Los Tuxtlas.',
  'motivo':'Combina naturaleza, senderos y experiencias de interpretación ambiental.',
  'fuente':FUENTE_RESERVAS,'tipo_fuente':'Oficial estatal',
  'acceso':'Consulta horarios, tarifas y recorridos directamente con la reserva; no se garantizan servicios en vivo.',
  'lat':18.433353,'lon':-95.052231,'duracion':150,'foto':FOTOS_CATEMACO['mun23_nanciyaga'][0],
 },
 {
  'id':'mun23_lago','nombre':'Lago de Catemaco','subactividades':['Agua y lagunas','Fauna y observación'],
  'resumen':'Paisajes lacustres y paseos en lancha sujetos a operadores y condiciones locales.',
  'motivo':'Permite contemplar el lago y observar fauna desde recorridos autorizados.',
  'fuente':FUENTE_GOB,'tipo_fuente':'Oficial estatal',
  'acceso':'Los paseos en lancha se contratan por separado. Confirma ruta, precio y medidas de seguridad.',
  'lat':18.425,'lon':-95.115,'duracion':120,'foto':FOTOS_CATEMACO['mun23_lago'][0],
 },
 {
  'id':'mun23_sontecomapan','nombre':'Laguna de Sontecomapan','subactividades':['Agua y lagunas','Fauna y observación'],
  'resumen':'Laguna costera y esteros de la localidad de Sontecomapan, municipio de Catemaco.',
  'motivo':'Interesa a quienes buscan humedales, aves y paseos por la laguna.',
  'fuente':FUENTE_SONTE,'tipo_fuente':'Oficial estatal',
  'acceso':'Confirma operadores habilitados, clima y accesos; respeta las áreas protegidas.',
  'lat':None,'lon':None,'duracion':140,'foto':None,
 },
 {
  'id':'mun23_barra','nombre':'Barra de Sontecomapan','subactividades':['Agua y lagunas','Fauna y observación'],
  'resumen':'Zona donde el sistema lagunar se encuentra con el mar; visitas sujetas a acceso y clima.',
  'motivo':'Paisaje costero, esteros y observación de aves en la zona.',
  'fuente':FUENTE_SONTE,'tipo_fuente':'Oficial estatal',
  'acceso':'El acceso puede requerir lancha o traslados locales; confirmar con prestadores locales.',
  'lat':None,'lon':None,'duracion':180,'foto':None,
 },
 {
  'id':'mun23_isla','nombre':'Isla de los Monos (recorrido lacustre)','subactividades':['Agua y lagunas','Fauna y observación'],
  'resumen':'Punto del circuito de lancha por el lago de Catemaco para observar fauna a distancia.',
  'motivo':'Ruta de interés para quienes buscan experiencias de observación animal.',
  'fuente':FUENTE_TUXTLAS,'tipo_fuente':'Oficial estatal',
  'acceso':'No alimentar ni tocar fauna; confirma permisos y condiciones con el operador.',
  'lat':None,'lon':None,'duracion':90,'foto':None,
 },
 {
  'id':'mun23_malecon','nombre':'Malecón de Catemaco','subactividades':['Agua y lagunas','Fauna y observación'],
  'resumen':'Paseo público junto al lago con vistas y puntos de salida para recorridos.',
  'motivo':'Opción sencilla para contemplar la laguna antes de contratar actividades.',
  'fuente':FUENTE_VISITMX,'tipo_fuente':'Turismo nacional',
  'acceso':'Consulta localmente las salidas de lancha y no presupongas precios ni horarios.',
  'lat':None,'lon':None,'duracion':75,'foto':None,
 },
 {
  'id':'mun23_biosfera','nombre':'Reserva de la Biosfera Los Tuxtlas · sector Catemaco','subactividades':['Selva y senderos','Fauna y observación'],
  'resumen':'Entorno natural protegido que incluye partes del municipio Catemaco.',
  'motivo':'Selva y biodiversidad; algunos recorridos pueden requerir guía o acceso autorizado.',
  'fuente':FUENTE_CONANP,'tipo_fuente':'Oficial federal',
  'acceso':'Es un área protegida extensa, no una entrada única; consulta reglas y sitios habilitados antes de ir.',
  'lat':None,'lon':None,'duracion':180,'foto':None,
 },
 {'id':'mun23_poza','nombre':'Poza de los Enanos · Sontecomapan',
  'subactividades':['Agua y lagunas','Selva y senderos'],
  'resumen':'Paraje de agua dulce asociado a la localidad de Sontecomapan.',
  'motivo':'Alternativa para quienes prefieren pozas y espacios naturales.',
  'fuente':'https://www.google.com/maps/search/?api=1&query=Poza+de+los+Enanos+Sontecomapan+Catemaco',
  'tipo_fuente':'Ficha de ubicación pública',
  'acceso':'Confirmar existencia de acceso público, condiciones de seguridad y horarios en el sitio.',
  'lat':None,'lon':None,'duracion':90,'foto':None,
 },
]

SITIOS = {(r['id']): r for r in SITIOS_CATEMACO}


def lugares_para_sembrar(marcador):
    """Conserva las 15 columnas de la tabla lugar; no modifica filas existentes."""
    resultados=[]
    for s in SITIOS_CATEMACO:
        f=s.get('foto') or {}
        resultados.append((
            s['id'], 'Veracruz', s['nombre'], 'Naturaleza',
            'Catemaco;'+(';'.join(s['subactividades']))+';Municipio Catemaco',
            s.get('lat'),s.get('lon'), f.get('imagen') or marcador,
            0,s['duracion'],0,s['resumen']+' '+s['acceso'],
            f.get('credito',''),f.get('licencia',''),f.get('fuente','')
        ))
    return resultados


def recomendar(estado,municipio,actividad,interes='Todas'):
    """Ranking transparente sin inventar visitantes, calificaciones o distancias de ruta.

    Máximo 100: coincidencia de actividad 40, municipio 25,
    afinidad 15 (8 si sin preferencia), respaldo documental 15 y ficha 5.
    """
    if (estado,municipio,actividad) != ('Veracruz','Catemaco','Naturaleza'):
        return []
    if interes not in PREFERENCIAS_NATURALEZA:
        interes='Todas'
    resultados=[]
    for s in SITIOS_CATEMACO:
        puntos=[{'criterio':'Actividad: Naturaleza','puntos':40,'maximo':40},
                {'criterio':'Dentro del municipio Catemaco','puntos':25,'maximo':25}]
        afinidad=8 if interes=='Todas' else (15 if interes in s['subactividades'] else 0)
        puntos.append({'criterio':'Interés '+('general' if interes=='Todas' else interes),
                       'puntos':afinidad,'maximo':15})
        verificacion= 15 if s['tipo_fuente'] in ('Oficial estatal','Oficial federal') else (12 if s['tipo_fuente']=='Turismo nacional' else 6)
        puntos.append({'criterio':'Fuente de referencia pública','puntos':verificacion,'maximo':15})
        ficha=5 if s['lat'] is not None and s['lon'] is not None else 3
        puntos.append({'criterio':'Ficha con ubicación documentada','puntos':ficha,'maximo':5})
        total=sum(x['puntos'] for x in puntos)
        resultados.append({
            'id_lugar':s['id'],'nombre':s['nombre'],'estado':estado,'municipio':municipio,'actividad':actividad,
            'subactividades':s['subactividades'],'descripcion':s['resumen'],'motivo':s['motivo'],
            'acceso':s['acceso'],'fuente':s['fuente'],'tipo_fuente':s['tipo_fuente'],
            'imagen':(s.get('foto') or {}).get('imagen',''),
            'credito':(s.get('foto') or {}).get('credito',''),
            'lat':s.get('lat'),'lon':s.get('lon'),'puntaje':total,
            'desglose':puntos,'duracion_min':s['duracion'],
            'tipo_precio':'Consultar tarifa',
        })
    return sorted(resultados,key=lambda x:(-x['puntaje'],x['nombre']))
