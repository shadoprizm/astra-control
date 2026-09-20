import datetime as dt
import importlib.util
import os
import pathlib
import unittest
from unittest import mock


ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("growth", ROOT / "scripts" / "growth.py")
assert SPEC and SPEC.loader
growth = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(growth)


class GrowthAutomationTest(unittest.TestCase):
    def test_campaign_is_valid(self):
        self.assertEqual(growth.validate(), [])

    def test_calendar_covers_campaign_end(self):
        calendar = growth.render_calendar()
        self.assertIn("2026-12-19", calendar)
        self.assertIn("Review the 1,000-star target", calendar)

    def test_every_outbound_schedule_event_has_a_human_gate(self):
        _, schedule, _ = growth.require_valid()
        outbound = {"launch", "distribution", "content", "proof", "release", "recruitment", "community"}
        self.assertTrue(all(event["human_gate"] for event in schedule["events"] if event["kind"] in outbound))

    def test_content_draft_has_approval_marker(self):
        draft = growth.content_drafts(dt.date(2026, 9, 21), "show-hn", 7)
        self.assertIn("Draft only — human approval required", draft)
        self.assertIn("Automation must never submit", draft)
        self.assertIn("TODO_", draft)

    def test_heartbeat_is_stable_before_campaign(self):
        heartbeat = growth.heartbeat(dt.date(2026, 9, 19), include_metrics=False)
        self.assertIn("campaign day -1", heartbeat)
        self.assertIn("must not post to a community", heartbeat)

    def test_github_token_prefers_environment(self):
        with mock.patch.dict(os.environ, {"GITHUB_TOKEN": "workflow-token"}):
            with mock.patch.object(growth.subprocess, "run") as run:
                self.assertEqual(growth.github_token(), "workflow-token")
        run.assert_not_called()

    def test_github_token_falls_back_to_authenticated_cli(self):
        completed = growth.subprocess.CompletedProcess(["gh", "auth", "token"], 0, "cli-token\n", "")
        with mock.patch.dict(os.environ, {}, clear=True):
            with mock.patch.object(growth.subprocess, "run", return_value=completed):
                self.assertEqual(growth.github_token(), "cli-token")


if __name__ == "__main__":
    unittest.main()
