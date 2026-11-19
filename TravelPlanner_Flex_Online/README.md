# TravelPlanner Flex Online

Aplicación web responsiva para PC y celular. Backend Python/Flask, SQLite en desarrollo local y PostgreSQL al publicarse en Railway.

## Qué incluye

- Registro e inicio de sesión con contraseña cifrada (hash); cada cuenta solo consulta sus propios viajes.
- Catálogo de 12 lugares de Oaxaca, Veracruz y Puebla con fotografías reales seleccionadas de Wikimedia Commons, crédito, licencia y fuente.
- Descarga opcional de las fotos a `static/img/real/` para servirlas desde el propio sitio.
- Viajes, hospedaje, transporte, itinerario, actividades, presupuesto, gastos, viajeros, votaciones y reparto igualitario de gastos compartidos.
- Plan B por lluvia, cancelación o presupuesto: propone alternativas del catálogo y solo cambia el itinerario cuando el usuario confirma.
- Detección de actividades con horarios encimados, alertas de presupuesto y exportación JSON.
- Interfaz adaptable: navegación lateral en PC y barra inferior en celular.
- Barra de planificación inferior con destino, fechas, presupuesto, gastos y actividades.

## 1. Requisitos

- Python 3.10 o superior.
- Visual Studio Code (opcional, recomendado para editar).
- Conexión a Internet para instalar paquetes y cargar/descargar fotografías.

## 2. Ejecutar localmente en Windows

1. Extrae el ZIP.
2. Abre la carpeta `TravelPlanner_Flex_Online` en Visual Studio Code o en el Explorador de archivos.
3. Haz doble clic en `iniciar_local.bat`.
   - La primera vez crea `.venv` e instala Flask y psycopg (Gunicorn se reserva para Railway).
   - Para hacerlo manualmente, abre la terminal dentro de la carpeta y ejecuta:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   py -m pip install -r requirements-local.txt
   py app.py
   ```

4. Abre `http://127.0.0.1:8000`.
5. Crea tu cuenta desde la pantalla de inicio. Ya no existe el PIN general 1234.

En local, si no existe `DATABASE_URL`, el programa crea `data/travelplanner.sqlite3` automáticamente.

### Probar desde un celular en la misma Wi-Fi (solo red local)

El servidor local escucha en `0.0.0.0:8000`. Averigua la IPv4 de tu computadora con `ipconfig` y abre `http://IP-DE-TU-PC:8000` en el teléfono. La computadora debe permanecer encendida. Para acceder desde cualquier lugar, publica la app en Railway siguiendo la sección 4.

## 3. Fotografías reales seleccionadas

Las imágenes se muestran inicialmente desde Wikimedia Commons con conexión a Internet. Para guardar una copia local dentro del proyecto:

```powershell
py descargar_fotos.py
```

El script descarga las 12 fotografías a `static/img/real/`. Al reiniciar la aplicación, el catálogo usa automáticamente las copias locales disponibles; si alguna descarga falla, mantiene la imagen remota. Revisa y conserva `docs/CREDITOS_FOTOGRAFIAS.md`.

Si quieres que Railway sirva las fotografías desde tu propio sitio, ejecuta el script, comprueba que haya descargado las imágenes y sube la carpeta `static/img/real/` al repositorio GitHub. No elimines el archivo de créditos.

## 4. Publicar en Railway y obtener un enlace para PC y celular

No se puede crear el enlace público desde este paquete: debes publicarlo desde tu propia cuenta de Railway y conectar el repositorio. Después Railway genera el dominio HTTPS.

### A. Subir el proyecto a GitHub

1. Crea una cuenta o inicia sesión en GitHub.
2. Crea un repositorio nuevo, por ejemplo `travelplanner-flex`.
3. Sube el contenido de esta carpeta, incluyendo `app.py`, `static/`, `requirements.txt`, `Procfile`, `docs/` y `descargar_fotos.py`.
4. No subas `.env`, `.venv/` ni `data/travelplanner.sqlite3`. El `.gitignore` ya excluye esos elementos.
5. Si descargaste fotos locales, sí sube `static/img/real/*.jpg`.

### B. Crear el proyecto en Railway

