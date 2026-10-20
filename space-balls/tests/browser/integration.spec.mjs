import { test,expect,contract,openGame,playGame,arrange,snapshot,aimAtNet,reachable } from './fixtures.mjs';

for(const side of [0,1]){
  test(contract(['C-GOAL-04','I-FLOW-04','I-FLOW-05'], `controlled browser: net ${side} → score → goal hold → fresh countdown`),async({page})=>{
    await openGame(page);await playGame(page,'Ice');await aimAtNet(page,side);
    const scores=side===0?[0,1]:[1,0],contact=await snapshot(page);
    expect(contact.match.phase).toBe('goal');expect(contact.match.scores).toEqual(scores);
    await expect(page.locator('.round-word')).toHaveText(side===0?'Opponent scores!':'You score!');
    await expect(page.locator('.score-you strong')).toHaveText(String(scores[0]));
    await expect(page.locator('.score-opponent strong')).toHaveText(String(scores[1]));
    await page.clock.runFor(1100);expect((await snapshot(page)).match.ball).toEqual(contact.match.ball);
    await page.clock.runFor(160);const reset=await snapshot(page);
    expect(reset.match.phase).toBe('countdown');expect(reset.match.scores).toEqual(scores);
    expect(reset.match.ball).toEqual({x:0.5,y:0.5,vx:0,vy:0});expect(reset.match.selectedPlanet).toBe('Ice');
    await expect(page.locator('.round-word')).toHaveText('Ready?');
  });
}

for(const winner of [0,1]){
  test(contract(['I-FLOW-06','I-FLOW-07','C-RESULT-04','V-RESP-06'], `controlled browser: winner ${winner}, native modal keyboard containment, Escape persistence and replay`),async({page})=>{
    await openGame(page);await playGame(page,'Lava');
    await aimAtNet(page,winner===0?1:0,winner===0?[9,7]:[7,9]);
    const dialog=page.getByRole('dialog'),replay=page.getByRole('button',{name:'New Game'});
    await expect(dialog).toBeVisible();await expect(page.locator('#result-title')).toHaveText(winner===0?'You win!':'Opponent wins!');
    await expect(replay).toBeFocused();await reachable(page,'.new-game');
    for(const key of ['Tab','Shift+Tab']){
      await page.keyboard.press(key);
      const focus=await page.evaluate(()=>({inside:!!document.activeElement.closest('.result-dialog'),
        chrome:!document.hasFocus()&&document.activeElement===document.body}));
      // Native dialogs allow browser chrome in the tab cycle, never background controls.
      expect(focus.inside||focus.chrome).toBe(true);
      if(focus.chrome){await page.keyboard.press(key);await expect(replay).toBeFocused();}
    }
    await page.keyboard.press('Escape');await expect(dialog).toBeVisible();
    const frozen=(await snapshot(page)).match;await page.clock.runFor(1000);expect((await snapshot(page)).match).toEqual(frozen);
    await replay.click();await expect(dialog).toBeHidden();
    await expect(page.locator('.planet-name')).toHaveText('Earth');await expect(page.locator('.planet-count')).toHaveText('1 / 4');
    await expect(page.getByRole('button',{name:'Previous planet'})).toBeFocused();
    await expect(page.locator('.voice-controls')).toBeHidden();await expect(page.locator('.scoreboard')).toBeHidden();
    await page.getByRole('button',{name:'Confirm',exact:true}).click();await page.locator('.start').click();
    expect((await snapshot(page)).match.scores).toEqual([0,0]);
  });
}

test(contract(['C-MATCH-04','I-FLOW-08'], 'controlled browser: deuce → match point → deuce without a winner modal'),async({page})=>{
  await openGame(page);await playGame(page);await arrange(page,{scores:[9,9]});
  await expect(page.locator('.match-rule')).toHaveText('Deuce · Win by 2');
  await aimAtNet(page,1,[9,9]);await expect(page.locator('.match-rule')).toHaveText('Match point · You');
  await expect(page.locator('.match-rule')).toHaveClass(/match-point/);
  await aimAtNet(page,0,[10,9]);await expect(page.locator('.match-rule')).toHaveText('Deuce · Win by 2');
  await expect(page.locator('.match-rule')).not.toHaveClass(/match-point/);
  await expect(page.getByRole('dialog')).toBeHidden();expect((await snapshot(page)).match.winner).toBeNull();
});

test(contract(['C-AUDIO-08','C-RESULT-01'], 'controlled browser: a winning collision releases native Web Audio fixture tracks'),async({page})=>{
  await openGame(page);await playGame(page);
  await page.evaluate(()=>{
    // Real browser MediaStream/AudioContext objects; capture acquisition is the fixture.
    window.__captureFixture=new AudioContext();
    const destination=window.__captureFixture.createMediaStreamDestination();
    navigator.mediaDevices.getUserMedia=async options=>{
      window.__captureOptions=options;window.__observedTracks=destination.stream.getTracks();return destination.stream;
    };
  });
  await page.getByRole('button',{name:'Enable microphone'}).click();
  await expect(page.getByRole('button',{name:'Turn mic off'})).toBeVisible();
  expect(await page.evaluate(()=>window.__observedTracks.map(t=>t.readyState))).toEqual(['live']);
  expect(await page.evaluate(()=>window.__captureOptions.video)).toBe(false);
  await aimAtNet(page,1,[9,0]);await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(()=>window.__observedTracks.map(t=>t.readyState))).toEqual(['ended']);
  await expect(page.locator('.voice-controls')).toBeHidden();
  await page.evaluate(()=>window.__captureFixture.close());
});

test(contract(['C-AUDIO-05','C-INPUT-08','V-TEXT-03'], 'controlled browser: permission rejection projects exact denied copy and preserves Boost'),async({page})=>{
  await openGame(page);await playGame(page);
  await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Fixture denial','NotAllowedError');};});
  await page.getByRole('button',{name:'Enable microphone'}).click();
  await expect(page.locator('.voice-status')).toHaveText('Microphone permission declined · Use Boost or Space instead.');
  expect((await snapshot(page)).microphone.state).toBe('denied');
  await page.getByRole('button',{name:'Boost',exact:true}).click();await page.clock.runFor(32);
  await expect(page.locator('.voice-controls')).toHaveClass(/voice-detected/);
});
