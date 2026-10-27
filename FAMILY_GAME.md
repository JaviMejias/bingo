# Bingo en familia

Implementación preparada el 27 de octubre de 2026 para una sala familiar con hasta 50 jugadores simultáneos, además del anfitrión. Mantiene un proceso Node.js y Nginx; no añade servicios ni dependencias de ejecución.

## Decisiones de uso

- El modo inicial es manual. Puedes activar la tómbola desde «Opciones». «Sacar primer número» cambia a «Sacar siguiente número», con un borde iluminado suave y una instrucción permanente. Cada número requiere la intervención del anfitrión para respetar el ritmo de quienes están marcando sus cartones.
- El tablero conserva la dirección visual original: ocupa la pantalla, con cristales, degradados neón, brillos, pulso del último número, confeti y animación de tómbola. La búsqueda queda visible en escritorio y plegada tras el botón «Buscar» en móvil; historial, instrucciones y ajustes permanecen en «Opciones». Los paneles laterales solo aparecen al revisar un Bingo o terminar la partida.
- Los modos Tómbola y Manual se eligen desde «Opciones». El servidor realiza el sorteo y termina cada giro sin depender de que el navegador siga abierto.
- Los avisos de Bingo pausan los nuevos giros mientras se revisan. Confirmar un premio requiere un modal que identifica al jugador y explica su efecto. Descartar un aviso también pide confirmación y solo retira ese aviso.
- Binguito conserva la partida en curso. Cartón lleno detiene los números y muestra el resultado y la acción «Iniciar un nuevo juego». Los demás avisos siguen disponibles para reconocer ganadores compartidos; también pueden entrar avisos posteriores de otros cartones.
- La nueva partida pide confirmación, avisa si hay solicitudes pendientes y mantiene el código, el modo, el rango, los participantes y los últimos 200 premios. Los invitados ven un aviso y un tablero limpio. Para cambiar el rango se confirma el inicio de otra partida.
- Los jugadores ven instrucciones, un botón de Bingo siempre localizable, el estado de su aviso y una búsqueda de números. No se generan cartones ni se validan combinaciones automáticamente.
- La búsqueda permite revisar cartones con teclado: escribir un entero de 1 al máximo actual y pulsar Enter. Un número sorteado se resalta localmente, sin modificar el juego; uno faltante muestra una alerta que puede cerrarse con Enter. En ambos casos el campo queda vacío y listo para el siguiente. Se bloquean ceros, negativos, letras, signos, decimales, notación científica y valores fuera del rango, incluso al pegar texto.
- Los nombres se distinguen de las identidades de participación: dos personas llamadas igual pueden ganar por separado.
- El anfitrión puede volver desde el inicio a la última sala que creó en ese navegador. La credencial no se comparte con los invitados.
- Las vistas se adaptan a escritorio y móvil, usan controles con etiquetas y foco visible, y respetan la preferencia de reducir movimiento. Los modales tienen una apariencia compartida y acciones que describen lo que harán.

## Correcciones técnicas

- Validación de payloads y rangos; los mensajes inválidos reciben errores en lugar de cerrar el proceso.
- Autorización del anfitrión en cada operación administrativa, con una credencial aleatoria generada por el servidor y guardada solo en su navegador.
- Mutaciones de números mediante órdenes del servidor; ya no se reemplaza un array a partir de una lectura antigua.
- Sorteos con temporizadores del servidor; las nuevas partidas cancelan los giros pendientes.
- Identificador de partida en las operaciones para rechazar confirmaciones o mensajes de una partida anterior.
- Reingreso al reconectarse, recuperación del estado inicial completo, timeouts y errores visibles.
- Limpieza de listeners y suscripciones al salir; filtrado de los eventos por sala.
- Nombres como texto o HTML escapado, incluidos premios e historial.
- Límite de 50 identidades de jugador conectadas por sala, 10 salas en memoria, mensajes de hasta 8 KiB, 100 eventos por conexión cada 10 segundos y 200 premios en el historial.
- Identificación de la sala en los eventos de cierre; endpoint `/health` para comprobaciones sencillas.
- Eliminación de la importación de todo el catálogo de iconos del bundle principal. El JavaScript pasó de unos 1.127 kB a unos 172 kB, medidos por Vite; su estimación gzip pasó de unos 351 kB a 51 kB.
- Docker usa Node 24 LTS, `npm ci`, exclusión de archivos locales y rotación de logs. No se fijaron presupuestos de memoria arbitrarios a partir de muestras en reposo.

## Verificación

- `npm --prefix backend test`: ocho pruebas con sockets reales locales. Incluyen modo manual inicial, entrada inválida, permisos, operaciones concurrentes, sorteo con anfitrión desconectado, nueva partida, nombres duplicados, varios ganadores y sincronización con 50 jugadores.
- `npm run build`: comprobación de TypeScript y compilación de producción.
- Comprobación del navegador con anfitrión e invitado: giro y recarga, aviso de Bingo, nombre con caracteres HTML, premios con cancelar/confirmar, nueva partida con cancelar/confirmar, historial, rango hasta 150, reconexión, reentrada y vistas móviles. También se verificaron el tablero completo dentro de la pantalla, controles secundarios ocultos, el menú con Escape, recuperación de ajustes al reconectar y controles sin recortes a 320 y 390 píxeles de ancho.

La prueba de 50 jugadores es funcional y local: no establece el máximo de capacidad de la instancia Oracle ni sustituye una medición durante una partida real. El build del frontend y backend utiliza el nuevo contrato de eventos; deben actualizarse juntos y recargarse los navegadores al desplegar.

## Alcance del despliegue

Los cambios están en el proyecto local. No se desplegaron, no se reiniciaron contenedores y no se borró caché ni datos de Oracle. La revisión SSH anterior fue de solo lectura.

El estado sigue en memoria: reiniciar el backend elimina salas y premios. La reconexión recupera una sala mientras ese proceso continúa vivo; no recupera un proceso reiniciado. La validación final de cada cartón corresponde al anfitrión. Mantener este diseño evita agregar memoria y operación de una base de datos para el uso familiar actual.

La comprobación responsive incluye el código de acceso con seis letras anchas y el historial con 200 registros en escritorio y móviles de 320 y 390 píxeles. Los mensajes auxiliares retirados no reaparecen al cambiar de partida ni después de validar una entrada. Para medir el servidor se preparó [CAPACITY_TEST.md](CAPACITY_TEST.md).
