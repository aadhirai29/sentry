import express, { Request, Response } from "express";
import { evaluate, suggestAlternatives } from "./decisionEngine";
import { getPrincipalTrajectory, getTrajectory } from "./trajectoryService";
import { ActionRequest, TrackedAction } from "./types";

const app = express();
app.use(express.json());
app.use(express.static("public"));
const pending = new Map<string, TrackedAction>();
const feed: TrackedAction[] = [];

app.get("/", (_req, res) => res.json({
  service: "Sentry Banking API",
  status: "running",
  message: "Action-layer security middleware for banking agents",
  endpoints: {
    health: "GET /health",
    evaluate: "POST /api/actions/evaluate",
    pending: "GET /api/actions/pending",
    feed: "GET /api/actions/feed",
    trajectory: "GET /api/trajectory/:sessionId",
    principalTrajectory: "GET /api/trajectory/principal/:principalId",
    approve: "POST /api/actions/:id/approve",
    reject: "POST /api/actions/:id/reject",
    alternatives: "POST /api/actions/:id/alternatives"
  }
}));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "sentry-banking-api" }));

app.post("/api/actions/evaluate", (req: Request<unknown, unknown, ActionRequest>, res: Response) => {
  const { decision, tracked } = evaluate(req.body);
  feed.unshift(tracked);
  if (decision.status === "REQUIRE_CONFIRMATION") pending.set(tracked.actionId, tracked);
  res.status(decision.status === "BLOCK" ? 403 : 200).json({ decision, forwarded: decision.status === "EXECUTE" });
});

app.get("/api/actions/pending", (_req, res) => res.json({ actions: [...pending.values()] }));
app.get("/api/actions/feed", (_req, res) => res.json({ actions: feed }));
app.get("/api/trajectory/:sessionId", (req: Request<{ sessionId: string }>, res) => res.json(getTrajectory(req.params.sessionId)));
app.get("/api/trajectory/principal/:principalId", (req: Request<{ principalId: string }>, res) => res.json(getPrincipalTrajectory(req.params.principalId)));

app.post("/api/actions/:id/alternatives", (req: Request<{ id: string }>, res) => {
  const action = pending.get(req.params.id);
  if (!action) return res.status(404).json({ error: "Pending action not found" });
  return res.json({ actionId: action.actionId, status: action.status, alternatives: suggestAlternatives(action), message: "Action remains pending; choose an alternative or decide later" });
});

app.post("/api/actions/:id/alternatives/:alternativeId/execute", (req: Request<{ id: string; alternativeId: string }>, res) => {
  const original = pending.get(req.params.id);
  if (!original) return res.status(404).json({ error: "Pending action not found" });
  const alternative = suggestAlternatives(original).find((item) => item.id === req.params.alternativeId);
  if (!alternative) return res.status(404).json({ error: "Alternative not found" });
  const { actionId: _actionId, ...originalRequest } = original;
  const { decision, tracked } = evaluate({ ...originalRequest, ...alternative.requestPatch });
  feed.unshift(tracked);
  if (decision.status === "REQUIRE_CONFIRMATION") pending.set(tracked.actionId, tracked);
  return res.status(decision.status === "BLOCK" ? 403 : 200).json({ originalActionId: original.actionId, alternative, decision, forwarded: decision.status === "EXECUTE", message: decision.status === "EXECUTE" ? "Safer alternative executed successfully" : "Alternative was also held or blocked by policy" });
});

app.post("/api/actions/:id/approve", (req: Request<{ id: string }>, res) => {
  const action = pending.get(req.params.id);
  if (!action) return res.status(404).json({ error: "Pending action not found" });
  action.status = "APPROVED";
  pending.delete(req.params.id);
  return res.json({ action, forwarded: true, message: "Human approval received; forward to core banking now" });
});

app.post("/api/actions/:id/reject", (req: Request<{ id: string }>, res) => {
  const action = pending.get(req.params.id);
  if (!action) return res.status(404).json({ error: "Pending action not found" });
  action.status = "REJECTED";
  pending.delete(req.params.id);
  return res.json({ action, forwarded: false, message: "Action rejected; it will not be forwarded" });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Sentry banking API listening on http://localhost:${port}`));