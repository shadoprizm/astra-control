import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const pkg=JSON.parse(readFileSync(`${root}/package.json`,'utf8'));

export const APP_VERSION=String(pkg.version||'unknown');

export interface ReleaseIdentity {version:string;commit:string;installedAt?:string;}

export function releaseIdentity():ReleaseIdentity {
 const path=`${root}/release.json`;
 if(!existsSync(path))return {version:APP_VERSION,commit:'development'};
 try{
  const release=JSON.parse(readFileSync(path,'utf8'));
  return {version:String(release.version||APP_VERSION),commit:String(release.commit||'unknown').slice(0,40),...(release.installedAt?{installedAt:String(release.installedAt)}:{})};
 }catch{return {version:APP_VERSION,commit:'invalid-release-manifest'};}
}
