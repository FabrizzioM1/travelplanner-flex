"""Descarga las 12 fotografías seleccionadas desde Wikimedia Commons.
Ejecutar: py descargar_fotos.py
"""
from pathlib import Path
from urllib.request import Request, urlopen
import json

ROOT = Path(__file__).resolve().parent
SOURCES = ROOT / 'docs' / 'photo_sources.json'
DEST = ROOT / 'static' / 'img' / 'real'
DEST.mkdir(parents=True, exist_ok=True)
items = json.loads(SOURCES.read_text(encoding='utf-8'))

ok = 0
for item in items:
    target = DEST / f"{item['id']}.jpg"
    if target.exists() and target.stat().st_size > 10_000:
        print(f"[YA EXISTE] {item['name']}")
        ok += 1
        continue
    try:
        req = Request(item['url'], headers={'User-Agent': 'TravelPlannerFlex/1.0 (educational project; photo attribution in app)'})
        with urlopen(req, timeout=40) as response:
            content_type = response.headers.get('Content-Type', '')
            data = response.read(25_000_001)
        if not content_type.startswith('image/'):
            raise RuntimeError(f"La fuente no devolvió una imagen ({content_type or 'sin tipo'}).")
        if len(data) > 25_000_000:
            raise RuntimeError('La imagen supera el límite de 25 MB.')
        if len(data) < 5_000:
            raise RuntimeError('La descarga parece incompleta.')
        target.write_bytes(data)
        print(f"[OK] {item['name']} · {len(data)//1024} KB")
        ok += 1
    except Exception as exc:
        print(f"[ERROR] {item['name']}: {exc}")

print(f"\nDescargas disponibles: {ok}/{len(items)}")
print('Reinicia TravelPlanner para que use las copias locales descargadas.')
print('Conserva docs/CREDITOS_FOTOGRAFIAS.md junto con las imágenes.')
