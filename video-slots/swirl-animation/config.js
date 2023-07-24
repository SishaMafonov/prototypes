var reelGap = 15;
var COLMS = 5;
var ROWS = 5;

var animationSpeed = 35;

/*UI Config*/
var symSize = {x: 145, y: 145};
var btnSpinPos = {x: 1030, y: 400};

/*Reels config*/
var REEL1 = { x: 100, y: 80};
var REEL2 = { x: REEL1.x + symSize.x, y: 80};
var REEL3 = { x: REEL2.x + symSize.x, y: 80};
var REEL4 = { x: REEL3.x + symSize.x, y: 80};
var REEL5 = { x: REEL4.x + symSize.x, y: 80};

var r1Sym1 = {x: REEL1.x, y: REEL1.y};
var r1Sym2 = {x: REEL1.x, y: r1Sym1.y + symSize.y + reelGap};
var r1Sym3 = {x: REEL1.x, y: r1Sym2.y + symSize.y + reelGap};
var r1Sym4 = {x: REEL1.x, y: r1Sym3.y + symSize.y + reelGap};
var r1Sym5 = {x: REEL1.x, y: r1Sym4.y + symSize.y + reelGap};

var r2Sym1 = {x: REEL2.x, y: REEL2.y};
var r2Sym2 = {x: REEL2.x, y: r2Sym1.y + symSize.y + reelGap};
var r2Sym3 = {x: REEL2.x, y: r2Sym2.y + symSize.y + reelGap};
var r2Sym4 = {x: REEL2.x, y: r2Sym3.y + symSize.y + reelGap};
var r2Sym5 = {x: REEL2.x, y: r2Sym4.y + symSize.y + reelGap};

var r3Sym1 = {x: REEL3.x, y: REEL3.y};
var r3Sym2 = {x: REEL3.x, y: r3Sym1.y + symSize.y + reelGap};
var r3Sym3 = {x: REEL3.x, y: r3Sym2.y + symSize.y + reelGap};
var r3Sym4 = {x: REEL3.x, y: r3Sym3.y + symSize.y + reelGap};
var r3Sym5 = {x: REEL3.x, y: r3Sym4.y + symSize.y + reelGap};

var r4Sym1 = {x: REEL4.x, y: REEL4.y};
var r4Sym2 = {x: REEL4.x, y: r4Sym1.y + symSize.y + reelGap};
var r4Sym3 = {x: REEL4.x, y: r4Sym2.y + symSize.y + reelGap};
var r4Sym4 = {x: REEL4.x, y: r4Sym3.y + symSize.y + reelGap};
var r4Sym5 = {x: REEL4.x, y: r4Sym4.y + symSize.y + reelGap};

var r5Sym1 = {x: REEL5.x, y: REEL5.y};
var r5Sym2 = {x: REEL5.x, y: r5Sym1.y + symSize.y + reelGap};
var r5Sym3 = {x: REEL5.x, y: r5Sym2.y + symSize.y + reelGap};
var r5Sym4 = {x: REEL5.x, y: r5Sym3.y + symSize.y + reelGap};
var r5Sym5 = {x: REEL5.x, y: r5Sym4.y + symSize.y + reelGap};