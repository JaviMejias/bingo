# Bingo Neón

Aplicación web multijugador para dirigir partidas de bingo en tiempo real. Un anfitrión crea una sala privada, comparte un código de acceso y controla el sorteo mientras los participantes siguen el tablero desde sus propios dispositivos y notifican cuando tienen bingo.

La interfaz está optimizada para escritorio y móvil, utiliza una estética neón y sincroniza el estado de cada sala mediante Socket.IO.

## Funcionalidades

### Salas y participantes

- Creación inmediata de salas con un código alfanumérico de 6 caracteres.
- Acceso de participantes mediante el código de sala.
- Nombre de jugador guardado durante la sesión del navegador.
- Código de sala copiable desde el panel de juego.
- Sincronización en tiempo real del tablero, últimos números, modo de juego, avisos de bingo y ganadores.
- Eliminación automática de salas tras 24 horas sin actividad; la revisión se ejecuta cada hora.

### Panel del anfitrión

- Tablero configurable entre 10 y 150 números; el valor inicial es 75.
- Marcado y desmarcado directo de números desde el tablero.
- Modo manual para ingresar números y evitar duplicados o valores fuera de rango.
- Búsqueda visual de números ya sorteados.
- Modo tómbola con selección aleatoria entre los números disponibles, animación compartida y prevención de repeticiones.
- Visualización del último número y del número anterior.
- Cambio de modo sin perder los números sorteados.
- Reinicio del tablero con confirmación.
- Cambio de rango con confirmación; inicia otra partida y conserva el modo elegido.

### Bingo y premios

- El botón para cantar bingo se habilita para los jugadores después de cuatro números sorteados.
- Los avisos aparecen en tiempo real en un panel exclusivo del anfitrión.
- El anfitrión puede marcar un aviso como `Binguito`, `Cartón Lleno` o `Falsa Alarma`.
- La confirmación de un premio requiere dos pasos para reducir errores accidentales.
- Los premios confirmados quedan registrados con jugador, tipo y hora.
- Historial de los últimos 200 premios, consultable por el anfitrión y conservado entre partidas.
- Notificación de victoria y animación de confeti para el jugador premiado.

## Flujo familiar

El tablero sigue siendo el centro de la pantalla, con el tema neón y sus animaciones. La búsqueda queda visible en escritorio y se despliega con el botón **Buscar** en móvil para liberar espacio al tablero. Modos, historial y ajustes quedan en **Opciones**. Los avisos de Bingo y los resultados aparecen únicamente cuando corresponde.

- Una sala admite hasta **50 jugadores conectados**, además del anfitrión. Los jugadores no necesitan cuentas y pueden tener el mismo nombre sin compartir sus premios.
- La partida empieza en **modo manual**, con 75 números. Desde **Opciones** puedes activar la tómbola. El botón indica **Sacar primer número** o **Sacar siguiente número**, se ilumina cuando está listo y explica cuándo volver a pulsarlo.
- El servidor completa cada giro, incluso si el anfitrión recarga o pierde conexión. Los clientes vuelven a entrar automáticamente al reconectarse.
- Al cantar Bingo, el jugador recibe un estado de espera y el anfitrión revisa su cartón. Mientras haya avisos pendientes, la tómbola espera.
- Un **Binguito** permite continuar. Un **cartón lleno** detiene los números, conserva el tablero y permite confirmar a otros ganadores.
- **Iniciar un nuevo juego** pide confirmación, limpia números y avisos, mantiene la sala, el modo, los participantes y el historial. Los invitados reciben un aviso de la nueva partida.
- En modo manual, desmarcar un número también requiere confirmación. La búsqueda está disponible para todos en manual y tómbola: escribe un número y pulsa Enter. Si salió, lo resalta sin cambiar el juego; si falta, muestra una alerta. El campo se limpia y recupera el foco para seguir revisando. Solo admite enteros de 1 al rango actual.
- Los controles muestran pérdida de conexión y se deshabilitan hasta recuperar el estado. Los modales usan botones grandes, texto explícito y foco de teclado.

