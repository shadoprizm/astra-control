"""Read-only Codex inventory. Runs unchanged locally and over an existing SSH login."""
import sys, json, sqlite3, pathlib, time, fcntl, subprocess

HOME = pathlib.Path.home() / '.codex'

def connection(name):
    db = sqlite3.connect(f'file:{HOME / name}?mode=ro', uri=True, timeout=3)
    db.row_factory = sqlite3.Row
    return db

def owned(thread):
    path = HOME / 'thread-writer-locks' / (thread + '.lock')
    if not path.exists(): return False
    try:
        with path.open('rb') as f:
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return False
    except BlockingIOError: return True
    except OSError: return None

def normalized(item):
    kind = item.get('type')
    if kind == 'agentMessage':
        return {'id': item.get('id'), 'role': 'assistant', 'text': item.get('text', '')[:18000], 'phase': item.get('phase')}
    if kind == 'userMessage':
        text = '\n'.join(x.get('text', '') for x in item.get('content', []) if x.get('type') == 'text')
        if text.startswith('<environment_context>'): return None
        return {'id': item.get('id'), 'role': 'user', 'text': text[:18000]}
    if kind == 'commandExecution':
        return {'id': item.get('id'), 'role': 'tool', 'text': item.get('command', '')[:2000], 'status': item.get('status'), 'exitCode': item.get('exitCode'), 'output': (item.get('aggregatedOutput') or '')[-12000:]}
    if kind == 'fileChange':
        return {'id': item.get('id'), 'role': 'change', 'text': '\n'.join(x.get('path', '') for x in item.get('changes', [])), 'status': item.get('status')}
    return None

def inventory(detail=None):
    state = connection('state_5.sqlite')
    history = connection('thread_history_1.sqlite')
    if detail:
        rows = state.execute('select * from threads where id=?', (detail,)).fetchall()
    else:
        rows = state.execute("select * from threads where archived=0 and source not like '%subagent%' order by updated_at desc limit 60").fetchall()
    tasks = []
    for r in rows:
        r = dict(r)
        turn = history.execute('select * from thread_turns where thread_id=? order by rollout_ordinal desc limit 1', (r['id'],)).fetchone()
        turn = dict(turn) if turn else None
        limit = 80 if detail else 4
        items = history.execute("select item_json,created_at_ms from thread_items where thread_id=? and item_type in ('agentMessage','userMessage'" + (",'commandExecution','fileChange'" if detail else '') + ") order by rollout_ordinal desc limit ?", (r['id'], limit)).fetchall()
        messages = []
        for it in reversed(items):
            try:
                x = normalized(json.loads(it['item_json']))
                if x: x['at'] = it['created_at_ms']; messages.append(x)
            except (ValueError, TypeError): pass
        latest = next((m for m in reversed(messages) if m['role'] == 'assistant' and m['text'] and not m['text'].lstrip().startswith('<heartbeat>')), None)
        locked = owned(r['id'])
        status = (turn or {}).get('status', 'unknown')
        if status == 'inProgress': status = 'running' if locked else 'unknown'
        elif status == 'completed': status = 'idle'
        elif status == 'interrupted': status = 'paused'
        elif status not in ['failed']: status = 'unknown'
        tasks.append({'id': r['id'], 'title': r.get('name') or r.get('title') or r.get('preview') or 'Untitled task', 'cwd': r['cwd'], 'branch': r.get('git_branch'), 'updatedAt': (r.get('updated_at_ms') or r['updated_at'] * 1000), 'turnId': (turn or {}).get('turn_id'), 'turnStatus': (turn or {}).get('status'), 'status': status, 'owned': locked, 'latest': latest, 'messages': messages if detail else [], 'model': r.get('model'), 'error': (turn or {}).get('error_json')})
    return tasks

def git_info(thread):
    db = connection('state_5.sqlite')
    r = db.execute('select cwd from threads where id=?', (thread,)).fetchone()
    if not r: raise ValueError('Task not found')
    cwd = r['cwd']
    def run(args):
        p = subprocess.run(['git', '-c', 'core.fsmonitor=false', '-C', cwd, *args], text=True, capture_output=True, timeout=12)
        if p.returncode: raise ValueError(p.stderr.strip()[:300])
        return p.stdout.strip()
    try:
        root = run(['rev-parse', '--show-toplevel'])
        head = run(['rev-parse', 'HEAD'])
        branch = run(['branch', '--show-current'])
        status = run(['status', '--short'])
        diff = run(['diff', '--no-ext-diff', '--stat'])
        staged = run(['diff', '--cached', '--no-ext-diff', '--stat'])
        try:
            upstream = run(['rev-parse', '--abbrev-ref', '@{upstream}'])
            counts = run(['rev-list', '--left-right', '--count', 'HEAD...@{upstream}']).split()
        except ValueError: upstream = None; counts = [None, None]
        return {'available': True, 'root': root, 'head': head, 'branch': branch, 'status': status[:15000], 'diffStat': diff[:15000], 'stagedStat': staged[:15000], 'upstream': upstream, 'ahead': int(counts[0]) if counts[0] else None, 'behind': int(counts[1]) if counts[1] else None, 'observedAt': int(time.time()*1000)}
    except (ValueError, subprocess.TimeoutExpired, FileNotFoundError) as e:
        return {'available': False, 'error': str(e)[:300]}

if __name__ == '__main__':
    try:
        arg = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
        result = git_info(arg['id']) if arg.get('method') == 'git' else inventory(arg.get('id'))
        print(json.dumps({'ok': True, 'result': result}))
    except Exception as e:
        print(json.dumps({'ok': False, 'error': str(e)[:300]}))
        sys.exit(1)
