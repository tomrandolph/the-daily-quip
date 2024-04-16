"use client";
import { useDecryption } from "@/hooks/use-crypto";

export const SumissionList = ({ submissions }: { submissions: string[] }) => {
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
