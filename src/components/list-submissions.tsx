"use client";
import { useDecryption } from "@/hooks/use-crypto";
import _ from "lodash";
export const SubmissionList = ({
  submissions,
}: {
  submissions: {
    player_name: string;
    content: string;
    prompt_content: string;
  }[];
}) => {
  console.log(_.groupBy(submissions, "prompt_content"));
  return (
    <div>
      <h1 className="text-xl font-extrabold">Submissions</h1>
      <ul className="gap-2 flex flex-col">
        {Object.entries(_.groupBy(submissions, "prompt_content")).map(
          ([prompt, submissions], i) => (
            <div key={i} className="rounded-md border-2">
              <h2 className="font-bold text-lg">{prompt}</h2>
              {submissions.map((submission, i) => (
                <div className="flex gap-2" key={i}>
                  <p className="font-bold">{submission.player_name}:</p>
                  <DecryptedMessage message={submission.content} />
                </div>
              ))}
            </div>
          )
        )}
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
