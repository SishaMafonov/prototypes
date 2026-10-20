import { readFileSync, readdirSync, mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const operators = new Set(['frame','picker','planets','rings','nets','ball','tail','background','panel','layout','motion','glow','countdown','goalReset','stable','fixture']);
const stages = new Set(['S-LOAD','S-ASSET-ERROR','S-PICK','S-READY','S-COUNT-READY','S-COUNT-STEADY','S-COUNT-GO','S-PLAY','S-GOAL','S-FINISH-YOU','S-FINISH-OPP']);
const sha = value => createHash('sha256').update(value).digest('hex');
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(directory,e.name)) : [join(directory,e.name)]);
const json = value => JSON.stringify(value, null, 2) + '\n';

export function parseDocument(text, path) {
  const definitions = [...text.matchAll(/(?:\*\*(V-[A-Z]+-\d+)\*\*|^## (V-[A-Z]+-\d+)([^\n]*))/gm)].map(m => ({ id:m[1]??m[2], title:(m[3]??'').replace(/^\s*[—:-]\s*/, '').trim() }));
  const mappings = [...text.matchAll(/```cv-config\s*\n([\s\S]*?)\n```/g)].flatMap(m => {
    const records = JSON.parse(m[1]);
    if (!Array.isArray(records)) throw new Error(path + ': cv-config must be an array');
    return records;
  });
  return { path, text, definitions, mappings };
}

export function compileDocuments(documents, templates, defaults) {
  const definitions = new Map(), mappings = new Map(), skipped = [], requirements = [];
  for (const doc of documents) {
    for (const definition of doc.definitions) {
      if (definitions.has(definition.id)) throw new Error('Duplicate definition ' + definition.id);
      definitions.set(definition.id, { ...definition, document:doc });
    }
    for (const mapping of doc.mappings) {
      if (!mapping || typeof mapping.id !== 'string' || mappings.has(mapping.id)) throw new Error('Duplicate/invalid mapping ' + mapping?.id);
      mappings.set(mapping.id, mapping);
    }
  }
  for (const id of mappings.keys()) if (!definitions.has(id)) throw new Error('Unknown requirement ' + id);
  for (const [id, definition] of definitions) {
    const mapping = mappings.get(id);
    if (!mapping) throw new Error('Visual requirement needs mapping or exclusion: ' + id);
    if (mapping.exclude) { skipped.push({ id, source:definition.document.path, reason:mapping.exclude }); continue; }
    if(typeof mapping.scope!=='string'||!mapping.scope.trim())throw new Error(id+': missing visual scope');
    if(mapping.relatedIds!==undefined&&(!Array.isArray(mapping.relatedIds)||mapping.relatedIds.some(id=>typeof id!=='string')))throw new Error(id+': invalid related IDs');
    const story = mapping.story ?? 'space-balls';
    if (!['space-balls','motion','workspace'].includes(story)) throw new Error(id + ': unknown story');
    if (mapping.stages && (!Array.isArray(mapping.stages) || !mapping.stages.length || mapping.stages.some(s => !stages.has(s)))) throw new Error(id + ': invalid stages');
    if (!Array.isArray(mapping.checks) || (!mapping.checks.length && !mapping.naReason)) throw new Error(id + ': missing checks');
    for (const check of mapping.checks) {
      if (!operators.has(check.op)) throw new Error(id + ': unknown operator ' + check.op);
      if (['panel','stable'].includes(check.op) && !['hud','voice','start','round','result'].includes(check.target)) throw new Error(id + ': invalid panel target');
      if (check.op === 'motion' && !['ball','nets'].includes(check.target)) throw new Error(id + ': invalid motion target');
      if (check.side !== undefined && check.side !== 0 && check.side !== 1) throw new Error(id + ': invalid side');
    }
    const durationMs = mapping.durationMs ?? 0;
    if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 6000) throw new Error(id + ': invalid duration');
    requirements.push({ schemaVersion:1, id, title:definition.title || id, story, stages:mapping.stages??[],
      durationMs, scope:mapping.scope, naReason:mapping.naReason, checks:mapping.checks,
      relatedIds:mapping.relatedIds??[],source:{ path:definition.document.path, sha256:sha(definition.document.text) } });
  }
  requirements.sort((a,b) => a.id.localeCompare(b.id));
  const suites = ['space-balls','motion','workspace'].map(id => ({ schemaVersion:1, id,
    title:({ 'space-balls':'Space Balls visual suite', motion:'Motion study suite', workspace:'Workspace chrome' })[id],
    requirementIds:requirements.filter(r => r.story===id).map(r=>r.id) }));
  return { requirements, suites, skipped, templates, defaults };
}

export function compileProject(root = projectRoot) {
  const directory = join(root,'requirements');
  const docs = walk(directory).filter(p=>p.endsWith('.md')).map(p=>parseDocument(readFileSync(p,'utf8'),relative(directory,p).replaceAll('\\','/')));
  const defaultsBlock = docs.flatMap(d=>[...d.text.matchAll(/```cv-defaults\s*\n([\s\S]*?)\n```/g)]);
  if (defaultsBlock.length!==1) throw new Error('Exactly one cv-defaults block is required');
  const templates = JSON.parse(readFileSync(join(directory,'assets/templates.json'),'utf8')).map(t=>{
    for(const [path,hash] of [[t.template,t.templateHash],[t.mask,t.maskHash]]) {
      if(sha(readFileSync(join(directory,'assets',path)))!==hash) throw new Error('Stale template/mask: '+path);
    }
    if(sha(readFileSync(join(root,t.source)))!==t.sourceHash) throw new Error('Source artwork changed: '+t.source);
    return {...t, mat:{type:'CV_8UC1',decode:'RGBA2GRAY'}, maskMat:{type:'CV_8UC1',resize:'INTER_NEAREST'}};
  });
  const defaults=JSON.parse(defaultsBlock[0][1]);
  if(!Array.isArray(defaults.geometry?.court)||defaults.geometry.court.length!==6||defaults.geometry.court.some(n=>!Number.isFinite(n)||n<=0))throw new Error('Invalid geometry defaults');
  if(!Array.isArray(defaults.thresholds?.scales)||!defaults.thresholds.scales.length||defaults.thresholds.scales.some(n=>!Number.isFinite(n)||n<=0||n>2))throw new Error('Invalid template scale defaults');
  for(const key of ['maxSqdiff','minMaskVisibility','ringSupport','backgroundCorrelation'])if(!Number.isFinite(defaults.thresholds[key])||defaults.thresholds[key]<=0||defaults.thresholds[key]>1)throw new Error('Invalid threshold '+key);
  const result = compileDocuments(docs,templates,defaults);
  const nonvisual = docs.flatMap(d=>[...d.text.matchAll(/\*\*((?:C|I)-[A-Z]+-\d+)\*\*/g)].map(m=>({id:m[1],source:d.path,reason:'Component/integration behavior delegated to unit, integration, and E2E tests.'})));
  const represented=nonvisual.map(record=>({...record,by:result.requirements.filter(r=>r.relatedIds.includes(record.id)).map(r=>r.id)})).filter(r=>r.by.length);
  for(const record of result.requirements)for(const id of record.relatedIds)if(!nonvisual.some(r=>r.id===id))throw new Error('Unknown related component/integration ID '+id);
  result.skipped.push(...nonvisual.filter(record=>!represented.some(r=>r.id===record.id)));
  const output = new Map();
  for(const record of result.requirements) output.set('requirements/'+record.id+'.json',json(record));
  for(const suite of result.suites) output.set('suites/'+suite.id+'.json',json(suite));
  const backgroundHash=sha(readFileSync(join(root,'src/assets/background.png')));
  output.set('manifest.json',json({schemaVersion:1, suites:result.suites.map(s=>s.id), templates:result.templates,
    defaults:result.defaults, background:{id:'background',source:'src/assets/background.png',sha256:backgroundHash}, represented, skipped:result.skipped}));
  return { ...result, output };
}

export function writeProject(result, root=projectRoot, check=false) {
  const directory=join(root,'tools/cv-test-tool/generated');
  for(const [path,content] of result.output) {
    const target=join(directory,path);
    if(check) { if(!existsSync(target)||readFileSync(target,'utf8')!==content) throw new Error('Generated config is stale: '+path+'; run npm run cv:compile'); }
    else { mkdirSync(dirname(target),{recursive:true}); writeFileSync(target,content); }
  }
  if(existsSync(directory)) for(const file of walk(directory)) {
    const path=relative(directory,file).replaceAll('\\','/');
    if(!result.output.has(path)) { if(check) throw new Error('Obsolete generated config: '+path); else unlinkSync(file); }
  }
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=compileProject(); writeProject(result,projectRoot,process.argv.includes('--check'));
  console.log(result.requirements.length+' visual requirements, '+result.suites.length+' suites; '+result.skipped.length+' explicit nonvisual exclusions.');
}
