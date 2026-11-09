import { spawnSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative } from 'node:path';
import { run } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const output = new URL('../TEST-COVERAGE.html', import.meta.url);
const levels = { U: 'Unit', I: 'Integration', F: 'Functional', V: 'Visual', E: 'E2E' };
const requirements = [
  ['R01', 'Use a standard deck: four aces, seven links, 41 stock cards, no duplicates.', 'Stages 1–2', 'U01'],
  ['R02', 'Reject five or more links of one suit and reuse all cards on redeal.', 'Stage 2', 'U03'],
  ['R03', 'Show profit odds of 1:1, 2:1, 3:1, 5:1, and 10:1 for suit counts zero through four.', 'Stages 1–2, 5', 'U02 F03 V01'],
  ['R04', 'Fail clearly on an exhausted stock, invalid random sample, or repeated invalid deals.', 'Stages 2–3', 'U04 U05 U09'],
  ['R05', 'Gate draws on Start race and ignore repeated or out-of-phase host actions.', 'Stages 3, 6', 'U06 I01 F04 E01'],
  ['R06', 'Draw once from stock in order, preserve history, and advance only the matching suit.', 'Stages 1, 3', 'U07 I01'],
  ['R07', 'Finish at position eight, declare one winner, and hold the result with no further draws.', 'Stages 1, 3, 6', 'U08 V02 E01'],
  ['R08', 'Share a 10-second deadline between the countdown and each draw, including the first.', 'Stages 1, 6', 'U10 I01 I02'],
  ['R09', 'Reveal once after a timer delay, restart the countdown from the reveal, and cancel pending work.', 'Stage 6', 'U11 U12 I02 E01'],
  ['R10', 'Choose, replace, and clear photos independently; retain the existing photo if decoding fails.', 'Stage 4', 'I03 F01'],
  ['R11', 'Wait for pending photos before dealing and ignore superseded decodes.', 'Stages 4–5', 'I03'],
  ['R12', 'Keep photos local to the open page and clear photos and race state on reload.', 'Stages 1, 4', 'F02 E01'],
  ['R13', 'Support four distinct illustrated fallbacks, all photos, or a mix, with visible suit labels.', 'Stages 1, 4, 7', 'F02 F03 V01 V03 E01'],
  ['R14', 'Render Start, seven face-up links, and Finish in order with racers at engine positions.', 'Stages 1, 5', 'I01 F03 V01 V02'],
  ['R15', 'Keep betting and beverages at the table and present only host actions during betting.', 'Stage 1', 'F03'],
  ['R16', 'Keep host controls reachable by keyboard and touch, including returning to setup and resetting.', 'Stages 4–7', 'I01 F01 F04 F05 E01'],
  ['R17', 'Keep the broadcast legible at 16:9 and confine narrow-screen overflow to the track.', 'Stages 5, 7', 'F05 V01 V02 V03'],
  ['R18', 'Show the last card, movement, winner portrait and suit, and announce draws and the result.', 'Stages 5, 7', 'I01 F05 V02 E01'],
  ['R19', 'Animate reveals and movement, and suppress all three race effects in reduced-motion mode.', 'Stage 7', 'I01 F05 V02 E01'],
  ['R20', 'Preserve the current race on resize and when a delayed browser timer resumes.', 'Stage 7', 'I02'],
  ['R21', 'Start a fresh deal after New race while retaining the selected portraits and clearing race progress.', 'Stages 1, 6', 'E01'],
  ['R22', 'Release the previous photo URL after replacing or clearing a portrait.', 'Stage 4', 'F01'],
];

const cases = new Map();
const issues = [];

function record(title, status, file) {
  const id = /^([UIFVE]\d+) /.exec(title)?.[1];
  if (!id || cases.has(id)) {
    issues.push('Missing or duplicate case ID: ' + title);
    return;
  }
  cases.set(id, { id, title: title.slice(id.length + 1), status, file: file.replaceAll('\\', '/') });
}

const unitFiles = readdirSync(new URL('../test/', import.meta.url))
  .filter((file) => file.endsWith('.test.mjs'))
  .map((file) => fileURLToPath(new URL('../test/' + file, import.meta.url)));
for await (const event of run({ files: unitFiles, cwd: root })) {
  if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
  const { name, file, details, skip, todo } = event.data;
  if (details.type !== 'test') {
    if (event.type === 'test:fail') issues.push(details.error?.message ?? name);
    continue;
  }
  record(name, skip || todo ? 'Skipped' : event.type === 'test:pass' ? 'Passed' : 'Failed', relative(root, file));
}

function command(args) {
  return spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
}

function browserCases(args) {
  const result = command([require.resolve('@playwright/test/cli'), 'test', '--reporter=json', ...args]);
  try {
    const report = JSON.parse(result.stdout);
    const specs = [];
    function visit(suite) {
      specs.push(...(suite.specs ?? []));
      for (const child of suite.suites ?? []) visit(child);
    }
    for (const suite of report.suites ?? []) visit(suite);
    return { result, report, specs };
  } catch {
    issues.push('Playwright did not produce a JSON report.');
    return { result, report: {}, specs: [] };
  }
}

const build = command([process.env.npm_execpath, 'run', 'build']);
const built = build.status === 0;
if (built) process.stdout.write(build.stdout);
else issues.push('Production build failed. ' + (build.stderr || build.error?.message || build.stdout));

