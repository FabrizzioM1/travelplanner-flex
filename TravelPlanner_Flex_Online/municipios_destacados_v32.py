"""Opciones municipales curadas de Veracruz para TravelPlanner Flex 3.2.
Solo atractivos respaldados por el portal turístico del estado; sin rankings de visitas,
precios, disponibilidad, fotos ni coordenadas ficticias. Se complementan con OSM.
"""
from __future__ import annotations
from urllib.parse import quote

MUNICIPIOS_DESTACADOS = {
 'Boca del Río': [
  {'id': 'mun32_bocadelro_1', 'nombre': 'Foro Boca', 'categoria': 'Cultura', 'subactividades': ['Museos', 'Historia'], 'descripcion': 'Recinto cultural junto a la escollera, con arquitectura contemporánea y actividades sujetas a programación.', 'fuente': 'https://veracruz.mx/atractivo.php?idnota=2059'},
  {'id': 'mun32_bocadelro_2', 'nombre': 'Museo Buque Cañonero C-07 Guanajuato', 'categoria': 'Cultura', 'subactividades': ['Museos', 'Historia'], 'descripcion': 'Buque museo naval ubicado en el municipio de Boca del Río; confirma si admite visitas antes de acudir.', 'fuente': 'https://www.veracruz.mx/atractivo.php?idnota=366'},
  {'id': 'mun32_bocadelro_3', 'nombre': 'Playas de Boca del Río', 'categoria': 'Naturaleza', 'subactividades': ['Agua y lagunas', 'Parques'], 'descripcion': 'Playas del municipio; consulta condiciones del mar, servicios y acceso del tramo elegido.', 'fuente': 'https://www.veracruz.mx/atractivo.php?idnota=297'},
  {'id': 'mun32_bocadelro_4', 'nombre': 'Plaza Cívica Benito Juárez de Boca del Río', 'categoria': 'Cultura', 'subactividades': ['Historia', 'Parques'], 'descripcion': 'Espacio cívico en el centro histórico de Boca del Río.', 'fuente': 'https://www.veracruz.mx/destino.php?Municipio=28'},
  {'id': 'mun32_bocadelro_5', 'nombre': 'Zona de restaurantes del centro de Boca del Río', 'categoria': 'Gastronomía', 'subactividades': ['Comida local'], 'descripcion': 'Zona urbana para consultar restaurantes tradicionales y mariscos; es un área de búsqueda, no un comercio reservado.', 'fuente': 'https://www.veracruz.mx/destino.php?Municipio=28'},
 ],
 'Veracruz': [
  {'id': 'mun32_veracruz_1', 'nombre': 'San Juan de Ulúa', 'categoria': 'Cultura', 'subactividades': ['Historia', 'Museos'], 'descripcion': 'Fortaleza histórica junto al puerto de Veracruz.', 'fuente': 'https://www.veracruz.mx/'},
  {'id': 'mun32_veracruz_2', 'nombre': 'Museo Naval México', 'categoria': 'Cultura', 'subactividades': ['Historia', 'Museos'], 'descripcion': 'Museo dedicado a la historia marítima de México.', 'fuente': 'https://www.veracruz.mx/'},
  {'id': 'mun32_veracruz_3', 'nombre': 'Malecón de Veracruz', 'categoria': 'Naturaleza', 'subactividades': ['Agua y lagunas', 'Parques'], 'descripcion': 'Paseo costero del puerto para caminar y observar el entorno marítimo.', 'fuente': 'https://www.veracruz.mx/'},
  {'id': 'mun32_veracruz_4', 'nombre': 'Acuario de Veracruz', 'categoria': 'Naturaleza', 'subactividades': ['Fauna'], 'descripcion': 'Recinto dedicado a la fauna acuática en el puerto; consultar tarifas y horarios.', 'fuente': 'https://www.veracruz.mx/'},
 ],
 'Xalapa': [
  {'id': 'mun32_xalapa_1', 'nombre': 'Museo de Antropología de Xalapa', 'categoria': 'Cultura', 'subactividades': ['Museos', 'Historia'], 'descripcion': 'Museo con colecciones arqueológicas regionales.', 'fuente': 'https://veracruz.mx/atractivos.php?Municipio=87'},
  {'id': 'mun32_xalapa_2', 'nombre': 'Parque de los Tecajetes', 'categoria': 'Naturaleza', 'subactividades': ['Parques'], 'descripcion': 'Área verde urbana de Xalapa con senderos y estanques.', 'fuente': 'https://veracruz.mx/atractivos.php?Municipio=87'},
  {'id': 'mun32_xalapa_3', 'nombre': 'Paseo de los Lagos de Xalapa', 'categoria': 'Naturaleza', 'subactividades': ['Agua y lagunas', 'Parques'], 'descripcion': 'Lagos y andadores en la ciudad de Xalapa.', 'fuente': 'https://veracruz.mx/atractivos.php?Municipio=87'},
  {'id': 'mun32_xalapa_4', 'nombre': 'Parque Los Berros', 'categoria': 'Naturaleza', 'subactividades': ['Parques'], 'descripcion': 'Parque urbano conocido también como Miguel Hidalgo en Xalapa.', 'fuente': 'https://veracruz.mx/atractivos.php?Municipio=87'},
 ],
 'Orizaba': [
  {'id': 'mun32_orizaba_1', 'nombre': 'Teleférico de Orizaba', 'categoria': 'Naturaleza', 'subactividades': ['Parques'], 'descripcion': 'Recorrido panorámico hacia el Cerro del Borrego; verifica operación y tarifas.', 'fuente': 'https://www.veracruz.mx/atractivo.php?idnota=1825'},
  {'id': 'mun32_orizaba_2', 'nombre': 'Ecoparque Cerro del Borrego', 'categoria': 'Naturaleza', 'subactividades': ['Selva y senderos', 'Parques'], 'descripcion': 'Área elevada para panoramas y recorridos sujetos a condiciones del acceso.', 'fuente': 'https://www.veracruz.mx/destino.php?Municipio=118'},
  {'id': 'mun32_orizaba_3', 'nombre': 'Palacio de Hierro', 'categoria': 'Cultura', 'subactividades': ['Historia', 'Museos'], 'descripcion': 'Edificio histórico de Orizaba que alberga espacios culturales.', 'fuente': 'https://www.veracruz.mx/atractivos.php?Municipio=118'},
  {'id': 'mun32_orizaba_4', 'nombre': 'Museo del Palacio de Hierro', 'categoria': 'Cultura', 'subactividades': ['Museos', 'Historia'], 'descripcion': 'Espacio museístico en el Palacio de Hierro de Orizaba.', 'fuente': 'https://www.veracruz.mx/atractivos.php?Municipio=118'},
 ],
 'Papantla': [
  {'id': 'mun32_papantla_1', 'nombre': 'Zona Arqueológica El Tajín', 'categoria': 'Cultura', 'subactividades': ['Historia', 'Museos'], 'descripcion': 'Zona arqueológica de la región de Papantla; consulta accesos y horarios oficiales.', 'fuente': 'https://locaciones.veracruz.mx/tajin.html'},
  {'id': 'mun32_papantla_2', 'nombre': 'Parque Takilhsukut', 'categoria': 'Cultura', 'subactividades': ['Historia'], 'descripcion': 'Espacio cultural totonaca en el municipio de Papantla.', 'fuente': 'https://www.veracruz.mx/atractivos.php?Municipio=124'},
  {'id': 'mun32_papantla_3', 'nombre': 'Monumento al Volador de Papantla', 'categoria': 'Cultura', 'subactividades': ['Historia', 'Parques'], 'descripcion': 'Monumento urbano relacionado con la tradición de los voladores.', 'fuente': 'https://www.veracruz.mx/noticia.php?idnota=25'},
  {'id': 'mun32_papantla_4', 'nombre': 'Mercado de Artesanías de Papantla', 'categoria': 'Cultura', 'subactividades': ['Historia'], 'descripcion': 'Espacio para buscar artesanías locales de la región de Papantla.', 'fuente': 'https://www.veracruz.mx/noticia.php?idnota=25'},
 ],
 'Coatepec': [
  {'id': 'mun32_coatepec_1', 'nombre': 'Cascada Bola de Oro', 'categoria': 'Naturaleza', 'subactividades': ['Agua y lagunas', 'Selva y senderos'], 'descripcion': 'Cascada del entorno de Coatepec; confirma los accesos habilitados.', 'fuente': 'https://www.veracruz.mx/atractivo.php?idnota=2118'},
  {'id': 'mun32_coatepec_2', 'nombre': 'Museo del Café Coatepec', 'categoria': 'Cultura', 'subactividades': ['Museos', 'Comida local'], 'descripcion': 'Recinto sobre la tradición cafetalera de Coatepec.', 'fuente': 'https://www.veracruz.mx/atractivos.php?Municipio=38'},
  {'id': 'mun32_coatepec_3', 'nombre': 'Parque Hidalgo de Coatepec', 'categoria': 'Naturaleza', 'subactividades': ['Parques'], 'descripcion': 'Parque central para recorrer el centro de Coatepec.', 'fuente': 'https://www.veracruz.mx/destino.php?Municipio=38'},
  {'id': 'mun32_coatepec_4', 'nombre': 'Casa de los Azulejos de Coatepec', 'categoria': 'Cultura', 'subactividades': ['Historia', 'Comida local'], 'descripcion': 'Lugar para artesanías y productos regionales en Coatepec.', 'fuente': 'https://www.veracruz.mx/atractivos.php?Municipio=38'},
 ],
 'Córdoba': [
  {'id': 'mun32_crdoba_1', 'nombre': 'Parque 21 de Mayo', 'categoria': 'Naturaleza', 'subactividades': ['Parques'], 'descripcion': 'Plaza principal de Córdoba, cercana al centro histórico.', 'fuente': 'https://veracruz.mx/destino.php?Municipio=44'},
  {'id': 'mun32_crdoba_2', 'nombre': 'Portal de Zevallos', 'categoria': 'Cultura', 'subactividades': ['Historia', 'Comida local'], 'descripcion': 'Portal histórico vinculado a los Tratados de Córdoba y a establecimientos de café.', 'fuente': 'https://www.veracruz.mx/atractivos.php?Municipio=44'},
  {'id': 'mun32_crdoba_3', 'nombre': 'Museo del Café Córdoba', 'categoria': 'Cultura', 'subactividades': ['Museos', 'Comida local'], 'descripcion': 'Museo sobre la cultura cafetalera de Córdoba.', 'fuente': 'https://www.veracruz.mx/atractivo.php?idnota=1409'},
  {'id': 'mun32_crdoba_4', 'nombre': 'Ex Hacienda Toxpan', 'categoria': 'Cultura', 'subactividades': ['Historia'], 'descripcion': 'Antiguo complejo vinculado a la historia azucarera de la ciudad.', 'fuente': 'https://www.veracruz.mx/atractivos.php?Municipio=44'},
 ],
 'Tecolutla': [
  {'id': 'mun32_tecolutla_1', 'nombre': 'Playas de Tecolutla', 'categoria': 'Naturaleza', 'subactividades': ['Agua y lagunas'], 'descripcion': 'Playas del municipio para pasear; consulta condiciones meteorológicas y de baño.', 'fuente': 'https://veracruz.mx/destino.php?Municipio=158'},
  {'id': 'mun32_tecolutla_2', 'nombre': 'Las Ciénegas del Fuerte', 'categoria': 'Naturaleza', 'subactividades': ['Fauna', 'Agua y lagunas'], 'descripcion': 'Zona natural de humedales y manglares; confirma condiciones de visita y operadores.', 'fuente': 'https://veracruz.mx/atractivo.php?idnota=1415'},
  {'id': 'mun32_tecolutla_3', 'nombre': 'Río Tecolutla · zona de esteros', 'categoria': 'Naturaleza', 'subactividades': ['Agua y lagunas', 'Fauna'], 'descripcion': 'Entorno ribereño de Tecolutla, con esteros y recorridos a consultar localmente.', 'fuente': 'https://veracruz.mx/destino.php?Municipio=158'},
 ],
 'Xico': [
  {'id': 'mun32_xico_1', 'nombre': 'Cascadas de Texolo', 'categoria': 'Naturaleza', 'subactividades': ['Agua y lagunas', 'Selva y senderos'], 'descripcion': 'Cascadas en el entorno del municipio de Xico; confirma accesos y seguridad de senderos.', 'fuente': 'https://www.veracruz.mx/atractivo.php?idnota=300'},
  {'id': 'mun32_xico_2', 'nombre': 'Centro histórico de Xico', 'categoria': 'Cultura', 'subactividades': ['Historia', 'Comida local'], 'descripcion': 'Zona central del pueblo para conocer arquitectura local y cocina tradicional.', 'fuente': 'https://www.veracruz.mx/destino.php?Municipio=92'},
  {'id': 'mun32_xico_3', 'nombre': 'Capilla de la Santa Cruz del Llanito', 'categoria': 'Cultura', 'subactividades': ['Historia'], 'descripcion': 'Recinto religioso en el camino hacia Texolo, en Xico.', 'fuente': 'https://www.veracruz.mx/atractivo.php?idnota=445'},
 ],
 'Alvarado': [
  {'id': 'mun32_alvarado_1', 'nombre': 'Malecón de Alvarado', 'categoria': 'Naturaleza', 'subactividades': ['Agua y lagunas', 'Parques'], 'descripcion': 'Paseo ribereño y entorno del puente de Alvarado.', 'fuente': 'https://www.veracruz.mx/atractivo.php?idnota=292'},
  {'id': 'mun32_alvarado_2', 'nombre': 'Playas de Antón Lizardo', 'categoria': 'Naturaleza', 'subactividades': ['Agua y lagunas'], 'descripcion': 'Tramos de playa de Antón Lizardo, localidad de Alvarado.', 'fuente': 'https://veracruz.mx/atractivo.php?idnota=588'},
  {'id': 'mun32_alvarado_3', 'nombre': 'Centro de Alvarado · gastronomía local', 'categoria': 'Gastronomía', 'subactividades': ['Comida local'], 'descripcion': 'Zona para buscar arroz a la tumbada y platillos regionales; confirma establecimientos y precios.', 'fuente': 'https://veracruz.mx/destino.php?Municipio=11'},
 ],
}

