import { startGame } from "@/actions/game";
import { CopyGameLinkButton, JoinGameForm } from "@/components/join-game";
import { SumissionList } from "@/components/list-submissions";
import { StartGameButton } from "@/components/start-game";
import { SubmitQuipForm } from "@/components/submit-quip";
import { Button } from "@/components/ui/button";
import { sql } from "@/db/db";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: { gameId: string } }) {
  console.log("gameId", params.gameId);
  const playerId = cookies().get("player-id")?.value; // TODO jwt
  const res = await sql`SELECT *
  FROM games
  WHERE games.id = ${params.gameId}`;
  if (!res.rowCount) {
    notFound();
  }

  const player = (
    await sql`SELECT players.name
  FROM games
  INNER JOIN players ON games.id = players.game_id
  WHERE games.id = ${params.gameId}
  AND players.id = ${playerId}`
  ).rows[0] as { name: string } | undefined;

  const totalSubmissions = (
    await sql`SELECT *
  FROM submissions
  INNER JOIN players ON submissions.player_id = players.id
  WHERE game_id = ${params.gameId}`
  ).rowCount;
  const gameStarted = totalSubmissions > 0;
  const gameCompleted =
    (
      await sql`SELECT *
  FROM submissions
  INNER JOIN players ON submissions.player_id = players.id
  WHERE game_id = ${params.gameId}
  AND content IS NOT NULL`
    ).rowCount == totalSubmissions && gameStarted;

  const nextSubmission = (
    await sql`SELECT submissions.content, prompts.content as prompt_content, prompts.id as prompt_id, player_id
      FROM submissions
      INNER JOIN prompts ON submissions.prompt_id = prompts.id
      WHERE player_id = ${playerId}
      AND submissions.content IS NULL
      LIMIT 1
  `
  ).rows[0] as Submission | undefined;
  const STATES = {
    NOT_JOINED: "NOT_JOINED",
    NOT_STARTED: "NOT_STARTED",
    PLAYER_PLAYING: "PLAYER_PLAYING",
    PLAYER_DONE: "PLAYER_DONE",
    COMPLETED: "COMPLETED",
  } as const;

  const STATE = !player
    ? STATES.NOT_JOINED
    : gameCompleted
    ? STATES.COMPLETED
    : gameStarted
    ? nextSubmission
      ? STATES.PLAYER_PLAYING
      : STATES.PLAYER_DONE
    : STATES.NOT_STARTED;

  const game = {
    [STATES.NOT_JOINED]: () => (
      <>
        <p>Join the game</p>
        <JoinGameForm gameId={params.gameId} />
      </>
    ),
    [STATES.NOT_STARTED]: () => <StartGameButton gameId={params.gameId} />,
    [STATES.PLAYER_PLAYING]: () => <PlayQuip submission={nextSubmission!} />,
    [STATES.PLAYER_DONE]: () => (
      <Link href={`/games/${params.gameId}`}>
        You completed your prompts. Click here to check out the other
        submissions
      </Link>
    ),
    [STATES.COMPLETED]: () => (
      <>
        <Submissions gameId={params.gameId} />
        <Link href="/new-game">
          <Button>New Game</Button>
        </Link>
      </>
    ),
  } as const;
  const Game = game[STATE];
  return (
    <main className="px-8 flex flex-col gap-2">
      {STATE !== STATES.NOT_JOINED && (
        <div className="flex gap-8 w-full justify-between">
          <GamePlayersList gameId={params.gameId} />
          <CopyGameLinkButton gameId={params.gameId} />
        </div>
      )}
      <Game />
    </main>
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
      <SubmitQuipForm
        playerId={submission.player_id}
        promptId={submission.prompt_id}
      />
    </div>
  );
}

async function GamePlayersList({ gameId }: { gameId: string }) {
  const res = await sql`SELECT players.name
  FROM players
  WHERE players.game_id = ${gameId}`;
  return (
    <ul className="flex gap-2">
      {res.rows.map((row) => (
        <li key={row.name}>{row.name}</li>
      ))}
    </ul>
  );
}

async function Submissions({ gameId }: { gameId: string }) {
  const res = (
    await sql`SELECT players.name, submissions.content, prompts.content as prompt_content
  FROM players
  INNER JOIN submissions ON players.id = submissions.player_id
  INNER JOIN prompts ON submissions.prompt_id = prompts.id
  WHERE players.game_id = ${gameId}`
  ).rows as { name: string; content: string; prompt_content: string }[];
  console.log(res);
  return <SumissionList submissions={res} />;
}
