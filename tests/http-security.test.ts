import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,symlinkSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {ActionBudget} from '../src/http-security.js';

test('action limits expire and are independent per authenticated owner',()=>{
 const budget=new ActionBudget(2,1000);
 assert.equal(budget.accept('owner',100),true);assert.equal(budget.accept('owner',101),true);
 assert.equal(budget.accept('owner',102),false);assert.equal(budget.accept('another-owner',102),true);
 assert.equal(budget.accept('owner',1100),true);
});

test('the actual public-mode server denies anonymous and forged-identity requests on every route',async()=>{
 const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
 const port=(reservation.address() as any).port;await new Promise<void>(r=>reservation.close(()=>r()));
 const dir=mkdtempSync(join(tmpdir(),'astra-http-'));
 for(const name of ['src','public','connector'])cpSync(resolve(name),join(dir,name),{recursive:true});
 symlinkSync(resolve('node_modules'),join(dir,'node_modules'),'dir');
 writeFileSync(join(dir,'package.json'),' {"type":"module"}');mkdirSync(join(dir,'data'));
 writeFileSync(join(dir,'data/config.json'),JSON.stringify({port,hosts:[],publicOrigin:'https://control.example.com',auth:{mode:'cloudflare-access',issuer:'https://example.cloudflareaccess.com',audience:'test-app',allowedEmails:['owner@example.com']}}));
 const child=spawn(process.execPath,['--import','tsx',join(dir,'src/server.ts')],{stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 try{
  const until=Date.now()+10000;while(!output.includes('listening')&&Date.now()<until&&child.exitCode===null)await new Promise(r=>setTimeout(r,40));
  assert.match(output,/listening/,'server starts');
  for(const path of ['/','/api/state','/api/events','/api/detail?key=any','/healthz','/app.js','/robots.txt']){
   const response=await fetch(`http://127.0.0.1:${port}${path}`,{headers:{Host:'control.example.com','Cf-Access-Authenticated-User-Email':'owner@example.com','Tailscale-User-Login':'owner@example.com'}});
   assert.equal(response.status,403,path);assert.match(response.headers.get('x-robots-tag')||'',/noindex/);
   assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);
   assert.equal(response.headers.get('strict-transport-security'),'max-age=31536000');
   assert.equal((await response.json()).tasks,undefined);
  }
  const spoof=await fetch(`http://127.0.0.1:${port}/api/state`,{headers:{Host:`localhost:${port}`,'Cf-Access-Jwt-Assertion':'forged'}});assert.equal(spoof.status,403);
  const signup=await fetch(`http://127.0.0.1:${port}/api/signup`,{method:'POST',headers:{Host:'control.example.com','Content-Type':'application/json'},body:'{}'});assert.equal(signup.status,403);
 }finally{
  if(child.exitCode===null){const ended=once(child,'exit');child.kill('SIGTERM');await ended;}
  rmSync(dir,{recursive:true,force:true});
 }
});
