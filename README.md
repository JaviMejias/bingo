🎲 Bingo App

¡Bienvenido a la aplicación de Bingo! Una herramienta interactiva y fácil de usar diseñada para gestionar partidas de bingo, ya sea de forma manual o automática (tómbola). Ideal para proyectar en una pantalla grande y mantener a todos al tanto de los números sorteados.
✨ Características

    Modo Manual: Ingresa los números uno por uno a medida que se van dictando.

    Modo Tómbola: Permite al sistema sortear números aleatoriamente con una animación visual.

    Visualización Clara: Muestra el último número sorteado y el anterior para facilitar el seguimiento.

    Tablero Dinámico: Un tablero de bingo que se actualiza en tiempo real, marcando los números a medida que salen.

    Búsqueda de Números: Busca rápidamente si un número específico ya ha sido sorteado y lo resalta en el tablero.

    Corrección de Errores: Opción para "desmarcar" un número si fue ingresado por error en modo manual.

    Configuración Personalizable: Ajusta el número máximo de la tabla (ej. de 1 a 150) para adaptarse a diferentes variantes de bingo.

    Diseño Responsivo: Adaptado para funcionar y verse bien en diferentes tamaños de pantalla, desde dispositivos móviles hasta proyectores y televisores.

    Notificaciones Interactivas: Mensajes de confirmación y error mediante toasts (SweetAlert2) que se pueden cerrar con un clic o con un botón "X".

    Control de Dropdown: El menú de configuración se cierra automáticamente al hacer clic fuera de él.

🛠️ Tecnologías Utilizadas

Este proyecto fue construido utilizando las siguientes tecnologías modernas:

    Vite: Un bundler de próxima generación para proyectos web, que ofrece un desarrollo rápido y optimizado.

    TypeScript: Un superset de JavaScript que añade tipado estático, mejorando la robustez y mantenibilidad del código.

    Tailwind CSS: Un framework CSS de bajo nivel que permite construir diseños personalizados rápidamente con clases de utilidad.

    Font Awesome: Biblioteca de iconos escalables para elementos visuales.

    SweetAlert2: Una librería para crear alertas y modales personalizables e interactivos.

🚀 Instalación y Ejecución

Sigue estos pasos para tener el proyecto funcionando en tu máquina local.
Prerrequisitos

Asegúrate de tener Node.js y npm (o yarn) instalados en tu sistema.

    Node.js (incluye npm)

Pasos

    Clonar el repositorio:

    git clone git@github.com:JaviMejias/bingo.git
    cd bingo

    Nota: Si tienes problemas con SSH, puedes usar HTTPS:

    git clone https://github.com/JaviMejias/bingo.git
    cd bingo

    Instalar dependencias:

    npm install
    # o si usas yarn
    # yarn install

    Ejecutar la aplicación en modo desarrollo:

    npm run dev
    # o si usas yarn
    # yarn dev

    Esto iniciará un servidor de desarrollo y abrirá la aplicación en tu navegador predeterminado (generalmente en http://localhost:5173/).

    Construir para producción (opcional):

    Si deseas generar una versión optimizada para despliegue, ejecuta:

    npm run build
    # o si usas yarn
    # yarn build

    Esto creará los archivos de producción en la carpeta dist/.