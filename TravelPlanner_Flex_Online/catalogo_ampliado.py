"""TravelPlanner Flex 2.1: destinos para descubrir, no reservas ni negocios verificados.

Por entidad: 3 culturales, 3 de aire libre y 3 áreas para comer.
Las áreas gastronómicas pueden ser mercados, barrios o corredores; NO se presentan
como restaurantes individuales con precios/horarios confirmados. Las fichas sin
coordenadas no se ofrecen como rutas viales precisas. Fotografía desde Commons.
"""
from __future__ import annotations
import hashlib
from catalogo_mexico import PHOTO_PLACEHOLDER

# Orden fijo: tres de Cultura | tres de Aire libre | tres de Gastronomía.
# Los nombres gastronómicos de zonas son referencias para buscar opciones cercanas,
# no implican que cada establecimiento del entorno esté abierto o disponible.
PICKS = {
"Aguascalientes": (
 "Museo Nacional de la Muerte|Museo de Aguascalientes|Templo de San Antonio",
 "Jardín de San Marcos|Parque Rodolfo Landeros|Cerro del Muerto",
 "Mercado Terán|Mercado Juárez de Aguascalientes|Barrio de San Marcos · zona gastronómica"),
"Baja California": (
 "Centro Cultural Tijuana|Museo de la Vid y el Vino|Museo de Historia de Ensenada",
 "Playas de Tijuana|La Bufadora|Parque Nacional Constitución de 1857",
 "Mercado Hidalgo de Tijuana|Avenida Revolución de Tijuana · zona gastronómica|Puerto Nuevo · zona de langosta"),
"Baja California Sur": (
 "Museo de la Ballena de La Paz|Misión de Nuestra Señora de Loreto|Museo de Historia Natural de Cabo San Lucas",
 "Playa Balandra|El Arco de Cabo San Lucas|Playa El Médano",
 "Mercado Bravo de La Paz|Malecón de La Paz · zona gastronómica|Marina de Cabo San Lucas · restaurantes"),
"Campeche": (
 "Baluarte de San Francisco|Fuerte de San Miguel|Zona Arqueológica de Edzná",
 "Reserva de la Biosfera Calakmul|Playa Bonita de Campeche|Malecón de Campeche",
 "Mercado Pedro Sáinz de Baranda|Calle 59 de Campeche · restaurantes|Mercado Alonso Felipe de Andrade"),
"Chiapas": (
 "Museo Na Bolom|Zona Arqueológica de Palenque|Centro Cultural de los Altos de Chiapas",
 "Cañón del Sumidero|Cascadas de Agua Azul|Lagunas de Montebello",
 "Mercado José Castillo Tielemans|Andador Guadalupano · gastronomía|Centro de San Cristóbal de las Casas · restaurantes"),
"Chihuahua": (
 "Casa Chihuahua Centro de Patrimonio Cultural|Quinta Gameros|Museo de la Revolución Mexicana de Chihuahua",
 "Barrancas del Cobre|Cascada de Basaseachi|Parque Metropolitano Tres Presas",
 "Mercado Juárez de Chihuahua|Centro de Creel · gastronomía|Centro Histórico de Chihuahua · restaurantes"),
"Ciudad de México": (
 "Palacio de Bellas Artes|Museo Nacional de Antropología|Museo del Templo Mayor",
 "Bosque de Chapultepec|Canales de Xochimilco|Parque Nacional Desierto de los Leones",
 "Mercado de San Juan|Mercado de Coyoacán|Mercado Roma"),
"Coahuila": (
 "Museo del Desierto|Museo Arocena|Museo de las Aves de México",
 "Dunas de Bilbao|Cuatro Ciénegas|Parque Ecológico El Chapulín",
 "Mercado Juárez de Torreón|Centro de Saltillo · zona gastronómica|Centro de Parras de la Fuente · restaurantes"),
"Colima": (
 "Museo Regional de Historia de Colima|Palacio de Gobierno de Colima|Museo Universitario de Artes Populares",
 "Centro de Comala|Playa La Audiencia|Laguna de Carrizalillos",
 "Portales de Comala · botanas|Mercado Obregón de Colima|Centro de Manzanillo · gastronomía"),
"Durango": (
 "Museo Francisco Villa|Catedral Basílica Menor de Durango|Paseo del Viejo Oeste",
 "Parque Natural Mexiquillo|Parque Guadiana|Presa Peña del Águila",
 "Mercado Gómez Palacio de Durango|Calle Constitución de Durango · restaurantes|Plaza de Armas de Durango · gastronomía"),
"Estado de México": (
 "Zona Arqueológica de Teotihuacán|Museo de Bellas Artes de Toluca|Cosmovitral Jardín Botánico",
 "Nevado de Toluca|Parque Nacional Desierto del Carmen|Lago de Valle de Bravo",
 "Mercado 16 de Septiembre de Toluca|Centro de Metepec · gastronomía|Centro de Valle de Bravo · restaurantes"),
"Guanajuato": (
 "Alhóndiga de Granaditas|Museo de las Momias de Guanajuato|Templo Expiatorio de León",
 "Jardín de la Unión|Parque Metropolitano de León|Presa de la Olla",
 "Mercado Hidalgo de Guanajuato|Mercado Aldama de León|Centro de San Miguel de Allende · restaurantes"),
"Guerrero": (
 "Fuerte de San Diego|Museo de la Platería de Taxco|Templo de Santa Prisca de Taxco",
 "La Quebrada de Acapulco|Playa Caleta|Grutas de Cacahuamilpa",
 "Mercado Central de Acapulco|Centro de Taxco · gastronomía|Playa Condesa · restaurantes"),
"Hidalgo": (
 "Reloj Monumental de Pachuca|Museo Nacional de la Fotografía|Exconvento de San Nicolás Tolentino",
 "Prismas Basálticos|Grutas de Tolantongo|Parque Nacional El Chico",
 "Mercado Benito Juárez de Pachuca|Centro de Real del Monte · pastes y gastronomía|Centro de Huasca de Ocampo · restaurantes"),
"Jalisco": (
 "Museo Cabañas|Teatro Degollado|Museo Regional de Guadalajara",
 "Lago de Chapala|Bosque La Primavera|Malecón de Puerto Vallarta",
 "Mercado San Juan de Dios|Mercado Corona de Guadalajara|Avenida Chapultepec de Guadalajara · restaurantes"),
"Michoacán": (
 "Catedral de Morelia|Museo del Estado de Michoacán|Zona Arqueológica de Tzintzuntzan",
 "Lago de Pátzcuaro|Parque Nacional Barranca del Cupatitzio|Santuario El Rosario · mariposa monarca",
 "Mercado de Dulces de Morelia|Mercado de Antojitos de Uruapan|Plaza Vasco de Quiroga · gastronomía"),
"Morelos": (
 "Museo Robert Brady|Museo Regional de los Pueblos de Morelos|Exconvento de la Natividad de Tepoztlán",
 "Cerro del Tepozteco|Jardines de México|Lago de Tequesquitengo",
 "Mercado de Tepoztlán|Mercado Adolfo López Mateos de Cuernavaca|Centro de Tlayacapan · gastronomía"),
"Nayarit": (
 "Museo Regional de Nayarit|Centro Histórico de Compostela|Zona Arqueológica Los Toriles",
 "Islas Marietas|Playa de Sayulita|Laguna de Santa María del Oro",
 "Mercado Juan Escutia de Tepic|Centro de Sayulita · restaurantes|Centro de San Blas · gastronomía"),
"Nuevo León": (
 "Museo de Historia Mexicana|Museo MARCO|Museo del Palacio de Monterrey",
 "Parque Fundidora|Parque Ecológico Chipinque|Parque La Huasteca",
 "Mercado Juárez de Monterrey|Barrio Antiguo de Monterrey · restaurantes|Centro de Santiago de Nuevo León · gastronomía"),
"Oaxaca": (
 "Museo de las Culturas de Oaxaca|Monte Albán|Museo Textil de Oaxaca",
 "Hierve el Agua|Jardín Etnobotánico de Oaxaca|Playa Zicatela",
 "Mercado 20 de Noviembre|Mercado Benito Juárez de Oaxaca|Barrio de Jalatlaco · restaurantes"),
"Puebla": (
 "Museo Amparo|Biblioteca Palafoxiana|Zona Arqueológica de Cholula",
 "Africam Safari|Parque Ecológico de Puebla|Parque Nacional Iztaccíhuatl-Popocatépetl",
 "Mercado de Sabores Poblanos|Callejón de los Sapos · restaurantes|Mercado La Acocota"),
"Querétaro": (
 "Museo Regional de Querétaro|Acueducto de Querétaro|Museo de Arte de Querétaro",
 "Peña de Bernal|Cerro de las Campanas|Reserva de la Biosfera Sierra Gorda",
 "Mercado La Cruz de Querétaro|Mercado Escobedo de Querétaro|Centro de Bernal · restaurantes"),
"Quintana Roo": (
 "Museo Maya de Cancún|Zona Arqueológica de Tulum|Zona Arqueológica San Gervasio",
 "Playa Delfines|Laguna de Bacalar|Reserva de la Biosfera Sian Ka'an",
 "Parque de las Palapas de Cancún|Mercado 28 de Cancún|Quinta Avenida de Playa del Carmen · restaurantes"),
"San Luis Potosí": (
 "Museo Nacional de la Máscara|Museo del Virreinato de San Luis Potosí|Centro de las Artes de San Luis Potosí",
 "Cascada de Tamul|Real de Catorce|Parque Tangamanga I",
 "Mercado Hidalgo de San Luis Potosí|Centro Histórico de San Luis Potosí · gastronomía|Centro de Xilitla · restaurantes"),
"Sinaloa": (
 "Teatro Ángela Peralta|Museo de Arte de Sinaloa|Centro Histórico de Mazatlán",
 "Malecón de Mazatlán|Isla de la Piedra|Jardín Botánico de Culiacán",
 "Mercado Pino Suárez de Mazatlán|Mercado Garmendia de Culiacán|Zona Dorada de Mazatlán · restaurantes"),
"Sonora": (
 "Museo de Arte de Sonora MUSAS|Museo Regional de Sonora|Centro Histórico de Álamos",
 "Bahía de Kino|Cerro de la Campana|Reserva de la Biosfera El Pinacate",
 "Mercado Municipal de Hermosillo|Centro de Álamos · restaurantes|Malecón de Guaymas · gastronomía"),
"Tabasco": (
 "Parque Museo La Venta|Museo Regional de Antropología Carlos Pellicer Cámara|Zona Arqueológica de Comalcalco",
 "Reserva Pantanos de Centla|Parque Tomás Garrido Canabal|Cascadas de Villa Luz",
 "Mercado José María Pino Suárez de Villahermosa|Centro de Paraíso · mariscos y restaurantes|Centro de Tapijulapa · gastronomía"),
"Tamaulipas": (
 "Museo TAMUX de Historia Natural|Casa de Arte de Ciudad Victoria|Museo de la Cultura Huasteca",
 "Playa Miramar|Laguna del Carpintero|Reserva de la Biosfera El Cielo",
 "Mercado Municipal de Tampico|Centro de Tampico · gastronomía|Centro de Ciudad Madero · restaurantes"),
"Tlaxcala": (
 "Museo Regional de Tlaxcala|Zona Arqueológica de Cacaxtla|Basílica de Ocotlán",
 "Parque Nacional La Malinche|Santuario de las Luciérnagas de Nanacamilpa|Laguna de Atlangatepec",
 "Mercado Emilio Sánchez Piedras de Tlaxcala|Centro de Huamantla · gastronomía|Centro de Apizaco · restaurantes"),
"Veracruz": (
 "Fortaleza de San Juan de Ulúa|Museo Naval México|Museo de Antropología de Xalapa",
 "Malecón de Veracruz|Playa Chachalacas|Laguna de Catemaco",
 "Mercado Hidalgo de Veracruz|Mercado La Rotonda de Xalapa|Bulevar Ávila Camacho · zona gastronómica"),
"Yucatán": (
 "Zona Arqueológica de Chichén Itzá|Zona Arqueológica de Uxmal|Gran Museo del Mundo Maya",
 "Cenote Ik Kil|Malecón de Progreso|Reserva de la Biosfera Ría Celestún",
 "Mercado Lucas de Gálvez|Mercado de Santiago de Mérida|Calle 47 de Mérida · restaurantes"),
"Zacatecas": (
 "Museo Rafael Coronel|Museo Pedro Coronel|Mina El Edén",
 "Cerro de la Bufa|Parque Nacional Sierra de Órganos|Parque La Encantada",
 "Mercado González Ortega|Centro Histórico de Zacatecas · restaurantes|Centro de Jerez de García Salinas · gastronomía"),
}

