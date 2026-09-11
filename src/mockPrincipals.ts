import { Principal } from "./types";

export const principals: Record<string, Principal> = {
  txn_assistant: {
    id: "txn_assistant",
    name: "TxnAssistant",
    role: "customer-service-agent",
    allowedActions: ["read_balance", "read_transactions", "transfer_funds", "close_account", "change_account_details", "place_temporary_hold", "request_callback_verification", "create_closure_request", "create_draft_transfer"],
    accountScope: "own"
  },
  ops_agent: {
    id: "ops_agent",
    name: "OpsAgent",
    role: "bank-operations-agent",
    allowedActions: ["read_balance", "read_transactions", "transfer_funds", "freeze_account", "export_customer_data", "change_account_details", "place_temporary_hold", "restrict_high_risk_transactions", "escalate_fraud_review", "create_redacted_report", "request_callback_verification", "create_draft_transfer"],
    accountScope: "any"
  },
  compromised_agent: {
    id: "compromised_agent",
    name: "CompromisedAgent",
    role: "customer-service-agent",
    allowedActions: ["read_balance", "read_transactions"],
    accountScope: "own"
  }
};