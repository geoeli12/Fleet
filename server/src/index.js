import express from "express";
import cors from "cors";
import { initDb } from "./db.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import drivers from "./routes/drivers.js";
import shifts from "./routes/shifts.js";
import runs from "./routes/runs.js";
import schedules from "./routes/schedules.js";
import customLoadTypes from "./routes/customLoadTypes.js";
import fuelReadings from "./routes/fuelReadings.js";
import fuelRefills from "./routes/fuelRefills.js";
import fuelTank from "./routes/fuelTank.js";

await initDb();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/drivers", drivers);
app.use("/api/shifts", shifts);
app.use("/api/runs", runs);
app.use("/api/schedules", schedules);
app.use("/api/custom-load-types", customLoadTypes);
app.use("/api/fuel-readings", fuelReadings);
app.use("/api/fuel-refills", fuelRefills);
app.use("/api/fuel-tank", fuelTank);

// --- Static hosting (so you can use the app by URL) ---
// When you run `npm run build` at the repo root, Vite outputs: <root>/dist
// In production we serve that build from the same URL as the API.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Static hosting (React build) ---
// Depending on how Render runs the build, the Vite output may end up in:
//   1) <repoRoot>/dist            (preferred; `npm run build` at repo root)
//   2) <repoRoot>/server/dist     (if build runs from /server)
// We probe a few common locations so the app doesn't render blank if the build
// ended up in a different folder.
const DIST_CANDIDATES = [
  path.resolve(__dirname, "../../dist"),
  path.resolve(__dirname, "../dist"),
  path.resolve(process.cwd(), "dist"),
  path.resolve(process.cwd(), "server/dist"),
];

const DIST_DIR = DIST_CANDIDATES.find((p) => {
  try {
    return p && fs.existsSync(path.join(p, "index.html"));
  } catch {
    return false;
  }
});

if (DIST_DIR) {
  console.log("Serving client from:", DIST_DIR);
  app.use(express.static(DIST_DIR));

  // SPA fallback (React Router): any non-API route should load index.html
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
} else {
  console.warn("No client build found. Looked in:", DIST_CANDIDATES);
  // Helpful message instead of a blank page
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res
      .status(500)
      .send(
        "Client build not found. Make sure Render runs `npm run build` at the repo root (so /dist exists)."
      );
  });
}

// Cloud-friendly bind/port
const PORT = Number(process.env.PORT || 5050);
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
