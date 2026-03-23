import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-990c827f/health", (c) => {
  return c.json({ status: "ok" });
});

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Create a new game lobby
app.post("/make-server-990c827f/games", async (c) => {
  try {
    const { playerName, playerCount } = await c.req.json();
    if (!playerName || !playerCount) {
      return c.json({ error: "playerName and playerCount required" }, 400);
    }

    let code = generateCode();
    // Ensure unique
    let existing = await kv.get(`game:${code}`);
    let attempts = 0;
    while (existing && attempts < 10) {
      code = generateCode();
      existing = await kv.get(`game:${code}`);
      attempts++;
    }

    const playerId = `player-0`;
    const gameData = {
      code,
      playerCount,
      hostId: playerId,
      players: [{ id: playerId, name: playerName }],
      state: null, // Game state set when game starts
      createdAt: Date.now(),
    };

    await kv.set(`game:${code}`, gameData);
    console.log(`Game created: ${code} by ${playerName}`);
    return c.json({ code, playerId });
  } catch (e) {
    console.log(`Error creating game: ${e}`);
    return c.json({ error: `Failed to create game: ${e}` }, 500);
  }
});

// Join a game
app.post("/make-server-990c827f/games/:code/join", async (c) => {
  try {
    const code = c.req.param('code');
    const { playerName } = await c.req.json();
    if (!playerName) return c.json({ error: "playerName required" }, 400);

    const gameData = await kv.get(`game:${code}`);
    if (!gameData) return c.json({ error: "Game not found" }, 404);
    if (gameData.players.length >= gameData.playerCount) {
      return c.json({ error: "Game is full" }, 400);
    }
    if (gameData.state) {
      return c.json({ error: "Game already started" }, 400);
    }

    const playerId = `player-${gameData.players.length}`;
    gameData.players.push({ id: playerId, name: playerName });
    await kv.set(`game:${code}`, gameData);

    console.log(`Player ${playerName} joined game ${code} as ${playerId}`);
    return c.json({ playerId, players: gameData.players });
  } catch (e) {
    console.log(`Error joining game: ${e}`);
    return c.json({ error: `Failed to join game: ${e}` }, 500);
  }
});

// Get game data
app.get("/make-server-990c827f/games/:code", async (c) => {
  try {
    const code = c.req.param('code');
    const gameData = await kv.get(`game:${code}`);
    if (!gameData) return c.json({ error: "Game not found" }, 404);
    return c.json(gameData);
  } catch (e) {
    console.log(`Error getting game: ${e}`);
    return c.json({ error: `Failed to get game: ${e}` }, 500);
  }
});

// Update game state
app.put("/make-server-990c827f/games/:code", async (c) => {
  try {
    const code = c.req.param('code');
    const { state, playerId } = await c.req.json();

    const gameData = await kv.get(`game:${code}`);
    if (!gameData) return c.json({ error: "Game not found" }, 404);

    // Version check for optimistic concurrency
    if (gameData.state && state.version <= gameData.state.version) {
      return c.json({ error: "Stale state", currentVersion: gameData.state.version }, 409);
    }

    gameData.state = state;
    await kv.set(`game:${code}`, gameData);
    return c.json({ success: true });
  } catch (e) {
    console.log(`Error updating game state: ${e}`);
    return c.json({ error: `Failed to update: ${e}` }, 500);
  }
});

// Delete game
app.delete("/make-server-990c827f/games/:code", async (c) => {
  try {
    const code = c.req.param('code');
    await kv.del(`game:${code}`);
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: `Failed to delete: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);
