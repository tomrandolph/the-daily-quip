import { Suspense } from "react";
import _ from "lodash";
import Link from "next/link";
import { CopyGameLinkButton, JoinGameForm } from "@/components/join-game";
import { SubmissionList } from "@/components/list-submissions";
import { StartGameButton } from "@/components/start-game";
import { SubmitQuipForm } from "@/components/submit-quip";
import { Button } from "@/components/ui/button";
import type { PossibleStates, Submission } from "@/data/game";
import { auth } from "@/lib/auth";
import * as game from "@/data/game";

export default async function Page({ params }: { params: { gameId: number } }) {
  const playerId = await auth();
  if (!playerId) {
    console.error("no player id");
  }

  const currentGame = await game.getCurrentGame(playerId);

  const playerInThisGame = currentGame.gameId == params.gameId;

  return (
    <main className="px-8 flex flex-col gap-2">
      <Suspense>
        {!playerInThisGame || !playerId ? (
          <div className="flex flex-col gap-8 w-full">
            <>
              <p>Join the game</p>
              <JoinGameForm gameId={params.gameId} />
            </>
          </div>
        ) : (
          <AuthorizedGame playerId={playerId} gameId={params.gameId} />
        )}
      </Suspense>
    </main>
  );
}

function Game({ gameId, game }: { gameId: number; game: PossibleStates }) {
  switch (game.state) {
    case "NOT_STARTED":
      return <StartGameButton gameId={gameId} />;
    case "PLAYER_PLAYING":
      return <PlayQuip submission={game.nextSubmission} />;
    case "PLAYER_DONE":
      return (
        <Link href={`/games/${gameId}`}>
          You completed your prompts. Click here to check out the other
          submissions
          {/* TODO does this work */}
        </Link>
      );
    case "COMPLETED":
      return (
        <>
          <SubmissionList submissions={game.allSubmissions} />
          <Link href="/new-game">
            <Button>New Game</Button>
          </Link>
        </>
      );
  }
}

async function AuthorizedGame({
  playerId,
  gameId,
}: {
  playerId: number;
  gameId: number;
}) {
  const gameState = await game.getGameState(gameId, playerId);

  return (
    <div className="flex flex-col justify-center w-full">
      <div className="flex justify-between">
        <GamePlayersList playerId={playerId} gameId={gameId} />
        {gameState.state === "NOT_STARTED" && <CopyGameLinkButton />}
      </div>
      <Game gameId={gameId} game={gameState} />
    </div>
  );
}

async function PlayQuip({ submission }: { submission: Submission<null> }) {
  console.log(submission);
  return (
    <div>
      <p>{submission.prompt_content}</p>
      <SubmitQuipForm promptId={submission.prompt_id} />
    </div>
  );
}

async function GamePlayersList({
  playerId,
  gameId,
}: {
  playerId: number;
  gameId: number;
}) {
  const players = await game.getPlayersInGame(gameId, playerId);
  return (
    <ul className="flex gap-2">
      {players.map((player) => (
        <li key={player.name}>{player.name}</li>
      ))}
    </ul>
  );
}
