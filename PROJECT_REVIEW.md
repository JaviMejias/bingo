# Revisión de Bingo Neón

Esta es la revisión inicial, anterior a la implementación del flujo familiar. Consulta [FAMILY_GAME.md](FAMILY_GAME.md) para conocer los cambios y su validación. Las referencias de líneas de este informe corresponden al código anterior.

Fecha: 27 de octubre de 2026. Alcance: código local completo, compilación, pruebas funcionales locales y consultas de solo lectura al servidor Oracle autorizado por el propietario.

La arquitectura actual —frontend estático con Nginx y un backend Node.js con Socket.IO— es razonable para una instancia pequeña. Las prioridades encontradas son la autorización de operaciones y la recuperación y consistencia de las partidas. No se modificaron archivos de aplicación, configuración del servidor, contenedores ni partidas de producción.

El código y el lockfile del backend desplegado coinciden por SHA-256 con los archivos locales. La configuración del proxy Nginx de Bingo también coincide. Esto confirma la correspondencia del backend; no se comparó byte a byte todo el bundle frontend desplegado.

## Recursos observados en Oracle

| Medición | Resultado |
| --- | --- |
| Arquitectura | x86_64 |
| CPU lógicas visibles | 2 |
| RAM del sistema | 954 MiB |
| RAM disponible | Aproximadamente 329–361 MiB en las muestras |
| Swap configurado | 2.047 MiB; 528–545 MiB ocupados en las lecturas de `free` |
| Disco raíz | 45 GB; 35 GB usados, 9,4 GB disponibles, 79 % de ocupación |
| Contenedores activos | 11, compartidos entre varios proyectos y herramientas |
| Bingo, primera muestra | Backend: 9,30 MiB; frontend: 1,53 MiB; CPU: 0 % |
| Bingo, segunda muestra | Backend: 2,77 MiB; frontend: 908 KiB; CPU: 0 % |
| Límites Docker de Bingo | Sin límites explícitos de memoria ni CPU |
| Estado de Bingo | Ambos contenedores activos desde hace unas seis semanas; `RestartCount=0`, `OOMKilled=false` |
| Logs Docker de Bingo | `json-file`, sin opciones de rotación configuradas en los contenedores |
| Persistencia y salud | Sin montajes ni healthchecks en los contenedores de Bingo |
| Runtime desplegado | Node.js 20.20.2 |
| Caché de compilación Docker | 8,241 GB informados como recuperables |

Estas muestras corresponden a baja actividad. `docker stats` no representa toda la memoria del host ni incluye toda la memoria intercambiada a swap. La diferencia entre muestras no permite concluir que haya una fuga o una mejora. El uso de swap muestra que el margen del servidor debe evaluarse considerando todos sus proyectos; no demuestra por sí solo saturación continua. No se ejecutaron pruebas de carga en producción ni se determinó un máximo de jugadores.

La cifra de caché recuperable corresponde a todo Docker. No se borró caché, imágenes, contenedores ni volúmenes. Las cifras de imágenes y caché pueden compartir capas y no deben sumarse para estimar espacio recuperable.

## Defectos confirmados, por prioridad

### 1. [P1] Un evento inválido puede cerrar todo el backend

