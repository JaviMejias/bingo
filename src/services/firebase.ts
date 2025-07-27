import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBDvgIKNDISmL50yL6Uo25kKWGNw1jsmXY",
  authDomain: "bingoappweb.firebaseapp.com",
  projectId: "bingoappweb",
  storageBucket: "bingoappweb.firebasestorage.app",
  messagingSenderId: "951343253421",
  appId: "1:951343253421:web:163b9de8acb6db3bb00324"
};

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const authReady = new Promise<typeof auth.currentUser>((resolve, reject) => {
  onAuthStateChanged(auth, (user) => {
    if (user) resolve(user)
    else signInAnonymously(auth).catch(reject)
  })
})

export { auth, db, authReady }
