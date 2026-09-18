import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {createAccessGuard} from '../src/auth.js';
import type {IncomingMessage} from 'node:http';
import type {Config} from '../src/types.js';
const config:Config={port:4318,hosts:[],publicOrigin:'https://control.example.com',auth:{mode:'cloudflare-access',issuer:'https://example.cloudflareaccess.com',audience:'test-app',allowedEmails:['owner@example.com']}};
const {privateKey,publicKey}=await generateKeyPair('RS256');
const keys=createLocalJWKSet({keys:[{...await exportJWK(publicKey),kid:'test',alg:'RS256'}]});
const guard=createAccessGuard(config,keys as any);
function req(token?:string,host='control.example.com',address='127.0.0.1'){return {headers:{host,...(token?{'cf-access-jwt-assertion':token}:{})},socket:{remoteAddress:address}} as IncomingMessage;}
async function token(extra:any={},key=privateKey){return new SignJWT({email:'owner@example.com',...extra}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('owner').setIssuer(config.auth!.issuer).setAudience('test-app').setIssuedAt().setExpirationTime('5m').sign(key);}
test('valid signed owner token is accepted',async()=>assert.equal((await guard(req(await token()))).subject,'owner'));
test('missing assertion is rejected even with localhost Host',async()=>{await assert.rejects(guard(req()),/Sign in/);await assert.rejects(guard(req(undefined,'localhost:4318')),/Sign in/);});
test('forged signature, different identity, expired and wrong audience tokens are rejected',async()=>{
 const other=await generateKeyPair('RS256');
 await assert.rejects(guard(req(await token({},other.privateKey))),/invalid/);
 await assert.rejects(guard(req(await token({email:'other@example.com'}))),/invalid/);
 for(const p of [{exp:1,aud:'test-app'}, {exp:Math.floor(Date.now()/1000)+60,aud:'another-app'}]){
  const jwt=await new SignJWT({email:'owner@example.com',...p}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('owner').setIssuer(config.auth!.issuer).setIssuedAt().sign(privateKey);
  await assert.rejects(guard(req(jwt)),/invalid/);
 }
});
test('bad host and non-loopback origins cannot reach authentication',async()=>{await assert.rejects(guard(req(undefined,'evil.example')),/Host/);await assert.rejects(guard(req(undefined,'control.example.com','192.0.2.10')),/Loopback/);});
test('external origins fail closed without an identity configuration',()=>{assert.throws(()=>createAccessGuard({port:4318,hosts:[],publicOrigin:'https://example.com'}),/requires authentication/);assert.throws(()=>createAccessGuard({...config,auth:{...config.auth!,issuer:'http://evil.example'}}),/requires/);});
test('private Tailscale mode keeps local access and enforces proxy identity',async()=>{const g=createAccessGuard({port:4318,hosts:[],publicOrigin:'https://private.example',allowedLogin:'owner'});assert.equal((await g(req(undefined,'localhost:4318'))).subject,'local-owner');await assert.rejects(g(req(undefined,'private.example')),/Tailscale/);const r=req(undefined,'private.example');r.headers['tailscale-user-login']='owner';assert.equal((await g(r)).subject,'owner');});
