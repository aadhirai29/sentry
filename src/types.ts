export type RiskLevel = "READ" | "WRITE" | "DESTRUCTIVE";
export type DecisionStatus = "EXECUTE" | "BLOCK" | "REQUIRE_CONFIRMATION";

export interface Principal {
  id: string;
  name: string;
  role: string;
  allowedActions: string[];
  accountScope: "own" | "any" | "none";
}

export interface ActionRequest {
  sessionId: string;
  principalId: string;
  action: string;
  accountId?: string;
  destinationAccountId?: string;
  amount?: number;
  currency?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface Decision {
  status: DecisionStatus;
  reason: string;
  risk: RiskLevel;
  trajectoryScore: number;
  trajectoryFlagged: boolean;
  scopeDrift?: boolean;
  sessionCount?: number;
  crossSessionScore?: number;
  actionId: string;
}

export interface TrackedAction extends ActionRequest {
  actionId: string;
  risk: RiskLevel;
  status: DecisionStatus | "APPROVED" | "REJECTED";
  reason: string;
  createdAt: string;
}

export interface ActionAlternative {
  id: string;
  label: string;
  action: string;
  requestPatch: Partial<ActionRequest>;
}