1. Entra a [Railway](https://railway.com/) e inicia sesión.
2. Selecciona **New Project → Deploy from GitHub Repo**.
3. Autoriza GitHub si lo solicita y elige `travelplanner-flex`.
4. Railway detectará Python e instalará las dependencias de `requirements.txt`. El `Procfile` incluye el comando de inicio como referencia; también lo configurarás en el panel.

### C. Agregar PostgreSQL

1. Dentro del mismo proyecto de Railway, selecciona **New → Database → PostgreSQL**.
2. Espera a que la base de datos termine de desplegarse.
3. Abre el servicio web de TravelPlanner y entra a **Variables**.
4. Agrega una variable de referencia llamada `DATABASE_URL` que apunte a la variable `DATABASE_URL` del servicio PostgreSQL. Si el servicio de base de datos se llama `Postgres`, la referencia suele mostrarse como:

   ```text
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```

   Es preferible elegirla desde el selector de variables de Railway para evitar errores con el nombre del servicio.

### D. Crear una clave secreta

En una terminal local ejecuta:

```powershell
py -c "import secrets; print(secrets.token_urlsafe(48))"
```

Copia el resultado y agrégalo en las variables del servicio web como:

```text
SECRET_KEY=PEGA_AQUI_EL_VALOR_GENERADO
```

No publiques esta clave ni la incluyas en GitHub. La aplicación no arranca en Railway si falta `SECRET_KEY` o `DATABASE_URL`.

### E. Configurar el comando de inicio y publicar

En Settings del servicio web, verifica que el Start Command sea:

```text
gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120
```

El `Procfile` ya contiene ese comando. Opcionalmente, configura Healthcheck Path como `/health` en los ajustes de despliegue.

Cuando las variables estén listas, aplica los cambios y espera a que termine el despliegue. La aplicación crea las tablas y carga el catálogo de lugares al iniciar.

### F. Generar el enlace público

1. Abre **Settings → Networking → Public Networking** en el servicio web.
2. Selecciona **Generate Domain**.
3. Railway creará una dirección `*.up.railway.app` con HTTPS.
4. Abre esa dirección en Chrome en tu computadora y registra una cuenta.
5. Abre exactamente la misma dirección en el celular e inicia sesión con la misma cuenta.

Los viajes se guardan en PostgreSQL y se sincronizan porque ambos dispositivos consultan la misma cuenta y base de datos.

## 5. Cómo funciona la aplicación

1. Crear una cuenta e iniciar sesión.
2. Crear un viaje, elegir destino, fechas, número de viajeros y presupuesto.
3. Abrir **Descubrir lugares** para ver fotos reales, categorías, descripción y costo orientativo.
4. Consultar **Detalles** para revisar el autor, licencia y fuente de cada fotografía.
5. Agregar lugares al itinerario, crear días, actividades, hospedaje y transporte.
6. Registrar gastos reales por separado de los costos estimados.
7. Usar **Plan B** para ver opciones alternativas. La aplicación no cambia el plan hasta que el usuario selecciona y confirma una opción.
8. Exportar una copia JSON desde Configuración.

## 6. Límites y advertencias

- Los precios y tiempos de visita del catálogo son valores de demostración, no tarifas oficiales.
- El pronóstico se consulta con Open-Meteo cuando hay conexión y disponibilidad; es un pronóstico limitado, no una garantía para fechas lejanas.
- La ruta sugerida ordena puntos por proximidad aproximada; no calcula tráfico, tiempos reales ni rutas viales.
- Plan B propone opciones del catálogo y requiere confirmación humana; no monitorea cancelaciones ni clima en segundo plano.
- No vende boletos, no hace reservaciones ni procesa pagos.
- Las cuentas usan contraseñas con hash, sesiones seguras y token CSRF. Para un servicio comercial real todavía se recomienda añadir verificación de correo, recuperación de contraseña, límites de intentos, monitoreo, copias de seguridad y una revisión de seguridad profesional.
- No introduzcas datos bancarios, documentos de identidad ni información especialmente sensible.
- Railway tiene planes y cargos según el uso. Según su documentación vigente, Free incluye US$1 de crédito de recursos al mes y los servicios pueden dormir tras 5–10 minutos sin actividad; Hobby cuesta US$5/mes e incluye US$5 de uso, con cargos adicionales si se excede. Revisa el precio y el consumo estimado antes de dejar el servicio activo.

## 7. Pruebas

Con las dependencias instaladas, ejecuta:

```powershell
py -m unittest discover -s tests -v
```

Las pruebas verifican el catálogo, las fotos y atribuciones, creación de cuentas, aislamiento de viajes entre cuentas, token CSRF, cálculo de presupuesto y alternativas interiores de Plan B.
