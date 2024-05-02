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
