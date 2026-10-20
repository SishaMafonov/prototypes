import assert from 'node:assert/strict';
import test from 'node:test';
import { assignedValues, calls, contract, functionBody, handler, methodBody, name, nodes,
  orderedCalls, requireCalls, source } from './graph.mjs';

const main = source('src/main.ts'), match = source('src/match.ts');
const body = id => functionBody(main, id);

test(contract(['I-PHYSICS-01', 'I-PHYSICS-02', 'I-PHYSICS-03'], 'rules and renderer connect to shared arena, fields, and goals'), () => {
  requireCalls(body('animate'), ['createArena', 'advanceMatch']);
  requireCalls(body('drawBall'), ['createArena']);
  requireCalls(body('drawPlayingField'), ['createArena', 'createPlanetField', 'drawGravityArea', 'drawPlanet', 'drawGoal']);
  requireCalls(functionBody(match, 'createMatch'), ['createGoal']);
  orderedCalls(functionBody(match, 'advanceMatch'), ['createPlanetField', 'advanceGoal', 'applyPlanetDynamics', 'moveBall']);
  orderedCalls(functionBody(match, 'moveBall'), ['touchesGoal', 'awardPoint', 'Math.abs']);
});

test(contract(['C-COURT-08'], 'render call order keeps rings behind planets, goals, and asteroid'), () => {
  orderedCalls(body('render'), ['context.drawImage', 'drawPlayingField', 'drawBall']);
  orderedCalls(body('drawPlayingField'), ['drawGravityArea', 'drawPlanet', 'context.fillText', 'drawGoal']);
});

test(contract(['I-INPUT-01', 'C-INPUT-04'], 'mic/manual drive merge feeds physics while meter reads mic only'), () => {
  orderedCalls(body('animate'), ['microphone.read', 'Math.max', 'advanceMatch']);
  const drive = nodes(body('animate'), n => n.type === 'AssignmentExpression' && name(n.left) === 'playerDrive');
  assert.equal(drive.length, 1);
  assert.equal(name(drive[0].right.callee), 'Math.max');
  assert.deepEqual(drive[0].right.arguments.map(name), ['voiceLevel', 'manualLevel']);
  const advance = calls(body('animate')).find(c => c.name === 'advanceMatch');
  const input = advance.args[4].properties.find(p => name(p.key) === 'voiceLevel');
  assert.equal(name(input.value), 'playerDrive');
  const meter = nodes(body('syncVoiceControls'), n => n.type === 'AssignmentExpression' && name(n.left) === 'voiceMeter.value');
  assert.equal(meter.length, 1);
  assert.equal(name(meter[0].right), 'microphone.level');
});

test(contract(['C-PICK-03', 'C-PICK-05', 'I-FLOW-01', 'I-FLOW-07'], 'outer state graph owns match creation and replay cleanup'), () => {
  const confirm = handler(main, 'confirm', 'click'), start = handler(main, 'start', 'click');
  const replay = handler(main, 'newGame', 'click');
  assert.deepEqual(assignedValues(confirm, 'state'), ['ready']);
  assert.deepEqual(assignedValues(start, 'state'), ['playing']);
  assert.deepEqual(assignedValues(replay, 'state'), ['selecting']);
  assert.equal(calls(main).filter(c => c.name === 'createMatch').length, 1, 'Only Start constructs a match');
  requireCalls(start, ['createMatch', 'syncMatchInterface', 'render']);
  const create = calls(start).find(c => c.name === 'createMatch');
  assert.equal(name(create.args[0]), 'Math.random');
  assert.equal(name(create.args[1].object), 'planetNames');
  assert.equal(name(create.args[1].property), 'selectedPlanet');
  assert.deepEqual(assignedValues(replay, 'match'), [null]);
  assert.deepEqual(assignedValues(replay, 'selectedPlanet'), [0]);
  orderedCalls(confirm, ['syncVoiceControls', 'render', 'start.focus']);
  orderedCalls(replay, ['microphone.stop', 'resultDialog.close', 'updateSelection', 'previous.focus']);
});

