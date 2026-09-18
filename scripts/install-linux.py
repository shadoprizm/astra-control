"""Install the built application as a per-user Linux service. Does not expose it."""
from pathlib import Path
import os, platform, shutil, subprocess, time

if platform.system() != 'Linux':
    raise SystemExit('This installer requires Linux')
source = Path(__file__).resolve().parents[1]
target = Path.home() / '.local/share/astra-control'
unit = Path.home() / '.config/systemd/user/astra-control.service'
node = shutil.which('node')
npm = shutil.which('npm')
if not node or not npm or not (source / 'dist/server.js').exists():
    raise SystemExit('Node, npm, and npm run build output are required')
if not (target / 'data/config.json').exists() and not (source / 'data/config.json').exists():
    raise SystemExit('Create data/config.json before installation')
backup = target / 'backups' / time.strftime('%Y%m%d-%H%M%S')
backup.mkdir(parents=True)
for name in ['dist', 'public', 'connector', 'package.json', 'package-lock.json']:
    p = target / name
    if p.is_dir(): shutil.copytree(p, backup / name)
    elif p.exists(): shutil.copy2(p, backup / name)
if unit.exists(): shutil.copy2(unit, backup / unit.name)
subprocess.run(['systemctl', '--user', 'stop', 'astra-control.service'], capture_output=True)
for name in ['dist', 'public', 'connector']:
    shutil.copytree(source / name, target / name, dirs_exist_ok=True)
for name in ['package.json', 'package-lock.json']:
    shutil.copy2(source / name, target / name)
(target / 'data').mkdir(mode=0o700, exist_ok=True)
if not (target / 'data/config.json').exists():
    shutil.copy2(source / 'data/config.json', target / 'data/config.json')
(target / 'data/config.json').chmod(0o600)
subprocess.run([npm, 'ci', '--omit=dev', '--ignore-scripts'], cwd=target, check=True)
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
print(f'Installed at {target}. Backup: {backup}. Verify with systemctl --user status astra-control.')
