"use client";

import { submitQuip } from "@/actions/game";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useFormState } from "react-dom";
import { useEffect, useState } from "react";
import { useEncryption } from "@/hooks/use-crypto";

export const SubmitQuipForm = ({ gameId }: { gameId: string }) => {
  const [state, action] = useFormState(submitQuip, undefined);
  const [text, setText] = useState("");
  const { encrypted, encrypt } = useEncryption();
  console.log(encrypted);
  const errors = state?.errors;
  console.log("errors", errors);

  return (
    <form action={action}>
      <Label>Quip</Label>
      <Input
        type="text"
        onInput={(e) => {
          setText(e.currentTarget.value);
          encrypt(e.currentTarget.value);
        }}
        value={text}
      />
      <Input type="hidden" name="text" value={encrypted ?? ""} />
      {!errors?.other && errors?.text && (
        <p className="text-red-400">{errors.text}</p>
      )}
      <input type="hidden" name="gameId" value={gameId} />
      {errors?.other && <p className="text-red-400">{errors.other}</p>}
      <Button type="submit" disabled={!encrypted || !text}>
        Submit Quip
      </Button>
    </form>
  );
};
