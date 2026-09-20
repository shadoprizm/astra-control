import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import type { HostConfig } from "./types.js";
import { APP_VERSION } from "./version.js";

export class Rpc extends EventEmitter {
  proc?: ChildProcessWithoutNullStreams;
  pending = new Map<
    number,
    {
      resolve: (x: any) => void;
      reject: (e: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  next = 0;
  connecting?: Promise<void>;
  ready = false;
  generation = "";
  constructor(public host: HostConfig) {
    super();
  }
  async connect() {
    if (this.ready) return;
    if (this.connecting) return this.connecting;
    this.connecting = this.start().finally(() => {
      this.connecting = undefined;
    });
    return this.connecting;
  }
  private async start() {
    const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
    const p = this.host.ssh
      ? spawn("ssh", [
          "-T",
          "-o",
          "BatchMode=yes",
          "-o",
          "ConnectTimeout=8",
          "-o",
          "ServerAliveInterval=15",
          "-o",
          "ServerAliveCountMax=2",
          this.host.ssh,
          `exec ${quote(this.host.codex)} app-server`,
        ])
      : spawn(this.host.codex, ["app-server"]);
    this.proc = p;
    this.generation = randomUUID();
    const rl = createInterface({ input: p.stdout });
    rl.on("line", (line) => {
      try {
        const m = JSON.parse(line);
        if (m.id != null && !m.method) {
          const v = this.pending.get(m.id);
          if (v) {
            clearTimeout(v.timer);
            this.pending.delete(m.id);
            m.error
              ? v.reject(new Error(m.error.message))
              : v.resolve(m.result);
          }
        } else {
          this.emit("event", m, this.generation);
        }
      } catch {}
    });
    p.stderr.on("data", () => {}); // Never forward runtime logs or secrets to the browser.
    const ended = () => {
      if (this.proc !== p) return;
      this.ready = false;
      this.proc = undefined;
      for (const q of this.pending.values()) {
        clearTimeout(q.timer);
        q.reject(
          new Error("Codex connection closed; delivery may be uncertain."),
        );
      }
      this.pending.clear();
      this.emit("disconnect");
    };
    p.on("error", ended);
    p.on("exit", ended);
    try {
      await this.raw(
        "initialize",
        {
          clientInfo: {
            name: "threadhelm",
            title: "ThreadHelm",
            version: APP_VERSION,
          },
          capabilities: { experimentalApi: true },
        },
        15000,
      );
      this.write({ method: "initialized", params: {} });
      this.ready = true;
    } catch (e) {
      p.kill();
      throw e;
    }
  }
  write(m: any) {
    if (!this.proc || this.proc.stdin.destroyed)
      throw new Error("Codex is offline");
    this.proc.stdin.write(JSON.stringify(m) + "\n");
  }
  private raw(method: string, params: any, timeout = 20000): Promise<any> {
    const id = ++this.next;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            `${method} timed out; do not retry a write until its outcome is checked.`,
          ),
        );
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.write({ id, method, params });
      } catch (e) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(e as Error);
      }
    });
  }
  async call(method: string, params: any, timeout = 20000) {
    await this.connect();
    return this.raw(method, params, timeout);
  }
  respond(id: any, result: any, generation: string) {
    if (generation !== this.generation || !this.ready)
      throw new Error(
        "This request belongs to an expired connection and cannot be reused. Resume the task and have the agent request approval again.",
      );
    this.write({ id, result });
  }
  close() {
    this.proc?.kill();
  }
}
