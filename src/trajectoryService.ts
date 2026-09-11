import fs from "fs";
import path from "path";
import { ActionRequest, RiskLevel } from "./types";

interface TrajectoryAction { action: string; risk: RiskLevel; allowed: boolean; sessionId: string; scope: string[]; }
interface SessionState { principalId: string; score: number; actions: TrajectoryAction[]; }
interface PrincipalState { score: number; actions: TrajectoryAction[]; scopes: string[]; sessionIds: string[]; }
interface StoredState { sessions: Record<string, SessionState>; principals: Record<string, PrincipalState>; }

const dataPath = path.join(process.cwd(), "data", "trajectory.json");
const emptyState = (): StoredState => ({ sessions: {}, principals: {} });

function loadState(): StoredState {
  try { return JSON.parse(fs.readFileSync(dataPath, "utf8")) as StoredState; } catch { return emptyState(); }
}

let store = loadState();
const weight: Record<RiskLevel, number> = { READ: 1, WRITE: 4, DESTRUCTIVE: 10 };
const riskRank: Record<RiskLevel, number> = { READ: 1, WRITE: 2, DESTRUCTIVE: 3 };

function saveState() {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(store, null, 2));
}

function scopesFor(request: ActionRequest) {
  return [request.accountId, request.destinationAccountId, request.resourceId].filter((value): value is string => Boolean(value));
}

export function track(request: ActionRequest, risk: RiskLevel, allowed: boolean) {
  const session = store.sessions[request.sessionId] ?? { principalId: request.principalId, score: 0, actions: [] };
  const principal = store.principals[request.principalId] ?? { score: 0, actions: [], scopes: [], sessionIds: [] };
  const scopes = scopesFor(request);
  const scopeDrift = principal.actions.length > 0 && scopes.some((scope) => !principal.scopes.includes(scope));
  const previousRisk = principal.actions[principal.actions.length - 1]?.risk;
  const escalation = previousRisk !== undefined && riskRank[risk] > riskRank[previousRisk];
  const points = weight[risk] + (allowed ? 0 : 5) + (scopeDrift ? 5 : 0) + (escalation ? 3 : 0);

  session.score += points;
  principal.score += points;
  const action: TrajectoryAction = { action: request.action, risk, allowed, sessionId: request.sessionId, scope: scopes };
  session.actions.push(action);
  principal.actions.push(action);
  principal.scopes = [...new Set([...principal.scopes, ...scopes])];
  principal.sessionIds = [...new Set([...principal.sessionIds, request.sessionId])];
  store.sessions[request.sessionId] = session;
  store.principals[request.principalId] = principal;
  saveState();

  return {
    score: Math.max(session.score, principal.score),
    sessionScore: session.score,
    crossSessionScore: principal.score,
    flagged: Math.max(session.score, principal.score) >= 20,
    scopeDrift,
    sessionCount: principal.sessionIds.length
  };
}

export function getTrajectory(sessionId: string) {
  const state = store.sessions[sessionId] ?? { principalId: "unknown", score: 0, actions: [] };
  const principal = store.principals[state.principalId];
  const score = Math.max(state.score, principal?.score ?? 0);
  return { sessionId, principalId: state.principalId, score, sessionScore: state.score, crossSessionScore: principal?.score ?? 0, flagged: score >= 20, actions: state.actions };
}

export function getPrincipalTrajectory(principalId: string) {
  const state = store.principals[principalId] ?? { score: 0, actions: [], scopes: [], sessionIds: [] };
  return { principalId, score: state.score, flagged: state.score >= 20, sessionCount: state.sessionIds.length, scopes: state.scopes, actions: state.actions };
}

export function resetTrajectories() {
  store = emptyState();
  try { fs.rmSync(dataPath, { force: true }); } catch { /* demo reset */ }
}
