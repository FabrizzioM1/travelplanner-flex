"""TravelPlanner Flex Online.
Python + Flask + PostgreSQL (Neon) / SQLite (local development).
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import html
import unicodedata
import time
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
from contextlib import contextmanager
from decimal import Decimal
from urllib.request import Request, urlopen
from urllib.parse import urlencode, urlparse

from catalogo_mexico import DESTINOS_NACIONALES, NATIONAL_PLACES, PHOTO_PLACEHOLDER
from catalogo_ampliado import EXPANDED_PLACES
from experiencias_veracruz import EXPERIENCIAS_VERACRUZ, EXPERIENCE_PLACES, PERMISOS, DIR_CONAPESCA
from municipios_recomendados import (
    MUNICIPIOS_CON_COBERTURA, ACTIVIDADES_CON_COBERTURA,
    PREFERENCIAS_NATURALEZA, SITIOS_CATEMACO, FOTOS_CATEMACO,
    lugares_para_sembrar, recomendar
)

from flask import Flask, g, jsonify, request, send_from_directory, session
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash, generate_password_hash

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # SQLite local can still run if psycopg is not installed.
    psycopg = None
    dict_row = None

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / 'static'
DB_PATH = Path(os.environ.get('TRAVELPLANNER_DB', str(ROOT / 'data' / 'travelplanner.sqlite3')))
DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()
IS_RENDER = bool(os.environ.get('RENDER') or os.environ.get('RENDER_SERVICE_ID'))
IS_HOSTED = IS_RENDER or os.environ.get('TRAVELPLANNER_HOSTED') == '1'
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = 'postgresql://' + DATABASE_URL[len('postgres://'):]
# Neon exige TLS; si la URL no incluye sslmode, se agrega explícitamente.
if DATABASE_URL and 'sslmode=' not in DATABASE_URL:
    DATABASE_URL += ('&' if '?' in DATABASE_URL else '?') + 'sslmode=require'
# Cobertura nacional: las 32 entidades federativas. Coordenadas de referencia.
DESTINOS = DESTINOS_NACIONALES

# Fotografías específicas seleccionadas y atribuidas manualmente.
# No se altera la base de datos ni se confunden sitios homónimos (e.g. Mercado Hidalgo
# de Guanajuato vs. Mercado Hidalgo de Veracruz). Para completar más lugares, agregar
# solo fotos verificadas con su página y licencia reales.
CURATED_GALLERIES = {'ex21_faed889549380': [{'imagen': 'https://upload.wikimedia.org/wikipedia/commons/0/03/Mercado_rotonda_en_Xalapa.jpg', 'credito': 'Koffermejia', 'licencia': 'CC BY-SA 4.0', 'fuente': 'https://commons.wikimedia.org/wiki/File:Mercado_rotonda_en_Xalapa.jpg', 'tipo': 'lugar'}], 'ex21_bb479626fb840': [{'imagen': 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Malec%C3%B3n_Boca_del_R%C3%ADo.jpg', 'credito': 'Skavania', 'licencia': 'CC BY 4.0', 'fuente': 'https://commons.wikimedia.org/wiki/File:Malec%C3%B3n_Boca_del_R%C3%ADo.jpg', 'tipo': 'lugar'}, {'imagen': 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Municipio_de_Veracruz_vac%C3%ADo_por_cuarentena.jpg', 'credito': 'YanpolGG', 'licencia': 'CC BY-SA 4.0', 'fuente': 'https://commons.wikimedia.org/wiki/File:Municipio_de_Veracruz_vac%C3%ADo_por_cuarentena.jpg', 'tipo': 'lugar'}, {'imagen': 'https://upload.wikimedia.org/wikipedia/commons/5/52/Monumento_de_La_Sirena%2C_Boca_del_R%C3%ADo%2C_Veracruz.jpg', 'credito': 'Skavania', 'licencia': 'CC BY 4.0', 'fuente': 'https://commons.wikimedia.org/wiki/File:Monumento_de_La_Sirena,_Boca_del_R%C3%ADo,_Veracruz.jpg', 'tipo': 'lugar'}]}

# Solo imágenes identificadas para su recinto; quedan con créditos de Wikimedia.
CURATED_GALLERIES.update(FOTOS_CATEMACO)

def curated_first(place_id):
    pics = CURATED_GALLERIES.get(str(place_id), [])
    return dict(pics[0]) if pics else None

# Fotografías reales seleccionadas manualmente de Wikimedia Commons.
# Se conserva el enlace a la ficha original y la licencia junto a cada foto.
PLACES = [
 ('oax_culturas','Oaxaca','Museo de las Culturas de Oaxaca','Cultura','Museo;Historia;Bajo techo',17.0660,-96.7212,
  'https://upload.wikimedia.org/wikipedia/commons/9/98/Museo_de_las_Culturas_de_Oaxaca.jpg',100,100,1,
  'Recinto cultural instalado en el exconvento de Santo Domingo. La fotografía muestra el entorno del museo.',
  'EdsonCid','CC BY-SA 3.0','https://commons.wikimedia.org/wiki/File:Museo_de_las_Culturas_de_Oaxaca.jpg'),
 ('oax_textil','Oaxaca','Museo Textil de Oaxaca','Cultura','Museo;Artesanía;Bajo techo',17.0597,-96.7231,
  'https://upload.wikimedia.org/wikipedia/commons/b/b2/Museo_Textil_de_Oaxaca_%28MTO%29.jpg',0,75,1,
  'Espacio cultural dedicado a los textiles, técnicas y tradiciones de Oaxaca, México y otras regiones.',
  'ArribalaLuna','CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Museo_Textil_de_Oaxaca_(MTO).jpg'),
 ('oax_hierve','Oaxaca','Hierve el Agua','Naturaleza','Mirador;Exterior;Excursión',16.8643,-96.2753,
  'https://upload.wikimedia.org/wikipedia/commons/7/76/Hierve_el_agua%2C_Oaxaca.jpg',280,180,0,
  'Paisaje natural de formaciones minerales y pozas; requiere desplazamiento fuera de la ciudad de Oaxaca.',
  'JishaBP','CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Hierve_el_agua,_Oaxaca.jpg'),
 ('oax_mercado','Oaxaca','Mercado 20 de Noviembre','Gastronomía','Comida;Mercado;Bajo techo',17.0586,-96.7264,
  'https://upload.wikimedia.org/wikipedia/commons/8/88/Mercado_a_20_Noviembre%2C_Oaxaca.jpg',220,75,1,
  'Mercado tradicional conocido por su oferta gastronómica y el pasillo de carnes asadas.',
  'Dan Nevill','CC BY 2.0','https://commons.wikimedia.org/wiki/File:Mercado_a_20_Noviembre,_Oaxaca.jpg'),
 ('oax_monte','Oaxaca','Monte Albán','Historia','Arqueología;Exterior;Excursión',17.0432,-96.7671,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Monte_Alb%C3%A1n_en_Oaxaca.jpg/960px-Monte_Alb%C3%A1n_en_Oaxaca.jpg',160,150,0,
  'Zona arqueológica zapoteca ubicada en los Valles Centrales de Oaxaca; visita principalmente al aire libre.',
  'Minkyroa','CC BY 4.0','https://commons.wikimedia.org/wiki/File:Monte_Alb%C3%A1n_en_Oaxaca.jpg'),
 ('oax_jardin','Oaxaca','Jardín Etnobotánico de Oaxaca','Naturaleza','Jardín;Exterior;Cultura',17.0663,-96.7215,
  'https://upload.wikimedia.org/wikipedia/commons/1/18/Jard%C3%ADn_Etnobot%C3%A1nico_%28Oaxaca%2C_Oaxaca%29.jpg',120,90,0,
  'Jardín con especies vegetales nativas y colecciones botánicas vinculadas con la región.',
  'A1437053','CC BY-SA 3.0','https://commons.wikimedia.org/wiki/File:Jard%C3%ADn_Etnobot%C3%A1nico_(Oaxaca,_Oaxaca).jpg'),
 ('ver_ulua','Veracruz','San Juan de Ulúa','Historia','Fortaleza;Exterior;Historia',19.2089,-96.1353,
  'https://upload.wikimedia.org/wikipedia/commons/d/d8/Fuerte_San_Juan_de_Ul%C3%BAa.jpg',120,120,0,
  'Fortaleza histórica junto al puerto de Veracruz; verifica disponibilidad y horarios antes de visitar.',
  'Yobahi','CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Fuerte_San_Juan_de_Ul%C3%BAa.jpg'),
 ('ver_naval','Veracruz','Museo Naval México','Cultura','Museo;Historia;Bajo techo',19.1989,-96.1358,
  'https://upload.wikimedia.org/wikipedia/commons/7/7a/Museo_Naval_M%C3%A9xico_04.jpg',100,90,1,
  'Museo dedicado a la historia marítima y naval de México, ubicado en el centro de Veracruz.',
  'WendyAvilesR','CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Museo_Naval_M%C3%A9xico_04.jpg'),
 ('ver_malecon','Veracruz','Malecón de Veracruz','Paseo','Paseo;Exterior;Mar',19.2031,-96.1324,
  'https://upload.wikimedia.org/wikipedia/commons/c/c4/Malec%C3%B3n_de_Veracruz.jpg',0,90,0,
  'Paseo público junto al puerto y la costa; ideal para caminar y contemplar la actividad portuaria.',
  'Koffermejia','CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Malec%C3%B3n_de_Veracruz.jpg'),
 ('ver_acuario','Veracruz','Acuario de Veracruz','Naturaleza','Acuario;Bajo techo;Familia',19.1892,-96.1230,
  'https://upload.wikimedia.org/wikipedia/commons/6/63/Nuevo_Acuarium_de_Veracruz.jpg',230,120,1,
  'Acuario del puerto de Veracruz. La foto muestra el acceso remodelado en 2024.',
  'Skavania','CC BY 4.0','https://commons.wikimedia.org/wiki/File:Nuevo_Acuarium_de_Veracruz.jpg'),
 ('pue_amparo','Puebla','Museo Amparo','Cultura','Museo;Arte;Bajo techo',19.0389,-98.1981,
  'https://upload.wikimedia.org/wikipedia/commons/5/57/Vista_del_Museo_Amparo_Puebla_M%C3%A9xico.JPG',100,90,1,
  'Museo con colecciones de arte prehispánico, virreinal y contemporáneo en el centro de Puebla.',
  'ALVivaldi','CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Vista_del_Museo_Amparo_Puebla_M%C3%A9xico.JPG'),
 ('pue_biblio','Puebla','Biblioteca Palafoxiana','Historia','Biblioteca;Cultura;Bajo techo',19.0422,-98.1980,
  'https://upload.wikimedia.org/wikipedia/commons/c/cc/Biblioteca_Palafoxiana_de_Puebla.jpg',60,65,1,
  'Biblioteca histórica fundada en 1646, reconocida por su colección y mobiliario antiguo.',
  'ProtoplasmaKid','CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Biblioteca_Palafoxiana_de_Puebla.jpg'),
]

SCHEMA = """
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS usuario (
 id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
 nombre TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, creado TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS viaje (
 id_viaje INTEGER PRIMARY KEY AUTOINCREMENT,
 id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
 nombre TEXT NOT NULL CHECK(length(trim(nombre)) > 0), destino TEXT NOT NULL,
 fecha_inicio TEXT NOT NULL, fecha_fin TEXT NOT NULL,
 num_viajeros INTEGER NOT NULL DEFAULT 1 CHECK(num_viajeros BETWEEN 1 AND 100),
 notas TEXT DEFAULT '', CHECK (fecha_fin >= fecha_inicio)
);
CREATE TABLE IF NOT EXISTS hospedaje (
 id_hospedaje INTEGER PRIMARY KEY AUTOINCREMENT,
 id_viaje INTEGER NOT NULL REFERENCES viaje(id_viaje) ON DELETE CASCADE,
 nombre TEXT NOT NULL, direccion TEXT DEFAULT '', fecha_entrada TEXT NOT NULL,
 fecha_salida TEXT NOT NULL, costo REAL NOT NULL DEFAULT 0 CHECK(costo>=0),
 num_reservacion TEXT DEFAULT '', estado TEXT NOT NULL DEFAULT 'pendiente'
 CHECK(estado IN ('pendiente','reservado','pagado')),
 CHECK(fecha_salida > fecha_entrada)
);
CREATE TABLE IF NOT EXISTS transporte (
 id_transporte INTEGER PRIMARY KEY AUTOINCREMENT,
 id_viaje INTEGER NOT NULL REFERENCES viaje(id_viaje) ON DELETE CASCADE,
 tipo TEXT NOT NULL CHECK(tipo IN ('avion','autobus','auto','tren','otro')),
 origen TEXT NOT NULL, destino TEXT NOT NULL, fecha_hora_salida TEXT NOT NULL,
 fecha_hora_llegada TEXT DEFAULT '', costo REAL NOT NULL DEFAULT 0 CHECK(costo>=0),
 num_reservacion TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS itinerario (
 id_itinerario INTEGER PRIMARY KEY AUTOINCREMENT,
 id_viaje INTEGER NOT NULL REFERENCES viaje(id_viaje) ON DELETE CASCADE,
 fecha TEXT NOT NULL, titulo TEXT DEFAULT '', descripcion TEXT DEFAULT '', UNIQUE(id_viaje,fecha)
);
CREATE TABLE IF NOT EXISTS actividad (
 id_actividad INTEGER PRIMARY KEY AUTOINCREMENT,
 id_itinerario INTEGER NOT NULL REFERENCES itinerario(id_itinerario) ON DELETE CASCADE,
 nombre TEXT NOT NULL, hora_inicio TEXT NOT NULL,
 duracion_min INTEGER NOT NULL DEFAULT 90 CHECK(duracion_min>0),
 lugar TEXT DEFAULT '', costo_estimado REAL NOT NULL DEFAULT 0 CHECK(costo_estimado>=0),
 categoria TEXT NOT NULL DEFAULT 'Cultura', lugar_id TEXT DEFAULT '',
 estado TEXT NOT NULL DEFAULT 'planeada' CHECK(estado IN ('planeada','realizada','cancelada'))
);
CREATE TABLE IF NOT EXISTS presupuesto (
 id_presupuesto INTEGER PRIMARY KEY AUTOINCREMENT,
 id_viaje INTEGER NOT NULL UNIQUE REFERENCES viaje(id_viaje) ON DELETE CASCADE,
 monto_total REAL NOT NULL CHECK(monto_total>=0), moneda TEXT NOT NULL DEFAULT 'MXN'
);
CREATE TABLE IF NOT EXISTS presupuesto_categoria (
 id_pc INTEGER PRIMARY KEY AUTOINCREMENT,
 id_presupuesto INTEGER NOT NULL REFERENCES presupuesto(id_presupuesto) ON DELETE CASCADE,
 categoria TEXT NOT NULL, monto REAL NOT NULL CHECK(monto>=0), UNIQUE(id_presupuesto,categoria)
);
CREATE TABLE IF NOT EXISTS viajero (
 id_viajero INTEGER PRIMARY KEY AUTOINCREMENT,
 id_viaje INTEGER NOT NULL REFERENCES viaje(id_viaje) ON DELETE CASCADE, nombre TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gasto (
 id_gasto INTEGER PRIMARY KEY AUTOINCREMENT,
 id_viaje INTEGER NOT NULL REFERENCES viaje(id_viaje) ON DELETE CASCADE,
 concepto TEXT NOT NULL, monto REAL NOT NULL CHECK(monto>=0), moneda TEXT NOT NULL DEFAULT 'MXN',
 fecha TEXT NOT NULL, categoria TEXT NOT NULL, metodo_pago TEXT DEFAULT 'Efectivo',
 id_pagador INTEGER REFERENCES viajero(id_viajero) ON DELETE SET NULL,
 compartido INTEGER NOT NULL DEFAULT 0 CHECK(compartido IN (0,1))
);
CREATE TABLE IF NOT EXISTS lugar (
 id_lugar TEXT PRIMARY KEY, ciudad TEXT NOT NULL, nombre TEXT NOT NULL, categoria TEXT NOT NULL,
 etiquetas TEXT NOT NULL, lat REAL, lon REAL, imagen TEXT NOT NULL, precio_estimado REAL NOT NULL,
 duracion_min INTEGER NOT NULL, interior INTEGER NOT NULL, descripcion TEXT NOT NULL,
 credito TEXT NOT NULL DEFAULT '', licencia TEXT NOT NULL DEFAULT '', fuente TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS preferencia (
 id_preferencia INTEGER PRIMARY KEY AUTOINCREMENT,
 id_viaje INTEGER NOT NULL REFERENCES viaje(id_viaje) ON DELETE CASCADE,
 categoria TEXT NOT NULL, UNIQUE(id_viaje,categoria)
);
CREATE TABLE IF NOT EXISTS voto (
 id_voto INTEGER PRIMARY KEY AUTOINCREMENT,
 id_viajero INTEGER NOT NULL REFERENCES viajero(id_viajero) ON DELETE CASCADE,
 id_lugar TEXT NOT NULL REFERENCES lugar(id_lugar), decision INTEGER NOT NULL CHECK(decision IN (-1,1)),
 UNIQUE(id_viajero,id_lugar)
);
CREATE TABLE IF NOT EXISTS alternativa_actividad (
 id_alternativa INTEGER PRIMARY KEY AUTOINCREMENT,
 id_actividad INTEGER NOT NULL REFERENCES actividad(id_actividad) ON DELETE CASCADE,
 id_lugar TEXT NOT NULL REFERENCES lugar(id_lugar), motivo TEXT NOT NULL,
 fecha_propuesta TEXT NOT NULL, aplicada INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS escenario_viaje (
 id_escenario INTEGER PRIMARY KEY AUTOINCREMENT,
 id_viaje INTEGER NOT NULL REFERENCES viaje(id_viaje) ON DELETE CASCADE,
 descripcion TEXT NOT NULL, impacto_estimado REAL NOT NULL DEFAULT 0, creado TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS galeria_lugar (
 id_lugar TEXT NOT NULL REFERENCES lugar(id_lugar) ON DELETE CASCADE,
 posicion INTEGER NOT NULL CHECK(posicion BETWEEN 1 AND 3),
 imagen TEXT NOT NULL,
 credito TEXT NOT NULL DEFAULT '',
 licencia TEXT NOT NULL DEFAULT '',
 fuente TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(id_lugar,posicion)
);
CREATE INDEX IF NOT EXISTS ix_viaje_usuario ON viaje(id_usuario);
CREATE INDEX IF NOT EXISTS ix_itinerario_viaje_fecha ON itinerario(id_viaje,fecha);
"""
SCHEMA_PG = re.sub(r'\bREAL\b', 'DOUBLE PRECISION', SCHEMA.replace('PRAGMA foreign_keys=ON;', '')
             .replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY'))

PK_MAP = {
 'usuario':'id_usuario','viaje':'id_viaje','hospedaje':'id_hospedaje','transporte':'id_transporte',
 'itinerario':'id_itinerario','actividad':'id_actividad','presupuesto':'id_presupuesto',
 'presupuesto_categoria':'id_pc','viajero':'id_viajero','gasto':'id_gasto','preferencia':'id_preferencia',
 'voto':'id_voto','alternativa_actividad':'id_alternativa','escenario_viaje':'id_escenario'
}

ENTITY = {
 "hospedaje": ("hospedaje", "id_hospedaje", ["id_viaje","nombre","direccion","fecha_entrada","fecha_salida","costo","num_reservacion","estado"]),
 "transporte": ("transporte", "id_transporte", ["id_viaje","tipo","origen","destino","fecha_hora_salida","fecha_hora_llegada","costo","num_reservacion"]),
 "itinerario": ("itinerario", "id_itinerario", ["id_viaje","fecha","titulo","descripcion"]),
 "actividad": ("actividad", "id_actividad", ["id_itinerario","nombre","hora_inicio","duracion_min","lugar","costo_estimado","categoria","lugar_id","estado"]),
 "gasto": ("gasto", "id_gasto", ["id_viaje","concepto","monto","moneda","fecha","categoria","metodo_pago","id_pagador","compartido"]),
 "viajero": ("viajero", "id_viajero", ["id_viaje","nombre"]),
 "preferencia": ("preferencia", "id_preferencia", ["id_viaje","categoria"]),
 "presupuesto_categoria": ("presupuesto_categoria", "id_pc", ["id_presupuesto","categoria","monto"]),
}

class HybridRow(dict):
    """Fila compatible con row['campo'] y row[0], como sqlite3.Row."""
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)

class CursorProxy:
    def __init__(self, cursor, lastrowid=None): self.cursor=cursor; self.lastrowid=lastrowid
    def fetchone(self):
        item=self.cursor.fetchone()
        return HybridRow(item) if item is not None and isinstance(item, dict) else item
    def fetchall(self):
        items=self.cursor.fetchall()
        return [HybridRow(item) if isinstance(item, dict) else item for item in items]
    @property
    def rowcount(self): return self.cursor.rowcount

class PostgresCompat:
    """Adaptador pequeño para conservar las consultas parametrizadas del prototipo SQLite."""
    def __init__(self, conn): self.conn=conn
    def execute(self, sql, params=()):
        sql=sql.replace('INSERT OR IGNORE INTO','INSERT INTO').replace('?', '%s')
        if sql.lstrip().upper().startswith('PRAGMA'):
            return CursorProxy(self.conn.execute('SELECT 1'))
        lastrowid=None
        if sql.lstrip().upper().startswith('INSERT') and 'RETURNING' not in sql.upper():
            match=re.search(r'INSERT\s+INTO\s+([a-z_]+)', sql, re.I)
            table=match.group(1).lower() if match else None
            if table in PK_MAP and 'DO NOTHING' not in sql.upper():
                pk=PK_MAP[table]
                sql += f' RETURNING {pk}'
                cur=self.conn.execute(sql, params)
                returned=cur.fetchone()
                lastrowid=returned[pk] if returned else None
                return CursorProxy(cur,lastrowid)
        cur=self.conn.execute(sql, params)
        return CursorProxy(cur,lastrowid)
    def executemany(self, sql, seq):
        ignore='INSERT OR IGNORE INTO' in sql.upper()
        sql=sql.replace('INSERT OR IGNORE INTO','INSERT INTO').replace('?', '%s')
        if ignore and 'ON CONFLICT' not in sql.upper(): sql += ' ON CONFLICT DO NOTHING'
        cur=self.conn.cursor(); cur.executemany(sql, list(seq)); return CursorProxy(cur)
    def executescript(self, script):
        for statement in script.split(';'):
            statement=statement.strip()
            if statement: self.execute(statement)
    def __getattr__(self,name): return getattr(self.conn,name)

class UserError(Exception):
    def __init__(self, msg, status=400): super().__init__(msg); self.status=status

@contextmanager
def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DATABASE_URL:
        if psycopg is None: raise RuntimeError('Instala psycopg[binary] para usar PostgreSQL.')
        raw = psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=12)
        db = PostgresCompat(raw)
    else:
        raw = sqlite3.connect(DB_PATH, timeout=12)
        raw.row_factory = sqlite3.Row
        raw.execute('PRAGMA foreign_keys=ON')
        db = raw
    try:
        yield db
        raw.commit()
    except Exception:
        raw.rollback()
        raise
    finally:
        raw.close()

def now(): return dt.datetime.now().isoformat(timespec="seconds")
def _plain_record(record):
    return {k: (float(v) if isinstance(v, Decimal) else v) for k, v in dict(record).items()}
def rows(db, sql, params=()):
    # psycopg 3 devuelve un CursorProxy que expone fetchall(), pero no es iterable.
    # SQLite y PostgreSQL ofrecen fetchall(), por lo que usamos la misma interfaz.
    cursor = db.execute(sql, params)
    return [_plain_record(item) for item in cursor.fetchall()]
def row(db,sql,params=()):
    r=db.execute(sql,params).fetchone();return _plain_record(r) if r else None

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.executescript(SCHEMA_PG if DATABASE_URL else SCHEMA)
        # Siembra incremental en Neon (una sola operación por lote). No sobrescribe
        # nombres, costos, fotografías ni otros datos de lugares ya guardados.
        known_ids = {x['id_lugar'] for x in rows(db, 'SELECT id_lugar FROM lugar')}
        pending = []
        for place in list(PLACES) + list(NATIONAL_PLACES) + list(EXPANDED_PLACES) + list(EXPERIENCE_PLACES) + lugares_para_sembrar(PHOTO_PLACEHOLDER):
            item = list(place)
            if item[0] in known_ids:
                continue
            local_photo = STATIC / 'img' / 'real' / f"{item[0]}.jpg"
            if local_photo.is_file():
                item[7] = f"/static/img/real/{item[0]}.jpg"
            else:
                item[7] = item[7] or PHOTO_PLACEHOLDER
            pending.append(tuple(item))
            known_ids.add(item[0])
        if pending:
            db.executemany(
                "INSERT INTO lugar (id_lugar,ciudad,nombre,categoria,etiquetas,lat,lon,imagen,precio_estimado,duracion_min,interior,descripcion,credito,licencia,fuente) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id_lugar) DO NOTHING",
                pending,
            )


def _plain_commons(value):
    value = html.unescape(str(value or ''))
    value = re.sub(r'<[^>]*>', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


def commons_photo_for_place(db, place_id):
    '''Busca una fotografía real en Wikimedia Commons y guarda atribución/licencia.

    Se ejecuta solo cuando el usuario abre el catálogo de un lugar sin foto; la
    respuesta y sus metadatos quedan guardados en PostgreSQL para no repetir la
    consulta en cada visita. Si Commons no responde, se conserva el placeholder.
    '''
    place = row(db, 'SELECT * FROM lugar WHERE id_lugar=?', (place_id,))
    if not place:
        raise UserError('Lugar no encontrado.', 404)
    verified = curated_first(place_id)
    if verified:
        return {**verified, 'encontrada': True}
    current = place.get('imagen') or ''
    if current and current != PHOTO_PLACEHOLDER and not current.endswith('photo-placeholder.svg'):
        return {'imagen': current, 'credito': place.get('credito') or '',
                'licencia': place.get('licencia') or '', 'fuente': place.get('fuente') or '', 'encontrada': True}
    query = f'filetype:bitmap "{place["nombre"]}" {place["ciudad"]} Mexico'
    params = {
        'action': 'query', 'generator': 'search', 'gsrsearch': query,
        'gsrnamespace': 6, 'gsrlimit': 6, 'prop': 'imageinfo',
        'iiprop': 'url|extmetadata', 'iiurlwidth': 960,
        'iiextmetadatafilter': 'Artist|Credit|LicenseShortName|UsageTerms',
        'format': 'json', 'formatversion': 2,
    }
    uri = 'https://commons.wikimedia.org/w/api.php?' + urlencode(params)
    try:
        req = Request(uri, headers={'User-Agent': 'TravelPlannerFlex/2.2 (https://travelplanner-flex.onrender.com; educational project)'})
        with urlopen(req, timeout=7) as response:
            payload = json.load(response)
        pages = (payload.get('query') or {}).get('pages') or []
        if isinstance(pages, dict):
            pages = list(pages.values())
        pages.sort(key=lambda x: (0 if place['nombre'].lower() in x.get('title', '').lower() else 1, x.get('title', '')))
        selected = None
        for page in pages:
            infos = page.get('imageinfo') or []
            if not infos:
                continue
            info = infos[0]
            image_url = info.get('thumburl') or info.get('url')
            if image_url and image_url.lower().split('?')[0].endswith(('.jpg', '.jpeg', '.png', '.webp')):
                selected = (page, info, image_url)
                break
        if not selected:
            return {'imagen': PHOTO_PLACEHOLDER, 'credito': '', 'licencia': '', 'fuente': '', 'encontrada': False}
        page, info, image_url = selected
        meta = info.get('extmetadata') or {}
        artist = _plain_commons((meta.get('Artist') or {}).get('value') or (meta.get('Credit') or {}).get('value'))
        license_name = _plain_commons((meta.get('LicenseShortName') or {}).get('value') or (meta.get('UsageTerms') or {}).get('value'))
        source = info.get('descriptionurl') or ('https://commons.wikimedia.org/wiki/' + page.get('title', '').replace(' ', '_'))
        artist = artist or 'Autor indicado en Wikimedia Commons'
        license_name = license_name or 'Consultar licencia en la ficha original'
        db.execute('UPDATE lugar SET imagen=?,credito=?,licencia=?,fuente=? WHERE id_lugar=?',
                   (image_url, artist, license_name, source, place_id))
        return {'imagen': image_url, 'credito': artist, 'licencia': license_name, 'fuente': source, 'encontrada': True}
    except Exception as exc:
        app.logger.warning('No se pudo resolver fotografía Commons para %s: %s', place_id, exc)
        return {'imagen': PHOTO_PLACEHOLDER, 'credito': '', 'licencia': '', 'fuente': '', 'encontrada': False}

# Galería adicional. Se consultan únicamente archivos de Wikimedia Commons, con
# atribución y licencia. Si no hay 3 fotos verificables, NO se inventan imágenes.
# El almacenamiento es incremental y no toca viajes/reservas ya existentes.
_GALLERY_RETRY = {}

def _search_words(name):
    text = unicodedata.normalize('NFKD', str(name).split('·')[0])
    text = ''.join(c for c in text if not unicodedata.combining(c)).lower()
    words = re.findall(r'[a-z0-9]+', text)
    banned = {'de','del','la','el','los','las','y','en','con','zona','centro','historico','restaurantes',
              'mexico','mexicana','mexicano','parque','nacional','museo','mercado','estado'}
    return {w for w in words if len(w) > 3 and w not in banned}

def _licensed_photos(query, place, seen):
    """Búsqueda de imágenes de Commons con licencia publicada y nombre compatible."""
    params = {
        'action': 'query', 'generator': 'search', 'gsrsearch': f'filetype:bitmap {query}',
        'gsrnamespace': 6, 'gsrlimit': 25, 'prop': 'imageinfo',
        'iiprop': 'url|mime|extmetadata', 'iiurlwidth': 960,
        'iiextmetadatafilter': 'Artist|Credit|LicenseShortName|UsageTerms',
        'format': 'json', 'formatversion': 2,
    }
    uri = 'https://commons.wikimedia.org/w/api.php?' + urlencode(params)
    req = Request(uri, headers={'User-Agent':'TravelPlannerFlex/2.2 (https://travelplanner-flex.onrender.com; educational project)'})
    with urlopen(req, timeout=7) as response:
        payload = json.load(response)
    pages = (payload.get('query') or {}).get('pages') or []
    if isinstance(pages, dict): pages = list(pages.values())
    key_words = _search_words(place['nombre'])
    results = []
    for page in pages:
        infos = page.get('imageinfo') or []
        if not infos: continue
        info = infos[0]
        title = page.get('title','')
        lowered = title.lower()
        if any(w in lowered for w in ('mapa', 'logo', 'icon.', 'bandera', 'escudo', 'plano ', 'map ', 'poster')):
            continue
        normalized = _search_words(title)
        if key_words and not key_words.intersection(normalized):
            continue
        url = info.get('thumburl') or info.get('url') or ''
        if not (url.startswith('https://upload.wikimedia.org/') and
                info.get('mime','').lower() in ('image/jpeg','image/png','image/webp')):
            continue
        source = info.get('descriptionurl') or 'https://commons.wikimedia.org/wiki/'+title.replace(' ','_')
        if not source.startswith('https://commons.wikimedia.org/'):
            continue
        meta = info.get('extmetadata') or {}
        lic = _plain_commons((meta.get('LicenseShortName') or {}).get('value') or
                             (meta.get('UsageTerms') or {}).get('value'))
        if not lic: continue
        if url in seen or source in seen: continue
        seen.add(url); seen.add(source)
        author = _plain_commons((meta.get('Artist') or {}).get('value') or
                                (meta.get('Credit') or {}).get('value')) or 'Ver ficha en Wikimedia Commons'
        results.append({'imagen':url,'credito':author[:250], 'licencia':lic[:150],
                        'fuente':source, 'tipo':'lugar'})
    return results

def gallery_for_place(db,place_id):
    place = row(db,'SELECT * FROM lugar WHERE id_lugar=?',(place_id,))
    if not place: raise UserError('Lugar no encontrado.',404)
    verified = CURATED_GALLERIES.get(str(place_id))
    if verified:
        return {'fotos': [dict(ph) for ph in verified],
                'faltantes': max(0,3-len(verified)), 'id_lugar': place_id,
                'verificacion': 'curada'}
    saved = rows(db,'SELECT imagen,credito,licencia,fuente FROM galeria_lugar WHERE id_lugar=? ORDER BY posicion',(place_id,))
    if len(saved) >= 3 or (_GALLERY_RETRY.get(place_id,0) > time.time()):
        return {'fotos':saved[:3], 'faltantes':max(0,3-len(saved)), 'id_lugar':place_id}
    photos = list(saved)
    seen = {x['imagen'] for x in photos} | {x['fuente'] for x in photos}
    primary = place.get('imagen') or ''
    primary_source = str(place.get('fuente') or '')
    primary_license = str(place.get('licencia') or '')
    if (not photos and primary and primary != PHOTO_PLACEHOLDER and
            not primary.endswith('photo-placeholder.svg') and
            primary.startswith(('https://upload.wikimedia.org/','/static/img/real/')) and
            primary_source.startswith('https://commons.wikimedia.org/wiki/File:') and
            primary_license and not primary_license.lower().startswith('consultar')):
        photos.append({'imagen':primary,'credito':place.get('credito') or 'Consultar autor',
                       'licencia':place.get('licencia') or 'Consultar licencia en origen',
                       'fuente':place.get('fuente') or '', 'tipo':'lugar'})
        seen.add(primary); seen.add(place.get('fuente') or '')
    short = str(place['nombre']).split('·')[0].strip()
    try:
        for query in (f'"{short}" {place["ciudad"]}', f'{short} Mexico'):
            if len(photos) >= 3: break
            for candidate in _licensed_photos(query,place,seen):
                if len(photos) >= 3: break
                photos.append(candidate)
    except Exception as exc:
        app.logger.warning('Commons temporalmente no disponible para %s: %s', place_id, exc)
    for i,ph in enumerate(photos[:3],1):
        db.execute('INSERT INTO galeria_lugar(id_lugar,posicion,imagen,credito,licencia,fuente) VALUES (?,?,?,?,?,?) ON CONFLICT(id_lugar,posicion) DO NOTHING',
                   (place_id,i,ph['imagen'],ph['credito'],ph['licencia'],ph['fuente']))
    _GALLERY_RETRY[place_id] = time.time() + (86400 if len(photos)<3 else 3600)
    stored = rows(db,'SELECT imagen,credito,licencia,fuente FROM galeria_lugar WHERE id_lugar=? ORDER BY posicion',(place_id,))
    return {'fotos':stored[:3], 'faltantes':max(0,3-len(stored)), 'id_lugar':place_id}

def date_value(v,label="Fecha"):
    try:
        parsed=dt.date.fromisoformat(str(v));return parsed
    except Exception: raise UserError(f"{label} inválida: usa AAAA-MM-DD.")

def time_value(v,label="Hora"):
    try:return dt.datetime.strptime(str(v),"%H:%M").time()
    except Exception:raise UserError(f"{label} inválida: usa HH:MM.")

def money(v,label="Monto"):
    try:f=float(v)
    except (ValueError,TypeError):raise UserError(f"{label}: escribe un número.")
    if not 0<=f<=100000000:raise UserError(f"{label}: debe ser un importe positivo.")
    return round(f,2)

def required(data,fields):
    for x in fields:
        if data.get(x) is None or str(data[x]).strip()=="":raise UserError(f"El campo {x} es obligatorio.")

def trip(db, tid):
    t = row(db, "SELECT * FROM viaje WHERE id_viaje=? AND id_usuario=?", (tid, current_user_id()))
    if not t:
        raise UserError("Viaje no encontrado o no tienes permiso para consultarlo.", 404)
    return t

def trip_for_child(db, table,pk,rid):
    if table=="actividad":
        a=row(db,"SELECT i.id_viaje FROM actividad a JOIN itinerario i ON i.id_itinerario=a.id_itinerario WHERE a.id_actividad=?",(rid,))
    elif table=="presupuesto_categoria":
        a=row(db,"SELECT p.id_viaje FROM presupuesto_categoria c JOIN presupuesto p ON c.id_presupuesto=p.id_presupuesto WHERE c.id_pc=?",(rid,))
    elif table=="preferencia":a=row(db,"SELECT id_viaje FROM preferencia WHERE id_preferencia=?",(rid,))
    else:a=row(db,f"SELECT id_viaje FROM {table} WHERE {pk}=?",(rid,))
    if not a:raise UserError("Registro no encontrado.",404)
    return trip(db,a['id_viaje'])

def owner_trip(db,table,payload):
    if table=="actividad":
        a=row(db,"SELECT id_viaje FROM itinerario WHERE id_itinerario=?",(payload.get("id_itinerario"),))
        if not a:raise UserError("Crea primero un día del itinerario.")
        return trip(db,a['id_viaje'])
    if table=="presupuesto_categoria":
        a=row(db,"SELECT id_viaje FROM presupuesto WHERE id_presupuesto=?",(payload.get("id_presupuesto"),))
        if not a:raise UserError("Primero guarda el presupuesto.")
        return trip(db,a['id_viaje'])
    return trip(db,payload.get("id_viaje"))

def validate_item(db,table,data,existing=None):
    t=owner_trip(db,table,data)
    for k in ["costo","costo_estimado","monto"]:
        if k in data:data[k]=money(data[k],k)
    if table=="hospedaje":
        required(data,["nombre","fecha_entrada","fecha_salida","estado"])
        a=date_value(data['fecha_entrada']);b=date_value(data['fecha_salida'])
        if b<=a:raise UserError("La salida debe ser posterior a la entrada.")
        if not(date_value(t['fecha_inicio'])<=a<=date_value(t['fecha_fin'])):raise UserError("La entrada debe estar dentro del viaje.")
        if b>date_value(t['fecha_fin'])+dt.timedelta(days=1):raise UserError("La salida debe coincidir con el viaje o el día siguiente.")
        if data['estado'] not in ['pendiente','reservado','pagado']:raise UserError("Estado inválido.")
    if table=="transporte":
        required(data,["tipo","origen","destino","fecha_hora_salida"])
        try:
            a=dt.datetime.fromisoformat(data['fecha_hora_salida']);
            if data.get('fecha_hora_llegada') and dt.datetime.fromisoformat(data['fecha_hora_llegada'])<a:raise UserError("La llegada no puede ser anterior a la salida.")
        except ValueError:raise UserError("Fecha y hora inválidas.")
    if table=="itinerario":
        required(data,['fecha']);day=date_value(data['fecha'])
        if not(date_value(t['fecha_inicio'])<=day<=date_value(t['fecha_fin'])):raise UserError("El día debe estar dentro de las fechas del viaje.")
    if table=="actividad":
        required(data,['nombre','hora_inicio','categoria']);time_value(data['hora_inicio'])
        if not 0 < int(data.get('duracion_min',90))<=1440:raise UserError("Duración inválida.")
        if data.get('lugar_id') and not row(db,"SELECT 1 FROM lugar WHERE id_lugar=?",(data['lugar_id'],)):
            raise UserError("Lugar del catálogo no encontrado.")
    if table=="gasto":
        required(data,['concepto','fecha','categoria','moneda']);date_value(data['fecha'])
        if data['moneda'] != (row(db,'SELECT moneda FROM presupuesto WHERE id_viaje=?',(t['id_viaje'],)) or {'moneda':'MXN'})['moneda']:
            raise UserError('La moneda del gasto debe ser la del presupuesto. No convertimos divisas automáticamente.')
        if data.get('id_pagador'):
            payer=row(db,'SELECT id_viaje FROM viajero WHERE id_viajero=?',(data['id_pagador'],))
            if not payer or payer['id_viaje']!=t['id_viaje']:raise UserError('El pagador debe pertenecer al viaje.')
    if table=='viajero':required(data,['nombre'])
    if table=='preferencia':required(data,['categoria'])
    if table=='presupuesto_categoria':required(data,['categoria'])
    return t

def budget_data(db,tid):
    p=row(db,'SELECT * FROM presupuesto WHERE id_viaje=?',(tid,)) or {'id_presupuesto':None,'monto_total':0.0,'moneda':'MXN'}
    real=db.execute('SELECT COALESCE(SUM(monto),0) FROM gasto WHERE id_viaje=?',(tid,)).fetchone()[0]
    planned_h=db.execute('SELECT COALESCE(SUM(costo),0) FROM hospedaje WHERE id_viaje=?',(tid,)).fetchone()[0]
    planned_t=db.execute('SELECT COALESCE(SUM(costo),0) FROM transporte WHERE id_viaje=?',(tid,)).fetchone()[0]
    planned_a=db.execute('SELECT COALESCE(SUM(a.costo_estimado),0) FROM actividad a JOIN itinerario i ON i.id_itinerario=a.id_itinerario WHERE i.id_viaje=? AND a.estado!=\'cancelada\'',(tid,)).fetchone()[0]
    total=round(planned_h+planned_t+planned_a,2)
    return {'presupuesto':p,'gasto_real':round(real,2),'saldo':round(p['monto_total']-real,2),
            'porcentaje':round(real/p['monto_total']*100,1) if p['monto_total'] else 0,
            'estimado_hospedaje':round(planned_h,2),'estimado_transporte':round(planned_t,2),
            'estimado_actividades':round(planned_a,2),'estimado_total':total,
            'categorias':rows(db,'SELECT * FROM presupuesto_categoria WHERE id_presupuesto=?',(p['id_presupuesto'],)) if p['id_presupuesto'] else [],
            'gastado_categorias':rows(db,'SELECT categoria,SUM(monto) total FROM gasto WHERE id_viaje=? GROUP BY categoria',(tid,))}

def check_warnings(t,days, bud, expenses):
    warnings=[]
    if bud['presupuesto']['monto_total']>0 and bud['saldo']<0:
        warnings.append({'level':'danger','text':f"Los gastos reales superan el presupuesto por ${-bud['saldo']:,.0f} MXN."})
    if bud['presupuesto']['monto_total']>0 and bud['estimado_total']>bud['presupuesto']['monto_total']:
        warnings.append({'level':'warn','text':'Los costos previstos de hospedaje, transporte y actividades superan el presupuesto.'})
    for d in days:
        active=sorted([a for a in d['actividades'] if a['estado']!='cancelada'],key=lambda a:a['hora_inicio'])
        for a,b in zip(active,active[1:]):
            am=int(a['hora_inicio'][:2])*60+int(a['hora_inicio'][3:5])+a['duracion_min']
            bm=int(b['hora_inicio'][:2])*60+int(b['hora_inicio'][3:5])
            if am>bm: warnings.append({'level':'warn','text':f"Actividades encimadas el {d['fecha']}: {a['nombre']} y {b['nombre']}."})
    return warnings

def detail(db,tid):
    t=trip(db,tid)
    days=rows(db,'SELECT * FROM itinerario WHERE id_viaje=? ORDER BY fecha',(tid,))
    for d in days:
        d['actividades']=rows(db,"""SELECT a.*,l.imagen,l.interior,l.lat,l.lon,l.descripcion AS descripcion_lugar
                    FROM actividad a LEFT JOIN lugar l ON l.id_lugar=a.lugar_id
                    WHERE a.id_itinerario=? ORDER BY a.hora_inicio""",(d['id_itinerario'],))
    b=budget_data(db,tid)
    expenses=rows(db,'SELECT g.*,v.nombre AS pagador FROM gasto g LEFT JOIN viajero v ON v.id_viajero=g.id_pagador WHERE g.id_viaje=? ORDER BY g.fecha DESC,g.id_gasto DESC',(tid,))
    travelers=rows(db,'SELECT * FROM viajero WHERE id_viaje=? ORDER BY id_viajero',(tid,))
    votos=rows(db,"""SELECT v.id_lugar, l.nombre AS lugar, SUM(CASE WHEN v.decision=1 THEN 1 ELSE 0 END) si, SUM(CASE WHEN v.decision=-1 THEN 1 ELSE 0 END) no
          FROM voto v JOIN viajero t ON v.id_viajero=t.id_viajero JOIN lugar l ON v.id_lugar=l.id_lugar WHERE t.id_viaje=? GROUP BY v.id_lugar, l.nombre""",(tid,))
    split={q['nombre']:{'pagado':0.0,'parte':0.0,'saldo':0.0} for q in travelers}
    for ex in expenses:
        if ex['compartido'] and ex['id_pagador'] is not None and travelers:
            share=ex['monto']/len(travelers)
            for q in travelers:split[q['nombre']]['parte']+=share
            payer=next((q for q in travelers if q['id_viajero']==ex['id_pagador']),None)
            if payer:split[payer['nombre']]['pagado']+=ex['monto']
    for x in split.values():
        x['pagado']=round(x['pagado'],2);x['parte']=round(x['parte'],2);x['saldo']=round(x['pagado']-x['parte'],2)
    return {'viaje':t,'dias':days,'hospedajes':rows(db,'SELECT * FROM hospedaje WHERE id_viaje=?',(tid,)),
            'transportes':rows(db,'SELECT * FROM transporte WHERE id_viaje=?',(tid,)),
            'presupuesto':b,'gastos':expenses,'viajeros':travelers,
            'preferencias':[x['categoria'] for x in rows(db,'SELECT categoria FROM preferencia WHERE id_viaje=?',(tid,))],
            'votos':votos,'reparto':split,'escenarios':rows(db,'SELECT * FROM escenario_viaje WHERE id_viaje=? ORDER BY id_escenario DESC',(tid,)),
            'alertas':check_warnings(t,days,b,expenses)}

def create_trip(db, p):
    required(p, ['nombre','destino','fecha_inicio','fecha_fin'])
    if p['destino'] not in DESTINOS: raise UserError('Selecciona una de las 32 entidades federativas disponibles.')
    if date_value(p['fecha_fin']) < date_value(p['fecha_inicio']): raise UserError('La fecha de finalización no puede ser anterior a la de inicio.')
    count = int(p.get('num_viajeros', 1))
    if not 1 <= count <= 100: raise UserError('El número de viajeros debe estar entre 1 y 100.')
    cur = db.execute('INSERT INTO viaje(id_usuario,nombre,destino,fecha_inicio,fecha_fin,num_viajeros,notas) VALUES (?,?,?,?,?,?,?)',
        (current_user_id(), p['nombre'].strip(), p['destino'], p['fecha_inicio'], p['fecha_fin'], count, p.get('notas','')))
    tid = cur.lastrowid
    db.execute('INSERT INTO presupuesto(id_viaje,monto_total,moneda) VALUES (?,?,?)', (tid, money(p.get('presupuesto',0)), 'MXN'))
    return tid

def recommend(db, tid, for_rain=False):
    t = trip(db, tid)
    data = rows(db, 'SELECT * FROM lugar WHERE ciudad=?', (t['destino'],))
    prefs = {x['categoria'] for x in rows(db, 'SELECT categoria FROM preferencia WHERE id_viaje=?', (tid,))}
    data.sort(key=lambda l: (-int(l['interior']) if for_rain else -int(l['categoria'] in prefs), -int(l['categoria'] in prefs), l['precio_estimado'], l['nombre']))
    for l in data:
        l['motivo'] = ('Bajo techo · Plan B ante lluvia' if for_rain and l['interior'] else 'Coincide con tus intereses' if l['categoria'] in prefs else 'Opción del catálogo')
        l['imagen_url'] = l['imagen']
    return data

def planb_preview(db,activity_id,reason):
    a=row(db,"""SELECT a.*,i.id_viaje,l.interior AS lugar_interior
                     FROM actividad a JOIN itinerario i ON a.id_itinerario=i.id_itinerario
                     LEFT JOIN lugar l ON l.id_lugar=a.lugar_id
                     WHERE a.id_actividad=?""",(activity_id,))
    if not a:raise UserError('Actividad no encontrada.',404)
    t=trip(db,a['id_viaje'])
    options=recommend(db,t['id_viaje'],reason=='lluvia')
    options=[x for x in options if x['id_lugar']!=a['lugar_id'] and (reason!='lluvia' or x['interior'])]
    for x in options:x['diferencia']=round(x['precio_estimado']-a['costo_estimado'],2)
    return {'actividad':a,'motivo':reason,'opciones':options[:8]}

def apply_planb(db,p):
    required(p,['actividad_id','lugar_id','motivo'])
    v=planb_preview(db,int(p['actividad_id']),str(p['motivo']))
    chosen=next((x for x in v['opciones'] if x['id_lugar']==p['lugar_id']),None)
    if not chosen:raise UserError('La alternativa elegida no está disponible en el catálogo filtrado.')
    a=v['actividad'];old=a['costo_estimado'];tid=a['id_viaje']
    db.execute("UPDATE actividad SET nombre=?, lugar=?, costo_estimado=?, duracion_min=?, categoria=?, lugar_id=? WHERE id_actividad=?",
               (chosen['nombre'],chosen['nombre'],chosen['precio_estimado'],chosen['duracion_min'],chosen['categoria'],chosen['id_lugar'],a['id_actividad']))
    db.execute("INSERT INTO alternativa_actividad(id_actividad,id_lugar,motivo,fecha_propuesta,aplicada) VALUES (?,?,?,?,1)",
               (a['id_actividad'],chosen['id_lugar'],p['motivo'],now()))
    db.execute('INSERT INTO escenario_viaje(id_viaje,descripcion,impacto_estimado,creado) VALUES (?,?,?,?)',
               (tid,f"Cambio por {p['motivo']}: {a['nombre']} → {chosen['nombre']}",round(chosen['precio_estimado']-old,2),now()))
    return {'mensaje':'Plan B aplicado al itinerario.','diferencia':round(chosen['precio_estimado']-old,2)}



app = Flask(__name__, static_folder=None)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
if IS_HOSTED and not os.environ.get('SECRET_KEY'):
    raise RuntimeError('Configura SECRET_KEY en las variables del servicio antes de publicar.')

app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'local-only-change-this-secret-before-deploying'),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=IS_HOSTED,
    PERMANENT_SESSION_LIFETIME=dt.timedelta(days=14),
    MAX_CONTENT_LENGTH=200_000,
)


def current_user_id():
    return getattr(g, 'user_id', None)


@app.before_request
def load_account_and_protect_api():
    g.user_id = session.get('user_id')
    if request.path.startswith('/api/'):
        public = request.path in ('/api/estado', '/api/login', '/api/register')
        if not public and not g.user_id:
            return jsonify({'error': 'Inicia sesión para continuar.'}), 401
        if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            expected = session.get('csrf_token', '')
            supplied = request.headers.get('X-CSRF-Token', '')
            if not expected or not secrets.compare_digest(expected, supplied):
                return jsonify({'error': 'La sesión de seguridad venció. Recarga la página e inténtalo de nuevo.'}), 403


@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    return response


@app.errorhandler(UserError)
def handle_user_error(error):
    return jsonify({'error': str(error)}), error.status


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    app.logger.exception('TravelPlanner error: %s', error)
    return jsonify({'error': 'Ocurrió un error inesperado. Revisa los registros del servidor.'}), 500


@app.get('/health')
def health():
    return jsonify({'ok': True, 'database': 'postgresql' if DATABASE_URL else 'sqlite-local'})


@app.get('/')
def index():
    return send_from_directory(STATIC, 'index.html')


@app.get('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(STATIC, filename)


@app.get('/api/estado')
def api_estado():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_urlsafe(32)
    return jsonify({'autenticado': bool(session.get('user_id')), 'csrf': session['csrf_token'], 'modo': 'online' if DATABASE_URL else 'local'})


def login_user(user):
    session.clear()
    session['user_id'] = int(user['id_usuario'])
    session['user_name'] = user['nombre']
    session['csrf_token'] = secrets.token_urlsafe(32)
    session.permanent = True
    return {'ok': True, 'csrf': session['csrf_token'], 'nombre': user['nombre']}


@app.post('/api/register')
def api_register():
    p = request.get_json(silent=True) or {}
    nombre = str(p.get('nombre','')).strip()
    email = str(p.get('email','')).strip().lower()
    password = str(p.get('password',''))
    if len(nombre) < 2 or len(nombre) > 100:
        raise UserError('Escribe tu nombre (de 2 a 100 caracteres).')
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or len(email) > 180:
        raise UserError('Escribe un correo electrónico válido.')
    if len(password) < 10:
        raise UserError('La contraseña debe tener al menos 10 caracteres.')
    with connect() as db:
        if row(db, 'SELECT id_usuario FROM usuario WHERE email=?', (email,)):
            raise UserError('Ya existe una cuenta con ese correo. Inicia sesión.')
        cur = db.execute('INSERT INTO usuario(nombre,email,password_hash,creado) VALUES (?,?,?,?)',
                         (nombre, email, generate_password_hash(password), now()))
        user = {'id_usuario': cur.lastrowid, 'nombre': nombre}
    return jsonify(login_user(user)), 201


@app.post('/api/login')
def api_login():
    p = request.get_json(silent=True) or {}
    email = str(p.get('email','')).strip().lower()
    password = str(p.get('password',''))
    with connect() as db:
        user = row(db, 'SELECT * FROM usuario WHERE email=?', (email,))
    if not user or not check_password_hash(user['password_hash'], password):
        raise UserError('Correo o contraseña incorrectos.', 401)
    return jsonify(login_user(user))


@app.post('/api/logout')
def api_logout():
    session.clear()
    return jsonify({'ok': True})


@app.route('/api/<path:subpath>', methods=['GET','POST','PUT','DELETE'])
def api_router(subpath):
    path = '/api/' + subpath
    method = request.method
    qs = request.args
    p = request.get_json(silent=True) or {}

    if path == '/api/recomendaciones-municipio' and method == 'GET':
        # Solo fichas municipales con fuente pública revisada. No se infiere
        # pertenencia a un municipio usando únicamente el campo estatal.
        estado = qs.get('estado', 'Veracruz')[:80]
        municipio = qs.get('municipio', 'Catemaco')[:100]
        actividad = qs.get('actividad', 'Naturaleza')[:50]
        interes = qs.get('interes', 'Todas')[:70]
        lugares = recomendar(estado, municipio, actividad, interes)
        return jsonify({
            'lugares': lugares,
            'estados': list(DESTINOS.keys()),
            'municipios': MUNICIPIOS_CON_COBERTURA,
            'actividades': ACTIVIDADES_CON_COBERTURA,
            'preferencias': PREFERENCIAS_NATURALEZA,
            'total': len(lugares),
            'cobertura': 'Catemaco, Veracruz · Naturaleza (catálogo piloto documentado)',
            'criterios': {'coincidencia_actividad': 40,'municipio':25,
                'afinidad_interes':15,'respaldo_fuente':15,'ficha':5},
            'aviso': ('Puntaje de pertinencia 0–100, NO ranking por visitantes, '
                'reseñas, seguridad, precio o popularidad. En otras combinaciones '
                'se mostrarán resultados cuando haya fichas municipales revisadas.'),
        })

    if path == '/api/experiencias' and method == 'GET':
        # Catálogo de referencia, sin afirmar que existe disponibilidad en vivo.
        estado = qs.get('estado', 'Veracruz')
        actividad = qs.get('actividad', 'Pescar')
        if estado != 'Veracruz' or actividad != 'Pescar':
            return jsonify({'experiencias': [], 'actividad': actividad,
                            'estado': estado, 'nota': 'Esta combinación aún no tiene fichas verificadas.'})
        return jsonify({'experiencias': EXPERIENCIAS_VERACRUZ, 'actividad': actividad,
                        'estado': estado, 'permiso_url': PERMISOS,
                        'directorio_url': DIR_CONAPESCA,
                        'nota': 'Zonas de consulta, no salidas contratadas. No hay disponibilidad ni precios en vivo.'})

    if path == '/api/catalogo' and method == 'GET':
        city = qs.get('ciudad','')
        with connect() as db:
            data = rows(db, 'SELECT * FROM lugar WHERE ciudad=? ORDER BY categoria,nombre', (city,)) if city else rows(db, 'SELECT * FROM lugar ORDER BY ciudad,categoria,nombre')
        for item in data:
            verified = curated_first(item['id_lugar'])
            if verified:
                item.update({key: verified[key] for key in ('imagen','credito','licencia','fuente')})
            item['imagen_url'] = item['imagen']
            item['foto_pendiente'] = (item['imagen'] == PHOTO_PLACEHOLDER or str(item['imagen']).endswith('photo-placeholder.svg'))
        return jsonify({'lugares': data, 'destinos': list(DESTINOS.keys()), 'cobertura_entidades': len(DESTINOS)})

    if path == '/api/preferencias' and method == 'GET':
        tid = qs.get('viaje','')
        with connect() as db:
            trip(db, tid)
            return jsonify({'items': rows(db, 'SELECT * FROM preferencia WHERE id_viaje=?', (tid,))})

    if path == '/api/viajes' and method == 'GET':
        with connect() as db:
            alltrips = rows(db, 'SELECT * FROM viaje WHERE id_usuario=? ORDER BY id_viaje DESC', (current_user_id(),))
            for t in alltrips: t['resumen'] = budget_data(db, t['id_viaje'])
        return jsonify({'viajes': alltrips})

    if path == '/api/viajes' and method == 'POST':
        with connect() as db: tid = create_trip(db, p)
        return jsonify({'id_viaje': tid}), 201

    bits = path.strip('/').split('/')

    if len(bits) == 4 and bits[:3] == ['api', 'catalogo', 'galeria'] and method == 'GET':
        with connect() as db:
            return jsonify(gallery_for_place(db, bits[3]))

    if len(bits) == 4 and bits[:3] == ['api', 'catalogo', 'foto'] and method == 'GET':
        with connect() as db:
            return jsonify(commons_photo_for_place(db, bits[3]))

    if len(bits) == 4 and bits[:2] == ['api', 'viajes'] and bits[2].isdigit() and bits[3] == 'lugares' and method == 'POST':
        vid = int(bits[2])
        required(p, ['id_lugar'])
        with connect() as db:
            t = trip(db, vid)
            place = row(db, 'SELECT * FROM lugar WHERE id_lugar=?', (p['id_lugar'],))
            if not place:
                raise UserError('El lugar ya no está disponible en el catálogo.', 404)
            if place['ciudad'] != t['destino']:
                raise UserError('El lugar debe pertenecer al destino del viaje seleccionado.')
            chosen_time = str(p.get('hora_inicio', '10:00'))
            time_value(chosen_time, 'Hora de actividad')
            day_date = p.get('fecha') or t['fecha_inicio']
            parsed = date_value(day_date, 'Fecha de actividad')
            if not (date_value(t['fecha_inicio']) <= parsed <= date_value(t['fecha_fin'])):
                raise UserError('La fecha elegida debe estar dentro del viaje.')
            if str(place['id_lugar']).startswith('exp22_'):
                repeated = row(db, '''SELECT a.id_actividad FROM actividad a
                    JOIN itinerario i ON i.id_itinerario=a.id_itinerario
                    WHERE i.id_viaje=? AND i.fecha=? AND a.lugar_id=?
                          AND a.hora_inicio=? AND a.estado!='cancelada' ''',
                    (vid, day_date, place['id_lugar'], chosen_time))
                if repeated:
                    raise UserError('Esta experiencia ya está añadida a esa hora. Elige otra fecha u horario.', 409)
            day = row(db, 'SELECT * FROM itinerario WHERE id_viaje=? AND fecha=?', (vid, day_date))
            if not day:
                cur_day = db.execute('INSERT INTO itinerario(id_viaje,fecha,titulo,descripcion) VALUES (?,?,?,?)',
                                     (vid, day_date, 'Día de exploración', 'Lugares agregados desde Explorar México.'))
                day_id = cur_day.lastrowid
            else:
                day_id = day['id_itinerario']
            cur_activity = db.execute('''INSERT INTO actividad
                (id_itinerario,nombre,hora_inicio,duracion_min,lugar,costo_estimado,categoria,lugar_id,estado)
                VALUES (?,?,?,?,?,?,?,?,?)''',
                (day_id, place['nombre'], chosen_time, place['duracion_min'],
                 place['nombre'], place['precio_estimado'], place['categoria'], place['id_lugar'], 'planeada'))
            return jsonify({'ok': True, 'id_actividad': cur_activity.lastrowid, 'id_itinerario': day_id}), 201

    if len(bits) >= 3 and bits[:2] == ['api','viajes'] and bits[2].isdigit():
        vid = int(bits[2])
        with connect() as db:
            if len(bits) == 3 and method == 'GET': return jsonify(detail(db, vid))
            if len(bits) == 3 and method == 'DELETE':
                trip(db, vid)
                db.execute('DELETE FROM viaje WHERE id_viaje=? AND id_usuario=?', (vid, current_user_id()))
                return jsonify({'ok': True})
            if len(bits) == 3 and method == 'PUT':
                old = trip(db, vid); merged = {**old, **p}
                required(merged, ['nombre','destino','fecha_inicio','fecha_fin'])
                if merged['destino'] not in DESTINOS: raise UserError('Destino no disponible.')
                if date_value(merged['fecha_fin']) < date_value(merged['fecha_inicio']): raise UserError('Fechas invertidas.')
                count = int(merged['num_viajeros'])
                if count <= 0: raise UserError('Debes tener al menos un viajero.')
                db.execute('UPDATE viaje SET nombre=?,destino=?,fecha_inicio=?,fecha_fin=?,num_viajeros=?,notas=? WHERE id_viaje=? AND id_usuario=?',
                           (merged['nombre'],merged['destino'],merged['fecha_inicio'],merged['fecha_fin'],count,merged.get('notas',''),vid,current_user_id()))
                return jsonify({'ok': True})
            if len(bits) == 4 and bits[3] == 'recomendaciones' and method == 'GET':
                return jsonify({'lugares': recommend(db, vid, qs.get('lluvia','0') == '1')})
            if len(bits) == 4 and bits[3] == 'ruta' and method == 'GET':
                trip(db, vid)
                day = qs.get('fecha','')
                acts = rows(db, """SELECT a.nombre,a.lugar_id,l.lat,l.lon FROM actividad a
                    JOIN itinerario i ON i.id_itinerario=a.id_itinerario JOIN lugar l ON l.id_lugar=a.lugar_id
                    WHERE i.id_viaje=? AND i.fecha=? AND a.estado!='cancelada'""", (vid,day))
                if acts:
                    ordered=[acts.pop(0)]
                    while acts:
                        here=ordered[-1]
                        j=min(range(len(acts)), key=lambda k:(acts[k]['lat']-here['lat'])**2+(acts[k]['lon']-here['lon'])**2)
                        ordered.append(acts.pop(j))
                else: ordered=[]
                return jsonify({'orden': ordered, 'aviso': 'Orden aproximado por proximidad geográfica; no son rutas, tiempos ni distancias viales.'})

    if path == '/api/presupuesto' and method == 'POST':
        required(p, ['id_viaje','monto_total','moneda'])
        if p['moneda'] != 'MXN': raise UserError('El prototipo calcula pesos mexicanos (MXN).')
        with connect() as db:
            trip(db, p['id_viaje'])
            db.execute('INSERT INTO presupuesto(id_viaje,monto_total,moneda) VALUES (?,?,?) ON CONFLICT(id_viaje) DO UPDATE SET monto_total=excluded.monto_total,moneda=excluded.moneda',
                       (p['id_viaje'], money(p['monto_total']), 'MXN'))
        return jsonify({'ok': True})

    if path == '/api/voto' and method == 'POST':
        required(p, ['id_viajero','id_lugar','decision'])
        if int(p['decision']) not in (-1,1): raise UserError('Voto inválido.')
        with connect() as db:
            traveler = row(db, 'SELECT id_viaje FROM viajero WHERE id_viajero=?', (p['id_viajero'],))
            if not traveler: raise UserError('Viajero desconocido.')
            trip(db, traveler['id_viaje'])
            if not row(db, 'SELECT id_lugar FROM lugar WHERE id_lugar=?', (p['id_lugar'],)): raise UserError('Lugar desconocido.')
            db.execute('INSERT INTO voto(id_viajero,id_lugar,decision) VALUES (?,?,?) ON CONFLICT(id_viajero,id_lugar) DO UPDATE SET decision=excluded.decision',
                       (p['id_viajero'],p['id_lugar'],int(p['decision'])))
        return jsonify({'ok': True})

    if path == '/api/planb' and method == 'POST':
        with connect() as db: return jsonify(planb_preview(db, int(p.get('id_actividad',0)), p.get('motivo','lluvia')))

    if path == '/api/planb/aplicar' and method == 'POST':
        with connect() as db: return jsonify(apply_planb(db, p))

    if path == '/api/exportar' and method == 'GET':
        uid = current_user_id()
        trip_filter = '(SELECT id_viaje FROM viaje WHERE id_usuario=?)'
        with connect() as db:
            content = {
              'usuario': rows(db, 'SELECT id_usuario,nombre,email,creado FROM usuario WHERE id_usuario=?', (uid,)),
              'viaje': rows(db, 'SELECT * FROM viaje WHERE id_usuario=?', (uid,)),
              'hospedaje': rows(db, f'SELECT * FROM hospedaje WHERE id_viaje IN {trip_filter}', (uid,)),
              'transporte': rows(db, f'SELECT * FROM transporte WHERE id_viaje IN {trip_filter}', (uid,)),
              'itinerario': rows(db, f'SELECT * FROM itinerario WHERE id_viaje IN {trip_filter}', (uid,)),
              'actividad': rows(db, f'SELECT a.* FROM actividad a JOIN itinerario i ON i.id_itinerario=a.id_itinerario WHERE i.id_viaje IN {trip_filter}', (uid,)),
              'presupuesto': rows(db, f'SELECT * FROM presupuesto WHERE id_viaje IN {trip_filter}', (uid,)),
              'presupuesto_categoria': rows(db, f'SELECT c.* FROM presupuesto_categoria c JOIN presupuesto p ON p.id_presupuesto=c.id_presupuesto WHERE p.id_viaje IN {trip_filter}', (uid,)),
              'gasto': rows(db, f'SELECT * FROM gasto WHERE id_viaje IN {trip_filter}', (uid,)),
              'viajero': rows(db, f'SELECT * FROM viajero WHERE id_viaje IN {trip_filter}', (uid,)),
              'preferencia': rows(db, f'SELECT * FROM preferencia WHERE id_viaje IN {trip_filter}', (uid,)),
              'voto': rows(db, f'SELECT v.* FROM voto v JOIN viajero t ON t.id_viajero=v.id_viajero WHERE t.id_viaje IN {trip_filter}', (uid,)),
              'alternativa_actividad': rows(db, f'SELECT a.* FROM alternativa_actividad a JOIN actividad x ON x.id_actividad=a.id_actividad JOIN itinerario i ON i.id_itinerario=x.id_itinerario WHERE i.id_viaje IN {trip_filter}', (uid,)),
              'escenario_viaje': rows(db, f'SELECT * FROM escenario_viaje WHERE id_viaje IN {trip_filter}', (uid,)),
              'lugar': rows(db, 'SELECT * FROM lugar ORDER BY ciudad,nombre'),
            }
        return jsonify({'version':'2.0','fecha_exportacion':now(),'datos':content})

    if path == '/api/clima' and method == 'GET':
        city = qs.get('ciudad','')
        if city not in DESTINOS: raise UserError('Ciudad no disponible.')
        lat,lon = DESTINOS[city]
        uri = f'https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=precipitation_probability_max,temperature_2m_max&timezone=America%2FMexico_City&forecast_days=7'
        try:
            with urlopen(uri, timeout=4) as response: forecast=json.load(response)
            return jsonify({'fuente':'Open-Meteo','clima':forecast['daily'],'es_pronostico_real':True,'nota':'Pronóstico a corto plazo; no corresponde a viajes fuera del período consultado.'})
        except Exception:
            return jsonify({'fuente':'sin conexion','clima':None,'es_pronostico_real':False,'nota':'No se pudo consultar el pronóstico; Plan B manual sigue disponible.'})

    if len(bits) >= 2 and bits[0] == 'api' and bits[1] in ENTITY:
        table = bits[1]; sqltable, pk, allowed = ENTITY[table]
        rid = int(bits[2]) if len(bits)==3 and bits[2].isdigit() else None
        if method == 'POST' and len(bits)==2:
            data = {k:p[k] for k in allowed if k in p}
            with connect() as db:
                validate_item(db, table, data)
                if table == 'presupuesto_categoria':
                    db.execute('INSERT INTO presupuesto_categoria(id_presupuesto,categoria,monto) VALUES (?,?,?) ON CONFLICT(id_presupuesto,categoria) DO UPDATE SET monto=excluded.monto',
                               (data['id_presupuesto'],data['categoria'],data['monto']))
                    return jsonify({'ok':True}), 201
                keys=list(data.keys())
                if not keys: raise UserError('Campos vacíos.')
                cur=db.execute(f"INSERT INTO {sqltable} ({','.join(keys)}) VALUES ({','.join('?' for _ in keys)})", [data[x] for x in keys])
                return jsonify({'id':cur.lastrowid}), 201
        if rid is not None and method in ('PUT','DELETE'):
            with connect() as db:
                trip_for_child(db, table, pk, rid)
                if method == 'DELETE':
                    db.execute(f'DELETE FROM {sqltable} WHERE {pk}=?', (rid,))
                    return jsonify({'ok':True})
                orig=row(db, f'SELECT * FROM {sqltable} WHERE {pk}=?', (rid,))
                if not orig: raise UserError('Registro no encontrado.',404)
                for key in ('id_viaje','id_itinerario','id_presupuesto'):
                    if key in orig and key in p and str(p[key]) != str(orig[key]):
                        raise UserError('No se puede cambiar el registro a otro viaje.')
                upd={k:p[k] for k in allowed if k in p}
                merged={**orig,**upd}
                validate_item(db, table, merged, orig)
                keys=list(upd.keys())
                if keys: db.execute(f"UPDATE {sqltable} SET {','.join(x+'=?' for x in keys)} WHERE {pk}=?", [merged[x] for x in keys]+[rid])
                return jsonify({'ok':True})

    raise UserError('Función no encontrada.',404)


if IS_HOSTED and not DATABASE_URL:
    raise RuntimeError('Configura DATABASE_URL con la cadena de conexión de Neon PostgreSQL.')

init_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT',8000)), debug=False)
