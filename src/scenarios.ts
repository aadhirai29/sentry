import { evaluate } from "./decisionEngine";
import { resetTrajectories } from "./trajectoryService";

export function runScenarios() {
  resetTrajectories();
  const attack = ["read_balance", "read_transactions", "export_customer_data", "close_account"].map((action) =>
    evaluate({ sessionId: "attack-session", principalId: "compromised_agent", action, accountId: "compromised_agent:account" }).decision
  );
  resetTrajectories();
  const legitimate = [
    { action: "read_balance" },
    { action: "transfer_funds", accountId: "txn_assistant:account", destinationAccountId: "txn_assistant:account", amount: 3000 },
    { action: "change_account_details", accountId: "txn_assistant:account" },
    { action: "close_account" }
  ].map((item) => evaluate({ sessionId: "legitimate-session", principalId: "txn_assistant", ...item }).decision);
  resetTrajectories();
  const crossSession = [
    evaluate({ sessionId: "session-one", principalId: "ops_agent", action: "read_balance", accountId: "customer-a:account" }).decision,
    evaluate({ sessionId: "session-two", principalId: "ops_agent", action: "read_balance", accountId: "customer-b:account" }).decision,
    evaluate({ sessionId: "session-two", principalId: "ops_agent", action: "freeze_account", accountId: "customer-b:account" }).decision
  ];
  return { attack, legitimate, crossSession };
}