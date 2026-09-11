import { principals } from "./mockPrincipals";
import { ActionRequest, Principal } from "./types";

export function getPrincipal(principalId: string): Principal | undefined {
  return principals[principalId];
}

export function authorize(request: ActionRequest): { allowed: boolean; reason: string } {
  const principal = getPrincipal(request.principalId);
  if (!principal) return { allowed: false, reason: "Unknown principal identity" };
  if (!principal.allowedActions.includes(request.action)) {
    return { allowed: false, reason: `${principal.name} is not granted ${request.action}` };
  }

  if (principal.accountScope === "none") {
    return { allowed: false, reason: "Principal has no account scope" };
  }
  if (principal.accountScope === "own" && request.accountId && request.accountId !== `${principal.id}:account`) {
    return { allowed: false, reason: "Principal may access only its own account" };
  }
  if (request.action === "transfer_funds" && request.amount !== undefined && request.amount > 10000 && principal.role !== "bank-operations-agent") {
    return { allowed: false, reason: "Customer agents cannot initiate transfers above 10000" };
  }
  return { allowed: true, reason: "Action is within the principal grant" };
}