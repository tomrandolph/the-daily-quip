"use client";
import { startGame } from "@/actions/game";
import { Button } from "./ui/button";
import { useState } from "react";
import { useFormState } from "react-dom";

export function StartGameButton({ gameId }: { gameId: string }) {
  const [state, action] = useFormState(startGame, undefined);
  console.log(state);
  return (
    <form action={action}>
      <input type="hidden" name="gameId" value={gameId} />
      <Button type="submit">Start Game</Button>
      {state?.errors?.other && (
        <p className="text-red-400">{state.errors?.other}</p>
      )}
    </form>
  );
}
