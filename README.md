# 🎲 Bingo Neón Multiplayer

Una aplicación web interactiva, multijugador y en tiempo real, diseñada para gestionar y jugar partidas de bingo. Ideal para reuniones familiares, eventos en vivo y streaming, permitiendo que un Anfitrión dirija el juego mientras los jugadores se unen desde sus propios dispositivos mediante códigos de sala únicos.

---

## ✨ Características y Módulos Clave

### 🎮 Arquitectura Multijugador en Tiempo Real
* **Salas Privadas:** Los anfitriones pueden crear salas únicas con códigos de 6 letras para que los jugadores se unan.
* **Sincronización Instantánea:** Gracias a **Socket.IO**, cualquier número sacado, cartón cantado o reinicio de tablero se refleja en milisegundos en las pantallas de todos los participantes.
* **Sistema de "Garbage Collection":** Las salas inactivas por más de 24 horas se eliminan automáticamente para mantener el servidor optimizado.

### 👑 Controles del Anfitrión (Host)
* **Modo Tómbola Automática:** Sorteo automatizado con animaciones dinámicas que evita sacar números repetidos.
* **Modo Manual:** El anfitrión puede marcar directamente en el tablero los números cantados.
* **Gestión de Ganadores:** Cuando un jugador canta "Bingo" o "Binguito", el anfitrión recibe una alerta y puede validar el cartón (animación de victoria y registro en el historial) o descartarlo como falsa alarma.
* **Historial de Ganadores:** Registro detallado de todos los ganadores de la sesión.
* **Configuración de Rango:** Ajuste del número máximo del bingo (ej. 75, 90, o hasta 150) adaptándose a cualquier variante.

### 📱 Experiencia del Jugador (Player)
* **Interfaz de Solo Visualización:** El tablero se mantiene siempre sincronizado con el anfitrión.
* **Botones de Alerta:** Botones dedicados para cantar "Bingo" (Cartón lleno) o "Binguito" que notifican inmediatamente al anfitrión.

---

## 🛠️ Tecnologías Utilizadas

El proyecto utiliza un stack tecnológico moderno, dividido en Frontend y Backend:

### Frontend (Interfaz de Usuario)
* **Vite:** Bundler ultrarrápido para el desarrollo frontend.
* **TypeScript:** Tipado estático para un código robusto y libre de errores.
* **Tailwind CSS:** Diseño moderno, utilitario y totalmente responsivo (adaptable a móviles y pantallas gigantes).
* **SweetAlert2 & FontAwesome:** Alertas interactivas premium y sistema de iconografía vectorial.

### Backend & DevOps
* **Node.js & Express:** Servidor backend ligero y eficiente.
* **Socket.IO:** Motor de comunicación bidireccional mediante WebSockets (con soporte de reconexión y fallbacks).
* **Docker & Docker Compose:** Contenerización completa que incluye tanto el backend como el frontend (servido mediante un proxy reverso Nginx para tráfico seguro).

---

## 🚀 Despliegue e Instalación

### 🐳 Opción 1: Con Docker (Recomendado para Producción)

Esta es la forma más sencilla y segura de levantar ambos servicios (Frontend y Backend) listos para producción con soporte para HTTPS/Reverse Proxies.

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/JaviMejias/bingo.git
   cd bingo
   ```

2. **Levantar los contenedores:**
   ```bash
   docker-compose up -d --build
   ```
   *El frontend quedará expuesto en el puerto `8081` y Nginx enrutará internamente el tráfico de WebSockets hacia el backend en el puerto `4001`.*

3. **Detener el servicio:**
   ```bash
   docker-compose down
   ```

### 💻 Opción 2: Desarrollo Local Manual

Ideal para modificar el código y ver los cambios en tiempo real gracias a HMR (Hot Module Replacement) y Nodemon.

1. **Instalar dependencias globales y del backend:**
   ```bash
   npm install
   cd backend && npm install
   cd ..
   ```

2. **Ejecutar Frontend y Backend simultáneamente:**
   ```bash
   npm run dev
   ```
   *Esto iniciará el backend en el puerto `4001` y el frontend de Vite en el puerto `5173`. Abre `http://localhost:5173` en tu navegador.*

### 📦 Construcción Manual (Producción sin Docker)
Si necesitas compilar los archivos estáticos del frontend:
```bash
npm run build
```
Generará la carpeta `dist/` lista para ser servida por cualquier servidor web tradicional (Apache, Nginx, etc.).

---

## 👨‍💻 Autor

**Javier Mejías** – Desarrollador Full-Stack  
[Perfil de LinkedIn](https://www.linkedin.com/in/javier-mejías-655a7936a)

---

## 📄 Licencia

Este proyecto está licenciado bajo la MIT License. Consulta el archivo [LICENSE](LICENSE) para más detalles.