assert len(PICKS) == 32, 'Faltan estados de México'
assert all(len(group.split('|')) == 3 for groups in PICKS.values() for group in groups), 'Cada categoría requiere tres lugares'

# Identificadores estables: insertar solo si no existen, para no afectar viajes.
def _id(state,category,name):
    digest = hashlib.sha256(f'{state}|{category}|{name}'.encode('utf-8')).hexdigest()[:13]
    return 'ex21_' + digest

EXPANDED_PLACES = []
for state, groups in PICKS.items():
    for category, raw_places in zip(('Cultura', 'Naturaleza', 'Gastronomía'), groups):
        for name in raw_places.split('|'):
            if category == 'Cultura':
                description = f'Experiencia cultural en {state}. Consulta horarios, entradas y acceso antes de la visita.'
                tags = 'Cultura;Historia;Museo;Patrimonio'
                duration, interior = 100, 1 if ('Museo' in name or 'Teatro' in name) else 0
            elif category == 'Naturaleza':
                description = f'Opción al aire libre en {state}. Revisa clima, traslados y condiciones de acceso.'
                tags = 'Aire libre;Naturaleza;Paseo;Paisaje'
                duration, interior = 120, 0
            else:
                description = (f'Punto de partida para descubrir la gastronomía de {state}. '
                               'Puede ser un mercado o una zona con diversos comercios; confirma ubicación, horarios y precios.')
                tags = 'Gastronomía;Comida;Mercado;Restaurantes'
                duration, interior = 75, 1 if 'Mercado' in name else 0
            EXPANDED_PLACES.append((
                _id(state, category, name), state, name, category, tags,
                None, None, PHOTO_PLACEHOLDER, 0, duration, interior, description,
                'Pendiente de consulta en Wikimedia Commons', 'Consultar licencia de la imagen', '',
            ))

assert len(EXPANDED_PLACES) == 288
