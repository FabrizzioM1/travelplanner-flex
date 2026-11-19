@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Creando entorno virtual...
  py -m venv .venv
)
call ".venv\Scripts\activate.bat"
echo Instalando o verificando dependencias...
python -m pip install -r requirements-local.txt
if errorlevel 1 (
  echo No se pudieron instalar las dependencias. Revisa tu conexion a Internet.
  pause
  exit /b 1
)
echo.
echo TravelPlanner Flex se abrira en http://127.0.0.1:8000
echo Para cerrar el servidor, presiona CTRL+C en esta ventana.
python app.py
pause
