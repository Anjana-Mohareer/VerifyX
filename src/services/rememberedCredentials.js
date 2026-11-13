// Credentials are opt-in, encrypted using a non-exportable per-origin WebCrypto key.
// Never persist plaintext passwords in localStorage, on either Vite port.
const DATABASE = 'verifyx-remembered-credentials-v1';
const STORE = 'keys';
const KEY_ID = 'aes-gcm-key';
const encode = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB || !globalThis.crypto?.subtle) return reject(new Error('Secure credential storage unavailable.'));
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function getEncryptionKey(create = false) {
  const db = await openDatabase();
  try {
    let key = await new Promise((resolve, reject) => {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY_ID);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
    if (!key && create) {
      key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(key, KEY_ID);
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
    }
    return key;
  } finally { db.close(); }
}
export function forgetCredentials(storageKey) {
  try { localStorage.removeItem(storageKey); } catch { /* Browser blocked storage. */ }
}
export async function saveRememberedCredentials(storageKey, email, password) {
  if (!email || !password) return forgetCredentials(storageKey);
  const key = await getEncryptionKey(true);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(password));
  localStorage.setItem(storageKey, JSON.stringify({ email, iv: encode(iv), ciphertext: encode(ciphertext) }));
}
export async function readRememberedCredentials(storageKey) {
  const empty = { email: '', password: '' };
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); }
  catch { forgetCredentials(storageKey); return empty; }
  if (typeof saved?.email !== 'string' || !saved.email) return empty;
  // Discard legacy plaintext records rather than exposing old credentials.
  if (Object.hasOwn(saved, 'password')) { forgetCredentials(storageKey); return { email: saved.email, password: '' }; }
  if (!saved.iv || !saved.ciphertext) return { email: saved.email, password: '' };
  try {
    const key = await getEncryptionKey();
    if (!key) throw new Error('Key unavailable');
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(saved.iv) }, key, decode(saved.ciphertext));
    return { email: saved.email, password: new TextDecoder().decode(decrypted) };
  } catch { forgetCredentials(storageKey); return { email: saved.email, password: '' }; }
}
