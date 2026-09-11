import { randomUUID } from "crypto";
import { authorize } from "./authService";
import { classifyRisk } from "./reversibilityService";
import { track } from "./trajectoryService";
import { ActionAlternative, ActionRequest, Decision, TrackedAction } from "./types";

export function suggestAlternatives(action: TrackedAction): ActionAlternative[] {
  const alternative = (id: string, label: string, replacement: string, requestPatch: Partial<ActionRequest> = {}): ActionAlternative => ({ id, label, action: replacement, requestPatch: { action: replacement, ...requestPatch } });
  switch (action.action) {
    case "transfer_funds":
      return [
        alternative("reduce-transfer", "Reduce the amount and transfer within the verified internal scope", "transfer_funds", { amount: 5000, destinationAccountId: action.accountId }),
        alternative("verify-beneficiary", "Request beneficiary verification before scheduling the transfer", "request_callback_verification"),
        alternative("draft-transfer", "Create a draft transfer for customer review without sending it", "create_draft_transfer")
      ];
    case "close_account":
      return [
        alternative("temporary-hold", "Place the account on a temporary hold instead of closing it", "place_temporary_hold"),
        alternative("callback-verification", "Start customer callback verification before closure", "request_callback_verification"),
        alternative("second-review", "Create a closure request for a second supervisor", "create_closure_request")
      ];
    case "freeze_account":
      return [
        alternative("temporary-hold", "Apply a temporary transaction hold with automatic expiry", "place_temporary_hold"),
        alternative("restrict-risk", "Restrict high-risk transactions while allowing verified access", "restrict_high_risk_transactions"),
        alternative("fraud-review", "Escalate to the fraud operations queue", "escalate_fraud_review")
      ];
    case "export_customer_data":
      return [
        alternative("minimum-fields", "Return only the minimum fields needed for the task", "create_redacted_report"),
        alternative("redacted-report", "Create a redacted report without direct identifiers", "create_redacted_report"),
        alternative("compliance-review", "Request a verified compliance purpose and second-person approval", "escalate_fraud_review")
      ];
    default:
      return [
        alternative("draft-action", "Create a draft action for supervisor review", "create_draft_transfer"),
        alternative("verified-scope", "Limit the action to the principal's verified account scope", "request_callback_verification"),
        alternative("additional-verification", "Request additional customer or beneficiary verification", "request_callback_verification")
      ];
  }
}

export function evaluate(request: ActionRequest): { decision: Decision; tracked: TrackedAction } {
  const risk = classifyRisk(request);
  const authorization = authorize(request);
  const trajectory = track(request, risk, authorization.allowed);
  let status: Decision["status"] = "EXECUTE";
  let reason = authorization.reason;

  if (!authorization.allowed) {
    status = "BLOCK";
  } else if (risk === "DESTRUCTIVE") {
    status = "REQUIRE_CONFIRMATION";
    reason = trajectory.flagged
      ? "Critical action requires confirmation because the behavioral trajectory is elevated"
      : "Critical action requires explicit human confirmation";
  }

  const actionId = randomUUID();
  const tracked: TrackedAction = { ...request, actionId, risk, status, reason, createdAt: new Date().toISOString() };
  return { decision: { status, reason, risk, trajectoryScore: trajectory.score, trajectoryFlagged: trajectory.flagged, scopeDrift: trajectory.scopeDrift, sessionCount: trajectory.sessionCount, crossSessionScore: trajectory.crossSessionScore, actionId }, tracked };
}