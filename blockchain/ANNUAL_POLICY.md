# Annual Roman units and Jailtime wallet policy

This implements the first repository-backed configuration agreed in the October
2026 design conversation. It replaces the syntactically broken Arena Credit
simulator. It is an **off-chain, local simulation**, not a deployed blockchain,
wallet custodian, or contract migration. No existing account balances are imported,
burned, frozen, or expired by installing or importing this module.

## Configuration and units

`annual-token-policy.json` is validated on startup and its SHA-256 hash is recorded
in every journal event. Live networks, external assets and rollover are disabled;
changing these flags to `true` is rejected rather than activating an adapter.

The retained provisional annual ceiling is 1,000,000 As, represented by
`100000000` atomic units. It is a configurable simulation ceiling, not an approved
mainnet issuance. One As is 100 atomic units; Sestertius = 400, Denarius = 1,600,
Aureus = 40,000. These are denominations of the same annual asset, not four assets
with independent prices or metal backing. All API amounts and balance outputs
are integer atomic units, returned as decimal strings; unsafe JavaScript numbers
and fractional inputs are rejected. BigInt arithmetic is used internally.

Each series is `ARC-YYYY`. The start is inclusive and the end exclusive at local
midnight on January 1 in `Asia/Jerusalem`. Boundaries are resolved to UTC timestamps
and recorded in the create-series receipt. The host clock is trusted simulation
input and must not come from the client. An on-chain port must use predefined
boundaries and consensus time; no script needs to run at midnight for expiry.

The constructor creates no series or balances. Governance explicitly creates a
series, then issues into it while active. Every year has its own cap and cumulative
issuance counter. Burning or withdrawing does not reopen that cap. Old balances
remain historical records but have zero availability after expiry. Old and new
series cannot be exchanged, combined, or rolled over by this engine.

## Accounts and transfers

Personal, business, treasury, project and subaccount records have viewer, spender
and owner roles. Parent permissions are inherited. New child accounts inherit
their parent owners rather than keeping the creator as an independent permanent
owner. Demotion and revocation remove stronger descendant grants. Governance can
issue assets and approve sanctions, but has no implicit right to debit somebody
else's account. Businesses need governance approval before receiving payments.

The provisional policy forbids transfers between separate personal hierarchies,
including routing through their subaccounts. Allocation is restricted to one
hierarchy; payments must target an approved business hierarchy. Business-to-person
transfers are currently possible for legitimate payouts; business collusion,
purpose-restricted grants, payout quotas and identity uniqueness are **not**
implemented. Account creation alone therefore does not establish anti-Sybil
eligibility. There is no automatic annual entitlement or automatic allocation.

Every outgoing debit uses the same unlocked-availability calculation: withdrawal,
transfer, payment, allocation, burn and a new reservation. Unsupported swap and
bridge commands are rejected. The old implicit transfer fee and unsafe transfer
signature are retired. No implicit fees are charged by this reference engine.

`withdraw` retires internal credits and returns an audit receipt with
`externalTransferExecuted: false`. It neither sends Pi nor redeems credits for
money. Real withdrawal settlement needs a separate verified adapter and must
enforce this policy at the actual custody/contract boundary before activation.

## Reservations and fixed Jailtime holds

Reservations reduce availability without duplicating balance. Settlement transfers
the reserved amount exactly once. Deadlines must be at least the configured one
day before annual expiry. Reservations expire lazily from trusted time. Previously
reserved obligations remain settleable after a free-balance hold is imposed, as
long as the reservation and series are active. Cancellation or expiration during
an active year puts released funds under the current hold percentage.

Holds require a case ID, subject with account access, exact account and series,
reason, evidence reference, percentage, end time and governance approver. The
configured tiers are 10/25/50/75/100 percent; the provisional maximum duration is
30 days. These parameters can be reviewed before starting a new simulation
journal. One account's hold does not automatically seize unrelated accounts or
business-partner funds. Subject-only access revocation is a role operation;
an explicitly account-scoped monetary decision is separate.

