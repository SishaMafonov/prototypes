var config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 800,
    backgroundColor: 0x909090,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

var symbols;
var currentCell;
var cellToMove;

var btnSpin;
var txtShowSwirl;

var swirl = [];
var swirlCounter;

var symbolToThrow;

var numSymbolsToMove;
var swirlCoords = [];
var currentSymbolToMove;
var playSuckingAnimation = true;
var playThrowAnimation = false;
var isPlaying = false;

var arrToThrow = [];

var counter = 0;
var testAnimation = false;
var isEnd = false;

var showWild = false;
var spinStarted = false;

var rnd;
var imgSwirlWild;

var randomBet;

var assetDir = 'assets/';

function preload ()
{
    this.load.image('dSym', assetDir + 'symbols/sym6.png');
    this.load.image('btnSpin', assetDir + 'btnSpin.png');

    this.load.image('sym0', assetDir + 'symbols/sym0.png');
    this.load.image('sym1', assetDir + 'symbols/sym1.png');
    this.load.image('sym2', assetDir + 'symbols/sym2.png');
    this.load.image('sym3', assetDir + 'symbols/sym3.png');
    this.load.image('sym4', assetDir + 'symbols/sym4.png');    
    this.load.image('sym5', assetDir + 'symbols/sym5.png');
    this.load.image('sym6', assetDir + 'symbols/sym6.png');
    this.load.image('sym7', assetDir + 'symbols/sym7.png');
    this.load.image('sym8', assetDir + 'symbols/sym8.png');    
    
    this.load.image('sym12', assetDir + 'symbols/sym12.png');
}    

function create ()
{ 	
    drawReels(this);

    txtShowSwirl = this.add.text(
            840,
            10,
            'SHOW SWIRL ANIMATION',
            { 
                fontSize:   '30px Arial',
                fill:       '#ff0',
                align:      "center",
                alpha: 0
            }            
        ).setInteractive();

	btnSpin = this.add.image(btnSpinPos.x, btnSpinPos.y,'btnSpin').setInteractive();
    btnSpin.on('pointerup', btnSpinPressed, this);
    imgSwirlWild = this.add.image(-100, -100,'sym0');

    txtShowSwirl.on('pointerup', showSwirlAnimation, this);

}

function update ()
{
	if(isEnd){
		drawReels(this);
		isEnd = false;
	}

	if(swirlCounter > 0){
		txtShowSwirl.alpha = 1;
		for(var i = 0; i < swirl.length; i++){
			swirl[i].rotation += 0.2;
		}
	} else {
		txtShowSwirl.alpha = 0;
	}

	if(testAnimation){		
    	for(var i = 0; i < swirlCounter; i++){
    		swirlCoords[i] = {x: swirl[i].x, y: swirl[i].y, name: swirl[i].name};
    	}
    	numSymbolsToMove = symbols.children.size;
    	testAnimation = false;
	}

	if(numSymbolsToMove > 0){
		moveSwirl(swirlCoords[0].x, swirlCoords[0].y, symbols.children.entries[currentSymbolToMove]);
		if(numSymbolsToMove <= 0){
			playThrowAnimation = true;
		}
	}

	if(playThrowAnimation){	

		if(!isPlaying){
			rnd = Phaser.Math.RND.pick(arrToThrow);
			symbolToThrow = symbols.children.entries[rnd];
			cellToMove = checkIfCellFree(currentCell, swirlCoords);

			if(checkIfNextIsSwirl(cellToMove, swirlCoords)){
				cellToMove = checkIfCellFree(currentCell, swirlCoords);
			}

			if(symbolToThrow.name == 'swirl'){
				isPlaying = false;
				var index = arrToThrow.indexOf(rnd);
				if (index > -1) {
				  	arrToThrow.splice(index, 1);
				}
				//currentCell++;
			} else {
				isPlaying = true;
			}
		}
		
		if(isPlaying){	
			symbolToThrow.rotation += 0.8;
			if(symbolToThrow.x < cellToMove.x){
				symbolToThrow.x += animationSpeed;
				if(symbolToThrow.x > cellToMove.x){
					symbolToThrow.x = cellToMove.x;
				}
			}

			if(symbolToThrow.y < cellToMove.y){
				symbolToThrow.y += animationSpeed;
				if(symbolToThrow.y > cellToMove.y){
					symbolToThrow.y = cellToMove.y;
				}
			}

			if(symbolToThrow.x > cellToMove.x){
				symbolToThrow.x -= animationSpeed;
				if(symbolToThrow.x < cellToMove.x){
					symbolToThrow.x = cellToMove.x;
				}
			}

			if(symbolToThrow.y > cellToMove.y){
				symbolToThrow.y -= animationSpeed;
				if(symbolToThrow.y < cellToMove.y){
					symbolToThrow.y = cellToMove.y;
				}
			}

			if(symbolToThrow.x == cellToMove.x && symbolToThrow.y == cellToMove.y){
				var index = arrToThrow.indexOf(rnd);
				if (index > -1) {
				  	arrToThrow.splice(index, 1);
				}
				symbolToThrow.rotation = 0;
				currentCell++;
				isPlaying = false;
				if(arrToThrow.length <= 0){
					playThrowAnimation = false;
					showWild = true;
				}
			}

		}
	}

	if(showWild){
		imgSwirlWild.setPosition(swirlCoords[0].x, swirlCoords[0].y);
		swirl[0].alpha = 0;
	} 
	if(spinStarted){
		imgSwirlWild.setPosition(-100, -100);
	}
}

