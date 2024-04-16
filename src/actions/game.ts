"use server";
import { sql } from "@/db/db";
import { handleFormData } from "@/lib/form";
import z from "zod";
import bcrypt from "bcrypt";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

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
  console.log("hashedPassword", hashedPassword, "salt", salt);
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

  const { password, name } = data;

  const game = (await sql`SELECT * FROM games WHERE id = ${data.gameId}`)
    .rows[0] as { id: string; salt: string; password: string } | undefined;
  if (!game) {
    return {
      errors: { other: "Game not found or invalid password" },
    };
  }
  console.log("game", game, "password", password + game.salt, "name", name);

  const isValid = await bcrypt.compare(password, game.password);

  if (!isValid) {
    return {
      errors: { other: "Game not found or invalid password" },
    };
  }
  const player = (
    await sql`INSERT INTO players (name) VALUES (${name}) RETURNING id`
  ).rows[0] as { id: string };
  await sql`INSERT INTO game_players (game_id, player_id) VALUES (${game.id}, ${player.id})`;
  cookies().set({
    name: "player-id",
    value: player.id,
    httpOnly: true,
    path: "/", // TODO what is this
  });
  console.log("cookies", cookies());
  revalidatePath(`/games/${game.id}`);
});

const submitQuipSchema = z.object({
  text: z.string().min(1, "Quip must be at least 1 characters long"),
  gameId: z.string(),
});

export const submitQuip = handleFormData(submitQuipSchema, async (parse) => {
  const { data, errors } = parse();
  if (errors) {
    return { errors };
  }

  const { text, gameId } = data;

  const playerId = cookies().get("player-id")?.value;
  if (!playerId) {
    return {
      errors: { other: "Not logged in" },
    };
  }

  await sql`INSERT INTO submissions (content, game_id, player_id) VALUES (${text}, ${gameId}, ${playerId})`;
  revalidatePath(`/games/${gameId}`);
});
