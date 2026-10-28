// Remember only email, never a password or decryptable ciphertext.
const DATABASE = 'verifyx-remembered-credentials-v1';
const STORE = 'keys';
const KEY_ID = 'aes-gcm-key';

const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (encoded) => Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB || !globalThis.crypto?.subtle) return reject(new Error('Secure browser storage is unavailable.'));
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getEncryptionKey(create = false) {
  const db = await openDatabase();
  try {
    const saved = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY_ID);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    if (saved || !create) return saved;
    const generated = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(generated, KEY_ID);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    return generated;
  } finally { db.close(); }
}

export function forgetCredentials(storageKey) {
  try { localStorage.removeItem(storageKey); } catch { /* Storage blocked. */ }
}

export async function saveRememberedCredentials(storageKey, email, password) {
  localStorage.setItem(storageKey, JSON.stringify({ email }));
}

export async function readRememberedCredentials(storageKey) {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); }
  catch { forgetCredentials(storageKey); return { email: '', password: '' }; }
  if (typeof saved?.email !== 'string' || !saved.email) return { email: '', password: '' };
  // Legacy builds once saved plaintext passwords. Never load those records.
  if (Object.hasOwn(saved, 'password')) {
    localStorage.setItem(storageKey, JSON.stringify({ email: saved.email }));
    return { email: saved.email, password: '' };
  }
  if (saved.iv || saved.ciphertext) localStorage.setItem(storageKey, JSON.stringify({ email: saved.email }));
  return { email: saved.email, password: '' };
}