function drawReels(internal) {
	symbols = internal.physics.add.group();
	var rndNum = getRandomNumber();
	swirl = [];
	swirlCounter = 0;
	numSymbolsToMove = 0;
	currentSymbolToMove = 0;
	currentCell = 0;
	playSuckingAnimation = true;
	playThrowAnimation = false;
	isPlaying = false;
	symbolToThrow = [];
	arrToThrow = [];
	cellToMove = {};
	rnd = 0;
	showWild = false;

	for(var i = 0; i < COLMS; i++){
		for(var j = 0; j < ROWS; j++){


			if(rndNum === 12){
				var symbol = symbols.create(REEL1.x + (symSize.x * i), REEL1.y + (symSize.y * j), 'sym12').setVelocityY(5000);
				symbol.body.moves = false;
				symbol.name = 'swirl';
				symbol.id = i + '' + j;
				rndNum = getRandomNumber();
				swirl.push(symbol);
				swirlCounter++;
			} else {
				var symbol = symbols.create(REEL1.x + (symSize.x * i), REEL1.y + (symSize.y * j), getRandomSymbol()).setVelocityY(5000);
				symbol.body.moves = false;
				symbol.name = 'sym' + i.toString() + 'x' + j.toString();
				symbol.id = i + '' + j;
			}
			rndNum = getRandomNumber();
		}
	}

	for(var i = 0; i < symbols.children.size; i++){
		arrToThrow.push(i);
	}
	spinStarted = false;
}

function getRandomSymbol(){
	var iRnd = getRandomNumber();
	var ret;
	if(iRnd >= 0 && iRnd < 10){
		ret = 'sym7'
	}

	if(iRnd >= 10 && iRnd < 20){
		ret = 'sym6'
	}

	if(iRnd >= 20 && iRnd < 30){
		ret = 'sym5'
	}

	if(iRnd >= 30 && iRnd < 40){
		ret = 'sym4'
	}

	if(iRnd >= 40 && iRnd < 45){
		ret = 'sym3'
	}

	if(iRnd >= 45 && iRnd < 50){
		ret = 'sym2'
	}

	if(iRnd >= 50 && iRnd < 55){
		ret = 'sym1'
	}

	if(iRnd >= 55 && iRnd <= 56){
		ret = 'sym8'
	}

	return ret;
}

function getRandomNumber(){
	return Phaser.Math.Between(0, 56);
}

function btnSpinPressed(){
	spinStarted = true;
	enablePhisics();
	setTimeout(
        function(){ 
		  symbols.destroy();
		  isEnd = true;
        }, 500);	
}

function enablePhisics(){
	symbols.children.iterate(function(symbol){
        symbol.body.moves = true;
    });
}

function showSwirlAnimation() {
	testAnimation = true;
	swirlCoords = [];
}

function moveSwirl(x, y, symbol){
	
	if(symbol.name == 'swirl'){
		currentSymbolToMove++;
		numSymbolsToMove--;
		if(numSymbolsToMove <= 0){
			playSuckingAnimation = false;
		} else {
			symbol = symbols.children.entries[currentSymbolToMove];
			if(numSymbolsToMove > 0 && symbol.name == 'swirl'){
				currentSymbolToMove++;
				numSymbolsToMove--;
				if(numSymbolsToMove <= 0){
					playSuckingAnimation = false;
					} else {
					symbol = symbols.children.entries[currentSymbolToMove];
				}
			}
					
		}
	}

		if(playSuckingAnimation && symbol.name != 'swirl'){
			symbol.rotation += 0.8;
			if(symbol.x < x){
				symbol.x += animationSpeed;
				if(symbol.x > x){
					symbol.x = x;
				}
			}

			if(symbol.y < y){
				symbol.y += animationSpeed;
				if(symbol.y > y){
					symbol.y = y;
				}
			}

			if(symbol.x > x){
				symbol.x -= animationSpeed;
				if(symbol.x < x){
					symbol.x = x;
				}
			}

			if(symbol.y > y){
				symbol.y -= animationSpeed;
				if(symbol.y < y){
					symbol.y = y;
				}
			}


			if(symbol.x == x && symbol.y == y){
				numSymbolsToMove--;
				currentSymbolToMove++;
			}
		}
}

