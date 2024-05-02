import { startGame } from "@/actions/game";
import { CopyGameLinkButton, JoinGameForm } from "@/components/join-game";
import { SumissionList } from "@/components/list-submissions";
import { StartGameButton } from "@/components/start-game";
import { SubmitQuipForm } from "@/components/submit-quip";
import { Button } from "@/components/ui/button";
import { STATES, getGameState } from "@/data/game";
// import { sql } from "@/db/db";
import { auth } from "@/lib/auth";
import _ from "lodash";
import Link from "next/link";
import { Suspense } from "react";
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

async function AuthorizedGame({
  playerId,
  gameId,
}: {
  playerId: number;
  gameId: number;
}) {
  const { nextSubmission, state } = await getGameState(gameId, playerId);

  const game = {
    [STATES.NOT_STARTED]: () => <StartGameButton gameId={gameId} />,
    [STATES.PLAYER_PLAYING]: () => <PlayQuip submission={nextSubmission!} />,
    [STATES.PLAYER_DONE]: () => (
      <Link href={`/games/${gameId}`}>
        You completed your prompts. Click here to check out the other
        submissions
        {/* TODO does this work */}
      </Link>
    ),
    [STATES.COMPLETED]: () => (
      <>
        <Submissions playerId={playerId} />
        <Link href="/new-game">
          <Button>New Game</Button>
        </Link>
      </>
    ),
  } as const;
  const Game = game[state];
  return (
    <div className="flex flex-col justify-center w-full">
      <div className="flex justify-between">
        <GamePlayersList playerId={playerId} gameId={gameId} />
        {state === STATES.NOT_STARTED && <CopyGameLinkButton />}
      </div>
      <Game />
    </div>
  );
}

type Submission = {
  content: string | null;
  prompt_content: string;
  prompt_id: number;
  player_id: number;
};
async function PlayQuip({ submission }: { submission: Submission }) {
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

async function Submissions({ playerId }: { playerId: number }) {
  const res = (
    await sql`SELECT players.name, submissions.content, prompts.content as prompt_content
  FROM players
  INNER JOIN submissions ON players.id = submissions.player_id
  INNER JOIN prompts ON submissions.prompt_id = prompts.id
  WHERE players.game_id = (SELECT game_id FROM players WHERE id = ${playerId})`
  ).rows as { name: string; content: string; prompt_content: string }[];
  console.log(res);
  return <SumissionList submissions={res} />;
}
