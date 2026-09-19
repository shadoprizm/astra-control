"""Install this user's private background service; preserves an existing deployment."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, shutil, subprocess, plistlib, time, sqlite3, os

source=Path(__file__).resolve().parents[1]
target=Path.home()/'.local/share/astra-control'
label='io.astra.control'
plist=Path.home()/'Library/LaunchAgents'/f'{label}.plist'
node=shutil.which('node')
npm=shutil.which('npm')
git=shutil.which('git')
if not node or not npm or not git:raise SystemExit('Node, npm, and Git are required')
if not (target/'data/config.json').exists() and not (source/'data/config.json').exists():raise SystemExit('Create data/config.json before installation')
dirty=subprocess.run([git,'status','--porcelain','--untracked-files=all'],cwd=source,check=True,capture_output=True,text=True).stdout.strip()
if dirty:raise SystemExit('Refusing to install a dirty source tree. Commit or stash the listed changes first.\n'+dirty)
commit=subprocess.run([git,'rev-parse','HEAD'],cwd=source,check=True,capture_output=True,text=True).stdout.strip()
subprocess.run([npm,'ci','--ignore-scripts'],cwd=source,check=True)
subprocess.run([npm,'test'],cwd=source,check=True)
subprocess.run([npm,'run','build'],cwd=source,check=True)
def artifact_digest(root):
    digest=hashlib.sha256()
    paths=[root/name for name in ['dist','public','connector','package.json','package-lock.json']]
    files=sorted(file for path in paths for file in ([path] if path.is_file() else path.rglob('*')) if file.is_file())
    for file in files:
        digest.update(str(file.relative_to(root)).encode());digest.update(b'\0');digest.update(file.read_bytes())
    return digest.hexdigest()
release={'version':json.loads((source/'package.json').read_text())['version'],'commit':commit,'installedAt':datetime.now(timezone.utc).isoformat(),'artifactSha256':artifact_digest(source)}
backup=target/'backups'/time.strftime('%Y%m%d-%H%M%S')
backup.mkdir(parents=True,exist_ok=True)
subprocess.run(['launchctl','bootout',f'gui/{os.getuid()}/{label}'],capture_output=True)
for name in ['dist','public','connector','package.json','package-lock.json','release.json']:
    if (target/name).exists():
        if (target/name).is_dir():shutil.copytree(target/name,backup/name)
        else:shutil.copy2(target/name,backup/name)
if plist.exists():shutil.copy2(plist,backup/plist.name)
for name in ['config.json','control.sqlite']:
    path=target/'data'/name
    if path.exists():shutil.copy2(path,backup/name)
for name in ['dist','public','connector']:
    destination=target/name
    if destination.exists():shutil.rmtree(destination)
    shutil.copytree(source/name,destination)
shutil.copy2(source/'package.json',target/'package.json')
shutil.copy2(source/'package-lock.json',target/'package-lock.json')
if artifact_digest(target)!=release['artifactSha256']:raise SystemExit('Installed artifact checksum does not match the verified source build')
(target/'release.json').write_text(json.dumps(release,indent=2)+'\n')
subprocess.run(['npm','ci','--omit=dev','--ignore-scripts'],cwd=target,check=True)
(target/'data').mkdir(exist_ok=True,mode=0o700)
if not (target/'data/config.json').exists():shutil.copy2(source/'data/config.json',target/'data/config.json')
if not (target/'data/control.sqlite').exists() and (source/'data/control.sqlite').exists():
    src=sqlite3.connect(f'file:{source}/data/control.sqlite?mode=ro',uri=True)
    dest=sqlite3.connect(target/'data/control.sqlite');src.backup(dest);dest.close();src.close()
definition={'Label':label,'ProgramArguments':[str(Path(node).resolve()),str(target/'dist/server.js')],'WorkingDirectory':str(target),'RunAtLoad':True,'KeepAlive':True,'ThrottleInterval':10,'EnvironmentVariables':{'PATH':f'{Path.home()}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin'},'StandardOutPath':str(target/'data/service.log'),'StandardErrorPath':str(target/'data/service-error.log')}
plist.parent.mkdir(parents=True,exist_ok=True)
plist.write_bytes(plistlib.dumps(definition))
plist.chmod(0o600)
for attempt in range(4):
    started=subprocess.run(['launchctl','bootstrap',f'gui/{os.getuid()}',str(plist)],capture_output=True,text=True)
    if started.returncode == 0: break
    if attempt == 3:
        print(started.stderr,end='')
        started.check_returncode()
    time.sleep(.5)
subprocess.run(['launchctl','print',f'gui/{os.getuid()}/{label}'],check=True,capture_output=True)
print(f'Installed Astra Control {release["version"]} ({commit[:12]}) as {label} at {target}. Previous files saved in {backup}.')
