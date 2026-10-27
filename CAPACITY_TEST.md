# Prueba de capacidad para una sala familiar

La prueba utiliza clientes Socket.IO reales para verificar que cada jugador reciba las actualizaciones. No requiere instalar Artillery ni otra dependencia. Es el enfoque de clientes administrados descrito en la [documentación de Socket.IO](https://socket.io/docs/v4/load-testing/).

## Qué mide

- Una sala temporal con anfitrión y etapas de 10, 25 y 50 jugadores.
- Marcado de números al ritmo indicado y ráfagas de cinco avisos de Bingo, resueltos sin entregar premios.
- Entregas esperadas y recibidas, desconexiones y latencia p50/p95/máxima por etapa.
- Al terminar o pulsar Ctrl+C se elimina la sala temporal y se cierran sus conexiones. Si el servidor cae, no se garantiza la limpieza de esa sala hasta retirar el contenedor de prueba.

No modifica las salas existentes. Comprueba `/health` y el contrato de eventos antes de crear la sala; la versión antigua de Oracle no es un destino compatible. El programa exige una URL explícita.

El script no mide CPU o RAM del servidor: eso se observa por separado con Docker/Portainer. Tampoco mide la descarga inicial del frontend, el proxy público/TLS ni el rendimiento de las animaciones en teléfonos reales.

## Preparar una instancia separada en Oracle

Con esta versión del proyecto disponible en un directorio del servidor, levantar únicamente el backend de prueba:

```bash
sudo docker compose -p bingo-capacity -f compose.capacity.yml up --build -d
```

El contenedor tiene nombre de proyecto separado, publica solamente `127.0.0.1:4401`, no tiene reinicio automático y dispone de un límite de memoria de **256 MiB**. No usa los puertos ni el nombre de los contenedores de producción. El límite es para acotar esta prueba, no es una estimación del consumo normal ni un límite recomendado para producción.

No hace falta detener otros proyectos para obtener la primera medición. Medir con los servicios habituales activos permite conocer el margen real de convivencia. Si el conjunto queda corto de recursos, se puede comparar después con una medición dedicada.

En Oracle, observar los contenedores con Portainer o Docker y la memoria total:

```bash
sudo docker stats
free -m
vmstat 1
```

Docker informa CPU, memoria y tráfico. En Linux, su cifra de memoria descuenta parte de la caché; debe interpretarse junto con la memoria y swap del host. [Referencia oficial](https://docs.docker.com/reference/cli/docker/container/stats/).

## Generar los jugadores desde el PC

Para que el generador no consuma la RAM limitada de Oracle, ejecutarlo desde el PC. Abrir un túnel SSH en una terminal:

```bash
ssh -i ~/.ssh/oracle_riff_forge -N -L 4401:127.0.0.1:4401 ubuntu@TU_SERVIDOR
```

Desde el proyecto local, en otra terminal:

```bash
npm run test:capacity -- --url http://127.0.0.1:4401 --players 50 --seconds 600 --interval-ms 5000
```

La duración indicada es el total aproximado, repartido entre las etapas: con 600 segundos son unos 200 segundos para cada grupo. La conexión inicial y una posible espera por errores añaden tiempo. Para comprobar estabilidad durante más tiempo se puede ampliar `--seconds` hasta 3600.

Para validar solamente la herramienta en desarrollo local, apuntar al backend local actual y reducir la duración:

```bash
npm run test:capacity -- --url http://127.0.0.1:4001 --players 50 --seconds 18 --interval-ms 1000
```

## Interpretar el resultado

La primera meta es llegar a 50 jugadores, sin desconexiones inesperadas ni entregas faltantes. Comparar latencia y recursos entre 10, 25 y 50: buscar si la latencia crece, si aparece presión sostenida de CPU, si la memoria aumenta sin estabilizarse o si el host empieza a intercambiar más memoria a swap.

La latencia incluye red y generador. Un p95 alto no demuestra por sí solo falta de capacidad del backend; hay que correlacionarlo con CPU/RAM y con las etapas más pequeñas. Un contenedor cerrado por su límite de 256 MiB demuestra que esa configuración de prueba no bastó, no establece el máximo absoluto de la máquina.

Después de la prueba de conexiones, revisar una partida en algunos teléfonos reales y comprobar la ruta pública habitual. Una prueba breve o una medición local no garantiza varias horas de uso ni sustituye la medición en Oracle.

Para retirar exclusivamente la instancia temporal:

```bash
sudo docker compose -p bingo-capacity -f compose.capacity.yml down
```

No se borran imágenes, caché ni volúmenes de los otros proyectos.

## Validación local de la herramienta

El 27 de octubre de 2026 se ejecutó una prueba breve de 18 segundos en el PC: etapas de 10, 25 y 50 jugadores, 18 actualizaciones, 20 avisos de Bingo, 510 entregas de 510 esperadas y cero desconexiones. El p95 local en la etapa de 50 fue de 2 ms. Se eliminó la sala temporal al terminar. Estas cifras corresponden al PC y no son una medición de Oracle.
