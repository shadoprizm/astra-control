export const POLICY_ACTORS = ["owner", "coordinator", "autopilot"] as const;
export type PolicyActor = (typeof POLICY_ACTORS)[number];

export const POLICY_ACTIONS = [
  "send",
  "interrupt",
  "archive",
  "create",
  "watch",
  "resolve",
  "approval.accept",
  "approval.decline",
  "approval.cancel",
  "approval.answer",
  "refresh",
] as const;
export type PolicyAction = (typeof POLICY_ACTIONS)[number];
export type PolicyDecision = "allow" | "propose" | "deny";

const all = (decision: PolicyDecision): Record<PolicyAction, PolicyDecision> =>
  Object.fromEntries(
    POLICY_ACTIONS.map((action) => [action, decision]),
  ) as Record<PolicyAction, PolicyDecision>;

export const POLICY_MATRIX: Record<
  PolicyActor,
  Record<PolicyAction, PolicyDecision>
> = {
  owner: all("allow"),
  coordinator: all("propose"),
  autopilot: all("deny"),
};

export function policyAction(
  type: string,
  decision?: string,
): PolicyAction | undefined {
  const value = type === "approval" ? `approval.${decision || ""}` : type;
  return POLICY_ACTIONS.find((action) => action === value);
}

export function policyDecision(
  actor: PolicyActor,
  action: PolicyAction,
): PolicyDecision {
  return POLICY_MATRIX[actor][action];
}
