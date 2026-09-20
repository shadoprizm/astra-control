import test from "node:test";
import assert from "node:assert/strict";
import {
  POLICY_ACTIONS,
  POLICY_ACTORS,
  POLICY_MATRIX,
  policyAction,
  policyDecision,
} from "../src/policy.js";

test("the authority truth table covers every actor and action class", () => {
  assert.deepEqual(
    Object.keys(POLICY_MATRIX).sort(),
    [...POLICY_ACTORS].sort(),
  );
  for (const actor of POLICY_ACTORS)
    assert.deepEqual(
      Object.keys(POLICY_MATRIX[actor]).sort(),
      [...POLICY_ACTIONS].sort(),
    );
});

test("only the owner can execute actions in Release 0", () => {
  for (const action of POLICY_ACTIONS) {
    assert.equal(policyDecision("owner", action), "allow");
    assert.equal(policyDecision("coordinator", action), "propose");
    assert.equal(policyDecision("autopilot", action), "deny");
  }
});

test("approval decisions map to separate policy classes and unknown actions fail closed", () => {
  assert.equal(policyAction("approval", "accept"), "approval.accept");
  assert.equal(policyAction("approval", "answer"), "approval.answer");
  assert.equal(policyAction("approval", "deploy"), undefined);
  assert.equal(policyAction("delete"), undefined);
});
