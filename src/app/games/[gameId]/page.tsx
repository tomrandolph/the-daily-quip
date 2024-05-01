import { startGame } from "@/actions/game";
import { CopyGameLinkButton, JoinGameForm } from "@/components/join-game";
import { SumissionList } from "@/components/list-submissions";
import { StartGameButton } from "@/components/start-game";
import { SubmitQuipForm } from "@/components/submit-quip";
import { Button } from "@/components/ui/button";
import { sql } from "@/db/db";
import { auth } from "@/lib/auth";
import _ from "lodash";
import Link from "next/link";
import { Suspense } from "react";

export default async function Page({ params }: { params: { gameId: number } }) {
  const playerId = await auth();
  if (!playerId) {
    console.error("no player id");
  }

  return (
    <main className="px-8 flex flex-col gap-2">
      <Suspense>
        {!playerId ? (
          <div className="flex flex-col gap-8 w-full">
            <>
              <p>Join the game</p>
              <JoinGameForm gameId={params.gameId} />
            </>
          </div>
        ) : (
          <AuthorizedGame playerId={playerId} />
        )}
      </Suspense>
    </main>
  );
}

async function AuthorizedGame({ playerId }: { playerId: number }) {
  type Submission = {
    prompt_id: number;
    player_id: number;
    prompt_content: string;
    game_id: number;
    content: string | null;
  };
  const allSubmissions =
    await sql<Submission>`SELECT submissions.*, prompts.id as prompt_id, prompts.content as prompt_content, players.game_id
  FROM submissions
  LEFT JOIN prompts on prompt_id = prompts.id
  INNER JOIN players ON submissions.player_id = players.id
  WHERE game_id =  (SELECT game_id FROM players where players.id = ${playerId})`;
  const gameStarted = allSubmissions.rowCount > 0;
  const gameCompleted =
    allSubmissions.rows.every((row) => row.content) && gameStarted;

  const nextSubmission = allSubmissions.rows.find(
    (row) => row.player_id === playerId && !row.content
  );
  console.log("game start", gameStarted);
  console.log("game completed", gameCompleted);
  console.log("Submission");
  console.log(allSubmissions.rows);
  console.log(nextSubmission);

  const STATES = {
    NOT_STARTED: "NOT_STARTED",
    PLAYER_PLAYING: "PLAYER_PLAYING",
    PLAYER_DONE: "PLAYER_DONE",
    COMPLETED: "COMPLETED",
  } as const;

  const STATE = gameCompleted
    ? STATES.COMPLETED
    : gameStarted
    ? nextSubmission
      ? STATES.PLAYER_PLAYING
      : STATES.PLAYER_DONE
    : STATES.NOT_STARTED;

  const game = {
    [STATES.NOT_STARTED]: () => <StartGameButton gameId={info.game_id} />,
    [STATES.PLAYER_PLAYING]: () => <PlayQuip submission={nextSubmission!} />,
    [STATES.PLAYER_DONE]: () => (
      <Link href={`/games/${info.game_id}`}>
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
  const Game = game[STATE];
  return (
    <div className="flex flex-col justify-center w-full">
      <div className="flex justify-between">
        <GamePlayersList playerId={playerId} />
        {STATE === STATES.NOT_STARTED && <CopyGameLinkButton />}
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

async function GamePlayersList({ playerId }: { playerId: number }) {
  const res = await sql`SELECT players.name
  FROM players
  WHERE players.game_id = (SELECT game_id FROM players WHERE id = ${playerId})`;

  return (
    <ul className="flex gap-2">
      {res.rows.map((row) => (
        <li key={row.name}>{row.name}</li>
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
