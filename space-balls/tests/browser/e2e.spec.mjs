import { test,expect,contract,openGame,playGame,reachable } from './fixtures.mjs';

test(contract(['C-BOOT-02','C-PICK-02','C-PICK-05','I-FLOW-03'], 'production: keyboard selection → ready → countdown → play'),async({page})=>{
  const failed=[];page.on('requestfailed',request=>failed.push(request.url()));
  await openGame(page);
  expect(await page.evaluate(()=>typeof window.__spaceBallsTest)).toBe('undefined');
  const scripts=await page.locator('script[type=module][src]').evaluateAll(nodes=>nodes.map(n=>n.src));
  for(const url of scripts)expect(await(await page.request.get(url)).text()).not.toContain('__spaceBallsTest');
  await page.getByRole('button',{name:'Previous planet'}).focus();
  await page.keyboard.press('ArrowLeft');await expect(page.locator('.planet-name')).toHaveText('Ice');
  await expect(page.locator('.planet-count')).toHaveText('4 / 4');
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(page.locator('.start')).toBeFocused();await expect(page.locator('.scoreboard')).toBeHidden();
  await page.keyboard.press('Enter');await page.clock.runFor(32);
  await expect(page.locator('.round-word')).toHaveText('Ready?');
  await page.clock.runFor(1000);await expect(page.locator('.round-word')).toHaveText('Steady!');
  await page.clock.runFor(1000);await expect(page.locator('.round-word')).toHaveText('GO!');
  await page.clock.runFor(1040);await expect(page.locator('.round-message')).toBeHidden();
  await expect(page.locator('canvas')).toHaveAttribute('aria-label',/Selected planet: Ice/);
  await expect(page.locator('.score-you strong')).toHaveText('0');expect(failed).toEqual([]);
});

test(contract(['C-INPUT-01','C-INPUT-02','C-INPUT-04','I-INPUT-02'], 'production: mouse capture and Space boost release without microphone input'),async({page})=>{
  await openGame(page);await playGame(page);
  const button=page.getByRole('button',{name:'Boost',exact:true}),bounds=await button.boundingBox();
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();
  await page.clock.runFor(32);await expect(page.locator('.voice-controls')).toHaveClass(/voice-detected/);
  await expect(page.locator('.voice-meter')).toHaveJSProperty('value',0);
  await page.mouse.move(5,5);await page.mouse.up();await page.clock.runFor(240);
  await expect(page.locator('.voice-controls')).not.toHaveClass(/voice-detected/);
  await page.mouse.click(30,200);await page.keyboard.down('Space');await page.clock.runFor(32);
  await expect(page.locator('.voice-controls')).toHaveClass(/voice-detected/);
  await page.keyboard.up('Space');await page.clock.runFor(32);
  await expect(page.locator('.voice-controls')).not.toHaveClass(/voice-detected/);
});

test(contract(['C-BOOT-03'], 'production: a failed artwork request blocks Start and reload recovers'),async({page})=>{
  const asset=/\/assets\/ball-[^/]+\.png$/;
  await page.route(asset,route=>route.abort('failed'));
  await page.goto('/');
  await expect(page.locator('.selection .confirm')).toHaveText('Game assets unavailable');
  await expect(page.locator('.selection .confirm')).toBeDisabled();
  await expect(page.locator('.load-status')).toHaveText('Unable to load the game artwork. Please reload to try again.');
  await expect(page.locator('.start')).toBeHidden();
  await page.unroute(asset);await page.reload();await expect(page.locator('.selection .confirm')).toBeEnabled();
});

test(contract(['C-AUDIO-05','C-INPUT-08'], 'production: browser microphone failure keeps the manual game playable'),async({page,context},testInfo)=>{
  const cdp=await context.newCDPSession(page);
  const {targetInfo}=await cdp.send('Target.getTargetInfo');
  await cdp.send('Browser.setPermission',{permission:{name:'microphone'},setting:'denied',
    browserContextId:targetInfo.browserContextId,origin:'http://127.0.0.1:4173'});
  await openGame(page);await playGame(page);
  expect(await page.evaluate(async()=>(await navigator.permissions.query({name:'microphone'})).state)).toBe('denied');
  await page.evaluate(()=>{
    const native=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=async options=>{
      try{return await native(options);}catch(error){window.__captureFailure=error.name;throw error;}
    };
  });
  await page.getByRole('button',{name:'Enable microphone'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__captureFailure)).toBeTruthy();
  const error=await page.evaluate(()=>window.__captureFailure);
  expect(['NotAllowedError','SecurityError','NotSupportedError']).toContain(error);
  testInfo.annotations.push({type:'native-capture-error',description:error});
  // Some headless platforms reject capture as unsupported before checking permission.
  await expect(page.locator('.voice-status')).toHaveText(error==='NotSupportedError'
    ?'Could not start microphone · Try again or use Boost.'
    :'Microphone permission declined · Use Boost or Space instead.');
  await expect(page.getByRole('button',{name:'Boost',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Boost',exact:true}).click();await page.clock.runFor(32);
  await expect(page.locator('.voice-controls')).toHaveClass(/voice-detected/);
});

test(contract(['V-RESP-01','V-RESP-02','V-RESP-05'], 'production: portrait and short resizing preserves reachable controls and backing size'),async({page})=>{
  await openGame(page);await page.getByRole('button',{name:'Confirm',exact:true}).click();
  for(const [width,height]of [[390,844],[844,390]]){
    await page.setViewportSize({width,height});await page.clock.runFor(32);
    for(const selector of ['.microphone-toggle','.boost'])await reachable(page,selector);
    const geometry=await page.locator('canvas').evaluate(canvas=>({width:canvas.width,height:canvas.height,
      cssWidth:canvas.getBoundingClientRect().width,cssHeight:canvas.getBoundingClientRect().height,
      scroll:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth}));
    expect(geometry).toEqual({width,height,cssWidth:width,cssHeight:height,scroll:false});
  }
  await page.getByRole('button',{name:/Tap or click to start/}).click();
  await expect(page.locator('.scoreboard')).toBeVisible();
});

test(contract(['C-HARNESS-01','C-CV-03','I-INPUT-09'], 'production: workspace loads WASM, navigates stories, and focuses the game iframe'),async({page})=>{
  await page.goto('/tools/cv-test-tool/');
  await expect(page.locator('#suite-status')).toContainText('Click a requirement or Run suite',{timeout:20000});
  await page.locator('[data-story=motion]').click();
  await expect(page.locator('#story-title')).toHaveText('Motion study');
  await expect(page.frameLocator('#preview').locator('canvas')).toBeVisible();
  await page.locator('[data-story=space-balls]').click();
  const game=page.frameLocator('#preview');
  await expect(game.getByRole('button',{name:'Confirm',exact:true})).toBeEnabled();
  await game.getByRole('button',{name:'Previous planet'}).focus();await page.keyboard.press('ArrowLeft');
  await expect(game.locator('.planet-name')).toHaveText('Ice');
  await game.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(game.locator('.start')).toBeFocused();
});
