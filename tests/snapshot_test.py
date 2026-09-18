import importlib.util, pathlib, tempfile, sqlite3, json, unittest

spec=importlib.util.spec_from_file_location('snapshot',pathlib.Path(__file__).parents[1]/'connector/snapshot.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class SnapshotTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();module.HOME=pathlib.Path(self.temp.name)
        d=sqlite3.connect(module.HOME/'state_5.sqlite')
        d.executescript("CREATE TABLE threads(id TEXT, title TEXT, name TEXT, cwd TEXT, source TEXT, archived INTEGER, updated_at INTEGER, updated_at_ms INTEGER); INSERT INTO threads VALUES('a','Hello',NULL,'/repo','vscode',0,10,NULL); INSERT INTO threads VALUES('child','Hidden',NULL,'/repo','subagent',0,11,NULL);")
        d.close();d=sqlite3.connect(module.HOME/'thread_history_1.sqlite')
        d.executescript("CREATE TABLE thread_turns(thread_id TEXT,turn_id TEXT,status TEXT,rollout_ordinal INTEGER,error_json TEXT); INSERT INTO thread_turns VALUES('a','turn','inProgress',1,NULL); CREATE TABLE thread_items(thread_id TEXT,item_json TEXT,item_type TEXT,created_at_ms INTEGER,rollout_ordinal INTEGER);")
        d.execute('INSERT INTO thread_items VALUES(?,?,?,?,?)',('a',json.dumps({'type':'agentMessage','id':'m','text':'Latest update'}),'agentMessage',10000,1));d.commit();d.close()
    def tearDown(self):self.temp.cleanup()
    def test_inventory_excludes_subagents_without_relying_on_has_user_event(self):
        rows=module.inventory();self.assertEqual(len(rows),1);self.assertEqual(rows[0]['latest']['text'],'Latest update')
    def test_unlocked_in_progress_is_unknown_not_claimed_running(self):
        self.assertEqual(module.inventory()[0]['status'],'unknown')
    def test_internal_reasoning_is_never_exposed(self):
        self.assertIsNone(module.normalized({'type':'reasoning','content':'private'}))
    def test_missing_command_output_is_safe(self):
        item=module.normalized({'type':'commandExecution','command':'test','aggregatedOutput':None});self.assertEqual(item['output'],'')

if __name__=='__main__':unittest.main()
