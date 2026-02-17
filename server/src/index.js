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

// Simple request logger (helps debugging on Render)
app.use((req, _res, next) => {
  // Keep it short; Render logs show this
  console.log(`${req.method} ${req.path}`);
  next();
});

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
// In production we serve the Vite build (dist) from the same URL as the API.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Some deploy setups build to <root>/dist, others to <root>/server/dist.
// Auto-detect so you don't get a blank page if the build output path changes.
const candidates = [
  path.resolve(__dirname, "../../dist"),
  path.resolve(__dirname, "../dist"),
  path.resolve(process.cwd(), "dist"),
  path.resolve(process.cwd(), "server/dist"),
];

function pickDistDir() {
  for (const p of candidates) {
    try {
      const indexHtml = path.join(p, "index.html");
      if (fs.existsSync(indexHtml)) return p;
    } catch (_) {}
  }
  return candidates[0];
}

const DIST_DIR = pickDistDir();
console.log("Serving client from:", DIST_DIR);

// Debug endpoints (useful when DevTools/F12 is blocked)
app.get("/debug/dist", (_req, res) => {
  try {
    const exists = fs.existsSync(DIST_DIR);
    const indexExists = fs.existsSync(path.join(DIST_DIR, "index.html"));
    const assetsDir = path.join(DIST_DIR, "assets");
    const assets = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).slice(0, 50) : [];
    res.json({
      distDir: DIST_DIR,
      distExists: exists,
      indexHtmlExists: indexExists,
      assetsCount: assets.length,
      assetsSample: assets,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/debug/index", (_req, res) => {
  try {
    const p = path.join(DIST_DIR, "index.html");
    const html = fs.readFileSync(p, "utf8");
    res.type("text/plain").send(html.slice(0, 2000));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.use(express.static(DIST_DIR));

// SPA fallback (React Router): any non-API route should load index.html
app.get(/^\/(?!api\/).*/, (_req, res) => {
  const p = path.join(DIST_DIR, "index.html");
  if (fs.existsSync(p)) return res.sendFile(p);
  res
    .status(500)
    .type("text/plain")
    .send(
      `Build not found. Expected index.html in: \n- ${candidates.join("\n- ")}\n\nOpen /debug/dist for details.`
    );
});

// Cloud-friendly bind/port
const PORT = Number(process.env.PORT || 5050);
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
