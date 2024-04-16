"use client";
import { useDecryption } from "@/hooks/use-crypto";
import { use, useEffect } from "react";
import { decryptMessage, deriveKey, encryptMessage } from "@/lib/crypto";

const enc = async () => {
  const key = await deriveKey("password");
  const e = await encryptMessage(key.key, "hello world");
  return { ...e, salt: key.salt };
};

const dec = async (e: {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  salt: Uint8Array;
}) => {
  const k = await deriveKey("password", e.salt);
  const d = await decryptMessage(k.key, e.ciphertext, e.iv);
  return d;
};

export const SumissionList = ({ submissions }: { submissions: string[] }) => {
  //   useEffect(() => {
  //     enc().then((e) => {
  //       console.log(e);
  //       dec(e).then((d) => {
  //         console.log(d);
  //       });
  //     });
  //   }, []);
  return (
    <div>
      <h1>Submissions</h1>
      <ul>
        {submissions.map((submission, i) => (
          <DecryptedMessage key={i} message={submission} />
        ))}
      </ul>
    </div>
  );
};

const DecryptedMessage = ({ message }: { message: string }) => {
  const decrypted = useDecryption(message);

  return (
    <div>
      <p>{decrypted}</p>
    </div>
  );
};
