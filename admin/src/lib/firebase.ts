// ---------------------------------------------------------------------------
// Firebase — inicialización para el panel (Auth + Realtime Database + Firestore/Storage).
// Vinculado al proyecto Firebase/RTDB de Eclipse (solo lectura de datos existentes).
// ---------------------------------------------------------------------------
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

let app: FirebaseApp
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

export const firebaseApp: FirebaseApp = app
export const auth: Auth = getAuth(app)
export const rtdb: Database = getDatabase(app, 'https://my-admin-f0d0f-default-rtdb.firebaseio.com/')
export const db: Firestore = getFirestore(app)
export const storage: FirebaseStorage = getStorage(app)

export default app
