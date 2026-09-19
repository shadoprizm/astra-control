import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutAssessment,filterInboxGroups,groupInboxActions,projectsForHost,workspaceTasks} from '../public/workspace.js';

test('running workspace total includes unwatched active tasks',()=>{
 const tasks=[
  {id:'watched-idle',watched:true,status:'idle'},
  {id:'unwatched-running-1',watched:false,status:'running'},
  {id:'unwatched-running-2',watched:false,status:'running'},
  {id:'offline-running',watched:true,status:'running',offline:true}
 ];
 const summary=workspaceTasks(tasks,task=>task.offline?'offline':task.status);
 assert.deepEqual(summary.watched.map(task=>task.id),['watched-idle','offline-running']);
 assert.deepEqual(summary.running.map(task=>task.id),['unwatched-running-1','unwatched-running-2']);
});

test('project choices stay scoped to the selected machine and require a checkout',()=>{
 const projects=[
  {id:'project-1',hostId:'local',name:'Local project',roots:['/local/repo']},
  {id:'project-2',hostId:'astra',name:'Remote project',roots:['/remote/repo']},
  {id:'project-3',hostId:'local',name:'Cloud-only project',roots:[]}
 ];
 assert.deepEqual(projectsForHost(projects,'local').map(project=>project.id),['project-1']);
});

test('project choices are deduplicated and disambiguated with their checkout path',()=>{
 const projects=[
  {id:'one',hostId:'local',name:'project',roots:['/work/client/project'],source:'codex'},
  {id:'one',hostId:'local',name:'project duplicate',roots:['/work/client/project'],source:'codex'},
  {id:'two',hostId:'local',name:'project',roots:['/work/internal/project'],source:'codex'}
 ];
 const choices=projectsForHost(projects,'local');
 assert.equal(choices.length,2);
 assert.match(choices[0].choiceLabel,/work\/client\/project|work\/internal\/project/);
 assert.notEqual(choices[0].choiceLabel,choices[1].choiceLabel);
});

test('completion noise is grouped by task while live decisions remain individual',()=>{
 const tasks=[{key:'local:one',title:'One',cwd:'/one'},{key:'local:two',title:'Two',cwd:'/two'}];
 const actions=[
  {id:'c1',task_key:'local:one',kind:'completion',status:'open',title:'Done',body:'First',created_at:10},
  {id:'c2',task_key:'local:one',kind:'completion',status:'open',title:'Done again',body:'Second',created_at:20},
  {id:'a1',task_key:'local:one',kind:'approval',status:'open',title:'Approve',body:'Command',created_at:30},
  {id:'a2',task_key:'local:two',kind:'approval',status:'open',title:'Answer',body:'Question',created_at:40},
  {id:'a3',task_key:'local:two',kind:'approval',status:'expired',title:'Expired',body:'Reconnect changed',created_at:50}
 ];
 const groups=groupInboxActions(actions,tasks);
 assert.equal(groups.length,4);
 const completed=groups.find(group=>group.category==='completed');
 assert.equal(completed.count,2);assert.deepEqual(completed.resolvableIds,['c1','c2']);assert.equal(completed.latest.id,'c2');
 const expired=groups.find(group=>group.latest.id==='a3');assert.deepEqual(expired.resolvableIds,['a3']);
 assert.equal(filterInboxGroups(groups,{type:'decisions'}).length,3);
 assert.equal(filterInboxGroups(groups,{query:'One'}).length,2);
});

test('checkout assessment flags an active shared checkout',()=>{
 const tasks=[{hostId:'local',cwd:'/repo',status:'running',branch:'main'},{hostId:'local',cwd:'/repo',status:'idle',branch:'main'}];
 const assessment=checkoutAssessment(tasks,'local','/repo',task=>task.status);
 assert.equal(assessment.level,'busy');assert.equal(assessment.active.length,1);assert.deepEqual(assessment.branches,['main']);
});
