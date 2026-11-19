"""Pruebas de integración del prototipo web.
Ejecutar: py -m unittest discover -s tests -v
"""
import tempfile
import unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app as tp


class TravelPlannerWebTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        tp.DB_PATH = Path(cls.temp.name) / 'test.sqlite3'
        tp.DATABASE_URL = ''
        tp.init_db()

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.client = tp.app.test_client()
        state = self.client.get('/api/estado').get_json()
        self.csrf = state['csrf']
        response = self.client.post('/api/register', json={
            'nombre': 'Usuario Prueba',
            'email': f'user{self._testMethodName}@example.com',
            'password': 'ClaveSegura2026!'
        }, headers={'X-CSRF-Token': self.csrf})
        self.assertEqual(response.status_code, 201, response.get_json())
        self.csrf = response.get_json()['csrf']

    def headers(self):
        return {'X-CSRF-Token': self.csrf}

    def create_trip(self, budget=12000):
        response = self.client.post('/api/viajes', json={
            'nombre': 'Viaje de prueba', 'destino': 'Oaxaca',
            'fecha_inicio': '2027-04-10', 'fecha_fin': '2027-04-13',
            'num_viajeros': 2, 'presupuesto': budget
        }, headers=self.headers())
        self.assertEqual(response.status_code, 201, response.get_json())
        return response.get_json()['id_viaje']

    def test_catalog_has_12_real_photo_sources_and_credits(self):
        response = self.client.get('/api/catalogo')
        self.assertEqual(response.status_code, 200)
        places = response.get_json()['lugares']
        self.assertEqual(len(places), 12)
        self.assertTrue(all(p['imagen'].startswith(('https://upload.wikimedia.org/', '/static/img/real/')) for p in places))
        self.assertTrue(all(p['credito'] and p['licencia'] and p['fuente'] for p in places))

    def test_create_trip_and_budget_calculation(self):
        tid = self.create_trip(12000)
        response = self.client.post('/api/gasto', json={
            'id_viaje': tid, 'concepto': 'Comida', 'monto': 7400,
            'moneda': 'MXN', 'fecha': '2027-04-10', 'categoria': 'Comida',
            'metodo_pago': 'Efectivo', 'compartido': 0
        }, headers=self.headers())
        self.assertEqual(response.status_code, 201, response.get_json())
        detail = self.client.get(f'/api/viajes/{tid}').get_json()
        self.assertEqual(detail['presupuesto']['gasto_real'], 7400)
        self.assertEqual(detail['presupuesto']['saldo'], 4600)

    def test_account_isolation(self):
        tid = self.create_trip()
        second = tp.app.test_client()
        csrf = second.get('/api/estado').get_json()['csrf']
        reg = second.post('/api/register', json={
            'nombre': 'Otra Cuenta', 'email': 'otra-cuenta@example.com',
            'password': 'OtraClaveSegura2026!'
        }, headers={'X-CSRF-Token': csrf})
        self.assertEqual(reg.status_code, 201)
        self.assertEqual(second.get('/api/viajes').get_json()['viajes'], [])
        self.assertEqual(second.get(f'/api/viajes/{tid}').status_code, 404)

    def test_csrf_is_required_for_changes(self):
        response = self.client.post('/api/viajes', json={
            'nombre': 'Sin CSRF', 'destino': 'Oaxaca',
            'fecha_inicio': '2027-04-10', 'fecha_fin': '2027-04-13'
        })
        self.assertEqual(response.status_code, 403)

    def test_planb_returns_indoor_alternatives_for_rain(self):
        tid = self.create_trip()
        day = self.client.post('/api/itinerario', json={
            'id_viaje': tid, 'fecha': '2027-04-10', 'titulo': 'Día 1'
        }, headers=self.headers())
        self.assertEqual(day.status_code, 201, day.get_json())
        activity = self.client.post('/api/actividad', json={
            'id_itinerario': day.get_json()['id'], 'nombre': 'Paseo exterior',
            'hora_inicio': '10:00', 'duracion_min': 90, 'categoria': 'Naturaleza',
            'costo_estimado': 200, 'lugar': 'Oaxaca'
        }, headers=self.headers())
        self.assertEqual(activity.status_code, 201, activity.get_json())
        result = self.client.post('/api/planb', json={
            'id_actividad': activity.get_json()['id'], 'motivo': 'lluvia'
        }, headers=self.headers())
        self.assertEqual(result.status_code, 200, result.get_json())
        self.assertTrue(result.get_json()['opciones'])
        self.assertTrue(all(x['interior'] == 1 for x in result.get_json()['opciones']))


if __name__ == '__main__':
    unittest.main(verbosity=2)