def filas_para_catalogo(placeholder):
    """15 columnas compatibles con tabla lugar; solo inserta IDs nuevos."""
    output=[]
    for municipio, sitios in MUNICIPIOS_DESTACADOS.items():
        for s in sitios:
            output.append((s['id'],'Veracruz',s['nombre'],s['categoria'],
                           ';'.join(['Municipio '+municipio,*s['subactividades']]),
                           None,None,placeholder,0,90,0,s['descripcion']+' Verifica horarios, tarifas y acceso.',
                           '','',''+s['fuente']))
    return output

def recomendaciones(municipio,actividad,interes):
    """Afinidad transparente: no es calificación de usuarios."""
    data=[]
    for s in MUNICIPIOS_DESTACADOS.get(municipio,()):
        if actividad!='Todas' and s['categoria']!=actividad:continue
        matching=(interes=='Todos' or interes in s['subactividades'])
        interest=8 if interes=='Todos' else (15 if matching else 0)
        breakdown=[
          {'criterio':'Coincidencia de actividad','puntos':40,'maximo':40},
          {'criterio':'Atractivo identificado en '+municipio,'puntos':25,'maximo':25},
          {'criterio':'Interés '+interes,'puntos':interest,'maximo':15},
          {'criterio':'Fuente turística estatal','puntos':15,'maximo':15},
          {'criterio':'Ficha documentada sin coordenadas verificadas','puntos':3,'maximo':5},
        ]
        data.append({
          'id_lugar':s['id'],'nombre':s['nombre'],'estado':'Veracruz','municipio':municipio,
          'categoria':s['categoria'],'actividad':s['categoria'],'subactividades':s['subactividades'],
          'descripcion':s['descripcion'],
          'motivo':'Recomendación documentada por una fuente turística estatal; coincide con el municipio y la categoría seleccionados.',
          'acceso':'Confirma horarios, precios, permisos y disponibilidad en la fuente oficial o con el operador.',
          'fuente':s['fuente'],'tipo_fuente':'Oficial estatal','imagen':'',
          'lat':None,'lon':None,'puntaje':sum(x['puntos'] for x in breakdown),
          'desglose':breakdown,'duracion_min':90,'tipo_precio':'Consultar tarifa','cerca':False,
        })
    return sorted(data,key=lambda x:(-x['puntaje'],x['nombre']))
