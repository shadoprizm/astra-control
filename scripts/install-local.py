"""Install this user's private background service; preserves an existing deployment."""
from pathlib import Path
import shutil, subprocess, plistlib, time, sqlite3, os

source=Path(__file__).resolve().parents[1]
target=Path.home()/'.local/share/astra-control'
label='io.astra.control'
plist=Path.home()/'Library/LaunchAgents'/f'{label}.plist'
backup=target/'backups'/time.strftime('%Y%m%d-%H%M%S')
backup.mkdir(parents=True,exist_ok=True)
for name in ['dist','public','connector','package.json','package-lock.json']:
    if (target/name).exists():
        if (target/name).is_dir():shutil.copytree(target/name,backup/name)
        else:shutil.copy2(target/name,backup/name)
if plist.exists():shutil.copy2(plist,backup/plist.name)
for name in ['dist','public','connector']:
    shutil.copytree(source/name,target/name,dirs_exist_ok=True)
shutil.copy2(source/'package.json',target/'package.json')
shutil.copy2(source/'package-lock.json',target/'package-lock.json')
subprocess.run(['npm','ci','--omit=dev','--ignore-scripts'],cwd=target,check=True)
(target/'data').mkdir(exist_ok=True,mode=0o700)
if not (target/'data/config.json').exists():shutil.copy2(source/'data/config.json',target/'data/config.json')
if not (target/'data/control.sqlite').exists() and (source/'data/control.sqlite').exists():
    src=sqlite3.connect(f'file:{source}/data/control.sqlite?mode=ro',uri=True)
    dest=sqlite3.connect(target/'data/control.sqlite');src.backup(dest);dest.close();src.close()
node=shutil.which('node')
if not node:raise SystemExit('Node is required')
definition={'Label':label,'ProgramArguments':[str(Path(node).resolve()),str(target/'dist/server.js')],'WorkingDirectory':str(target),'RunAtLoad':True,'KeepAlive':True,'ThrottleInterval':10,'EnvironmentVariables':{'PATH':f'{Path.home()}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin'},'StandardOutPath':str(target/'data/service.log'),'StandardErrorPath':str(target/'data/service-error.log')}
plist.parent.mkdir(parents=True,exist_ok=True)
plist.write_bytes(plistlib.dumps(definition))
plist.chmod(0o600)
subprocess.run(['launchctl','bootout',f'gui/{os.getuid()}/{label}'],capture_output=True)
subprocess.run(['launchctl','bootstrap',f'gui/{os.getuid()}',str(plist)],check=True)
print(f'Installed {label} at {target}. Previous files saved in {backup}.')
