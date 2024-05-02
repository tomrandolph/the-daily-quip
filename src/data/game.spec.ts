import { it, describe, beforeEach, afterAll, expect } from "@jest/globals";
import { sql } from "@/db/db";
import { startGame } from "./game";

async function seedGame() {
  const {
    rows: [{ id: gameId }],
  } = await sql<{
    id: number;
  }>`INSERT INTO games (password, salt) VALUES ('asdf', 'asdf') RETURNING id`;

  const {
    rows: [{ id: playerId }],
  } = await sql<{
    id: number;
  }>`INSERT INTO players (game_id, name) VALUES (${gameId}, 'Player') RETURNING id`;
  return { playerId, gameId };
}

async function addPlayerToGame(gameId: number) {
  const {
    rows: [{ id: playerId }],
  } = await sql<{
    id: number;
  }>`INSERT INTO players (game_id, name) VALUES (${gameId}, 'Player') RETURNING id`;
  return { playerId };
}

describe("Game Start", () => {
  beforeEach(async () => {
    // await sql`DELETE FROM games CASCADE;`;
  });
  it("Should start a game with 2 players", async () => {
    const { playerId, gameId } = await seedGame();
    await addPlayerToGame(gameId);
    const { error } = await startGame(playerId, gameId);
    expect(error).toBeNull();
  });
  it("Should not start a game that does not exist", async () => {
    const { error } = await startGame(1, 1);

    expect(error).toEqual("Game does not exist");
  });
  it("Should not start a game that the player is not in", async () => {
    const game1 = await seedGame();
    await addPlayerToGame(game1.gameId);
    const game2 = await seedGame();
    const { error } = await startGame(game1.playerId, game2.gameId);
    expect(error).toEqual("Game does not exist");
  });
  it("Should not start a game that has already been started", async () => {
    const game = await seedGame();
    await addPlayerToGame(game.gameId);

    const firstTry = await startGame(game.playerId, game.gameId);
    expect(firstTry.error).toBeNull();
    const secondTry = await startGame(game.playerId, game.gameId);

    expect(secondTry?.error).toEqual("Game already started");
  });
  it("Should not start a game that has only one player", async () => {
    const game = await seedGame();
    const { error } = await startGame(game.playerId, game.gameId);
    expect(error).toEqual("Not enough players");
  });
});