const browser = browserCases(built ? [] : ['--list']);
if (built && browser.result.status !== 0) {
  issues.push('Browser suite failed. ' + (browser.report.errors?.[0]?.message ?? browser.result.stderr ?? ''));
}
const specs = browser.specs.length ? browser.specs : browserCases(['--list']).specs;
for (const spec of specs) {
  const result = spec.tests[0]?.results.at(-1);
  const status = !result ? 'Not run' : result.status === 'passed' ? 'Passed' :
    result.status === 'skipped' ? 'Skipped' : 'Failed';
  if (status === 'Failed' && result.error?.message) issues.push(spec.title + ': ' + result.error.message);
  record(spec.title, status, 'browser/' + spec.file);
}

const mapped = new Set(requirements.flatMap(([, , , ids]) => ids.split(' ')));
for (const id of mapped) if (!cases.has(id)) issues.push('Mapped test missing from results: ' + id);
for (const id of cases.keys()) if (!mapped.has(id)) issues.push('Executed test has no requirement: ' + id);

const escape = (value) => String(value).replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const counts = (key) => [...cases.values()].filter((item) => item.id.startsWith(key)).length;
const passed = [...cases.values()].filter((item) => item.status === 'Passed').length;
const verified = requirements.filter(([, , , ids]) =>
  ids.split(' ').every((id) => cases.get(id)?.status === 'Passed')).length;

function caseCell(ids, level) {
  const matching = ids.split(' ').filter((id) => id.startsWith(level));
  if (!matching.length) return '<td class="empty" aria-label="No case at this level">—</td>';
  return '<td><ul>' + matching.map((id) => {
    const item = cases.get(id);
    const status = item?.status ?? 'Missing';
    return '<li><strong>' + id + '</strong> <span class="' + (status === 'Passed' ? 'pass' : 'issue') +
      '">' + escape(status) + '</span><br>' + escape(item?.title ?? 'Case absent from the run') +
      '<br><small>' + escape(item?.file ?? '') + '</small></li>';
  }).join('') + '</ul></td>';
}

const rows = requirements.map(([id, title, source, ids]) =>
  '<tr id="' + id + '"><th scope="row"><strong>' + id + '</strong><br>' + escape(title) +
  '<br><small>' + escape(source) + '</small></th>' +
  Object.keys(levels).map((level) => caseCell(ids, level)).join('') + '</tr>').join('\n');
const unmapped = [...cases.values()].filter((item) => !mapped.has(item.id));
const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Xmas Madness — Test traceability</title>
<style>
  :root { font: 15px/1.45 system-ui, sans-serif; color: #172d27; background: #f6f8f5; }
  body { margin: 0 auto; padding: 1.25rem; max-width: 108rem; }
  h1 { margin-bottom: .4rem; }
  .summary { background: #e1eee6; border-radius: .5rem; padding: .8rem 1rem; }
  .scroll { overflow: auto; }
  table { width: 100%; min-width: 70rem; border-collapse: collapse; }
  caption { text-align: left; font-weight: 700; margin: .6rem 0; }
  th, td { text-align: left; vertical-align: top; padding: .65rem; border: 1px solid #c1d1c7; }
  thead { color: white; background: #214b3d; }
  tbody th { width: 23%; font-weight: 500; }
  tbody td { width: 15.4%; }
  tbody tr:nth-child(even) { background: #eaf1ec; }
  ul { margin: 0; padding: 0; list-style: none; }
  li + li { margin-top: .6rem; }
  small, .empty { color: #475f55; overflow-wrap: anywhere; }
  .pass { color: #17643f; font-weight: 700; }
  .issue { color: #982442; font-weight: 700; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
<h1>Xmas Madness — Test traceability</h1>
<p>Executed ${escape(new Date().toISOString())} · Node ${escape(process.version)} · ${escape(process.platform)} · Playwright ${escape(require('@playwright/test/package.json').version)} (Chromium)</p>
<p class="summary"><strong>${verified}/${requirements.length} requirements verified</strong> · ${passed}/${cases.size} unique cases passed · Production build ${built ? 'passed' : 'failed'}</p>
<p>${Object.entries(levels).map(([key, label]) => label + ' ' + counts(key)).join(' · ')}. Case IDs may appear in multiple rows and are counted once. A requirement is verified when all mapped cases pass.</p>
<p>Scope follows the <a href="DEVELOPMENT_PLAN.md">browser rules contract and acceptance criteria</a>. Longer tracks, hidden links, and jokers are deferred. Browser timer tests use a controlled clock. The earlier full race at normal speed is recorded in Stage 8. Visual baselines are platform-specific. Resuming from browser throttling is simulated by advancing the clock, and accessible announcements are checked in the DOM.</p>
<div class="scroll" role="region" aria-label="Requirement coverage matrix" tabindex="0">
<table>
<caption>Requirements × test cases by coverage level</caption>
<thead><tr><th scope="col">Requirement</th>${Object.values(levels).map((label) => '<th scope="col">' + label + '</th>').join('')}</tr></thead>
<tbody>${rows}</tbody>
</table>
</div>
${issues.length ? '<h2>Run issues</h2><pre>' + escape(issues.join('\n')) + '</pre>' : ''}
${unmapped.length ? '<h2>Unmapped executed cases</h2><ul>' + unmapped.map((item) =>
  '<li>' + escape(item.id + ' ' + item.title + ' — ' + item.status + ' (' + item.file + ')') + '</li>').join('') + '</ul>' : ''}
</html>`;
writeFileSync(output, html);
console.log('TEST-COVERAGE.html — ' + verified + '/' + requirements.length + ' requirements verified, ' +
  passed + '/' + cases.size + ' cases passed.');
if (issues.length) console.error(issues.join('\n'));
if (issues.length || verified !== requirements.length || passed !== cases.size) process.exitCode = 1;
