"""Install the built application as a per-user Linux service. Does not expose it."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, os, platform, shutil, subprocess, time

if platform.system() != 'Linux':
    raise SystemExit('This installer requires Linux')
source = Path(__file__).resolve().parents[1]
target = Path.home() / '.local/share/astra-control'
unit = Path.home() / '.config/systemd/user/astra-control.service'
def executable(name):
    found = shutil.which(name)
    if found: return found
    candidate = Path.home() / '.local/bin' / name
    return str(candidate) if candidate.is_file() else None

node = executable('node')
npm = executable('npm')
git = executable('git')
if not node or not npm or not git:
    raise SystemExit('Node, npm, and Git are required')
tool_env = os.environ.copy()
tool_env['PATH'] = os.pathsep.join(dict.fromkeys([str(Path(node).parent), str(Path(npm).parent), tool_env.get('PATH', '')]))
if not (target / 'data/config.json').exists() and not (source / 'data/config.json').exists():
    raise SystemExit('Create data/config.json before installation')
dirty = subprocess.run([git, 'status', '--porcelain', '--untracked-files=all'], cwd=source, check=True, capture_output=True, text=True).stdout.strip()
if dirty:
    raise SystemExit('Refusing to install a dirty source tree. Commit or stash the listed changes first.\n' + dirty)
commit = subprocess.run([git, 'rev-parse', 'HEAD'], cwd=source, check=True, capture_output=True, text=True).stdout.strip()
subprocess.run([npm, 'ci', '--ignore-scripts'], cwd=source, check=True, env=tool_env)
subprocess.run([npm, 'test'], cwd=source, check=True, env=tool_env)
subprocess.run([npm, 'run', 'build'], cwd=source, check=True, env=tool_env)

def artifact_digest(root):
    digest = hashlib.sha256()
    paths = [root / name for name in ['dist', 'public', 'connector', 'package.json', 'package-lock.json']]
    files = sorted(file for path in paths for file in ([path] if path.is_file() else path.rglob('*')) if file.is_file())
    for file in files:
        digest.update(str(file.relative_to(root)).encode())
        digest.update(b'\0')
        digest.update(file.read_bytes())
    return digest.hexdigest()

release = {
    'version': json.loads((source / 'package.json').read_text())['version'],
    'commit': commit,
    'installedAt': datetime.now(timezone.utc).isoformat(),
    'artifactSha256': artifact_digest(source),
}
backup = target / 'backups' / time.strftime('%Y%m%d-%H%M%S')
backup.mkdir(parents=True, mode=0o700)
subprocess.run(['systemctl', '--user', 'stop', 'astra-control.service'], capture_output=True)
for name in ['dist', 'public', 'connector', 'package.json', 'package-lock.json', 'release.json']:
    p = target / name
    if p.is_dir(): shutil.copytree(p, backup / name)
    elif p.exists(): shutil.copy2(p, backup / name)
if unit.exists(): shutil.copy2(unit, backup / unit.name)
for name in ['config.json', 'control.sqlite']:
    p = target / 'data' / name
    if p.exists(): shutil.copy2(p, backup / name)
config_path = target / 'data/config.json'
if config_path.exists():
    config = json.loads(config_path.read_text())
    credential_paths = []
    for source_config in config.get('sources', []):
        credential_paths.extend(source_config.get(key) for key in ['tokenFile', 'deviceFile'])
    credential_paths.append((config.get('runtime') or {}).get('tokenFile'))
    private = backup / 'private'
    for index, value in enumerate(dict.fromkeys(path for path in credential_paths if path)):
        credential = Path(value).expanduser()
        if credential.is_file():
            private.mkdir(mode=0o700, exist_ok=True)
            copied = private / f'{index:02d}-{credential.name}'
            shutil.copy2(credential, copied)
            copied.chmod(0o600)
for name in ['dist', 'public', 'connector']:
    destination = target / name
    if destination.exists(): shutil.rmtree(destination)
    shutil.copytree(source / name, destination)
for name in ['package.json', 'package-lock.json']:
    shutil.copy2(source / name, target / name)
if artifact_digest(target) != release['artifactSha256']:
    raise SystemExit('Installed artifact checksum does not match the verified source build')
(target / 'release.json').write_text(json.dumps(release, indent=2) + '\n')
(target / 'data').mkdir(mode=0o700, exist_ok=True)
if not (target / 'data/config.json').exists():
    shutil.copy2(source / 'data/config.json', target / 'data/config.json')
(target / 'data/config.json').chmod(0o600)
subprocess.run([npm, 'ci', '--omit=dev', '--ignore-scripts'], cwd=target, check=True, env=tool_env)
unit.parent.mkdir(parents=True, exist_ok=True)
def quote(value):
    return '"' + str(value).replace('\\', '\\\\').replace('"', '\\"').replace('%', '%%') + '"'
unit.write_text('\n'.join([
    '[Unit]', 'Description=Astra Control coordination dashboard',
    'After=network-online.target', 'Wants=network-online.target', '', '[Service]',
    'Type=simple', 'WorkingDirectory=%h/.local/share/astra-control',
    f'ExecStart={quote(Path(node).resolve())} {quote(target / "dist/server.js")}',
    f'Environment="PATH={Path.home()}/.local/bin:/usr/local/bin:/usr/bin:/bin"',
    'Restart=on-failure', 'RestartSec=5', 'UMask=0077', '', '[Install]',
    'WantedBy=default.target', ''
]))
subprocess.run(['systemctl', '--user', 'daemon-reload'], check=True)
subprocess.run(['systemctl', '--user', 'enable', '--now', 'astra-control.service'], check=True)
subprocess.run(['systemctl', '--user', 'is-active', '--quiet', 'astra-control.service'], check=True)
print(f'Installed Astra Control {release["version"]} ({commit[:12]}) at {target}. Backup: {backup}.')
