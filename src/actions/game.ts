"use server";
import { sql } from "@/db/db";
import { handleFormData } from "@/lib/form";
import z from "zod";
import bcrypt from "bcrypt";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, issueJWT } from "@/lib/auth";

const gameSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

// ...

export const createGame = handleFormData(gameSchema, async (parse) => {
  const { data, errors } = parse();

  if (errors) {
    return { errors };
  }

  const { password } = data;

  // Generate a salt for password hashing
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);

  // Hash the password using the generated salt
  const hashedPassword = await bcrypt.hash(password, salt);
  // Store the hashed password securely
  const res = (
    await sql`INSERT INTO games (password, salt) VALUES (${hashedPassword}, ${salt}) RETURNING id`
  ).rows[0] as { id: string };
  redirect(`/games/${res.id}`);
});

// TODO create a new game with salted hash of password
// to join game, user must provide password
// if password is correct, user is added to game
// password is imported to the client to be used to encrypt/decrypt game data

const joinGameSchema = z.object({
  password: z.string(),
  name: z.string().min(3, "Name must be at least 3 characters long"),
  gameId: z.string(),
});

export const joinGame = handleFormData(joinGameSchema, async (parse) => {
  const { data, errors } = parse();
  console.log("data", data, "errors", errors);
  if (errors) {
    return { errors };
  }

  const gameStarted =
    (
      await sql`SELECT *
      FROM submissions
      INNER JOIN players ON submissions.player_id = players.id
      WHERE game_id = ${data.gameId}`
    ).rowCount > 0;
  if (gameStarted) {
    console.error("Game already started");
    return { errors: { other: "Game already started" } };
  }

  const { password, name, gameId } = data;

  const game = (await sql`SELECT * FROM games WHERE id = ${gameId}`).rows[0] as
    | { id: string; salt: string; password: string }
    | undefined;
  if (!game) {
    return {
      errors: { other: "Game not found or invalid password" },
    };
  }

  const isValid = await bcrypt.compare(password, game.password);

  if (!isValid) {
    return {
      errors: { other: "Game not found or invalid password" }, // TODO can we just 404 instead?
    };
  }

  const player = (
    await sql`INSERT INTO players (name, game_id) VALUES (${name}, ${gameId}) RETURNING id`
  ).rows[0] as { id: number };

  const jwt = await issueJWT(player.id);
  cookies().set({
    name: "player-jwt",
    value: jwt,
    httpOnly: true,
    path: "/", // TODO what is this
  });

  revalidatePath(`/games/${game.id}`);
});

const submitQuipSchema = z.object({
  text: z.string(),
  promptId: z.number({ coerce: true }).int().gte(0),
  playerId: z.number({ coerce: true }).int().gte(0),
});

export const submitQuip = handleFormData(submitQuipSchema, async (parse) => {
  const playerId = await auth();
  if (!playerId) {
    return {
      errors: { other: "Not logged in" },
    };
  }
  const { data, errors } = parse();
  if (errors) {
    return { errors };
  }

  const { text, playerId: pid, promptId } = data;

  const { id, game_id } = (
    await sql`SELECT * FROM players WHERE id = ${playerId}`
  ).rows[0] as { game_id: number; id: number };
  if (!playerId || playerId != pid || id != playerId) {
    console.error("Not logged in", playerId, pid, id);
    return {
      errors: { other: "Not logged in" },
    };
  }

  await sql`UPDATE submissions set content = ${text} WHERE player_id = ${playerId} AND prompt_id = ${promptId}`;
  revalidatePath(`/games/${game_id}`);
  redirect(`/games/${game_id}`);
});

const MIN_PLAYERS = 2;
const startGameSchema = z.object({
  gameId: z.number({ coerce: true }).int().gte(0),
});
export const startGame = handleFormData(startGameSchema, async (parse) => {
  const playerId = await auth();
  if (!playerId) {
    return {
      errors: { other: "Not logged in" },
    };
  }
  const { data, errors } = parse();
  if (errors) {
    return { errors };
  }
  const { gameId } = data;
  console.time("findgame");

  const gameExists =
    (await sql`SELECT * FROM games WHERE id = ${gameId}`).rowCount === 1;
  if (!gameExists) {
    console.error("Game does not exist");
    return { errors: { other: "Game does not exist" } };
  }
  console.timeEnd("findgame");
  // TODO check that player is in game
  console.time("players");
  const players = await sql`SELECT * FROM players WHERE game_id = ${gameId}`;
  const playerCount = players.rowCount;
  if (playerCount < MIN_PLAYERS) {
    console.error("Not enough players");
    return { errors: { other: "Not enough players" } };
  }
  console.timeEnd("players");
  console.time("submissions");
  const submissions = await sql`SELECT * FROM submissions
    INNER JOIN players ON submissions.player_id = players.id
    WHERE game_id = ${gameId}`;
  if (submissions.rowCount > 0) {
    console.error("Game already started");
    // TODO if user is in game, redirect to game page
    return { errors: { other: "Game already started" } };
  }
  console.timeEnd("submissions");
  console.time("insert");
  await sql`
  WITH matched_player_1 AS (
    SELECT
        players.id as player_id,
        (ROW_NUMBER() OVER (ORDER BY players.id)-1) AS round
    FROM
        players
    WHERE game_id = ${gameId}
), matched_player_2 AS (
    SELECT
        players.id as player_id,
        (ROW_NUMBER() OVER (ORDER BY players.id) % ( COUNT(*) OVER ())) AS round

    FROM
        players
    WHERE game_id = ${gameId}
), random_prompts AS (
    SELECT
        id,
        (ROW_NUMBER() OVER (ORDER BY RANDOM())-1) AS round
    FROM
        prompts
), player_matches AS (
    SELECT *
    FROM matched_player_1
    UNION
    SELECT *
    FROM matched_player_2
)
INSERT INTO submissions (player_id, prompt_id) (
    SELECT
        player_id,
        random_prompts.id as prompt_id
    FROM player_matches
    LEFT JOIN random_prompts ON player_matches.round = random_prompts.round
);`;
  console.timeEnd("insert");
  revalidatePath(`/games/${gameId}`);
});
