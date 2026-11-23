"""Catálogo inicial de experiencias por actividad — Veracruz.

Referencias de áreas, NO excursiones o permisos confirmados. No se publican
precios ficticios, disponibilidad ni promesas de captura. Fotografías de
contexto geográfico, acreditadas individualmente a Wikimedia Commons.
"""
from urllib.parse import quote


def _foto(nombre, autor, licencia):
    ruta = quote(nombre.replace(' ', '_'), safe='()!._-')
    return {
        'imagen': f'https://commons.wikimedia.org/wiki/Special:FilePath/{ruta}?width=900',
        'fuente': f'https://commons.wikimedia.org/wiki/File:{ruta}',
        'credito': autor,
        'licencia': licencia,
        'descripcion': 'Fotografía real del entorno; no muestra necesariamente una excursión ni un operador.',
    }


DIR_CONAPESCA = 'https://www.gob.mx/conapesca/documentos/prestadores-de-servicios?state=published'
PERMISOS = 'https://www.gob.mx/conapesca/es/documentos/conapesca-01-016-pesca-deportivo-recreativa'

# Atención: teléfonos y referencias de operadores proceden de una guía turística
# publicada en 2025, pueden haber cambiado. Deben confirmarse antes de reservar.
GUIA_VERACRUZ = ('https://datos.veracruzmunicipio.gob.mx/es/dataset/'
                 '1adb9926-b4b7-4127-8ad8-19af5461f2ce/resource/'
                 'd1ffac8f-4b6c-41ea-9367-c20bdd3285be/download/'
                 'catalogo-de-info.-turistica-2025.pdf')

