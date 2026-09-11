import { ActionRequest, RiskLevel } from "./types";

export function classifyRisk(request: ActionRequest): RiskLevel {
  if (["read_balance", "read_transactions"].includes(request.action)) return "READ";
  if (request.action === "transfer_funds") {
    const ownAccount = request.accountId === request.destinationAccountId;
    return ownAccount && (request.amount ?? 0) <= 10000 ? "WRITE" : "DESTRUCTIVE";
  }
  if (["close_account", "freeze_account", "export_customer_data"].includes(request.action)) return "DESTRUCTIVE";
  if (request.action === "change_account_details") return "WRITE";
  if (["place_temporary_hold", "restrict_high_risk_transactions", "escalate_fraud_review", "create_redacted_report", "request_callback_verification", "create_closure_request", "create_draft_transfer"].includes(request.action)) return "WRITE";
  return "DESTRUCTIVE";
}