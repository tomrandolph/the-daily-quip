"use server";
import { sql } from "@/db/db";
import { handleFormData } from "@/lib/form";
import z from "zod";
import bcrypt from "bcrypt";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_NAME, auth, issueJWT } from "@/lib/auth";
import * as game from "@/data/game";

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
  // TODO ensure player does not leave games stranded
  cookies().delete(COOKIE_NAME);
  console.log("redirecting to", res.id);
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
  const { data: sensitiveData, errors } = parse();
  console.log("errors", errors);
  if (errors) {
    return { errors };
  }
  type Game = {
    id: number;
    password: string;
    salt: string;
  };

  const res = await sql<Game>`SELECT games.*
      FROM games
      LEFT JOIN players ON players.game_id = games.id
      LEFT JOIN submissions ON submissions.player_id = players.id
      WHERE games.id = ${sensitiveData.gameId}`;

  const gameStarted = res.rowCount > 1;
  const game: Game | undefined = res.rows[0];
  const { password, name, gameId } = sensitiveData;

  const isValid = await bcrypt.compare(password, game.password);

  if (gameStarted || !game || !isValid) {
    console.error("Game invite expired or invalid");
    return { errors: { other: "Game invite expired or invalid" } };
  }

  const player = (
    await sql`INSERT INTO players (name, game_id) VALUES (${name}, ${gameId}) RETURNING id`
  ).rows[0] as { id: number };

  const jwt = await issueJWT(player.id);
  cookies().set({
    name: COOKIE_NAME,
    value: jwt,
    httpOnly: true,
    path: "/", // TODO what is this
  });

  revalidatePath(`/games/${game.id}`);
});

const submitQuipSchema = z.object({
  text: z.string(),
  promptId: z.number({ coerce: true }).int().gte(0),
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

  const { text, promptId } = data;

  const res = await sql<{
    game_id: number;
  }>`UPDATE submissions set content = ${text} WHERE player_id = ${playerId} AND prompt_id = ${promptId}
  RETURNING (SELECT game_id FROM players WHERE id = ${playerId})`;
  const gameId = res.rows[0].game_id;
  revalidatePath(`/games/${gameId}`);
  redirect(`/games/${gameId}`);
});

const startGameSchema = z.object({
  gameId: z.number({ coerce: true }).int().gte(0),
});
export const startGame = handleFormData(startGameSchema, async (parse) => {
  console.log("attempting to start game");
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
  const { error: startError } = await game.startGame(playerId, gameId);
  if (startError) {
    return { errors: { other: startError } };
  }
});
