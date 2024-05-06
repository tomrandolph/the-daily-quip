import { sql } from "@/db/db";
import _ from "lodash";

export async function startGame(playerId: number, gameId: number) {
  try {
    console.time("insert");
    const res = await addEmptySubmissionToGame(gameId, playerId);
    console.timeEnd("insert");

    if (res.rowCount === 0) {
      return { error: "Game does not exist" };
    }
    return { error: null };
  } catch (e) {
    if (
      _.isError(e) &&
      e.message.includes("unique") &&
      e.message.includes("match_number")
    ) {
      return { error: "Game already started" };
    }
    if (_.isError(e) && e.message.includes("submissions_pkey")) {
      return { error: "Not enough players" };
    }
    return { error: "Failed to start the game" };
  }
}

function addEmptySubmissionToGame(gameId: number, playerId: number) {
  return sql`
  WITH  all_players AS (
    SELECT players.id as player_id
    FROM players
    WHERE game_id = ${gameId} -- filter requested game
    AND game_id = (SELECT game_id FROM players WHERE id = ${playerId}) -- Check that player is in game
  ), matched_player_1 AS (
    SELECT
        player_id,
        (ROW_NUMBER() OVER (ORDER BY all_players.player_id)-1) AS round
    FROM all_players
), matched_player_2 AS (
    SELECT
        player_id,
        (ROW_NUMBER() OVER (ORDER BY all_players.player_id) % ( COUNT(*) OVER ())) AS round

    FROM all_players
), random_prompts AS (
    SELECT
        id,
        (ROW_NUMBER() OVER (ORDER BY RANDOM())-1) AS round
    FROM prompts
    WHERE adult = false
), player_matches AS (
    SELECT *, 1 as match_number
    FROM matched_player_1
    UNION
    SELECT *, 2 as match_number
    FROM matched_player_2
)
INSERT INTO submissions (player_id, prompt_id, match_number) (
    SELECT
        player_id,
        random_prompts.id as prompt_id,
        match_number
    FROM player_matches
    LEFT JOIN random_prompts ON player_matches.round = random_prompts.round
);`;
}
export type Submission<Content extends string | null = string | null> = {
  prompt_id: number;
  player_id: number;
  player_name: string;
  prompt_content: string;
  game_id: number;
  content: Content;
};
export const STATES = {
  NOT_STARTED: "NOT_STARTED",
  PLAYER_PLAYING: "PLAYER_PLAYING",
  PLAYER_DONE: "PLAYER_DONE",
  COMPLETED: "COMPLETED",
} as const;

type PossibleStates =
  | {
      state: "NOT_STARTED";
      nextSubmission: undefined;
      allSubmissions: Submission<null>[];
    }
  | {
      state: "PLAYER_PLAYING";
      nextSubmission: Submission<null>;
      allSubmissions: Submission<string | null>[];
    }
  | {
      state: "PLAYER_DONE";
      nextSubmission: undefined;
      allSubmissions: Submission<string | null>[];
    }
  | {
      state: "COMPLETED";
      nextSubmission: undefined;
      allSubmissions: Submission<string>[];
    };
export async function getGameState(
  gameId: number,
  playerId: number
): Promise<PossibleStates> {
  const allSubmissions =
    await sql<Submission>`SELECT submissions.*, prompts.id as prompt_id, prompts.content as prompt_content, players.game_id, players.name as player_name
  FROM submissions
  LEFT JOIN prompts on prompt_id = prompts.id
  INNER JOIN players ON submissions.player_id = players.id
  WHERE game_id =  (SELECT game_id FROM players where players.id = ${playerId})
  AND game_id = ${gameId}`;
  const gameStarted = allSubmissions.rowCount > 0;
  const gameCompleted =
    allSubmissions.rows.every((row) => row.content) && gameStarted;

  const nextSubmission = allSubmissions.rows.find(
    (row) => row.player_id === playerId && !row.content
  );

  const state = gameCompleted
    ? STATES.COMPLETED
    : gameStarted
    ? nextSubmission
      ? STATES.PLAYER_PLAYING
      : STATES.PLAYER_DONE
    : STATES.NOT_STARTED;
  return { state, nextSubmission, allSubmissions: allSubmissions.rows };
}
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

function firstRow<T>(result: { rows: T[] }): T | undefined {
  return first(result.rows);
}
export async function getCurrentGame(playerId: number | undefined | null) {
  if (!playerId) {
    return { gameId: undefined };
  }
  const currentGame = firstRow(
    await sql<{
      game_id: number;
    }>`SELECT game_id FROM players WHERE id = ${playerId}`
  );
  return { gameId: currentGame?.game_id };
}

export async function getPlayersInGame(gameId: number, playerId: number) {
  const res = await sql<{ name: string }>`SELECT players.name
  FROM players
  WHERE players.game_id = (SELECT game_id FROM players WHERE id = ${playerId})
  AND players.game_id = ${gameId}`;
  return res.rows;
}