function checkIfCellFree(thisCell, sCoords){
	var cCell = getCellCoord(thisCell);
	var ret = cCell;
	for(var i = 0; i < sCoords.length; i++){
		if(cCell.x == sCoords[i].x && cCell.y == sCoords[i].y ){
			currentCell++;
			cCell = getCellCoord(thisCell + 1);
		}
	}

	ret = cCell;

	return ret;
}

function checkIfNextIsSwirl(coords, sCoords){
	var ret = false;
	for(var i = 0; i < sCoords.length; i++){
		if(coords.x == sCoords[i].x && coords.y == sCoords[i].y){
			ret = true;
		}
	}
	return ret;
}

function getCellCoord(input){				
	if(input == 0)	return	{x: REEL1.x + (symSize.x * 0), y: REEL1.y + (symSize.y * 0)};
	if(input == 1)	return	{x: REEL1.x + (symSize.x * 0), y: REEL1.y + (symSize.y * 1)};
	if(input == 2)	return	{x: REEL1.x + (symSize.x * 0), y: REEL1.y + (symSize.y * 2)};
	if(input == 3)	return	{x: REEL1.x + (symSize.x * 0), y: REEL1.y + (symSize.y * 3)};
	if(input == 4)	return	{x: REEL1.x + (symSize.x * 0), y: REEL1.y + (symSize.y * 4)};
	if(input == 5)	return	{x: REEL1.x + (symSize.x * 1), y: REEL1.y + (symSize.y * 0)};
	if(input == 6)	return	{x: REEL1.x + (symSize.x * 1), y: REEL1.y + (symSize.y * 1)};
	if(input == 7)	return	{x: REEL1.x + (symSize.x * 1), y: REEL1.y + (symSize.y * 2)};
	if(input == 8)	return	{x: REEL1.x + (symSize.x * 1), y: REEL1.y + (symSize.y * 3)};
	if(input == 9)	return	{x: REEL1.x + (symSize.x * 1), y: REEL1.y + (symSize.y * 4)};
	if(input == 10)	return	{x: REEL1.x + (symSize.x * 2), y: REEL1.y + (symSize.y * 0)};
	if(input == 11)	return	{x: REEL1.x + (symSize.x * 2), y: REEL1.y + (symSize.y * 1)};
	if(input == 12)	return	{x: REEL1.x + (symSize.x * 2), y: REEL1.y + (symSize.y * 2)};
	if(input == 13)	return	{x: REEL1.x + (symSize.x * 2), y: REEL1.y + (symSize.y * 3)};
	if(input == 14)	return	{x: REEL1.x + (symSize.x * 2), y: REEL1.y + (symSize.y * 4)};
	if(input == 15)	return	{x: REEL1.x + (symSize.x * 3), y: REEL1.y + (symSize.y * 0)};
	if(input == 16)	return	{x: REEL1.x + (symSize.x * 3), y: REEL1.y + (symSize.y * 1)};
	if(input == 17)	return	{x: REEL1.x + (symSize.x * 3), y: REEL1.y + (symSize.y * 2)};
	if(input == 18)	return	{x: REEL1.x + (symSize.x * 3), y: REEL1.y + (symSize.y * 3)};
	if(input == 19)	return	{x: REEL1.x + (symSize.x * 3), y: REEL1.y + (symSize.y * 4)};
	if(input == 20)	return	{x: REEL1.x + (symSize.x * 4), y: REEL1.y + (symSize.y * 0)};
	if(input == 21)	return	{x: REEL1.x + (symSize.x * 4), y: REEL1.y + (symSize.y * 1)};
	if(input == 22)	return	{x: REEL1.x + (symSize.x * 4), y: REEL1.y + (symSize.y * 2)};
	if(input == 23)	return	{x: REEL1.x + (symSize.x * 4), y: REEL1.y + (symSize.y * 3)};
	if(input == 24)	return	{x: REEL1.x + (symSize.x * 4), y: REEL1.y + (symSize.y * 4)};
	if(input < 0) return 'error';
	if(input >= 25) return 'error';

}