El detalle técnico y las verificaciones están en [FAMILY_GAME.md](FAMILY_GAME.md).

## Cómo funciona

1. El anfitrión selecciona **Crear Sala** y recibe un código único.
2. Comparte el código con los participantes.
3. Cada participante selecciona **Unirse a Sala**, ingresa el código y elige un nombre.
4. El anfitrión añade números manualmente o utiliza la tómbola.
5. Todos los dispositivos reciben las actualizaciones de la sala en tiempo real.
6. Cuando un jugador canta bingo, el anfitrión revisa el aviso y confirma el tipo de premio o lo descarta.

> La aplicación funciona como tablero y canal de coordinación. No genera cartones individuales ni comprueba automáticamente sus combinaciones; la validación final corresponde al anfitrión.

## Arquitectura

```text
Navegadores
    │
    │ HTTP + Socket.IO
    ▼
Frontend SPA ───────────────► Backend Node.js
Vite + TypeScript             Express + Socket.IO
servido por Nginx             estado en memoria
```

- El frontend es una SPA con enrutamiento por hash y vistas diferenciadas para anfitrión y jugador.
- En desarrollo, Vite reenvía `/socket.io/` al backend en el puerto `4001`; el navegador utiliza el mismo origen.
- En Docker, Nginx sirve el frontend y actúa como proxy para `/socket.io/` hacia el backend.
- El backend conserva las salas en memoria y distribuye el estado completo a los clientes conectados.
- El servidor entrega una credencial privada al anfitrión; su navegador la conserva en `localStorage`. Cada pestaña de jugador mantiene su identidad y nombre en `sessionStorage`.

## Tecnologías

| Área | Tecnologías |
| --- | --- |
| Frontend | TypeScript, Vite, Tailwind CSS |
| Tiempo real | Socket.IO Client y Socket.IO Server |
| Interfaz | SweetAlert2, Font Awesome, Canvas Confetti |
| Backend | Node.js, Express, CORS |
| Despliegue | Docker, Docker Compose, Nginx |

## Requisitos

Para desarrollo local:

- Node.js 24 LTS recomendado; las imágenes Docker y la validación local de este flujo utilizan esa versión.
- npm.

Para despliegue contenerizado:

- Docker con Docker Compose.

## Inicio rápido con Docker

```bash
git clone https://github.com/JaviMejias/bingo.git
cd bingo
docker compose up --build -d
```

