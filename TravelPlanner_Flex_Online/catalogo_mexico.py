"""Catálogo nacional inicial de TravelPlanner Flex 2.0.

Incluye las 32 entidades federativas y lugares representativos para explorar.
Las fotografías se resuelven bajo demanda desde Wikimedia Commons y conservan
crédito/licencia cuando Commons publica esos metadatos. Los costos se dejan en
cero para indicar "consultar tarifa" y no inventar precios de entrada.
"""

PHOTO_PLACEHOLDER = "/static/img/photo-placeholder.svg"

# Coordenadas de referencia para clima y búsquedas. No representan el punto
# exacto de todos los atractivos de la entidad.
DESTINOS_NACIONALES = {
    "Aguascalientes": (21.8853, -102.2916),
    "Baja California": (32.5149, -117.0382),
    "Baja California Sur": (22.8905, -109.9167),
    "Campeche": (19.8301, -90.5349),
    "Chiapas": (16.7516, -93.1029),
    "Chihuahua": (28.6353, -106.0889),
    "Ciudad de México": (19.4326, -99.1332),
    "Coahuila": (25.4383, -100.9737),
    "Colima": (19.2452, -103.7241),
    "Durango": (24.0277, -104.6532),
    "Estado de México": (19.2570, -99.6557),
    "Guanajuato": (21.0190, -101.2574),
    "Guerrero": (16.8531, -99.8237),
    "Hidalgo": (20.1011, -98.7591),
    "Jalisco": (20.6597, -103.3496),
    "Michoacán": (19.7008, -101.1844),
    "Morelos": (18.9242, -99.2216),
    "Nayarit": (21.5042, -104.8946),
    "Nuevo León": (25.6866, -100.3161),
    "Oaxaca": (17.0654, -96.7237),
    "Puebla": (19.0414, -98.2063),
    "Querétaro": (20.5888, -100.3899),
    "Quintana Roo": (21.1619, -86.8515),
    "San Luis Potosí": (22.1565, -100.9855),
    "Sinaloa": (23.2494, -106.4111),
    "Sonora": (29.0729, -110.9559),
    "Tabasco": (17.9895, -92.9475),
    "Tamaulipas": (23.7369, -99.1411),
    "Tlaxcala": (19.3139, -98.2404),
    "Veracruz": (19.1738, -96.1342),
    "Yucatán": (20.9674, -89.5926),
    "Zacatecas": (22.7709, -102.5832),
}


def _p(id_, state, name, category, tags, lat, lon, description, indoor=0, minutes=120):
    return (
        id_, state, name, category, tags, lat, lon, PHOTO_PLACEHOLDER,
        0, minutes, indoor, description,
        "Pendiente de consulta en Wikimedia Commons",
        "Consultar licencia en la ficha de la imagen",
        "",
    )


