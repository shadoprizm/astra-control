import type {IncomingMessage} from 'node:http';
import {createRemoteJWKSet, jwtVerify} from 'jose';
import type {Config} from './types.js';

export interface Identity { subject:string; expiresAt?:number; }

export function createAccessGuard(config:Config, testKeys?:ReturnType<typeof createRemoteJWKSet>) {
  const origin=config.publicOrigin;
  if(origin){
    const url=new URL(origin);
    if(url.protocol!=='https:' || url.origin!==origin) throw new Error('publicOrigin must be an exact HTTPS origin without a trailing slash');
  }
  const auth=config.auth;
  if(auth && auth.mode!=='cloudflare-access') throw new Error('Unsupported authentication mode');
  if(origin && !auth && !config.allowedLogin) throw new Error('External access requires authentication configuration');
  if(auth?.mode==='cloudflare-access'){
    if(!origin || !/^https:\/\/[a-zA-Z0-9-]+\.cloudflareaccess\.com$/.test(auth.issuer)
      || !auth.audience?.trim() || !auth.allowedEmails?.length
      || auth.allowedEmails.some(email=>typeof email!=='string'||!email.includes('@')))
      throw new Error('Cloudflare Access requires publicOrigin, team issuer, application audience, and allowedEmails');
  }
  const keys=auth?.mode==='cloudflare-access'
    ? testKeys||createRemoteJWKSet(new URL(`${auth.issuer}/cdn-cgi/access/certs`),{timeoutDuration:5000}) : undefined;
  const hosts=new Set([`localhost:${config.port}`,`127.0.0.1:${config.port}`,...(origin?[new URL(origin).host]:[])]);
  return async (req:IncomingMessage):Promise<Identity>=>{
    if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress||'')) throw new Error('Loopback proxy connection required');
    if(!hosts.has(req.headers.host||'')) throw new Error('Host not allowed');
    if(auth?.mode==='cloudflare-access'){
      // Require the signed assertion even if the proxy rewrites Host to localhost.
      const token=req.headers['cf-access-jwt-assertion'];
      if(typeof token!=='string' || token.length>16384) throw new Error('Sign in through Cloudflare Access');
      try {
        const {payload}=await jwtVerify(token,keys!,{issuer:auth.issuer,audience:auth.audience,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email']});
        if(typeof payload.email!=='string'||!auth.allowedEmails.some(e=>e.toLowerCase()===payload.email!.toString().toLowerCase())) throw new Error('Unauthorized identity');
        return {subject:payload.sub!,expiresAt:payload.exp!*1000};
      } catch {throw new Error('Access token is invalid, expired, or not authorized');}
    }
    if(origin && req.headers.host===new URL(origin).host){
      if(req.headers['tailscale-user-login']!==config.allowedLogin) throw new Error('Sign in to your authorized Tailscale account');
      return {subject:config.allowedLogin!};
    }
    return {subject:'local-owner'};
  };
}
