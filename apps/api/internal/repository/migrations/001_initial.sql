CREATE TABLE threads (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE calculations (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK(operation IN ('add','subtract','multiply','divide','power','sqrt','percent')),
  operands TEXT NOT NULL,
  expression TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX calculations_thread_sequence ON calculations(thread_id, sequence);
CREATE INDEX threads_recent ON threads(updated_at DESC, id);
