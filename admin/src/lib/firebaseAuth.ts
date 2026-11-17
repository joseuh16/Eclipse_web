// ---------------------------------------------------------------------------
// Firebase Auth — módulo aislado de autenticación del panel.
// Solo este módulo conoce cómo iniciar/cerrar sesión y cómo observar el estado
// de la sesión. El resto de la app consume `useAuth()`.
// ---------------------------------------------------------------------------
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'
import type { AdminUser } from '../types'

/** Dominio interno para permitir iniciar sesión con usuario corto (ej. "admin"). */
export const ADMIN_EMAIL_DOMAIN = 'eclipse.tech'

export function resolveEmail(identifier: string): string {
  const value = identifier.trim()
  if (!value) return value
  return value.includes('@') ? value : `${value.toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`
}

function uidToNumber(uid: string): number {
  let hash = 0
  for (let i = 0; i < uid.length; i += 1) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0
  }
  return hash || 1
}

export function toAdminUser(firebaseUser: User): AdminUser {
  return {
    id: uidToNumber(firebaseUser.uid),
    username: firebaseUser.email ?? firebaseUser.displayName ?? firebaseUser.uid,
    role: 'admin',
    lastLoginAt: firebaseUser.metadata.lastSignInTime
      ? new Date(firebaseUser.metadata.lastSignInTime).toISOString()
      : null,
  }
}

/** Mensajes legibles para los códigos de error más comunes de Firebase Auth. */
export function friendlyAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''

  switch (code) {
    case 'auth/invalid-email':
      return 'El correo no tiene un formato válido.'
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada. Contacta al administrador.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    case 'auth/network-request-failed':
      return 'Sin conexión con Firebase. Revisa tu red e inténtalo de nuevo.'
    case 'auth/operation-not-allowed':
      return 'El inicio de sesión con correo/contraseña no está habilitado en Firebase.'
    default:
      return 'No pudimos iniciar sesión. Intenta de nuevo.'
  }
}

export async function setAuthPersistence(remember: boolean): Promise<void> {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
}

export async function signInAdmin(email: string, password: string, remember: boolean): Promise<User> {
  // La persistencia define si la sesión sobrevive al cerrar el navegador.
  await setAuthPersistence(remember)
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function signOutAdmin(): Promise<void> {
  await signOut(auth)
}

/**
 * Crea el usuario administrador en Firebase Auth si aún no existe.
 * Solo se usa para aprovisionar las cuentas definidas en código.
 */
export async function signUpAdmin(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, resolveEmail(email))
}

/** Observa el estado de sesión de Firebase (fuente de verdad). */
export function watchAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}