NATIONAL_PLACES = [
    # Aguascalientes
    _p("ags_centro", "Aguascalientes", "Centro Histórico de Aguascalientes", "Historia", "Arquitectura;Plaza;Cultura", 21.8818, -102.2960, "Recorrido por plazas, templos y edificios históricos del centro de la capital."),
    _p("ags_calvillo", "Aguascalientes", "Calvillo", "Paseo", "Pueblo Mágico;Gastronomía;Artesanía", 21.8458, -102.7187, "Pueblo Mágico conocido por su tradición de guayaba, textiles y paisaje serrano."),
    # Baja California
    _p("bc_valle", "Baja California", "Valle de Guadalupe", "Gastronomía", "Vino;Paisaje;Ruta gastronómica", 32.0830, -116.5750, "Región vinícola del municipio de Ensenada con viñedos, restaurantes y experiencias gastronómicas."),
    _p("bc_bufadora", "Baja California", "La Bufadora", "Naturaleza", "Costa;Mirador;Exterior", 31.7210, -116.7270, "Géiser marino natural en la península de Punta Banda; las condiciones del oleaje varían."),
    # Baja California Sur
    _p("bcs_balandra", "Baja California Sur", "Playa Balandra", "Naturaleza", "Playa;Mar;Exterior", 24.3210, -110.3230, "Área natural protegida cercana a La Paz, famosa por sus aguas someras y paisaje costero."),
    _p("bcs_arco", "Baja California Sur", "El Arco de Cabo San Lucas", "Naturaleza", "Mar;Formación rocosa;Paseo en lancha", 22.8750, -109.8940, "Formación rocosa emblemática en el extremo de la península; el acceso suele realizarse por embarcación autorizada."),
    # Campeche
    _p("camp_centro", "Campeche", "Centro Histórico de San Francisco de Campeche", "Historia", "Murallas;Arquitectura;Cultura", 19.8450, -90.5360, "Calles amuralladas, baluartes y arquitectura colonial en una ciudad Patrimonio Mundial."),
    _p("camp_edzna", "Campeche", "Zona Arqueológica de Edzná", "Historia", "Arqueología;Maya;Exterior", 19.5940, -90.2310, "Antigua ciudad maya con plazas, templos y estructuras monumentales en el interior de Campeche."),
    # Chiapas
    _p("chis_sumidero", "Chiapas", "Cañón del Sumidero", "Naturaleza", "Cañón;Río;Mirador", 16.8180, -93.0930, "Parque nacional con paredes naturales y recorridos en lancha sujetos a condiciones y operadores autorizados."),
    _p("chis_palenque", "Chiapas", "Zona Arqueológica de Palenque", "Historia", "Maya;Arqueología;Selva", 17.4840, -92.0460, "Antigua ciudad maya rodeada de selva; considera clima, humedad y caminatas al aire libre."),
    # Chihuahua
    _p("chih_barrancas", "Chihuahua", "Barrancas del Cobre", "Naturaleza", "Sierra;Miradores;Aventura", 27.5150, -107.7700, "Conjunto de barrancas de la Sierra Tarahumara con miradores y opciones de recorrido regional."),
    _p("chih_centro", "Chihuahua", "Centro Histórico de Chihuahua", "Historia", "Museos;Arquitectura;Plaza", 28.6350, -106.0880, "Zona céntrica con edificios históricos, plazas y museos de la capital del estado."),
    # Ciudad de México
    _p("cdmx_chapultepec", "Ciudad de México", "Bosque de Chapultepec", "Naturaleza", "Parque;Museos;Familia", 19.4205, -99.1818, "Gran parque urbano con áreas verdes, museos, lagos y espacios culturales."),
    _p("cdmx_bellas", "Ciudad de México", "Palacio de Bellas Artes", "Cultura", "Arquitectura;Museo;Espectáculos", 19.4352, -99.1412, "Recinto cultural del Centro Histórico; consulta cartelera, exposiciones y horarios oficiales."),
    # Coahuila
    _p("coah_desierto", "Coahuila", "Museo del Desierto", "Cultura", "Museo;Ciencia;Familia", 25.4380, -100.9720, "Museo de historia natural y paleontología ubicado en Saltillo." , 1),
    _p("coah_dunas", "Coahuila", "Dunas de Bilbao", "Naturaleza", "Desierto;Paisaje;Exterior", 25.3000, -102.9000, "Paisaje de dunas en la región de Viesca; verifica condiciones de acceso y recomendaciones ambientales."),
    # Colima
    _p("col_comala", "Colima", "Comala", "Paseo", "Pueblo Mágico;Arquitectura;Gastronomía", 19.3230, -103.7590, "Pueblo de arquitectura tradicional, plazas y cocina regional al norte de la ciudad de Colima."),
    _p("col_nevado", "Colima", "Parque Nacional Nevado de Colima", "Naturaleza", "Montaña;Senderismo;Exterior", 19.5630, -103.6160, "Área natural de montaña compartida regionalmente; el acceso y las condiciones dependen del clima."),
    # Durango
    _p("dgo_centro", "Durango", "Centro Histórico de Durango", "Historia", "Arquitectura;Museos;Plaza", 24.0250, -104.6530, "Centro histórico con arquitectura virreinal, plazas y museos."),
    _p("dgo_mexiquillo", "Durango", "Parque Natural Mexiquillo", "Naturaleza", "Bosque;Cascadas;Aventura", 24.0500, -105.6200, "Zona boscosa de la Sierra Madre Occidental con formaciones rocosas y cascadas estacionales."),
    # Estado de México
    _p("edomex_teotihuacan", "Estado de México", "Zona Arqueológica de Teotihuacán", "Historia", "Arqueología;Pirámides;Exterior", 19.6925, -98.8438, "Conjunto arqueológico con las pirámides del Sol y de la Luna; consulta las restricciones vigentes."),
    _p("edomex_cosmovitral", "Estado de México", "Cosmovitral Jardín Botánico", "Cultura", "Vitral;Jardín;Interior", 19.2820, -99.6550, "Recinto de Toluca conocido por su vitral monumental y jardín botánico." , 1),
    # Guanajuato
    _p("gto_alhondiga", "Guanajuato", "Alhóndiga de Granaditas", "Historia", "Museo;Independencia;Interior", 21.0170, -101.2530, "Edificio histórico y museo ligado a episodios de la Independencia de México.", 1),
    _p("gto_callejon", "Guanajuato", "Callejón del Beso", "Paseo", "Centro histórico;Arquitectura;Exterior", 21.0160, -101.2550, "Callejón tradicional del centro de Guanajuato; considera afluencia y reglas de acceso locales."),
    # Guerrero
    _p("gro_quebrada", "Guerrero", "La Quebrada", "Paseo", "Acapulco;Mirador;Mar", 16.8470, -99.9070, "Acantilado emblemático de Acapulco donde se realizan exhibiciones de clavados en horarios específicos."),
    _p("gro_roqueta", "Guerrero", "Isla La Roqueta", "Naturaleza", "Playa;Senderos;Mar", 16.8270, -99.9120, "Isla frente a Acapulco con playas y senderos; el traslado se realiza por embarcación."),
    # Hidalgo
    _p("hgo_prismas", "Hidalgo", "Prismas Basálticos", "Naturaleza", "Geología;Cascada;Exterior", 20.2040, -98.5750, "Formaciones geológicas y cascadas en Santa María Regla, municipio de Huasca de Ocampo."),
    _p("hgo_reloj", "Hidalgo", "Reloj Monumental de Pachuca", "Historia", "Arquitectura;Centro;Plaza", 20.1250, -98.7330, "Monumento emblemático en la Plaza Independencia de Pachuca."),
    # Jalisco
    _p("jal_cabanas", "Jalisco", "Instituto Cultural Cabañas", "Cultura", "Museo;Muralismo;Interior", 20.6760, -103.3380, "Antiguo hospicio y recinto cultural de Guadalajara, reconocido por los murales de José Clemente Orozco.", 1),
    _p("jal_tequila", "Jalisco", "Centro de Tequila", "Gastronomía", "Pueblo Mágico;Agave;Cultura", 20.8820, -103.8360, "Localidad del paisaje agavero con destilerías y recorridos; revisa edad mínima y condiciones de cada operador."),
    # Michoacán
    _p("mich_morelia", "Michoacán", "Centro Histórico de Morelia", "Historia", "Arquitectura;Catedral;Plaza", 19.7020, -101.1920, "Centro histórico de cantera rosa con plazas, templos y edificios patrimoniales."),
    _p("mich_janitzio", "Michoacán", "Isla de Janitzio", "Paseo", "Lago;Cultura;Embarcación", 19.5740, -101.6500, "Isla del lago de Pátzcuaro con miradores, artesanía y tradiciones locales."),
    # Morelos
    _p("mor_tepoztlan", "Morelos", "Tepoztlán", "Paseo", "Pueblo Mágico;Montaña;Gastronomía", 18.9850, -99.1000, "Pueblo rodeado de montañas, mercados y rutas de senderismo; el acceso al Tepozteco puede tener restricciones."),
    _p("mor_cortes", "Morelos", "Museo Regional de los Pueblos de Morelos", "Cultura", "Museo;Historia;Interior", 18.9210, -99.2370, "Recinto cultural instalado en el Palacio de Cortés, en el centro de Cuernavaca.", 1),
    # Nayarit
    _p("nay_marietas", "Nayarit", "Parque Nacional Islas Marietas", "Naturaleza", "Islas;Mar;Ecoturismo", 20.6970, -105.5700, "Área natural protegida con acceso regulado mediante operadores autorizados y cupos."),
    _p("nay_sanblas", "Nayarit", "San Blas", "Naturaleza", "Costa;Manglar;Playa", 21.5430, -105.2850, "Destino costero con manglares, playas y recorridos de naturaleza."),
    # Nuevo León
    _p("nl_grutas", "Nuevo León", "Grutas de García", "Naturaleza", "Cueva;Montaña;Excursión", 25.8330, -100.5680, "Sistema de cavernas en la Sierra del Fraile; consulta operación del teleférico y condiciones de visita."),
    _p("nl_macro", "Nuevo León", "Macroplaza de Monterrey", "Paseo", "Plaza;Museos;Arquitectura", 25.6680, -100.3090, "Gran espacio público del centro de Monterrey, rodeado de edificios culturales y cívicos."),
    # Querétaro
    _p("qro_bernal", "Querétaro", "Peña de Bernal", "Naturaleza", "Monolito;Senderismo;Pueblo Mágico", 20.7500, -99.9410, "Monolito y localidad de Bernal; los ascensos tienen distintos niveles de dificultad y restricciones."),
    _p("qro_acueducto", "Querétaro", "Acueducto de Querétaro", "Historia", "Arquitectura;Mirador;Exterior", 20.5920, -100.3890, "Acueducto histórico y uno de los símbolos urbanos de Santiago de Querétaro."),
    # Quintana Roo
    _p("qroo_tulum", "Quintana Roo", "Zona Arqueológica de Tulum", "Historia", "Maya;Mar;Arqueología", 20.2140, -87.4290, "Zona arqueológica maya junto al Caribe; consulta horarios y restricciones de acceso."),
    _p("qroo_bacalar", "Quintana Roo", "Laguna de Bacalar", "Naturaleza", "Laguna;Nado;Ecoturismo", 18.6810, -88.3930, "Laguna conocida por sus tonalidades; respeta reglas de conservación y operadores responsables."),
    # San Luis Potosí
    _p("slp_tamul", "San Luis Potosí", "Cascada de Tamul", "Naturaleza", "Cascada;Río;Aventura", 21.8000, -99.1800, "Cascada de la Huasteca Potosina; el acceso y los paseos dependen del nivel del río y operadores."),
    _p("slp_james", "San Luis Potosí", "Jardín Surrealista Edward James", "Cultura", "Jardín;Escultura;Exterior", 21.3920, -99.0000, "Conjunto escultórico y jardín en Xilitla; suele requerir reservación o control de aforo."),
    # Sinaloa
    _p("sin_malecon", "Sinaloa", "Malecón de Mazatlán", "Paseo", "Costa;Atardecer;Bicicleta", 23.2200, -106.4210, "Paseo costero de Mazatlán con vistas al Pacífico, playas y espacios públicos."),
    _p("sin_elfuerte", "Sinaloa", "Centro Histórico de El Fuerte", "Historia", "Pueblo Mágico;Arquitectura;Cultura", 26.4160, -108.6190, "Centro histórico con edificios tradicionales y referencias a la historia regional."),
    # Sonora
    _p("son_pinacate", "Sonora", "Reserva de la Biosfera El Pinacate", "Naturaleza", "Desierto;Volcanes;Paisaje", 31.7700, -113.5000, "Paisaje volcánico y desértico protegido; requiere preparación, rutas permitidas y atención a condiciones extremas."),
    _p("son_sancarlos", "Sonora", "San Carlos", "Naturaleza", "Mar;Montaña;Playa", 27.9630, -111.0540, "Destino costero de Guaymas con playas y vistas del cerro Tetakawi."),
    # Tabasco
    _p("tab_laventa", "Tabasco", "Parque-Museo La Venta", "Cultura", "Museo;Olmeca;Arqueología", 17.9930, -92.9250, "Parque-museo de Villahermosa con piezas monumentales de la cultura olmeca.", 1),
    _p("tab_aguablanca", "Tabasco", "Parque Estatal Agua Blanca", "Naturaleza", "Cascadas;Selva;Senderismo", 17.6200, -92.4700, "Área natural con vegetación tropical y cuerpos de agua; verifica accesos y condiciones."),
    # Tamaulipas
    _p("tamps_miramar", "Tamaulipas", "Playa Miramar", "Naturaleza", "Playa;Mar;Familia", 22.2570, -97.8170, "Playa de Ciudad Madero con zonas recreativas y servicios turísticos."),
    _p("tamps_laguna", "Tamaulipas", "Laguna del Carpintero", "Naturaleza", "Laguna;Paseo;Fauna", 22.2530, -97.8560, "Espacio natural urbano de Tampico con andadores y observación de fauna desde zonas permitidas."),
    # Tlaxcala
    _p("tlax_cacaxtla", "Tlaxcala", "Zona Arqueológica de Cacaxtla", "Historia", "Arqueología;Murales;Interior", 19.2430, -98.3420, "Sitio arqueológico con murales prehispánicos; consulta el acceso al museo y las áreas abiertas.", 1),
    _p("tlax_valquirico", "Tlaxcala", "Val'Quirico", "Paseo", "Arquitectura;Gastronomía;Compras", 19.1910, -98.2860, "Complejo turístico de estilo europeo con restaurantes, tiendas y espacios para caminar."),
    # Yucatán
    _p("yuc_chichen", "Yucatán", "Chichén Itzá", "Historia", "Maya;Arqueología;Patrimonio", 20.6840, -88.5680, "Zona arqueológica maya reconocida como Patrimonio Mundial; consulta tarifas, horarios y reglas vigentes."),
    _p("yuc_uxmal", "Yucatán", "Zona Arqueológica de Uxmal", "Historia", "Maya;Arqueología;Exterior", 20.3600, -89.7710, "Ciudad maya del estilo arquitectónico Puuc, reconocida por sus edificios ceremoniales."),
    # Zacatecas
    _p("zac_mina", "Zacatecas", "Mina El Edén", "Historia", "Minería;Recorrido;Interior", 22.7750, -102.5710, "Antigua mina adaptada para recorridos turísticos en la ciudad de Zacatecas.", 1),
    _p("zac_bufa", "Zacatecas", "Cerro de la Bufa", "Paseo", "Mirador;Historia;Exterior", 22.7750, -102.5580, "Mirador y sitio histórico sobre la ciudad de Zacatecas, con vistas panorámicas."),
]
