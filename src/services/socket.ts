import { io } from 'socket.io-client';

// We use relative path or configured URL depending on environment.
// For Docker deployment where both run on the same server, we use the same hostname but port 4001
const backendHost = window.location.hostname;
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || `http://${backendHost}:4001`;

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
