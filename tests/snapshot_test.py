import importlib.util, pathlib, tempfile, sqlite3, json, unittest, subprocess

spec=importlib.util.spec_from_file_location('snapshot',pathlib.Path(__file__).parents[1]/'connector/snapshot.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class SnapshotTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();module.HOME=pathlib.Path(self.temp.name)
        d=sqlite3.connect(module.HOME/'state_5.sqlite')
        d.executescript("CREATE TABLE threads(id TEXT, title TEXT, name TEXT, cwd TEXT, source TEXT, archived INTEGER, updated_at INTEGER, updated_at_ms INTEGER); INSERT INTO threads VALUES('a','Hello',NULL,'/repo','vscode',0,10,NULL); INSERT INTO threads VALUES('child','Worker',NULL,'/repo','subagent',0,11,NULL); INSERT INTO threads VALUES('archived','Archived',NULL,'/repo','vscode',1,12,NULL);")
        d.close();d=sqlite3.connect(module.HOME/'thread_history_1.sqlite')
        d.executescript("CREATE TABLE thread_turns(thread_id TEXT,turn_id TEXT,status TEXT,rollout_ordinal INTEGER,error_json TEXT); INSERT INTO thread_turns VALUES('a','turn','inProgress',1,NULL); INSERT INTO thread_turns VALUES('child','child-turn','interrupted',1,NULL); CREATE TABLE thread_items(thread_id TEXT,item_json TEXT,item_type TEXT,created_at_ms INTEGER,rollout_ordinal INTEGER);")
        d.execute('INSERT INTO thread_items VALUES(?,?,?,?,?)',('a',json.dumps({'type':'agentMessage','id':'m','text':'Latest update'}),'agentMessage',10000,1));d.commit();d.close()
    def tearDown(self):self.temp.cleanup()
    def test_inventory_includes_all_non_archived_parent_and_subagent_work(self):
        rows=module.inventory();self.assertEqual([row['id'] for row in rows],['child','a']);self.assertEqual(rows[1]['latest']['text'],'Latest update');self.assertEqual(rows[0]['status'],'paused')
    def test_unlocked_in_progress_is_unknown_not_claimed_running(self):
        self.assertEqual(next(row for row in module.inventory() if row['id']=='a')['status'],'unknown')
    def test_internal_reasoning_is_never_exposed(self):
        self.assertIsNone(module.normalized({'type':'reasoning','content':'private'}))
    def test_missing_command_output_is_safe(self):
        item=module.normalized({'type':'commandExecution','command':'test','aggregatedOutput':None});self.assertEqual(item['output'],'')
    def test_inventory_has_no_fixed_recent_task_cap(self):
        state=sqlite3.connect(module.HOME/'state_5.sqlite')
        state.executemany("INSERT INTO threads VALUES(?,?,NULL,'/repo','vscode',0,?,NULL)",[(f'extra-{i}',f'Extra {i}',100+i) for i in range(75)])
        state.commit();state.close()
        rows=module.inventory();self.assertEqual(len(rows),77)
    def test_isolated_worktree_uses_a_codex_branch_and_sibling_directory(self):
        repo=module.HOME/'repo';repo.mkdir()
        subprocess.run(['git','init','-q',str(repo)],check=True)
        (repo/'README.md').write_text('test\n')
        subprocess.run(['git','-C',str(repo),'add','README.md'],check=True)
        subprocess.run(['git','-C',str(repo),'-c','user.name=Astra Test','-c','user.email=test@example.com','commit','-qm','initial'],check=True)
        result=module.create_worktree(str(repo),'Safe feature')
        self.assertTrue(result['branch'].startswith('codex/safe-feature-'))
        self.assertTrue(pathlib.Path(result['cwd']).is_dir())
        self.assertEqual(result['sourceRoot'],str(repo.resolve()))

if __name__=='__main__':unittest.main()
