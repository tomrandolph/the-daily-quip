"use client";
import { startGame } from "@/actions/game";
import { Button } from "./ui/button";

export async function StartGameButton({ gameId }: { gameId: string }) {
  return <Button onClick={() => startGame(gameId)}>Start Game</Button>;
}
