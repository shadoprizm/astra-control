# Architecture and integration direction

## Current

The browser talks to a loopback Node hub over HTTP and server-sent events. SQLite persists tasks, inbox entries, command delivery, and coordinator messages. Local/SSH Python readers inspect Codex projections without modifying them. Separate Codex App Server subprocesses execute dashboard-managed work through JSON-RPC. The coordinator is an on-demand read-only planning turn; proposed dispatches require a user action.

The current provider-specific code is in `src/rpc.ts`, `src/hosts.ts`, `src/engine.ts`, and `connector/snapshot.py`. The database discovery adapter depends on internal schemas and must remain version-checked and replaceable.

## Target

Browser → authenticated server hub → machine connector → provider runtime.

The hub owns coordination and its audit trail. Machine connectors own persistent runtime connections and credentials. Provider adapters advertise what each session supports. The browser receives normalized state and renders native approval details only when the adapter can answer that request safely.

A future session identifier needs provider + machine + native session ID. Capabilities include observe, create, resume, send, steer, interrupt, and answer-request, plus reasons for unsupported operations. A request is tied to its provider session and connection generation; reconnect must reconcile it before accepting a response. Existing task keys need a migration rather than a silent format change.

## Codex integration investigation

[Codex App Server documentation](https://learn.chatgpt.com/docs/app-server) describes conversation, streaming, approval, and runtime APIs plus stdio, WebSocket, and Unix transports. Its remote CLI interface is a useful shared-runtime prototype target. The documentation labels the WebSocket transport experimental and unsupported for production workloads.

A remote CLI connection is not proof that an existing desktop app can attach to the same runtime. Desktop coexistence, event subscriptions, writer ownership, and which client receives and resolves requests must be tested separately. The MVP's separate App Server cannot take over a thread still owned by the desktop. Private IPC and direct database edits are not a supported bridge.

The next prototype should use an isolated runtime and disposable thread, two authenticated clients, a harmless permission request, a mid-turn message, and a disconnect/reconnect. Record which events both clients receive and which responses are accepted before integrating it into the board.

## Future providers

Claude Code and other tools are roadmap items, not supported integrations today. Use each provider's documented SDK/runtime surface and preserve its permissions model. An adapter must not pretend that all providers share the same approval or resumption semantics.
