export function workspaceTasks(tasks,statusFor){
 return {
  watched:tasks.filter(task=>task.watched),
  running:tasks.filter(task=>['running','active','recent'].includes(statusFor(task)))
 };
}

const volatileUiFields=new Set(['csrf','now','lastSeen','observedAt','updatedAt']);

/** Build a stable comparison key without poll timestamps that do not change rendered content. */
export function uiStateFingerprint(value){
 return JSON.stringify(value,(key,item)=>volatileUiFields.has(key)?undefined:item);
}

const pathTail=(path,parts=3)=>String(path||'').replace(/[\\/]+$/,'').split(/[\\/]/).filter(Boolean).slice(-parts).join('/');

export function projectChoiceLabel(project){
 const roots=[...new Set(project.roots||[])];
 const location=roots.length===1?pathTail(roots[0]):`${roots.length} checkouts`;
 return `${project.name} — ${location}${project.source==='history'?' · observed':''}`;
}

export function projectsForHost(projects,hostId){
 const seen=new Set();
 return projects
  .filter(project=>project.hostId===hostId&&Array.isArray(project.roots)&&project.roots.length)
  .filter(project=>{
   const key=`${project.id||'history'}:${[...new Set(project.roots)].sort().join('\n')}`;
   if(seen.has(key))return false;
   seen.add(key);return true;
  })
  .map(project=>({...project,choiceLabel:projectChoiceLabel(project)}))
  .sort((a,b)=>(a.source==='history')-(b.source==='history')||(b.recencyAt||0)-(a.recencyAt||0)||a.choiceLabel.localeCompare(b.choiceLabel));
}

export function checkoutAssessment(tasks,hostId,cwd,statusFor){
 const related=tasks.filter(task=>task.hostId===hostId&&task.cwd===cwd);
 const active=related.filter(task=>['running','active','recent','unknown'].includes(statusFor(task)));
 const branches=[...new Set(related.map(task=>task.branch).filter(Boolean))];
 return {
  related,
  active,
  branches,
  level:active.length?'busy':related.length?'caution':'clear',
  message:active.length
   ?`${active.length} active task${active.length===1?'':'s'} already ${active.length===1?'uses':'use'} this checkout. Create an isolated worktree to avoid overlapping edits.`
   :related.length
    ?`${related.length} recent task${related.length===1?'':'s'} use this checkout. An isolated worktree is the safer default.`
    :'No other recent task is using this checkout.'
 };
}

export function inboxCategory(action){
 if(action.kind==='approval')return 'decisions';
 if(action.kind==='failure'||action.kind==='delivery'||action.kind==='blocked')return 'issues';
 if(action.kind==='completion'||action.kind==='review')return 'completed';
 return 'other';
}

export function groupInboxActions(actions,tasks=[]){
 const taskMap=new Map(tasks.map(task=>[task.key,task]));
 const groups=new Map();
 for(const action of actions.filter(action=>action.status!=='resolved')){
  const category=inboxCategory(action);
  const key=category==='decisions'?`action:${action.id}`:`${category}:${action.task_key||action.id}`;
  const group=groups.get(key)||{key,category,task:taskMap.get(action.task_key),actions:[],latest:action,createdAt:action.created_at};
  group.actions.push(action);
  if(action.created_at>group.latest.created_at)group.latest=action;
  group.createdAt=Math.max(group.createdAt,action.created_at);
  groups.set(key,group);
 }
 return [...groups.values()].map(group=>({
  ...group,
  count:group.actions.length,
  actionIds:group.actions.map(action=>action.id),
  resolvableIds:group.actions.filter(action=>action.kind!=='approval'||action.status==='expired').map(action=>action.id)
 })).sort((a,b)=>b.createdAt-a.createdAt);
}

export function filterInboxGroups(groups,{type='all',query='',sort='newest'}={}){
 const needle=String(query).trim().toLowerCase();
 const result=groups.filter(group=>{
  if(type!=='all'&&group.category!==type)return false;
  if(!needle)return true;
  const task=group.task||{};
  return [group.latest.title,group.latest.body,task.title,task.cwd,task.hostId].some(value=>String(value||'').toLowerCase().includes(needle));
 });
 return result.sort((a,b)=>sort==='oldest'?a.createdAt-b.createdAt:b.createdAt-a.createdAt);
}