Ubicación: [backend/server.js:33](backend/server.js#L33).

`createRoom` accede a `roomData.id` sin validar el argumento. En una instancia local aislada, enviar `createRoom(null)` terminó el proceso con `TypeError` y código de salida 1. Como las salas existen solo en RAM, el cierre elimina todas las partidas de ese proceso. El reinicio automático del contenedor no recupera los datos.

Corrección: validar estructura, tipos, tamaños y rangos antes de usar los payloads, y responder con un error controlado. Aplicar esa validación a todos los eventos; capturar globalmente excepciones sin corregir sus causas no resuelve el problema.

### 2. [P1] El servidor permite controlar salas sin ser su anfitrión

Ubicación: [backend/server.js:81](backend/server.js#L81), [backend/server.js:124](backend/server.js#L124) y [backend/server.js:137](backend/server.js#L137).

`updateRoom`, `addWinner`, `removeBingoCaller` y `deleteRoom` no comprueban rol ni pertenencia. La comprobación de `hostId` está en el navegador y ese identificador se entrega como parte del estado compartido. `hostSocketId` se guarda, pero no se utiliza para autorizar acciones.

Reproducción local: un segundo socket que no había entrado en la sala modificó sus números, registró un premio y eliminó la sala conociendo su ID. Un jugador que entra normalmente ya recibe ese ID.

Corrección: autorizar cada evento en el servidor mediante una identidad o credencial de anfitrión verificable, que permita reconexión y no se incluya en el estado enviado a los jugadores. Permitir a los invitados únicamente sus operaciones autorizadas. Ocultar botones o restringir CORS no sustituye esa autorización.

### 3. [P1] Un nombre de jugador puede ejecutar JavaScript en el navegador del anfitrión

Ubicación: [src/pages/GameRoom.ts:221](src/pages/GameRoom.ts#L221), [src/pages/GameRoom.ts:243](src/pages/GameRoom.ts#L243) y [src/pages/GameRoom.ts:735](src/pages/GameRoom.ts#L735).

Los nombres se insertan en `innerHTML`, atributos y HTML de SweetAlert sin escapar. La entrada de nombre no impide estos caracteres y el servidor conserva el texto recibido.

Reproducción en navegador local: un nombre con una imagen y un manejador `onerror` estableció una variable de prueba en la ventana del anfitrión al mostrar el aviso de Bingo. Es ejecución de código confirmada, no solamente un defecto visual.

Corrección: construir los elementos con APIs DOM y asignar nombres mediante `textContent`; asignar atributos mediante propiedades seguras. Aplicar límites de longitud y validación en el servidor. Los campos del historial también requieren tratamiento seguro.

### 4. [P1] Una reconexión deja al jugador fuera de la sincronización

Ubicación: [src/services/socket.ts:8](src/services/socket.ts#L8) y [src/pages/GameRoom.ts:27](src/pages/GameRoom.ts#L27).

La aplicación entra en la sala al cargar la vista. No existe un manejador de reconexión que vuelva a entrar y obtenga el estado actual. Tampoco se configura recuperación de conexión en el servidor. Socket.IO elimina las pertenencias a salas cuando se desconecta un socket.

Reproducción local: el cliente entró en una sala, se desconectó y volvió a conectarse con otro ID. Los cambios posteriores del anfitrión no llegaron al cliente hasta volver a entrar expresamente.

Corrección: en cada conexión, recuperar la sala activa y su estado; mostrar si el cliente está desconectado. Añadir timeout y errores a las confirmaciones para que las promesas de creación y acceso no queden pendientes indefinidamente.

Referencia: [ciclo de vida de las salas en Socket.IO](https://socket.io/docs/v4/rooms/#disconnection).

### 5. [P1] Los eventos de una sala anterior pueden sobrescribir otra sala en pantalla

Ubicación: [src/pages/GameRoom.ts:362](src/pages/GameRoom.ts#L362), [src/pages/GameRoom.ts:367](src/pages/GameRoom.ts#L367) y [src/main.ts:12](src/main.ts#L12).

Cada entrada registra nuevos manejadores, pero al navegar no se eliminan los anteriores ni se abandona la sala del servidor. `roomUpdated` no filtra por ID; `roomDeleted` tampoco identifica qué sala se eliminó.

Reproducción en navegador: después de salir y volver había dos manejadores de `roomUpdated`. Después de abrir otra sala, una actualización de la anterior mostró el número 20 bajo el código de la nueva, aunque la nueva sala seguía sin números en el servidor. La pantalla y los controles pueden quedar asociados a estados diferentes.

Corrección: dar a la vista una función de limpieza que quite sus manejadores y temporizadores y abandone la sala. Identificar la sala en todos los eventos y descartar estados de otras salas.

### 6. [P2] Dos operaciones próximas pueden perder números marcados

Ubicación: [src/components/BingoBoard.ts:62](src/components/BingoBoard.ts#L62), [src/components/BingoControls.ts:150](src/components/BingoControls.ts#L150) y [backend/server.js:86](backend/server.js#L86).

El cliente lee el estado, modifica una copia del array y envía el array completo. Dos acciones que lean el mismo estado pueden sobrescribirse, incluso con un único proceso Node: la lectura y la escritura son mensajes separados.

Reproducción local: dos lecturas de un tablero vacío seguidas de escrituras con `[1]` y `[2]` dejaron únicamente `[2]`.

Corrección: enviar órdenes como añadir, quitar o alternar un número y calcular el resultado en el servidor sobre el estado vigente, con validación y autorización. Lo mismo aplica a las operaciones de tómbola.

### 7. [P2] Recargar durante una tómbola deja el sorteo bloqueado

Ubicación: [src/components/BingoControls.ts:321](src/components/BingoControls.ts#L321).

El sorteo termina mediante un `setTimeout` de tres segundos que pertenece al navegador del anfitrión. Una recarga cancela el temporizador, pero en el backend permanece `tombolaActive=true`. El botón rechaza nuevos giros mientras ese valor sea verdadero.

Reproducción en navegador: iniciar un giro y recargar antes de terminar dejó la sala activa y sin número sorteado pasados los tres segundos; intentar girar otra vez no la recuperó.

Corrección: hacer que el servidor sea responsable del inicio y la finalización del sorteo. El navegador debe representar la animación a partir del estado y los tiempos del servidor.

### 8. [P2] La carga inicial omite alertas pendientes y el botón de Bingo

Ubicación: [src/pages/GameRoom.ts:347](src/pages/GameRoom.ts#L347), [src/pages/GameRoom.ts:403](src/pages/GameRoom.ts#L403) y [src/pages/GameRoom.ts:451](src/pages/GameRoom.ts#L451).

El render inicial dibuja tablero, últimos números y controles; las alertas, la visibilidad del botón de Bingo y el estado de la tómbola se procesan únicamente en `roomUpdated`.

Reproducción en navegador: entrar como jugador con cuatro números ya sorteados mostró el último número 4 y mantuvo oculto el botón Bingo. Recargar el anfitrión con una alerta pendiente mostró cero tarjetas y mantuvo oculto el panel. Una actualización posterior vuelve a procesar esos datos.

Corrección: utilizar la misma función de aplicación del estado tanto para la respuesta inicial como para las actualizaciones, inicializando también el historial ya procesado.

### 9. [P2] El menú del anfitrión deja de responder al volver a la sala

Ubicación: [src/pages/GameRoom.ts:356](src/pages/GameRoom.ts#L356).

`hostControlsListenersSetup` se guarda en el elemento persistente `#app`. Al navegar se reemplaza su contenido, desaparecen los botones anteriores y sus listeners, pero la bandera sigue en `true`. Los botones nuevos no reciben sus manejadores.

Reproducción en navegador: el menú abrió al entrar por primera vez y dejó de abrir después de ir al inicio y volver sin recargar.

Corrección: asociar el registro de manejadores al ciclo de vida de los elementos actuales o usar delegación de eventos con limpieza explícita.

### 10. [P2] Cambiar el rango conserva la validación del rango anterior

Ubicación: [src/components/BingoControls.ts:10](src/components/BingoControls.ts#L10), [src/components/BingoControls.ts:243](src/components/BingoControls.ts#L243) y [src/components/BingoControls.ts:264](src/components/BingoControls.ts#L264).

Los inputs se conservan si el modo no cambia y sus listeners retienen el objeto `room` del primer render. El atributo `max` también permanece con el valor anterior.

Reproducción en navegador: pasar de 75 a 150 dibujó 150 celdas, pero el input mantuvo `max=75` y escribir `100` terminó como `10`.

Corrección: actualizar los atributos y hacer que los manejadores lean el estado actual, o recrear y registrar los controles cuando cambie el rango.

### 11. [P2] Confirmar un ganador elimina las alertas de los demás jugadores

Ubicación: [backend/server.js:129](backend/server.js#L129).

`addWinner` vacía todos los `bingoCallers`. Si dos personas cantan Bingo, confirmar a una elimina la solicitud pendiente de la otra sin validarla ni descartarla expresamente.

Reproducción local: crear avisos para Alice y Bob y premiar a Alice dejó la lista vacía.

Corrección: retirar solamente el aviso resuelto, salvo que se defina explícitamente que un premio cierra la ronda y cómo se informa esa decisión a los demás participantes.

## Límites de diseño y mejoras operativas

Estos puntos requieren decisiones o ajustes; no son fallos de carga demostrados.

- **Retención sin cuotas.** [backend/server.js:33](backend/server.js#L33) acepta creación de salas sin límite de cantidad, y cada sala puede permanecer entre 24 y aproximadamente 25 horas después de su última actividad. No hay límites de frecuencia por evento ni cotas de historial o participantes. La expiración por tiempo no limita la memoria máxima. Añadir cuotas y límites de payloads, nombres, historial y frecuencia es especialmente relevante con 954 MiB compartidos. No se intentó agotar memoria.
- **Estado volátil.** Reiniciar o reemplazar el backend borra salas, números y premios. Es una limitación conocida del `Map` en memoria, confirmada en el código y sin persistencia montada en el contenedor. Si es necesario recuperar partidas, evaluar un snapshot o SQLite con volumen para este despliegue de un solo proceso; no hay evidencia actual que justifique añadir varios servicios de base de datos o réplicas.
- **Identidad por nombre.** Los avisos se deduplican por nombre y las victorias se atribuyen comparando el nombre. Dos invitados con el mismo nombre comparten esa identidad funcional. Usar un ID de participante independiente del nombre visible.
- **Logs sin cota Docker.** Configurar rotación por servicio, por ejemplo `max-size: "10m"` y `max-file: "3"`. La configuración observada de `json-file` no incluye esas opciones y su límite de tamaño predeterminado es ilimitado. No se determinó que los logs sean la causa de los 35 GB usados. [Documentación oficial](https://docs.docker.com/engine/logging/drivers/json-file/#options).
- **Imágenes y builds.** Añadir `.dockerignore` para excluir `.git`, `node_modules`, `backend/node_modules`, `dist` y artefactos locales. El Dockerfile raíz hace `COPY . .` y no existe `.dockerignore`; el `node_modules` local revisado ocupa unos 129 MB. Usar `npm ci` para builds reproducibles y `npm ci --omit=dev` en el backend. Mantener el frontend multistage existente. Compilar fuera de esta VM reduciría los picos de memoria del despliegue.
- **Runtime sin soporte.** Los Dockerfiles usan Node 20 y producción ejecuta 20.20.2. Al 27 de octubre de 2026, Node 20 figura EOL en el calendario oficial; Node 24 es LTS. Planificar y validar esa actualización. La compilación local de esta revisión pasó con Node 24.22.0, pero no se reconstruyeron las imágenes de producción. [Calendario oficial de Node.js](https://nodejs.org/en/about/previous-releases).
- **Aislamiento de recursos.** Establecer presupuestos de memoria, CPU y procesos después de una prueba representativa de jugadores. No fijar límites a partir de las muestras en reposo: un límite demasiado bajo también puede cerrar partidas y hoy el estado no se recupera.
- **Puertos publicados.** Docker publica el backend en `0.0.0.0:4001` y `[::]:4001`. El frontend ya lo alcanza por la red interna Docker mediante Nginx, por lo que esa publicación merece revisión. No se verificaron reglas de Oracle ni del firewall; publicar un puerto en el host no demuestra por sí solo acceso desde Internet.
- **Frontend pesado para su función.** El build produce un JS de 1.127,21 kB; Vite estima 350,62 kB con gzip. Se importa todo `fas` en [src/main.ts:3](src/main.ts#L3) y además se carga Font Awesome por CDN en `index.html`. Importar los iconos utilizados y unificar su estrategia de carga reduciría descargas y trabajo del navegador. La cifra gzip es una estimación del build, no una medición de transferencia del proxy público. Confeti y animaciones se ejecutan principalmente en los dispositivos de los jugadores.
- **Difusión del estado completo.** Para un tablero de hasta 150 números puede ser suficiente mantener el diseño actual. Acotar el historial y medir bytes por evento antes de introducir un protocolo de deltas. Cambiar a órdenes del servidor sí es necesario para resolver la consistencia indicada en el hallazgo 6.

## Validación realizada

- `npm run build`: TypeScript y Vite pasan. Vite advierte sobre el tamaño del bundle JS.
- Pruebas Socket.IO contra backend local: escritura y borrado sin pertenencia, premio sin autorización, pérdida de actualización, falta de reingreso tras reconectar y eliminación de alertas ajenas al premiar.
- Prueba de evento inválido en un proceso local separado: `createRoom(null)` cierra el proceso con código 1.
- Playwright con navegador real: HTML ejecutable en nombres, estado inicial incompleto, acumulación de listeners, contaminación entre salas, menú inactivo al reingresar, rango de inputs desactualizado y tómbola bloqueada tras recargar.
- Consultas SSH de solo lectura: CPU, RAM, swap, disco, contenedores, estadísticas, configuración seleccionada, checksums y versión del backend. No se leyeron variables de entorno ni secretos de los proyectos.
- No existe una suite de pruebas declarada en los scripts del proyecto. Las comprobaciones de esta revisión se crearon en `/tmp`; no forman parte de una suite permanente.
- No se probó carga en Oracle, no se auditó cada dependencia mediante una base de vulnerabilidades y no se comprobó toda la configuración del proxy público o las reglas de red.

## Orden recomendado

1. Validar eventos y autorizar operaciones del anfitrión en el servidor; eliminar inserciones inseguras de HTML.
2. Corregir reconexión, limpieza de vistas, filtrado de eventos y render inicial.
3. Mover las operaciones de números y la finalización de tómbola al servidor; corregir premios, menú y rango.
4. Incorporar pruebas de regresión de esos comportamientos y decidir si las partidas deben sobrevivir a reinicios.
5. Configurar rotación de logs, revisar caché de Docker y ajustar builds y runtime. Medir una partida representativa antes de establecer capacidad y límites.
