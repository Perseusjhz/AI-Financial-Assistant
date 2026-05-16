import type { AppStateSnapshot } from './types';

type SessionRecord = AppStateSnapshot & {
  sessionId: string;
  updatedAt: string;
  historyCount?: number;
};

const store = new Map<string, SessionRecord>();

export function getSessionSnapshot(sessionId = 'default'): SessionRecord {
  const current = store.get(sessionId);
  if (current) return current;
  const snapshot: SessionRecord = {
    sessionId,
    updatedAt: new Date().toISOString(),
    historyCount: 0,
  };
  store.set(sessionId, snapshot);
  return snapshot;
}

export function updateSessionSnapshot(
  sessionId: string,
  patch: Partial<SessionRecord>
): SessionRecord {
  const current = getSessionSnapshot(sessionId);
  const next: SessionRecord = {
    ...current,
    ...patch,
    sessionId,
    updatedAt: new Date().toISOString(),
    historyCount: patch.historyCount ?? current.historyCount ?? 0,
  };
  store.set(sessionId, next);
  return next;
}

export function clearSessionSnapshot(sessionId = 'default'): void {
  store.delete(sessionId);
}
