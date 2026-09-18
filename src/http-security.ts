import type {ServerResponse} from 'node:http';

export function securityHeaders(res:ServerResponse, https:boolean) {
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive, nosnippet');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  if(https)res.setHeader('Strict-Transport-Security','max-age=31536000');
}

// Limit expensive owner actions and event streams without storing request bodies.
export class ActionBudget {
  private entries=new Map<string,{count:number;reset:number}>();
  constructor(private limit=60,private windowMs=60000){}
  accept(subject:string,now=Date.now()) {
    for(const [key,value] of this.entries)if(value.reset<=now)this.entries.delete(key);
    let entry=this.entries.get(subject);
    if(!entry){entry={count:0,reset:now+this.windowMs};this.entries.set(subject,entry);}
    return ++entry.count<=this.limit;
  }
}