test(contract(['I-FLOW-06', 'I-FLOW-08', 'C-RESULT-01'], 'result and HUD synchronize from Match with cleanup before modal'), () => {
  orderedCalls(body('animate'), ['advanceMatch', 'syncMatchInterface', 'syncVoiceControls', 'render']);
  orderedCalls(body('syncMatchInterface'), ['roundMessage', 'scoreStatus', 'microphone.stop', 'resultDialog.showModal']);
  for (const [target, value] of [['yourScore.textContent', 'match.scores.0'], ['opponentScore.textContent', 'match.scores.1'],
    ['resultYouScore.textContent', 'match.scores.0'], ['resultOpponentScore.textContent', 'match.scores.1']]) {
    const write = nodes(body('syncMatchInterface'), n => n.type === 'AssignmentExpression' && name(n.left) === target);
    assert.equal(write.length, 1);
    assert.equal(name(write[0].right.callee), 'String');
    assert.equal(name(write[0].right.arguments[0]), value);
  }
});

test(contract(['I-INPUT-06', 'I-INPUT-07', 'I-INPUT-08', 'C-AUDIO-08'], 'hidden, finished, replay, and pagehide connect to audio release'), () => {
  for (const root of [handler(main, 'document', 'visibilitychange'), handler(main, 'window', 'pagehide'),
    handler(main, 'newGame', 'click'), body('syncMatchInterface')]) requireCalls(root, ['microphone.stop']);
  for (const root of [handler(main, 'document', 'visibilitychange'), handler(main, 'newGame', 'click'), body('syncMatchInterface')]) {
    for (const target of ['pointerBoost', 'keyboardBoost']) assert.deepEqual(assignedValues(root, target), [false]);
    for (const target of ['boostUntil', 'playerDrive']) assert.deepEqual(assignedValues(root, target), [0]);
  }
  for (const target of ['pointerBoost', 'keyboardBoost']) {
    assert.deepEqual(assignedValues(handler(main, 'window', 'blur'), target), [false]);
  }
});

test(contract(['C-AUDIO-02', 'C-AUDIO-06'], 'microphone graph reads locally and disconnects without speaker output'), () => {
  const mic = source('src/microphone.ts');
  requireCalls(methodBody(mic, 'MicrophoneInput', 'read'), ['this.analyser.getFloatTimeDomainData', 'voiceLoudness']);
  requireCalls(methodBody(mic, 'MicrophoneInput', 'stop'), ['this.source.disconnect', 'this.analyser.disconnect', 'track.stop', 'this.context.close']);
  const connections = calls(mic).filter(c => c.name?.endsWith('.connect'));
  assert.equal(connections.length, 1);
  assert.equal(name(connections[0].args[0]), 'this.analyser');
});

test(contract(['C-HARNESS-02', 'C-HARNESS-06', 'I-TOOL-02', 'C-SUITE-06'], 'capture, navigation, and analysis retain lifecycle connections'), () => {
  const workspace = source('tools/cv-test-tool/main.ts');
  orderedCalls(functionBody(workspace, 'loadStory'), ['suiteControls.onStoryChanged', 'tool.stop', 'tool.clearScreenshots', 'render']);
  requireCalls(handler(workspace, 'window', 'pagehide'), ['tool.stop']);
  requireCalls(handler(workspace, 'stop', 'click'), ['suiteControls.cancel', 'tool.stop']);
  const capture = functionBody(workspace, 'captureScreenshots');
  requireCalls(capture, ['tool.captureScreenshot']);
  assert.equal(nodes(capture, n => n.type === 'AwaitExpression').length, 0, 'Capture must retain transient user activation');
  const runner = source('tools/cv-test-tool/vision/manual-runner.ts');
  requireCalls(methodBody(runner, 'ManualRunner', 'run'), ['this.options.capture', 'evaluate', 's.dispose']);
  requireCalls(functionBody(source('tools/cv-test-tool/vision/evaluate.ts'), 'analyze'), ['Session', 'evaluate', 'session.dispose']);
});
