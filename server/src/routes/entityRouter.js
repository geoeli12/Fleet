import { Router } from "express";
import { db, makeId, nowIso, applyFilters, sortItems } from "../db.js";

/**
 * Generic CRUD router for a collection in lowdb.
 * - GET /           -> list (supports query filters + ?sort=name or ?sort=-created_date)
 * - POST /          -> create
 * - PUT /:id        -> update (partial)
 * - DELETE /:id     -> delete
 */
export function makeEntityRouter({ collectionKey, idPrefix }) {
  const r = Router();

  r.get("/", async (req, res) => {
    await db.read();
    const items = db.data?.[collectionKey] || [];
    const filtered = applyFilters(items, req.query || {});
    const sorted = sortItems(filtered, req.query?.sort);
    res.json(sorted);
  });

  r.post("/", async (req, res) => {
    await db.read();
    const items = db.data?.[collectionKey] || [];
    const body = req.body || {};

    const id = makeId(idPrefix);
    const created_date = nowIso();
    const row = { id, created_date, ...body };

    items.push(row);
    db.data[collectionKey] = items;
    await db.write();

    res.json(row);
  });

  r.put("/:id", async (req, res) => {
    await db.read();
    const items = db.data?.[collectionKey] || [];
    const { id } = req.params;
    const body = req.body || {};

    const idx = items.findIndex((x) => x.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });

    items[idx] = { ...items[idx], ...body };
    db.data[collectionKey] = items;
    await db.write();

    res.json(items[idx]);
  });

  r.delete("/:id", async (req, res) => {
    await db.read();
    const items = db.data?.[collectionKey] || [];
    const { id } = req.params;

    const idx = items.findIndex((x) => x.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });

    items.splice(idx, 1);
    db.data[collectionKey] = items;
    await db.write();

    res.json({ ok: true });
  });

  return r;
}
