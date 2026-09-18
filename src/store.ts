import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import type {Task} from './types.js';

export class Store {
 db:DatabaseSync;
 constructor(path:string){this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;
 CREATE TABLE IF NOT EXISTS tasks(key TEXT PRIMARY KEY, payload TEXT NOT NULL, watched INTEGER NOT NULL DEFAULT 0, managed INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS actions(id TEXT PRIMARY KEY, task_key TEXT, kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, fingerprint TEXT UNIQUE, payload TEXT);
 CREATE TABLE IF NOT EXISTS commands(id TEXT PRIMARY KEY, task_key TEXT, kind TEXT, body TEXT, status TEXT, result TEXT, created_at INTEGER, updated_at INTEGER);
 CREATE TABLE IF NOT EXISTS chat(id TEXT PRIMARY KEY, role TEXT, body TEXT, created_at INTEGER);
 CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);
 `);}
 upsert(t:Task){this.db.prepare('INSERT INTO tasks(key,payload) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload').run(t.key,JSON.stringify(t));}
 tasks():Task[]{return this.db.prepare('SELECT * FROM tasks').all().map((r:any)=>({...JSON.parse(r.payload),watched:!!r.watched,managed:!!r.managed}));}
 task(key:string){return this.tasks().find(t=>t.key===key);}
 watch(key:string,value:boolean){this.db.prepare('UPDATE tasks SET watched=? WHERE key=?').run(+value,key);}
 manage(key:string){this.db.prepare('UPDATE tasks SET managed=1,watched=1 WHERE key=?').run(key);}
 action(kind:string,title:string,body:string,key:string|null,fingerprint:string,payload?:any){const id=randomUUID(),now=Date.now();this.db.prepare('INSERT OR IGNORE INTO actions(id,task_key,kind,title,body,created_at,updated_at,fingerprint,payload) VALUES(?,?,?,?,?,?,?,?,?)').run(id,key,kind,title,body,now,now,fingerprint,payload?JSON.stringify(payload):null);return this.db.prepare('SELECT * FROM actions WHERE fingerprint=?').get(fingerprint) as any;}
 actions(){return this.db.prepare('SELECT * FROM actions ORDER BY created_at DESC LIMIT 250').all().map((r:any)=>({...r,payload:r.payload?JSON.parse(r.payload):null}));}
 resolve(id:string,status='resolved'){this.db.prepare('UPDATE actions SET status=?,updated_at=? WHERE id=?').run(status,Date.now(),id);}
 expireApprovals(hostId?:string){this.db.prepare("UPDATE actions SET status='expired',updated_at=? WHERE kind='approval' AND status IN ('open','responding')"+(hostId?" AND task_key LIKE ?":'')).run(...(hostId?[Date.now(),hostId+':%']:[Date.now()]));}
 beginCommand(id:string,key:string,kind:string,body:any){const now=Date.now();
 const changed=this.db.prepare('INSERT OR IGNORE INTO commands(id,task_key,kind,body,status,result,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id,key,kind,JSON.stringify(body),'sending',null,now,now);return Number(changed.changes)>0;}
 command(id:string){return this.db.prepare('SELECT * FROM commands WHERE id=?').get(id) as any;}
 finishCommand(id:string,status:string,result:any){this.db.prepare('UPDATE commands SET status=?,result=?,updated_at=? WHERE id=?').run(status,JSON.stringify(result),Date.now(),id);}
 recover(){this.db.prepare("UPDATE commands SET status='uncertain' WHERE status='sending'").run();this.expireApprovals();}
 commands(){return this.db.prepare('SELECT * FROM commands ORDER BY created_at DESC LIMIT 60').all();}
 addChat(role:string,body:any){this.db.prepare('INSERT INTO chat VALUES(?,?,?,?)').run(randomUUID(),role,JSON.stringify(body),Date.now());}
 chat(){return this.db.prepare('SELECT * FROM (SELECT * FROM chat ORDER BY created_at DESC LIMIT 40) ORDER BY created_at').all().map((r:any)=>({...r,body:JSON.parse(r.body)}));}
 close(){this.db.close();}
}
