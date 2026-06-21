import { io } from 'socket.io-client';

// En producción (cuando accedemos desde el dominio), usamos '/' para que Socket.io
// se conecte al mismo dominio (por HTTPS) y Nginx enruta el tráfico al backend.
const isDevelopment = window.location.port === '5173' || window.location.port === '5174';
const SOCKET_URL = isDevelopment ? `http://${window.location.hostname}:4001` : '/';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
});

// User session variables (simulating Firebase anonymous auth)
export const auth = {
  currentUser: {
    uid: localStorage.getItem('bingo_uid') || generateAndSaveUid()
  }
};

function generateAndSaveUid() {
  const uid = Math.random().toString(36).substring(2, 15);
  localStorage.setItem('bingo_uid', uid);
  return uid;
}

// Emulates authReady from Firebase
export const authReady = Promise.resolve(auth.currentUser);
