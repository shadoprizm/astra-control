export interface HostConfig { id:string; name:string; ssh?:string; codex:string; python?:string; }
export interface Message { id:string; role:string; text:string; phase?:string; at?:number; status?:string; exitCode?:number; output?:string; }
export interface Task { key:string; hostId:string; id:string; title:string; cwd:string; branch?:string; updatedAt:number; observedAt:number; turnId?:string; turnStatus?:string; status:string; owned:boolean|null; latest?:Message; messages:Message[]; model?:string; error?:string; managed?:boolean; watched?:boolean; }
export interface Config { port:number; hosts:HostConfig[]; publicOrigin?:string; allowedLogin?:string; auth?:{mode:'cloudflare-access';issuer:string;audience:string;allowedEmails:string[]}; }
export const taskKey = (host:string,id:string) => `${host}:${id}`;
