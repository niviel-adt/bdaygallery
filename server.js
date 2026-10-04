require("dotenv").config();

const express = require("express");
const path = require("path");
const multer = require("multer");
const { Pool } = require("pg");
const cloudinary = require("cloudinary").v2;

const app = express();
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");

if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is not configured. Add PostgreSQL in Railway and reference its DATABASE_URL in this service.");
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

const maxMb = Number(process.env.MAX_FILE_SIZE_MB || 10);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Only image files are allowed."))
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

function cleanText(value, max = 500) { return String(value || "").trim().slice(0, max); }
function slugify(value) {
  return cleanText(value, 80).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "memory";
}
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.body.adminKey || req.query.adminKey;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) return res.status(401).json({ error: "Admin key required." });
  next();
}
function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "image", transformation: [{ quality: "auto", fetch_format: "auto" }] },
      (error, result) => error ? reject(error) : resolve(result));
    stream.end(buffer);
  });
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS memories (
      id BIGSERIAL PRIMARY KEY, slug TEXT UNIQUE NOT NULL, celebrant_name TEXT NOT NULL,
      title TEXT NOT NULL, intro TEXT DEFAULT '', cover_url TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS photos (
      id BIGSERIAL PRIMARY KEY, memory_id BIGINT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL, public_id TEXT DEFAULT '', caption TEXT DEFAULT '', contributor TEXT DEFAULT '',
      taken_at DATE, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_photos_memory_id ON photos(memory_id);
    CREATE INDEX IF NOT EXISTS idx_memories_slug ON memories(slug);
  `);
}

app.get("/api/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ ok: true, service: "birthday-memory-lane", version: "4" }); }
  catch { res.status(500).json({ ok: false, error: "Database unavailable." }); }
});

app.post("/api/memories", requireAdmin, async (req, res) => {
  try {
    const celebrantName = cleanText(req.body.celebrantName, 100), title = cleanText(req.body.title, 120), intro = cleanText(req.body.intro, 1000);
    if (!celebrantName || !title) return res.status(400).json({ error: "Celebrant name and title are required." });
    const baseSlug = slugify(`${celebrantName}-${title}`); let slug = baseSlug;
    for (let i = 2; i < 100; i++) { const exists = await pool.query("SELECT 1 FROM memories WHERE slug=$1", [slug]); if (!exists.rowCount) break; slug = `${baseSlug}-${i}`; }
    const result = await pool.query(`INSERT INTO memories (slug, celebrant_name, title, intro) VALUES ($1,$2,$3,$4) RETURNING id,slug,celebrant_name,title,intro,created_at`, [slug, celebrantName, title, intro]);
    res.status(201).json({ memory: result.rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: "Could not create memory." }); }
});

app.get("/api/memories/:slug", async (req, res) => {
  try {
    const m = await pool.query("SELECT id,slug,celebrant_name,title,intro,cover_url,created_at FROM memories WHERE slug=$1", [req.params.slug]);
    if (!m.rowCount) return res.status(404).json({ error: "Memory Lane not found." });
    const p = await pool.query("SELECT id,image_url,caption,contributor,taken_at,sort_order,created_at FROM photos WHERE memory_id=$1 ORDER BY sort_order ASC,created_at ASC", [m.rows[0].id]);
    res.json({ memory: m.rows[0], photos: p.rows });
  } catch (e) { console.error(e); res.status(500).json({ error: "Could not load memory." }); }
});

app.post("/api/memories/:slug/photos", upload.array("photos", 50), async (req, res) => {
  try {
    const m = await pool.query("SELECT id,slug FROM memories WHERE slug=$1", [req.params.slug]);
    if (!m.rowCount) return res.status(404).json({ error: "Memory Lane not found." });
    if (!req.files?.length) return res.status(400).json({ error: "No photos uploaded." });
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return res.status(500).json({ error: "Cloudinary is not configured." });
    const contributor = cleanText(req.body.contributor, 100), caption = cleanText(req.body.caption, 500), takenAt = cleanText(req.body.takenAt, 20) || null;
    const count = await pool.query("SELECT COALESCE(MAX(sort_order),-1)+1 AS next FROM photos WHERE memory_id=$1", [m.rows[0].id]); let order = Number(count.rows[0].next); const uploaded = [];
    for (const file of req.files) {
      const cloud = await uploadToCloudinary(file.buffer, `birthday-memory-lane/${m.rows[0].slug}`);
      const row = await pool.query(`INSERT INTO photos (memory_id,image_url,public_id,caption,contributor,taken_at,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,image_url,caption,contributor,taken_at,sort_order`, [m.rows[0].id, cloud.secure_url, cloud.public_id, caption, contributor, takenAt, order++]);
      uploaded.push(row.rows[0]);
    }
    if (uploaded[0]) await pool.query("UPDATE memories SET cover_url=COALESCE(NULLIF(cover_url,''),$1) WHERE id=$2", [uploaded[0].image_url, m.rows[0].id]);
    res.status(201).json({ photos: uploaded });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message || "Upload failed." }); }
});

app.delete("/api/photos/:id", requireAdmin, async (req, res) => {
  try {
    const photo = await pool.query("SELECT id,public_id FROM photos WHERE id=$1", [req.params.id]);
    if (!photo.rowCount) return res.status(404).json({ error: "Photo not found." });
    if (photo.rows[0].public_id) try { await cloudinary.uploader.destroy(photo.rows[0].public_id); } catch (e) { console.warn(e.message); }
    await pool.query("DELETE FROM photos WHERE id=$1", [req.params.id]); res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Could not delete photo." }); }
});

// Explicit web routes: avoids Express 5 wildcard routing problems.
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.get("/admin", (_req, res) => res.sendFile(path.join(publicDir, "admin.html")));
app.get("/admin.html", (_req, res) => res.sendFile(path.join(publicDir, "admin.html")));
app.get("/m/:slug", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.use(express.static(publicDir));
app.use((req, res) => req.path.startsWith("/api/") ? res.status(404).json({ error: "API route not found." }) : res.status(404).sendFile(path.join(publicDir, "404.html")));

initDb().then(() => app.listen(port, "0.0.0.0", () => console.log(`Birthday Memory Lane V4 running on port ${port}`))).catch(err => { console.error("Startup failed:", err); process.exit(1); });
