import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { Rpc } from "./rpc.js";
import type { HostConfig, Project, Task } from "./types.js";
import { taskKey } from "./types.js";

export class Host {
  rpc: Rpc;
  online = false;
  lastSeen = 0;
  error = "Connecting";
  polling = false;
  inventoryCount = 0;
  projects: Project[] = [];
  projectsError = "";
  projectsRefreshedAt = 0;
  projectsPolling = false;
  constructor(
    public config: HostConfig,
    private root: string,
  ) {
    this.rpc = new Rpc(config);
  }
  async snapshot(id?: string): Promise<Task[]> {
    const tasks = await this.python(id ? { id } : {});
    const now = Date.now();
    return tasks.map((t: any) => ({
      ...t,
      key: taskKey(this.config.id, t.id),
      hostId: this.config.id,
      observedAt: now,
    }));
  }
  async git(id: string) {
    return this.python({ method: "git", id });
  }
  async worktree(
    cwd: string,
    title: string,
  ): Promise<{ cwd: string; branch: string; sourceRoot: string }> {
    return this.python({ method: "worktree", cwd, title });
  }
  async refreshProjects(force = false) {
    if (
      this.projectsPolling ||
      (!force && Date.now() - this.projectsRefreshedAt < 60000)
    )
      return;
    this.projectsPolling = true;
    try {
      const projects: Project[] = [];
      let cursor: string | null = null,
        pages = 0;
      do {
        const r = await this.rpc.call("project/list", {
          cursor,
          limit: 100,
          sortKey: "position",
          sortDirection: "asc",
        });
        if (!Array.isArray(r?.data))
          throw new Error("Codex returned an invalid project list");
        for (const p of r.data) {
          const roots: string[] = Array.isArray(p.roots)
            ? p.roots.flatMap((x: any) =>
                typeof x?.path === "string" && x.path.trim() ? [x.path] : [],
              )
            : [];
          if (
            typeof p.id === "string" &&
            typeof p.name === "string" &&
            roots.length
          )
            projects.push({
              id: p.id,
              hostId: this.config.id,
              name: p.name,
              roots: [...new Set(roots)],
              source: "codex",
              recencyAt: typeof p.recencyAt === "number" ? p.recencyAt : null,
            });
        }
        cursor =
          typeof r.nextCursor === "string" && r.nextCursor
            ? r.nextCursor
            : null;
        pages++;
      } while (cursor && pages < 20);
      this.projects = projects;
      this.projectsError = "";
    } catch (e) {
      this.projectsError = (e as Error).message;
    } finally {
      this.projectsRefreshedAt = Date.now();
      this.projectsPolling = false;
    }
  }
  private python(params: any): Promise<any> {
    const script = readFileSync(`${this.root}/connector/snapshot.py`, "utf8");
    const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
    const args = JSON.stringify(params);
    const child = this.config.ssh
      ? spawn("ssh", [
          "-T",
          "-o",
          "BatchMode=yes",
          "-o",
          "ConnectTimeout=8",
          this.config.ssh,
          `python3 - ${quote(args)}`,
        ])
      : spawn(this.config.python || "python3", ["-", args]);
    return new Promise((resolve, reject) => {
      let out = "";
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error("Host did not respond within 25 seconds"));
      }, 25000);
      child.stdout.on("data", (d) => {
        out += d;
        if (out.length > 8000000) child.kill();
      });
      child.stderr.on("data", () => {});
      child.on("error", (e) => {
        clearTimeout(timeout);
        reject(e);
      });
      child.on("close", (code) => {
        clearTimeout(timeout);
        try {
          const result = JSON.parse(out);
          if (!result.ok) throw new Error(result.error);
          resolve(result.result);
        } catch (e) {
          reject(
            new Error(
              code === 255
                ? "SSH connection unavailable"
                : (e as Error).message,
            ),
          );
        }
      });
      child.stdin.end(script);
    });
  }
}