At application, the percentage is converted into a fixed amount from balance
minus prior reservations. With 100,000 atomic units, a 20,000-unit reservation and
a 25% case, 20,000 units are held and 60,000 are available. Repeated small
withdrawals cannot reduce that fixed hold. Incoming credits and released
reservations increase its cumulative basis. Rounding is upward on the cumulative
basis, not independently on every tiny credit. Overlapping cases use the maximum
live hold rather than summing percentages. Ending one case retains other holds.

Appeals and releases append new events. Time-based release requires no scheduler.
Release never revives expired tokens. A case is series-scoped and does not
automatically restrict a new year's issuance. Prior commitments, appeal authority
and the expiry treatment need to be disclosed in product UX before real use.

## Trusted host integration

`backend/jailtime-events` exports `createJailtimeWalletController`. The host must
provide `resolvePrincipal(context)` from authenticated server identity and
`loadApprovedDecision(id, actor)` from authoritative decision storage. An apply
decision must be approved, immutable and explicitly `walletScope: "account"`.
The engine separately requires its configured governance principal. No bot or
scheduled room event automatically authorizes a hold. Client `joinJail` profiles,
request body actor fields and an AI risk score are not approved decisions.

The controller is dependency-injected and tested but **not mounted as HTTP routes**.
The existing app's identity and permissions endpoints are not an adequate trust
boundary for monetary operations. There is no new network endpoint to impersonate
`admin`. Public wallet reads must use the controller or pass an authenticated
caller to `getBalanceSummary`; audit/snapshot methods are private operator tools
and include account and moderation data.

This first version uses one configured governance principal. It does not implement
multisig approvals, decentralized consensus, token custody, client signatures,
eligibility proofs, account recovery, Spatial/Unreal client code or AI autonomy.
Those are explicit next integration stages, not properties of this simulator.

## Storage, replay and operation

`journalStore.openLedger({journalPath, policy, clock})` opens an absolute local path
with a single-writer lock. It appends and fsyncs each event before publishing state.
State is reconstructed through command replay; hashes, sequence, policy and results
must match. Request IDs are bound to command and actor, so retrying a successful
request returns its original receipt without another debit. Reusing an ID with a
different payload is rejected. Persist request IDs across host retries.

The journal contains a policy header and one JSON event per line. Truncated records,
policy changes and invalid replay stop startup. Write failure stops all subsequent
ledger use until reopened and verified. After a crash, inspect the existing writer
and journal before manually removing a stale `.lock`; do not discard account
history. Back up the journal with private access and test recovery. The default
in-memory instance is only for isolated tests; persistent hosts must use openLedger.

Hash chaining detects accidental or partial modification relative to the retained
head. It does not stop a privileged operator from replacing a whole history or
removing its tail. Independent checkpoint anchoring and signed commands are needed
before claiming append-only decentralization. The host must provide a reliable,
monotonic clock after restart. Single-file storage is not multi-writer production
infrastructure and this implementation has not been load-tested.

Run the dependency-free checks from the repository root (Node 20+ recommended):

```sh
npm run arena:check
npm run test:arena
node blockchain/test_arenaCreditService.js
```

The new scoped workflow tests the policy on Node 20 and 24. Legacy whole-repository
CI remains separate. Staging deployment is now limited to pushes to main/develop,
so review PRs do not deploy staging. No merge, deployment, Pi transaction, physical
server configuration or existing-balance migration is performed by this change.

Before real use: choose the chain and custody adapter; replace the single governance
principal with the agreed approval system; implement verified user identity; pin
annual parameters; port or enforce the rules at the chain boundary; verify shared
business scope and external settlement; import any legacy data through a reviewed
migration; and complete security/recovery testing. A local journal must never be
presented as already decentralized on-chain enforcement.
