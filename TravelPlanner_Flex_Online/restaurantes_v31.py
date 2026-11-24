"""Búsqueda opcional y acotada de establecimientos de comida documentados en OSM.

La tarifa asignada es un rango presupuestal genérico por tipo de establecimiento,
NO un precio del restaurante. No modifica tablas ni cuentas; resultados con caché
por proceso para reducir solicitudes a un servidor comunitario compartido.
"""
from __future__ import annotations
import json
import math
import threading
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from flask import request, jsonify

CACHE: dict[str,tuple[float,list[dict],str]] = {}
LOCK = threading.Lock()
ENDPOINT = 'https://overpass-api.de/api/interpreter'


def nearby_food(lat:float,lon:float) -> list[dict]:
    query = f'''[out:json][timeout:8];
    nwr["amenity"~"^(restaurant|cafe|fast_food)$"]["name"](around:5000,{lat:.5f},{lon:.5f});
    out center 60;'''
    req = Request(
        ENDPOINT, data=urlencode({'data':query}).encode('utf-8'),
        headers={'User-Agent':'TravelPlannerFlex/3.1 (educational travel planning prototype)',
                 'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
        method='POST',
    )
    with urlopen(req,timeout=9) as response:
        payload=json.load(response)
    seen=set()
    results=[]
    for x in payload.get('elements',[]):
        tags=x.get('tags',{})
        name=str(tags.get('name','')).strip()[:125]
        if not name or name.casefold() in seen:continue
        amenity=tags.get('amenity','restaurant')
        if amenity not in ('restaurant','cafe','fast_food'):continue
        coords=x.get('center') or x
        if 'lat' not in coords or 'lon' not in coords:continue
        seen.add(name.casefold())
        low,high={'restaurant':(170,450),'cafe':(65,210),'fast_food':(75,220)}[amenity]
        results.append({'nombre':name,'tipo':amenity,'lat':coords['lat'],'lon':coords['lon'],
                        'cocina':str(tags.get('cuisine','')).replace(';',', ')[:85],
                        'direccion':str(tags.get('addr:street',''))[:85],
                        'min':low,'max':high,
                        'fuente':f'https://www.openstreetmap.org/{x.get("type","node")}/{x.get("id",0)}',
                        'referencia':'Rango general del tipo de establecimiento; NO precio del menú'})
        if len(results)>=12:break
    return results


def register_restaurants(app,destinos:dict):
    @app.get('/api/opciones/restaurantes')
    def api_food_options():
        dest=request.args.get('destino','')
        try:
            lat=float(request.args['lat']) if 'lat' in request.args else None
            lon=float(request.args['lon']) if 'lon' in request.args else None
            if (lat is None)!=(lon is None):raise ValueError()
            if lat is not None and not (math.isfinite(lat) and math.isfinite(lon) and 14.0<=lat<=33.0 and -118.0<=lon<=-86.0):raise ValueError()
        except (ValueError,TypeError):
            return jsonify({'error':'Coordenadas inválidas para México.'}),400
        if dest not in destinos:
            return jsonify({'error':'Destino no reconocido.'}),400
        key=(dest, round(lat,3),round(lon,3)) if lat is not None else (dest,None,None)
        with LOCK:
            cached=CACHE.get(key)
            if cached and cached[0]>time.monotonic():
                return jsonify({'resultados':cached[1],'fuente':'OpenStreetMap / Overpass (caché)',
                                'aviso':cached[2]})
        try:
            places=nearby_food(lat,lon) if lat is not None else nearby_food(*destinos[dest])
            note=('Puntos de comida cercanos a la actividad seleccionada. ' if lat is not None else 'Puntos de comida cercanos a la ubicación de referencia del estado. ')
            note += ('La cobertura y vigencia de los nombres puede variar; NO se consultan menús, tarifas ni disponibilidad. '
                     'Comprueba los datos en la ficha del establecimiento.')
            ttl=12*3600
        except Exception:
            places=[]
            note=('No fue posible consultar OpenStreetMap en este momento. '
                  'Puedes usar las zonas gastronómicas del catálogo y comprobar restaurantes en Maps.')
            ttl=15*60
        with LOCK: CACHE[key]=(time.monotonic()+ttl,places,note)
        return jsonify({'resultados':places,'fuente':'OpenStreetMap / Overpass','aviso':note})
