export async function deriveKey(password: string, salt?: Uint8Array) {
  const encoder = new TextEncoder();
  salt = salt ?? window.crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000, // A higher number of iterations increases security
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  return { key, salt };
}

export async function encryptMessage(key: CryptoKey, message: string) {
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = encoder.encode(message);

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encodedMessage
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    iv: iv,
  };
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Decryption Function
export async function decryptMessage(
  key: CryptoKey,
  ciphertext: ArrayBuffer,
  iv: ArrayBuffer
) {
  const decoder = new TextDecoder();
  try {
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      ciphertext
    );
    console.log("Decrypted message:", decrypted);
    return decoder.decode(decrypted);
  } catch (e) {
    console.error("Decryption failed", e);

    return null;
  }
}

// Base64 to ArrayBuffer conversion function
export function base64ToArrayBuffer(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  let bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
