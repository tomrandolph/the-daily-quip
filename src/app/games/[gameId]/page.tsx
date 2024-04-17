import { startGame } from "@/actions/game";
import { JoinGameForm } from "@/components/join-game";
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
    await sql`SELECT player.name
  FROM games
  INNER JOIN game_players ON games.id = game_players.game_id
  INNER JOIN players AS player ON game_players.player_id = player.id
  WHERE games.id = ${params.gameId}
  AND game_players.player_id = ${playerId}`
  ).rows[0] as { name: string } | undefined;

  const totalSubmissions = (
    await sql`SELECT *
  FROM submissions
  WHERE game_id = ${params.gameId}`
  ).rowCount;
  const gameStarted = totalSubmissions > 0;
  const gameCompleted =
    (
      await sql`SELECT *
  FROM submissions
  WHERE game_id = ${params.gameId}
  AND content IS NOT NULL`
    ).rowCount == totalSubmissions && gameStarted;
  return (
    <div>
      <h1>Session {params.gameId}</h1>
      {player ? (
        <div>
          <p>Welcome back, {player.name}</p>
          <GamePlayersList gameId={params.gameId} />
          <SubmissionsList gameId={params.gameId} />
          {gameCompleted && "Game completed"}
          {gameStarted ? (
            <>
              {/* <Submissions gameId={params.gameId} /> */}
              <SubmitQuipForm gameId={params.gameId} />
            </>
          ) : (
            <StartGameButton gameId={params.gameId} />
          )}
        </div>
      ) : (
        <>
          <p>Join the game</p>
          <JoinGameForm gameId={params.gameId} />
        </>
      )}
    </div>
  );
}

async function GamePlayersList({ gameId }: { gameId: string }) {
  const res = await sql`SELECT player.name
  FROM games
  INNER JOIN game_players ON games.id = game_players.game_id
  INNER JOIN players AS player ON game_players.player_id = player.id
  WHERE games.id = ${gameId}`;
  return (
    <ul>
      {res.rows.map((row) => (
        <li key={row.name}>{row.name}</li>
      ))}
    </ul>
  );
}

async function SubmissionsList({ gameId }: { gameId: string }) {
  const res =
    await sql`SELECT players.name, prompts.content AS prompt, submissions.content as submission
  FROM submissions
  INNER JOIN prompts ON submissions.prompt_id = prompts.id
  INNER JOIN players ON submissions.player_id = players.id
  WHERE game_id = ${gameId}`;
  return (
    <ul>
      {res.rows.map((row, i) => (
        <li key={i}>{JSON.stringify(row)}</li>
      ))}
    </ul>
  );
}

async function Submissions({ gameId }: { gameId: string }) {
  const res = (
    await sql`SELECT player.name, submissions.content
  FROM games
  INNER JOIN game_players ON games.id = game_players.game_id
  INNER JOIN players AS player ON game_players.player_id = player.id
  INNER JOIN submissions ON game_players.player_id = submissions.player_id
  WHERE games.id = ${gameId}`
  ).rows as { name: string; content: string }[];
  return <SumissionList submissions={res.map((a) => a.content)} />;
}
