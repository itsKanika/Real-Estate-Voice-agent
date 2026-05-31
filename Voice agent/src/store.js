import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "calls.json");

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ calls: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export function listCalls() {
  return readDb().calls.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function getCall(id) {
  return readDb().calls.find((call) => call.id === id || call.call_id === id);
}

export function upsertCall(partial) {
  const db = readDb();
  const id = partial.id || partial.call_id;
  const now = new Date().toISOString();
  const index = db.calls.findIndex((call) => call.id === id || call.call_id === id);

  if (index === -1) {
    db.calls.push({
      id,
      call_id: partial.call_id || id,
      created_at: partial.created_at || now,
      updated_at: now,
      status: "created",
      events: [],
      tool_calls: [],
      ...partial
    });
  } else {
    db.calls[index] = {
      ...db.calls[index],
      ...partial,
      updated_at: now,
      events: mergeEvents(db.calls[index].events, partial.events)
    };
  }

  writeDb(db);
  return getCall(id);
}

export function appendEvent(callId, event) {
  const existing = getCall(callId);
  const nextEvents = [...(existing?.events || []), event];
  return upsertCall({ id: existing?.id || callId, call_id: callId, events: nextEvents });
}

export function appendToolCall(callId, toolCall) {
  const existing = getCall(callId);
  const tool_calls = [...(existing?.tool_calls || []), toolCall];
  return upsertCall({ id: existing?.id || callId, call_id: callId, tool_calls });
}

function mergeEvents(current = [], incoming) {
  if (!incoming) return current;
  if (!Array.isArray(incoming)) return current;
  return incoming;
}
