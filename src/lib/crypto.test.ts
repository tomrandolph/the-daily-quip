import { decryptMessage, deriveKey, encryptMessage } from "./crypto";
const enc = async () => {
  const key = await deriveKey("password");
  const e = await encryptMessage(key, "hello world");
  return e;
};

const dec = async (stuff: { ciphertext: Uint8Array; iv: Uint8Array }) => {
  const key = await deriveKey("password");
  const d = await decryptMessage(key, e.ciphertext, e.iv);
  return d;
};

enc().then((e) => {
  console.log(e);
  dec(e).then((d) => {
    console.log(d);
  });
});