EXPERIENCIAS_VERACRUZ = [
    {
        'id': 'exp22_boca', 'lugar_id': 'exp22_boca', 'nombre': 'Pesca deportiva en Boca del Río',
        'zona': 'Boca del Río', 'estado': 'Veracruz', 'modalidad': 'Embarcación', 'nivel': 'Intermedio',
        'duracion_min': 180, 'lat': 19.103, 'lon': -96.105, 'actividad': 'Pescar',
        'descripcion': 'Zona de referencia para consultar salidas de pesca deportiva con guías de la conurbación Veracruz–Boca del Río.',
        'nota': 'Las rutas y puntos de embarque se determinan con el operador; clima, oleaje, permisos y cupos deben confirmarse.',
        'equipo': 'Pregunta si incluye cañas, carnada, chalecos salvavidas, combustible y asistencia.',
        'fotos': [
            _foto('Veracruz, Playa foro Boca del Rio.jpg', 'Mama-ines', 'CC BY-SA 4.0'),
            _foto('BocadelRioVeracruz.JPG', 'Thelmadatter', 'Dominio público'),
            _foto('Playa de Boca del Río.png', 'Yariii55', 'CC BY-SA 4.0'),
        ],
        'operadores': [
            {'nombre': 'Blue Marlín Veracruz', 'tipo': 'Referencia en catálogo turístico municipal (2025)',
             'descripcion': 'La guía municipal describe servicios de pesca deportiva y actividades acuáticas. Confirma vigencia antes de contratar.',
             'telefono': '2299195123', 'fuente': GUIA_VERACRUZ, 'vigencia': 'Referencia de 2025, no verificación en vivo'},
        ],
    },
    {
        'id': 'exp22_puerto', 'lugar_id': 'exp22_puerto', 'nombre': 'Pesca recreativa desde costa en Veracruz',
        'zona': 'Puerto de Veracruz', 'estado': 'Veracruz', 'modalidad': 'Desde costa', 'nivel': 'Principiante',
        'duracion_min': 120, 'lat': 19.199, 'lon': -96.133, 'actividad': 'Pescar',
        'descripcion': 'Opción de exploración para encontrar sitios autorizados de pesca desde tierra en los alrededores del puerto.',
        'nota': 'No cualquier muelle, playa o zona portuaria permite pescar. Verifica accesos, señalización, vedas y reglamento local.',
        'equipo': 'Consulta reglamentos de artes de pesca y el equipo permitido para la zona específica.',
        'fotos': [
            _foto('Puerto de Veracruz.jpg', 'Skavania', 'CC BY 4.0'),
            _foto('Conociendo el Puerto de Veracruz.jpg', 'BelRamirez12rl', 'CC0 1.0'),
            _foto('Puerto de Veracruz Malecón.JPG', 'Ver ficha de Wikimedia Commons', 'CC BY-SA 4.0'),
        ], 'operadores': [],
    },
    {
        'id': 'exp22_tecolutla', 'lugar_id': 'exp22_tecolutla', 'nombre': 'Entorno del río Tecolutla',
        'zona': 'Tecolutla', 'estado': 'Veracruz', 'modalidad': 'Río', 'nivel': 'Principiante',
        'duracion_min': 150, 'lat': 20.48, 'lon': -97.01, 'actividad': 'Pescar',
        'descripcion': 'Conoce la zona del río Tecolutla y localiza guías que puedan informar dónde se permite la pesca recreativa.',
        'nota': 'Es una zona de exploración, no una actividad autorizada o excursión disponible automáticamente.',
        'equipo': 'Confirma si la salida es desde orilla o embarcación y cuáles requisitos aplican.',
        'fotos': [
            _foto('Río Tecolutla, Veracruz MX2.jpg', 'Ver ficha de Wikimedia Commons', 'CC BY-SA 4.0'),
            _foto('Río Tecolutla, Veracruz MX3.jpg', 'Ver ficha de Wikimedia Commons', 'CC BY-SA 4.0'),
            _foto('Río Tecolutla, Veracruz MX4.jpg', 'Ver ficha de Wikimedia Commons', 'CC BY-SA 4.0'),
        ], 'operadores': [],
    },
    {
        'id': 'exp22_tamiahua', 'lugar_id': 'exp22_tamiahua', 'nombre': 'Explorar pesca en Laguna de Tamiahua',
        'zona': 'Tamiahua', 'estado': 'Veracruz', 'modalidad': 'Laguna', 'nivel': 'Intermedio',
        'duracion_min': 180, 'lat': 21.66, 'lon': -97.59, 'actividad': 'Pescar',
        'descripcion': 'Descubre el entorno de la laguna y encuentra prestadores que informen sobre recorridos de pesca recreativa.',
        'nota': 'No se confirma acceso, temporada ni autorización de captura; consulta las reglas y permisos aplicables.',
        'equipo': 'Pregunta por embarcación, equipo, medidas de seguridad y permisos.',
        'fotos': [
            _foto('Laguna de Tamiahua.JPG', 'Carlos t', 'Dominio público'),
            _foto('Laguna de Tamiahua 3.JPG', 'Carlos t', 'Dominio público'),
            _foto('Laguna de Tamiahua 2.JPG', 'Carlos t', 'Dominio público'),
        ], 'operadores': [],
    },
    {
        'id': 'exp22_catemaco', 'lugar_id': 'exp22_catemaco', 'nombre': 'Explorar pesca recreativa en Catemaco',
        'zona': 'Catemaco', 'estado': 'Veracruz', 'modalidad': 'Laguna', 'nivel': 'Principiante',
        'duracion_min': 120, 'lat': 18.425, 'lon': -95.115, 'actividad': 'Pescar',
        'descripcion': 'Consulta con guías locales las condiciones para experiencias recreativas permitidas en el entorno de Catemaco.',
        'nota': 'Revisa zonas protegidas, vedas y normas locales; la ficha no certifica que se permita pescar en cualquier punto del lago.',
        'equipo': 'Confirma tipo de salida, equipo, chaleco y condiciones ambientales.',
        'fotos': [
            _foto('Lake Catemaco.jpg', 'Bozotexino', 'CC BY 3.0'),
            _foto('Lago de Catemaco, Veracruz 010.jpg', 'Isaacvp', 'CC BY-SA 4.0'),
            _foto('Lago de Catemaco, Veracruz 008.jpg', 'Isaacvp', 'CC BY-SA 4.0'),
        ], 'operadores': [],
    },
]

EXPERIENCE_PLACES = []
for e in EXPERIENCIAS_VERACRUZ:
    foto = e['fotos'][0]
    EXPERIENCE_PLACES.append((
        e['lugar_id'], 'Veracruz', e['nombre'], 'Naturaleza',
        f"Aire libre;Pesca;{e['modalidad']};{e['zona']}",
        e['lat'], e['lon'], foto['imagen'], 0, e['duracion_min'], 0,
        e['descripcion'] + ' ' + e['nota'], foto['credito'], foto['licencia'], foto['fuente']
    ))
