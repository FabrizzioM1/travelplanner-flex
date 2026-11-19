# TravelPlanner Flex — Arquitectura y alcance de la versión en línea

## 1. Base del proyecto original

Se conservan las ocho entidades definidas en la documentación inicial:

1. Viaje
2. Hospedaje
3. Transporte
4. Itinerario
5. Actividad
6. Presupuesto
7. Presupuesto_Categoria
8. Gasto

Se mantienen los flujos de crear el viaje, registrar destino y fechas, capturar hospedaje y transporte, organizar actividades por día, registrar presupuesto y gastos, consultar la información y mostrar alertas cuando el gasto real rebasa el presupuesto.

## 2. Entidades nuevas para TravelPlanner Flex

| Entidad | Para qué se incorpora | Relación principal |
|---|---|---|
| Usuario | Crear cuentas y separar los viajes de cada persona. | Usuario 1:N Viaje |
| Lugar | Mantener un catálogo ilustrado de sitios por destino. | Lugar 1:N Actividad (opcional) |
| Preferencia | Guardar categorías de interés para ordenar recomendaciones. | Viaje 1:N Preferencia |
| Viajero | Registrar integrantes de un viaje grupal. | Viaje 1:N Viajero |
| Voto | Guardar si un integrante apoya o no una experiencia. | Viajero 1:N Voto; Lugar 1:N Voto |
| Alternativa_Actividad | Registrar la opción que se propone para sustituir una actividad. | Actividad 1:N Alternativa_Actividad; Lugar 1:N Alternativa_Actividad |
| Escenario_Viaje | Mantener un registro de los cambios confirmados en el plan. | Viaje 1:N Escenario_Viaje |

En total, la versión Flex utiliza quince entidades: las ocho originales y siete adicionales.

## 3. Funcionamiento de las funciones nuevas

### Catálogo visual

El usuario filtra lugares por destino y categoría. Cada ficha muestra fotografía, descripción, ubicación, costo orientativo, tiempo estimado y crédito/licencia de la imagen. Las fotografías se seleccionaron de Wikimedia Commons. Si se ejecuta `descargar_fotos.py`, se guardan en `static/img/real/` y el servidor las utiliza desde su propio sitio.

### Plan B

El usuario abre Plan B desde una actividad y selecciona el motivo (lluvia, cancelación o presupuesto). El sistema propone lugares del catálogo del mismo destino. La lluvia prioriza espacios bajo techo. El usuario revisa el costo estimado y confirma manualmente si desea aplicar el cambio. La sustitución queda registrada en `Escenario_Viaje` y `Alternativa_Actividad`.

### Presupuesto

Se distinguen costos planeados (hospedaje, transporte y actividades) de gastos reales capturados. El saldo se calcula como presupuesto total menos gastos reales. Los costos planeados no se suman automáticamente a los gastos reales, para evitar duplicar importes.

### Grupo

El propietario del viaje puede registrar acompañantes, capturar votos por lugar y repartir gastos marcados como compartidos. En esta versión académica los integrantes son registros dentro de la cuenta propietaria; no tienen todavía cuentas independientes ni permisos de colaboración por invitación.

## 4. Arquitectura técnica

- Interfaz: HTML, CSS y JavaScript adaptable a PC y celular.
- Backend: Python con Flask.
- Desarrollo local: SQLite en `data/travelplanner.sqlite3`.
- Publicación: PostgreSQL conectado mediante `DATABASE_URL`.
- Servidor de producción: Gunicorn.
- Alojamiento: Railway.
- Imágenes: URLs de Wikimedia Commons o copias locales descargadas con el script incluido.

## 5. Seguridad implementada

- Registro e inicio de sesión.
- Contraseñas almacenadas como hash; no se guardan en texto plano.
- Sesión firmada y cookie HTTPOnly; en Railway se marca Secure.
- Token CSRF en operaciones que modifican datos.
- Consultas parametrizadas.
- Consultas de viaje filtradas por el usuario autenticado.
- Restricciones de integridad y eliminación en cascada.

Antes de un uso comercial se recomienda incorporar verificación de correo, recuperación de contraseña, limitación de intentos, respaldos automáticos, monitoreo y auditoría de seguridad.

## 6. Límites de la demostración

- Los precios del catálogo son orientativos y no son tarifas oficiales.
- No se hacen reservaciones, compras ni pagos.
- Plan B no monitorea cancelaciones ni cambios meteorológicos en segundo plano; ofrece alternativas cuando el usuario lo solicita.
- La consulta de clima depende de conexión y de la disponibilidad de Open-Meteo.
- El orden de ruta es una aproximación por coordenadas, no navegación vial ni cálculo de tráfico.
- Los importes del prototipo se manejan en MXN; no hay conversión automática de divisas.
- La publicación requiere que el equipo conecte su propio repositorio GitHub y su cuenta Railway. El ZIP no contiene credenciales ni un enlace ya desplegado.
