"use client";

import { createGame } from "@/actions/game";
import { useFormState } from "react-dom";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

export const CreateGameForm = ({
  alreadyInGame,
}: {
  alreadyInGame: boolean;
}) => {
  const [state, action] = useFormState(createGame, undefined);
  const errors = state?.errors;
  return (
    <form action={action}>
      {alreadyInGame && (
        <p className="text-red-500 font-bold">
          Warning: Creating a new game will revoke access to the game you are
          already in
        </p>
      )}
      <Label>Password</Label>
      <Input type="password" name="password" />
      {errors?.password && <p className="text-red-400">{errors.password}</p>}
      <button type="submit">Create Game</button>
    </form>
  );
};
