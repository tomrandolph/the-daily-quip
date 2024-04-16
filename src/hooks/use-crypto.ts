import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  decryptMessage,
  deriveKey,
  encryptMessage,
} from "@/lib/crypto";
import { use, useEffect, useMemo, useState } from "react";

export const useEncryption = () => {
  const [key, setKey] = useState<{ key: CryptoKey; salt: Uint8Array }>();
  const [encrypted, setEncrypted] = useState<string>();
  const loadKey = async () => {
    const password = window.localStorage.getItem("password");
    if (!password) {
      throw new Error("Password not set");
    }
    const key = await deriveKey(password);
    setKey(key);
    return key;
  };
  useEffect(() => {
    loadKey();
  }, []);
  const encrypt = async (message: string) => {
    let k = key;
    if (!k) {
      k = await loadKey();
    }
    setEncrypted(undefined);

    const encrypted = await encryptMessage(k.key, message);
    setEncrypted(
      arrayBufferToBase64(encrypted.ciphertext) +
        ":" +
        arrayBufferToBase64(encrypted.iv) +
        ":" +
        arrayBufferToBase64(k.salt)
    );
    return encrypted;
  };
  return {
    encrypted,
    encrypt,
  };
};

export const useDecryption = (message: string) => {
  const [ciphertextBase64, ivBase64, saltBase64] = message.split(":");

  const [key, setKey] = useState<CryptoKey>();
  const [decrypted, setDecrypted] = useState<string>();

  useEffect(() => {
    const loadKey = async () => {
      const password = window.localStorage.getItem("password");
      if (!password) {
        throw new Error("Password not set");
      }
      const binary_string = window.atob(saltBase64);
      const len = binary_string.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
      }

      const { key: k } = await deriveKey(password, bytes);
      setKey(k);
    };
    loadKey();
  }, [saltBase64]);
  useEffect(() => {
    const decrypt = async (key: CryptoKey) => {
      console.log("ciphertext", ciphertextBase64, "iv", ivBase64);
      // Convert Base64 back to ArrayBuffer
      const ivArray = base64ToArrayBuffer(ivBase64); // Assuming a function base64ToArrayBuffer to decode Base64 to ArrayBuffer
      const ciphertextArray = base64ToArrayBuffer(ciphertextBase64);

      const decryptedMessage = await decryptMessage(
        key,
        ciphertextArray,
        ivArray
      );
      if (!decryptedMessage) {
        throw new Error("Decryption failed");
      }
      setDecrypted(decryptedMessage);
      return decryptedMessage;
    };
    if (key) {
      decrypt(key);
    }
  }, [key, ciphertextBase64, ivBase64]);

  return decrypted;
};
