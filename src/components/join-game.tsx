"use client";

import { useFormState } from "react-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { joinGame } from "@/actions/game";
import { useState } from "react";

export const JoinGameForm = ({ gameId }: { gameId: number }) => {
  const [state, action] = useFormState(joinGame, undefined);

  const errors = state?.errors;
  console.log("errors", errors);

  return (
    <form action={action}>
      <Label>Name</Label>
      <Input type="text" name="name" />
      {!errors?.other && errors?.name && (
        <p className="text-red-400">{errors.name}</p>
      )}
      <Label>Password</Label>
      <Input
        type="password"
        name="password"
        onInput={(e) =>
          window.localStorage.setItem("password", e.currentTarget.value)
        }
      />
      <input type="hidden" name="gameId" value={gameId} />
      {errors?.password && <p className="text-red-400">{errors.password}</p>}
      {errors?.other && <p className="text-red-400">{errors.other}</p>}
      <Button type="submit" onSubmit={() => {}}>
        Join Game
      </Button>
    </form>
  );
};

export const CopyGameLinkButton = () => {
  return (
    <Button
      variant={"secondary"}
      onClick={() => {
        navigator.clipboard.writeText(`${window.location.href}`);
      }}
    >
      Copy Game Link
    </Button>
  );
};