Abre [http://localhost:8081](http://localhost:8081). El frontend se publica en el puerto `8081` y el backend en el `4001`.

Para consultar los registros o detener los servicios:

```bash
docker compose logs -f
docker compose down
```

## Desarrollo local

Instala las dependencias del frontend y del backend:

```bash
npm run install:all
```

Inicia ambos servicios con recarga automática:

```bash
npm run dev
```

Servicios disponibles:

- Frontend: [http://localhost:5173](http://localhost:5173).
- Backend y Socket.IO: `http://localhost:4001`.

Vite usa un proxy local para Socket.IO. El navegador utiliza el mismo origen tanto en desarrollo como en producción.

Antes de arrancar, `npm run dev` comprueba que los puertos `4001` y `5173` estén libres. Si ya hay otra instancia abierta, muestra un aviso y termina. Vite conserva el puerto `5173` en lugar de cambiar automáticamente a otro. Para reiniciar, detén la instancia anterior con `Ctrl+C` y vuelve a ejecutar el comando.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Vite y el backend con la recarga nativa de Node.js; detiene ambos si uno de los comandos falla. |
| `npm --prefix backend test` | Ejecuta regresiones del servidor, incluyendo 50 jugadores locales. |
| `npm run build` | Valida TypeScript y genera el frontend de producción en `dist/`. |
| `npm run preview` | Sirve localmente la compilación del frontend. |
| `npm run install:all` | Instala las dependencias raíz y las del backend. |
| `npm --prefix backend start` | Inicia únicamente el backend. |
| `npm --prefix backend run dev` | Inicia únicamente el backend con recarga automática. |

Las imágenes Docker utilizan Node.js 24 LTS, instalación mediante `npm ci` y logs con rotación (tres archivos de hasta 10 MB por contenedor). No hay base de datos adicional.

## Compilación para producción

```bash
npm run build
```

Los archivos estáticos se generan en `dist/`. Para mantener la comunicación en tiempo real, el servidor que publique esos archivos debe reenviar `/socket.io/` al backend con soporte para WebSocket. El archivo [`nginx.conf`](nginx.conf) contiene una configuración funcional para el entorno de Docker Compose.

El backend acepta la variable de entorno `PORT`; si no está definida, utiliza `4001`.

## Estructura del proyecto

```text
.
├── backend/
│   ├── server.js          # Servidor Express y eventos de Socket.IO
│   └── Dockerfile
├── src/
│   ├── components/        # Tablero, controles y últimos números
│   ├── pages/             # Inicio, creación, acceso y sala de juego
│   ├── services/          # Conexión Socket.IO y gestión de salas
│   ├── types/             # Contratos TypeScript del juego
│   ├── main.ts            # Entrada y enrutador de la SPA
│   └── style.css          # Tema, utilidades y animaciones
├── Dockerfile             # Build del frontend y servidor Nginx
├── docker-compose.yml     # Orquestación de frontend y backend
├── nginx.conf             # Estáticos y proxy de Socket.IO
└── vite.config.ts
```

## Medir capacidad

La prueba gradual de 10, 25 y 50 jugadores y el procedimiento para ejecutarla en un backend temporal de Oracle están en [CAPACITY_TEST.md](CAPACITY_TEST.md). Se genera la carga desde el PC y se observan CPU y memoria por separado. El resultado local no determina la capacidad de Oracle.

## Estado y persistencia

Actualmente, todas las salas y sus historiales se almacenan en la memoria del proceso del backend. Esto implica que:

- reiniciar o reemplazar el contenedor del backend elimina todas las salas activas;
- varias réplicas del backend no compartirán estado entre sí;
- no existe recuperación de partidas ni almacenamiento histórico permanente.

Para un despliegue con alta disponibilidad se recomienda incorporar un almacén persistente y un adaptador compartido para Socket.IO.

## Consideraciones de seguridad

La implementación actual está orientada a partidas informales en entornos controlados:

- la identidad es local y anónima; no existe un sistema de cuentas;
- el navegador conecta a Socket.IO desde el mismo origen de la aplicación;
- el backend valida los eventos y autoriza las operaciones del anfitrión mediante una credencial privada;
- los códigos de sala no deben considerarse credenciales sensibles.

El uso previsto es una sala familiar con hasta 50 jugadores simultáneos. Hay límites de payload, frecuencia de eventos, cantidad de salas e historial; los nombres se muestran como texto. No es una plataforma pública con cuentas ni recuperación de partidas tras reiniciar el backend.

## Resolución de problemas

### La interfaz abre, pero no se actualiza en tiempo real

Comprueba que el backend esté activo en el puerto `4001`. En un despliegue propio, verifica también que el proxy preserve las cabeceras `Upgrade` y `Connection` para `/socket.io/`.

### Una sala desapareció

Las salas se eliminan después de 24 horas sin actividad y también desaparecen cuando se reinicia el backend, porque el estado no es persistente.

### El anfitrión no puede recuperar su rol desde otro navegador

La credencial del anfitrión se guarda localmente en el navegador que creó la sala. Otro navegador o un almacenamiento local limpio no dispone de esa credencial. Desde el inicio puedes volver a la última sala creada en ese navegador.

## Autor

Desarrollado por **Javier Mejías** — [LinkedIn](https://www.linkedin.com/in/javier-mejías-655a7936a).
