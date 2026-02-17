import express from "express";
import cors from "cors";
import { initDb } from "./db.js";
import path from "path";
import { fileURLToPath } from "url";

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
const DIST_DIR = path.resolve(__dirname, "../../dist");

app.use(express.static(DIST_DIR));

// SPA fallback (React Router): any non-API route should load index.html
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

// Cloud-friendly bind/port
const PORT = Number(process.env.PORT || 5050);
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
