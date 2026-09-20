# Per-project objective and authority template

This template captures the authority that a task inherits when it is submitted. The owner sets and versions the project defaults. A model may recommend a narrower scope, but free text, transcripts, tool output, and approval payloads cannot add permissions.

## Project default

```yaml
templateId: project-slug/default
version: 1
project:
  name: Human-readable project name
  repositoryIds:
    - exact provider repository ID or normalized Git remote
  allowedRoots:
    - /absolute/project/root

objectiveDefaults:
  purpose: The standing purpose of work in this project
  definitionOfDone:
    - Required observable outcome
    - Required verification evidence
  stopConditions:
    - A decision is needed from the owner
    - The requested scope conflicts with active work
    - Required evidence is unavailable

authority:
  actionClasses:
    observe: allow
    analyze: allow
    editWorkspace: review
    runTests: review
    installDependencies: deny
    useNetwork: deny
    sendMessage: deny
    createTask: deny
    answerApproval: deny
    publishOrDeploy: deny
    spendMoney: deny
  filesystem:
    read:
      - /absolute/project/root
    write:
      - /absolute/project/root
    forbidden:
      - ~/.ssh
      - ~/.config
      - any credential or browser-session directory
  network:
    mode: none
    allowedHosts: []
  providers:
    allowed:
      - codex
    unattendedEligible:
      - codex
    localOnly: false
  funding:
    currency: USD
    perTask: 0
    perDay: 0

execution:
  sandbox: provider-native
  approvalPolicy: on-request
  checkoutMode: isolated-worktree
  concurrentWriterPolicy: refuse-same-checkout

scopeChange:
  requireOwnerConfirmationWhen:
    - the objective or definition of done changes
    - a new repository, root, provider, host, or network destination is needed
    - an action class would move from deny to review or allow
    - a funding limit would increase
    - work would publish, deploy, send externally, or accept a high-impact approval
```

## Task submission

```yaml
projectTemplate: project-slug/default@1
objective: The concrete result requested for this task
definitionOfDone:
  - Task-specific observable outcome
  - Task-specific verification evidence
requestedScope:
  roots:
    - /absolute/project/root/subdirectory
  actionClasses:
    - observe
    - analyze
  provider: codex
  model: optional exact model
  deadline: optional ISO-8601 timestamp
```

Submission takes the intersection of `requestedScope` and the owner-set project default. Missing values inherit the default. A task cannot widen the template. If the request needs broader authority, Astra creates a decision for the owner that shows the exact difference and the evidence revision it was based on.

The agreed objective is the submitted objective plus its definition of done, template identity, template version, and resulting effective scope. Any proposed change produces a new revision. Unattended work can continue only while the current action stays inside that immutable revision and the project's deterministic action-class allowlist.

## Owner setup checklist

- Set the project and repository identity once.
- Choose allowed roots; do not infer them from task prose.
- Set every action class explicitly. New classes default to `deny`.
- Identify providers eligible for unattended work. A provider without a native sandbox and approval policy is never eligible.
- Keep local-only projects pinned to local analysis and execution routes.
- Set funding limits explicitly, including zero.
- Version every change so the audit trail can reconstruct the authority used by a task.
