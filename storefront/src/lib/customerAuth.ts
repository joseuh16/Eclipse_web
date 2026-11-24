// ---------------------------------------------------------------------------
// Autenticación de clientes con Firebase Auth.
// El perfil se guarda en RTDB: usuarios_clientes/<uid>.
// Los clientes antiguos NO se borran: solo se agregan campos nuevos.
// ---------------------------------------------------------------------------
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { get, onValue, ref, update } from 'firebase/database'
import { auth, rtdb } from './firebase'
import { uploadStudentCredential } from './storage'
import type { CustomerProfile } from '../types'

export interface RegisterCustomerInput {
  name: string
  email: string
  password: string
  isStudent: boolean
  /** DataURL comprimida de la credencial (solo si isStudent). */
  credential?: string
}

/** Reglas de contraseña pedidas por el negocio + las de Firebase. */
export function passwordErrors(password: string): string[] {
  const errors: string[] = []
  if (password.length < 6) errors.push('6 caracteres')
  if (!/[A-Z]/.test(password)) errors.push('una mayúscula')
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('un símbolo')
  return errors
}

export function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ese correo ya tiene una cuenta. Inicia sesión con tu contraseña.'
    case 'auth/invalid-email':
      return 'Escribe un correo válido.'
    case 'auth/weak-password':
      return 'La contraseña es muy débil. Usa mayúscula y símbolo.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento y vuelve a intentar.'
    case 'auth/network-request-failed':
      return 'Sin conexión con Firebase. Revisa tu internet e inténtalo de nuevo.'
    default:
      return error instanceof Error ? error.message : 'No pudimos completar la operación.'
  }
}

/** true si el correo ya está registrado en Firebase Auth. */
export async function hasAccount(email: string): Promise<boolean> {
  const methods = await fetchSignInMethodsForEmail(auth, email.trim())
  return methods.length > 0
}

function profilePath(uid: string) {
  return `usuarios_clientes/${uid}`
}

function mapProfile(uid: string, raw: Record<string, any>, fallback: Partial<CustomerProfile> = {}): CustomerProfile {
  const now = new Date().toISOString()
  return {
    uid,
    email: String(raw.email ?? fallback.email ?? ''),
    displayName: String(raw.displayName ?? raw.nombre ?? fallback.displayName ?? ''),
    isStudent: Boolean(raw.isStudent ?? raw.estudiante ?? fallback.isStudent ?? false),
    studentApproved: Boolean(raw.studentApproved ?? fallback.studentApproved ?? false),
    studentCredentialUrl: String(raw.studentCredentialUrl ?? fallback.studentCredentialUrl ?? ''),
    createdAt: String(raw.createdAt ?? fallback.createdAt ?? now),
    updatedAt: String(raw.updatedAt ?? now),
  }
}

/** Lee el perfil. Si no existe, lo crea sin sobrescribir datos antiguos. */
export async function ensureCustomerProfile(user: User): Promise<CustomerProfile> {
  const path = profilePath(user.uid)
  const snap = await get(ref(rtdb, path)).catch(() => null)
  if (snap?.exists()) {
    return mapProfile(user.uid, snap.val() as Record<string, any>, {
      email: user.email ?? '',
      displayName: user.displayName ?? '',
    })
  }

  const now = new Date().toISOString()
  const initial: Record<string, unknown> = {
    email: user.email ?? '',
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Cliente',
    isStudent: false,
    studentApproved: false,
    studentCredentialUrl: '',
    createdAt: now,
    updatedAt: now,
  }
  // update() no reemplaza el nodo completo: respeta clientes que ya existían.
  await update(ref(rtdb, path), initial).catch(() => undefined)
  return mapProfile(user.uid, initial)
}

export async function getCustomerProfile(uid: string): Promise<CustomerProfile | null> {
  const snap = await get(ref(rtdb, profilePath(uid))).catch(() => null)
  if (!snap?.exists()) return null
  return mapProfile(uid, snap.val() as Record<string, any>)
}

export async function signInCustomer(email: string, password: string): Promise<CustomerProfile> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password)
  return ensureCustomerProfile(result.user)
}

export async function registerCustomer(input: RegisterCustomerInput): Promise<CustomerProfile> {
  const email = input.email.trim()
  const name = input.name.trim()
  const problems = passwordErrors(input.password)
  if (problems.length > 0) {
    throw new Error(`La contraseña necesita ${problems.join(', ')}.`)
  }
  if (name.length < 2) {
    throw new Error('Escribe tu nombre completo.')
  }
  if (input.isStudent && !input.credential) {
    throw new Error('Adjunta tu credencial de estudiante para solicitar el descuento.')
  }

  const result = await createUserWithEmailAndPassword(auth, email, input.password)
  await updateProfile(result.user, { displayName: name }).catch(() => undefined)
  const profile = await ensureCustomerProfile(result.user)

  if (input.isStudent && input.credential) {
    return attachStudentCredential(result.user, profile, input.credential)
  }
  return profile
}

export async function attachStudentCredential(
  user: User,
  profile: CustomerProfile,
  dataUrl: string,
): Promise<CustomerProfile> {
  const credentialUrl = await uploadStudentCredential(dataUrl, user.uid)
  const now = new Date().toISOString()
  await update(ref(rtdb, profilePath(user.uid)), {
    isStudent: true,
    // El cliente NUNCA puede aprobarse a sí mismo (validación en las reglas).
    studentApproved: profile.studentApproved,
    studentCredentialUrl: credentialUrl,
    updatedAt: now,
  })
  return {
    ...profile,
    isStudent: true,
    studentCredentialUrl: credentialUrl,
    updatedAt: now,
  }
}

export async function logoutCustomer(): Promise<void> {
  await signOut(auth)
}

export function watchCustomerAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

/** Escucha el perfil en RTDB para reflejar al instante la aprobación del panel. */
export function watchCustomerProfile(
  uid: string,
  callback: (profile: CustomerProfile | null) => void,
): () => void {
  return onValue(
    ref(rtdb, profilePath(uid)),
    (snap) => {
      callback(snap.exists() ? mapProfile(uid, snap.val() as Record<string, any>) : null)
    },
    () => callback(null),
  )
}
