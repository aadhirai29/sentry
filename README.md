# Sentry

## Runtime Security Middleware for AI Banking Agents

Sentry is a full-stack runtime security prototype that sits between an AI banking agent and a banking system. It evaluates every proposed action before execution and returns one of three decisions:

- `EXECUTE`: the action is authorized and safe enough to continue.
- `REQUIRE_CONFIRMATION`: the action is critical or suspicious and needs human approval.
- `BLOCK`: the action is unauthorized or violates the security boundary.

The dashboard provides supervisor visibility and control. The backend API and security middleware enforce the decision.

When a critical action is held, the supervisor can choose **Suggest alternative**. Sentry returns concrete safer replacement actions, and selecting one sends that replacement back through the same security checks. For example, an account closure can become a temporary hold or callback verification. The original critical action remains pending; the approved replacement is recorded separately and can execute successfully.

```text
User
  |
  v
AI Banking Agent
  |
  v
Sentry API and Security Middleware
  |
  v
Core Banking System
```

The prototype uses a mock banking system and mock banking data. No real customer or bank data is connected.

## Why Sentry Exists

An AI model evaluates requests one at a time. It may not know whether:

- The agent is authorized to access a particular account.
- An action is reversible or destructive.
- The agent's behavior is gradually becoming suspicious.
- Several reasonable requests together form an attack.

A system prompt can influence the model, but it cannot independently enforce authorization, remember complete behavior across sessions, or prevent a tool call from reaching a protected system. Sentry provides that external enforcement layer.

## Three Security Controls

### 1. Authorization Context

Every action carries a principal identity, session, account or resource scope, and requested operation. Sentry checks the principal's permissions before the action can proceed.

Example:

```text
compromised_agent -> export_customer_data -> BLOCK
```

The unauthorized request is stopped before it reaches the banking system.

### 2. Reversibility and Critical-Action Gate

Sentry classifies actions as `READ`, `WRITE`, or `DESTRUCTIVE`.

```text
read_balance                -> READ
small own-account transfer  -> WRITE
change_account_details      -> WRITE
freeze_account              -> DESTRUCTIVE
close_account               -> DESTRUCTIVE
export_customer_data        -> DESTRUCTIVE
```

Routine authorized reads and writes execute without unnecessary approval. Critical actions, such as closing an account, freezing an account, exporting sensitive data, or making a high-value external transfer, are held for a supervisor.

### 3. Cross-Session Behavioral Monitoring

Sentry remembers principal behavior across sessions in `data/trajectory.json`. It tracks:

- Previous actions and risk levels
- Unauthorized attempts
- Account and resource scopes
- Session history
- Risk escalation
- Scope drift

Scope drift means that an agent gradually expands beyond its original account or resource scope. For example:

```text
Session 1: view customer A's balance
Session 2: access customer B's account
Session 3: attempt a high-value external transfer
```

The trajectory score increases as behavior becomes more sensitive. A critical action can then require confirmation even when the principal is otherwise authorized.

## Jury Demonstration

Open:

```text
http://localhost:3000
```

The dashboard focuses on three proof cases.

### 1. Unauthorized Action

Click **1 - Unauthorized Action**.

```text
Compromised agent
  -> attempts export_customer_data
  -> authorization fails
  -> BLOCK
  -> target system is not reached
```

Point to the action feed and show the blocked verdict and `Target: not reached`.

### 2. Destructive Action

Click **2 - Destructive Action**.

```text
Authorized agent
  -> requests close_account
  -> classified as DESTRUCTIVE
  -> REQUIRE_CONFIRMATION
  -> supervisor approves or rejects
```

The action is not forwarded while it is waiting. Approve it through the modal to show the transition to `APPROVED` and forwarding.

### 3. Cross-Session Escalation

Click **3 - Cross-Session Escalation**.

The dashboard replays:

```text
Session 1: view account balance
Session 2: change account details
Session 3: transfer 50,000 externally
```

Show the trajectory chart, session count, scope history, and the final critical action being held for review.

## Frontend

The frontend is a light-themed supervisor console in `public/index.html`. It:

- Replays the three scenarios against the real API.
- Shows the agent conversation.
- Displays the action feed and verdict colors.
- Plots trajectory score changes.
- Shows authorization, risk, scope drift, and session context.
- Provides the human approval queue and modal.
- Shows whether the downstream target was reached.

The frontend does not decide whether an action is safe. It sends requests to the API and visualizes the returned decision.

## Backend and API

The backend is an Express and TypeScript service in `src/index.ts`.

### Routes

```text
GET  /
GET  /health

POST /api/actions/evaluate
GET  /api/actions/pending
GET  /api/actions/feed

POST /api/actions/:id/approve
POST /api/actions/:id/reject
POST /api/actions/:id/alternatives
POST /api/actions/:id/alternatives/:alternativeId/execute

GET  /api/trajectory/:sessionId
GET  /api/trajectory/principal/:principalId
```

### Example Request

```json
{
  "sessionId": "demo-session",
  "principalId": "txn_assistant",
  "action": "close_account",
  "accountId": "txn_assistant:account"
}
```

### Example Decision

```json
{
  "decision": {
    "status": "REQUIRE_CONFIRMATION",
    "risk": "DESTRUCTIVE",
    "trajectoryScore": 20,
    "trajectoryFlagged": true,
    "scopeDrift": false
  },
  "forwarded": false
}
```

## Project Structure

```text
src/
  index.ts                 Express server and routes
  types.ts                 Request and response types
  mockPrincipals.ts        Mock agents and permissions
  authService.ts           Authorization and account-scope checks
  reversibilityService.ts  READ, WRITE, DESTRUCTIVE classification
  trajectoryService.ts     Persistent trajectory and scope-drift monitoring
  decisionEngine.ts        Final security decision
  scenarios.ts             Scripted attack and legitimate traces
  runScenarios.ts          Scenario runner

public/
  index.html               Supervisor dashboard
  architecture.html        Architecture diagram webpage

data/
  trajectory.json          Persistent local trajectory history
```

## Run Locally

Requirements: Node.js and npm.

```powershell
npm install
npm run build
npm run dev
```

Then open `http://localhost:3000`.

Run the scripted backend checks with:

```powershell
npm run scenarios
```

## Mock Data Boundary

The prototype uses:

- Mock principals: `txn_assistant`, `ops_agent`, and `compromised_agent`
- Mock account IDs and scopes
- Mock permissions
- Mock transaction amounts
- Mock sessions and actions
- A mock downstream banking service

The security behavior is implemented in the middleware, but no real transaction is performed.

## Production Direction

For production, Sentry should be deployed primarily as a private backend security platform, not as a browser extension. A bank would integrate its AI agent with a Sentry SDK or API:

```text
AI Banking Agent
  -> Sentry SDK/API
  -> Authorization, risk, and trajectory engine
  -> Human approval service when needed
  -> Secure banking adapter
  -> Core banking API
```

Recommended production improvements:

- OAuth or JWT-based principal verification
- PostgreSQL for actions, approvals, and audit history
- Redis or Kafka for real-time events
- Banking sandbox or core-banking adapter
- Supervisor authentication and role-based approval
- Two-person approval for high-value actions
- Notifications through email, Slack, Teams, or mobile push
- Immutable audit logs
- Configurable policy thresholds
- More advanced anomaly detection

## One-Sentence Explanation

> Sentry allows AI agents to assist with banking tasks while ensuring that unauthorized actions are blocked, critical actions require human approval, and gradual cross-session escalation is detected before it reaches the banking system.
