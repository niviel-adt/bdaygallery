CREATE TABLE IF NOT EXISTS memories (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  celebrant_name TEXT NOT NULL,
  title TEXT NOT NULL,
  intro TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photos (
  id BIGSERIAL PRIMARY KEY,
  memory_id BIGINT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  public_id TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  contributor TEXT DEFAULT '',
  taken_at DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_memory_id ON photos(memory_id);
CREATE INDEX IF NOT EXISTS idx_memories_slug ON memories(slug);
