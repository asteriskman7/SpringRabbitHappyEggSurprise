'use strict';

let game = {
  canvas: undefined,
  ctx: undefined,
  resizeTimeout: undefined,
  lastTick: undefined,
  titleMode: undefined,
  buttons: undefined,
  mousePos: undefined,
  world: undefined,
  scale: undefined,
  physicsEnabled: undefined,
  plugJoint: undefined,
  pressedKeys: undefined,
  touchScreen: undefined,
  score: 0,
  finished: false,
  eggs: [],
  speedUpgrades: [{cost: 40, newVal: 0.95}, {cost: 1000, newVal: 0.9}, {cost: 11000, newVal: 0.85}, {cost: 45000, newVal: 0.8}, {cost: 300000, newVal: 0.0}],
  upgrades: {
    look: [{cost: 25}, {cost: 300}, {cost: 2000}, {cost: 5000}, {cost: 15000}, {cost: 140000}],
    speed: undefined,
    value: [{cost: 10, newVal: 2}, {cost: 500, newVal: 4}, {cost: 2400, newVal: 8}, {cost: 5500, newVal: 16}, {cost: 18000, newVal: 32}, {cost: 55000, newVal: 64}]
  },
  init: function() {
    console.log('init');

    game.upgrades.speed = game.speedUpgrades.slice();

    game.canvas = document.getElementById('cmain');
    game.ctx = game.canvas.getContext('2d');

    window.onresize = game.resizeStart;
    game.canvas.onclick = game.canvasClick;
    game.canvas.onmousemove = game.canvasMouseMove;
    game.canvas.ontouchstart = game.onTouchStart;
    game.canvas.ontouchend = game.onTouchEnd;

    game.lastTick = 0;
    game.titleMode = true;
    game.buttons = [];
    game.hoverColor = '#11111110';
    game.scale = 75; //75 pixels per meter
    game.physicsEnabled = true;
    game.touchScreen = false;

    images.loadSpriteSheet('./sprites.json');

    game.resizeEnd();
    game.tick();
  },
  resizeStart: function() {
    clearTimeout(game.resizeTimeout);
    game.resizeTimeout = setTimeout(game.resizeEnd, 500);
  },
  resizeEnd: function() {
    let iw = window.innerWidth;
    let ih = window.innerHeight;
    let borderSize = 10;

    let freeSize = Math.min(iw, ih);
    let size = freeSize - 2 * borderSize;

    game.canvas.style.width = size;
    game.canvas.style.height = size;

    game.canvas.style.top = (ih - size) * 0.5;
    game.canvas.style.left = (iw - size) * 0.5;
    game.canvas.style.background = '#FFFFFF';
  },
  tick: function(timestamp) {
    let delta = timestamp - game.lastTick;
    if (delta > (1/5)) {
      delta = 1/5;
    }

    game.update(timestamp, delta);
    game.draw(timestamp, delta);

    game.lastTick = timestamp;
    window.requestAnimationFrame(game.tick);
  },
  update: function(timestamp, delta) {
    if (game.titleMode) {
      if (images.isDoneLoading()) {
        if (game.buttons.length === 0) {
          game.createButton(game.canvas.width * 0.5 - 120, game.canvas.height * 0.3 - 20, 240, 40,
            "25px 'Comic Sans MS'", '#E8F4FF', '#2A6F8A', '#000000', 'START GAME', game.startGame);
        }
      }
    } else {
      if (game.physicsEnabled) {

        let rabbitX = 4 + 3 * Math.sin(timestamp*game.rabbitSpeed);
        let rabbitY = 0.4;
        game.rabbit.SetPosition(new b2Vec2(rabbitX, rabbitY));

        if (Math.random() > game.eggGenerateLimit) {
          game.eggs.push(game.createEgg(rabbitX + 0.7/2, rabbitY, 0.1, game.eggValue));
        }

        for (let i = game.eggs.length - 1; i >= 0; i--) {
          let egg = game.eggs[i];
          let pos = egg.GetPosition();
          let data = egg.GetUserData();
          if (pos.y >= 8) {
            //game.score += data.value;
            if (data.imgNum === 4) {
              game.score += game.eggValue * 10;  
            } else {
              game.score += game.eggValue;
            }
            game.world.DestroyBody(egg);
            game.eggs.splice(i, 1);
          }
        }

        let availColor = '#00F00060';
        let unavailColor = '#00000020';
        game.lookButton.bgcolor  = (game.upgrades.look.length  > 0 && game.upgrades.look[0].cost  <= game.score) ? availColor : unavailColor;
        game.speedButton.bgcolor = (game.upgrades.speed.length > 0 && game.upgrades.speed[0].cost <= game.score) ? availColor : unavailColor;
        game.valueButton.bgcolor = (game.upgrades.value.length > 0 && game.upgrades.value[0].cost <= game.score) ? availColor : unavailColor;

        game.lookButton.progress  = game.upgrades.look.length > 0  ? (game.score / game.upgrades.look[0].cost)  : 0;
        game.speedButton.progress = game.upgrades.speed.length > 0 ? (game.score / game.upgrades.speed[0].cost) : 0;
        game.valueButton.progress = game.upgrades.value.length > 0 ? (game.score / game.upgrades.value[0].cost) : 0;

        game.finished = game.upgrades.look.length === 0 && game.upgrades.speed.length === 0 && game.upgrades.value.length === 0;

        game.world.Step(1/60, 2, 2);
        game.world.ClearForces();

      }
    }
  },
  draw: function(timestamp, delta) {
    let ctx = game.ctx;
    ctx.save();
    ctx.clearRect(0,0,600,600);
    if (game.titleMode) {
      ctx.font = "25px 'Comic Sans MS'";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (images.isDoneLoading()) {
        images.draw(ctx, 'title', 0, 0);
      } else {
        ctx.fillText('LOADING', game.canvas.width * 0.5, game.canvas.height * 0.5);
      }
      ctx.fillText('Spring Rabbit Happy Egg Surprise!', game.canvas.width * 0.5, game.canvas.height * 0.1);

    } else {

      if (game.lookLevel > 3) {
        images.draw(ctx, 'background', 0, 0);
      }
      if (game.lookLevel > 4) {
        images.draw(ctx, 'headtop', 139, 311);
      }

      for (let b = game.world.GetBodyList(); b; b = b.m_next) {
        let userData = b.GetUserData();
        if (userData === null) {
          userData = {type: 'none'};
        }
        let pos = b.GetPosition();
        ctx.save();
        ctx.translate(pos.x * game.scale, pos.y * game.scale);
        ctx.rotate(b.GetAngle());
        ctx.translate(-pos.x * game.scale, -pos.y * game.scale);
        switch (userData.type) {
          case 'hidden':
            break;
          case 'proto':
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(
              (pos.x - userData.width / 2) * game.scale,
              (pos.y - userData.height / 2) * game.scale,
              userData.width * game.scale,
              userData.height * game.scale
            );
            break;
          case 'rabbit':
            if (game.lookLevel < 3) {
              ctx.fillStyle = "#00FF00";
              ctx.fillRect(
                (pos.x - userData.width / 2) * game.scale,
                (pos.y - userData.height / 2) * game.scale,
                userData.width * game.scale,
                userData.height * game.scale
              );
              ctx.fillStyle = '#004000';
              ctx.font = "12px 'Comic Sans MS'";
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('rabbit', pos.x * game.scale, pos.y * game.scale);

            } else {
              images.draw(ctx, 'rabbit', (pos.x - userData.width / 2) * game.scale, (pos.y - userData.height / 2) * game.scale);
            }


            break;
          case 'egg':
            if (game.lookLevel < 1) {
              ctx.strokeStyle = '#FF0000';
              ctx.beginPath();
              ctx.arc(pos.x * game.scale, pos.y * game.scale, userData.radius * game.scale, 0, Math.PI * 2, 0);
              ctx.stroke();
            } else {
              if (game.lookLevel < 6) {
                images.draw(ctx, 'egg' + userData.imgNum, (pos.x - userData.radius) * game.scale, (pos.y - userData.radius) * game.scale);
              } else {
                images.draw(ctx, 'yuck', (pos.x - userData.radius) * game.scale, (pos.y - userData.radius) * game.scale);
              }
            }
            break;
          case 'peg':
            if (game.lookLevel < 2) {
              ctx.strokeStyle = '#00FF00';
              ctx.beginPath();
              ctx.arc(pos.x * game.scale, pos.y * game.scale, userData.radius * game.scale, 0, Math.PI * 2, 0);
              ctx.stroke();
            } else {
              images.draw(ctx, 'flower0', (pos.x - userData.radius) * game.scale, (pos.y - userData.radius ) * game.scale);
            }
            break;
          case 'wall':

            ctx.fillStyle = "#77612f";
            ctx.fillRect(
              (pos.x - userData.width / 2) * game.scale,
              (pos.y - userData.height / 2) * game.scale,
              userData.width * game.scale,
              userData.height * game.scale
            );

            break;
          case 'ground':
            break;
          default:
            throw `Unknown body type ${userData.type}`;
        }

        ctx.restore();
      }


      if (game.lookLevel > 4) {
        images.draw(ctx, 'headbot', 139, 570);
      }


      //draw score
      if (game.lookLevel < 4) {
        ctx.fillStyle = '#2d2727';
      } else {
        ctx.fillStyle = '#d7d7d7';
      }
      ctx.font = "25px 'Comic Sans MS'";
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Egg Points: ${game.score}`, 10, game.canvas.height - 8);

      if (game.finished) {
        ctx.textAlign = 'right';
        ctx.fillText('You win!?', game.canvas.width - 10, game.canvas.height - 8);
      }

    }

/*
    if (game.dialogActive) {
      //draw the box
      images.draw(ctx, 'dialog', 88, 0);

      //draw the text
      ctx.fillStyle = '#000000';
      ctx.font = "15px 'Russo One'";
      ctx.textAlignt = 'left';
      ctx.textBaseline = 'hanging';
      let textMargin = 10;
      let msgLeft = game.dialogMsg;
      let maxChars = 45;
      let nextTextY = 222;
      while (msgLeft.length > 0) {
        //take the maxChars chars and then back up to the previous space
        let msgLine;
        if (msgLeft.length <= maxChars) {
          msgLine = msgLeft;
          msgLeft = '';
        } else {
          msgLine = msgLeft.substr(0, maxChars);
          let lastSpace = msgLine.lastIndexOf(' ');
          msgLine = msgLine.substr(0, lastSpace);
          msgLeft = msgLeft.substr(lastSpace + 1);
        }
        ctx.fillText(msgLine, 120, nextTextY);
        nextTextY += 20;
      }

    }

*/

/*
    if (game.finished) {
      let frameNum = Math.floor(timestamp / 1000) % 2;
      let faceSize = images.getImageSize('spotface' + frameNum);
      images.draw(ctx, 'spotface' + frameNum, (game.canvas.width - faceSize.width) * 0.5,
       (game.canvas.height - faceSize.height) * 0.2);
      ctx.fillStyle = game.fs || "#00000060";
      let rx = 40;
      let ry = 382;
      let rw = game.canvas.width - 2 * rx;
      let rh = 70;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.font = "30px 'Russo One'";
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.fillText('All dogs go to heaven.... right?!?', game.canvas.width * 0.5,
       game.canvas.height * 0.7);
      ctx.font = "10px 'Russo One'";
      ctx.fillText('The End', game.canvas.width * 0.5, game.canvas.height * 0.7 + 25);

    }
*/

    game.drawButtons();

    ctx.restore();
  },
  startGame: function() {
    game.buttons = [];
    game.titleMode = false;
    game.eggGenerateLimit = 0.99;
    game.rabbitSpeed = 0.001;
    game.eggValue = 1;
    game.lookLevel = 0;

    //set up Box2D
    game.world = new b2World(new b2Vec2(0, 10), true);
    game.world.GetBodyList().SetUserData({type: 'ground'}); //not sure what this line does

    //create walls
    let leftRamp = game.createWall(0, (game.canvas.height - 60) / game.scale, 3.5, 10 / game.scale);
    leftRamp.SetAngle(Math.PI * 2 * 0.03);

    let rightRamp = game.createWall(4.5, (game.canvas.height - 60) / game.scale, 3.5, 10 / game.scale);
    rightRamp.SetAngle(-Math.PI * 2 * 0.03);

    //let leftWall  = game.createWall(-10 / game.scale, 0, 20 / game.scale, game.canvas.height / game.scale);
    let leftWall  = game.createWall(-20 / game.scale, 0, 20 / game.scale, game.canvas.height / game.scale);
    //let rightWall = game.createWall((game.canvas.width - 10) / game.scale, 0, 20 / game.scale, game.canvas.height / game.scale);
    let rightWall = game.createWall((game.canvas.width + 0) / game.scale, 0, 20 / game.scale, game.canvas.height / game.scale);

    //create rabbit
    game.rabbit = game.createBox(250 / game.scale, 250 / game.scale, 0.7, 0.5, 'rabbit');

    game.pressedKeys = {};
    game.canvas.parentElement.onkeydown = game.onkeydown;
    game.canvas.parentElement.onkeyup = game.onkeyup;

    let rows = 7;
    let cols = 9;
    let minPegX = 1;
    let maxPegX = 7;
    let minPegY = 1.5;
    let maxPegY = 6;
    let pegRadius = 0.1;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < (y % 2 === 0 ? cols : cols + 1); x++) {
        let pegX = minPegX + (y % 2 === 0 ? x : x - 0.5) * (maxPegX - minPegX) / (cols - 1);
        let pegY = minPegY + y * (maxPegY - minPegY) / (rows - 1);
        game.debugpeg = game.createPeg(pegX, pegY, pegRadius);
      }
    }

    /*
    if (game.touchScreen) {
      let touchButtonSize = 100;
      game.createButton(0, (game.canvas.height - touchButtonSize) * 0.5, touchButtonSize, touchButtonSize,
       "30px 'Comic Sans MS'", '#F0F0F020', '#F0F0F060', '#00000000', '<', game.doLeftTouch);
      game.createButton(game.canvas.width - touchButtonSize, (game.canvas.height - touchButtonSize)* 0.5, touchButtonSize, touchButtonSize,
       "30px 'Comic Sans MS'", '#F0F0F020', '#F0F0F060', '#00000000', '>', game.doRightTouch);
    }
    */

    let buttonWidth = 100;
    let buttonHeight = 50;
    game.lookButton = game.createButton(game.canvas.width - 100, 0*buttonHeight, buttonWidth, buttonHeight, "30px 'Comic Sans MS'",
      '#00000020', '#00000060', '#00000060', 'look', () => {game.buyUpgrade('look');}, 'look');
    game.speedButton = game.createButton(game.canvas.width - 100, 1*buttonHeight, buttonWidth, buttonHeight, "30px 'Comic Sans MS'",
      '#00000020', '#00000060', '#00000060', 'rate', () => {game.buyUpgrade('speed');}, 'speed');
    game.valueButton = game.createButton(game.canvas.width - 100, 2*buttonHeight, buttonWidth, buttonHeight, "30px 'Comic Sans MS'",
      '#00000020', '#00000060', '#00000060', 'value', () => {game.buyUpgrade('value');}, 'value');
    /*
    let dialogText = "Hi there! I'm the Bot Operation Support Superintendent (B.O.S.S)." +
      " I'm in charge of watching over you, the Self Propelled Obliterater of Trash (S.P.O.T)" +
      ". Can you try to collect that trash by moving with " + (game.touchScreen ? "the" : "your") +
      " arrow " + (game.touchScreen ? "buttons" : "keys") + "?";
    game.showDialogBox(dialogText);
    */

  },
  createButton: function(x, y, w, h, font, bgcolor, fgcolor, strokeColor, text, callback, tag) {
    //x,y are the upper left corner
    let newButton = {rect: {x: x, y: y, w: w, h: h}, font: font, bgcolor: bgcolor,
      fgcolor: fgcolor, strokeColor, text: text, callback: callback, tag: tag};
    game.buttons.push(newButton);
    return newButton;
  },
  drawButtons: function() {
    game.ctx.save();
    game.ctx.textAlign = 'center';
    game.ctx.textBaseline = 'middle';
    game.buttons.forEach((v) => {
      let hover = game.isPointInRect(game.mousePos, v.rect);
      //draw background
      game.ctx.fillStyle = v.bgcolor;
      game.ctx.fillRect(v.rect.x, v.rect.y, v.rect.w, v.rect.h);
      //draw text
      game.ctx.font = v.font;
      game.ctx.fillStyle = v.fgcolor;
      game.ctx.fillText(v.text, v.rect.x + v.rect.w * 0.5 , v.rect.y + v.rect.h * 0.5);

      if (v.progress && v.progress < 1) {
        game.ctx.fillStyle = '#7aabe880';
        game.ctx.fillRect(v.rect.x, v.rect.y, v.rect.w * v.progress, v.rect.h);
      }

      if (hover) {
        game.ctx.fillStyle = game.hoverColor;
        game.ctx.fillRect(v.rect.x, v.rect.y, v.rect.w, v.rect.h);
      }
      //draw outline
      game.ctx.strokeStyle = v.strokeColor;
      game.ctx.lineWidth = hover ? 3 : 1;

      game.ctx.strokeRect(v.rect.x, v.rect.y, v.rect.w, v.rect.h);
    });
    game.ctx.restore();
  },
  canvasClick: function(event) {
    let pos = game.getCursorPosition(event);
    //console.log(pos);
    game.buttons.forEach((v) => {
      if (game.isPointInRect(pos, v.rect)) {
        v.callback();
      }
    });
  },
  getCursorPosition: function(event) {
    //modified from https://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
    let rect = game.canvas.getBoundingClientRect();
    let absx = event.clientX - rect.left;
    let absy = event.clientY - rect.top;
    let relx = absx * game.canvas.width / game.canvas.style.width.slice(0,-2);
    let rely = absy * game.canvas.height / game.canvas.style.height.slice(0,-2);
    return {x: relx, y: rely};
  },
  getTouchPosition: function(event) {
    let rect = game.canvas.getBoundingClientRect();
    let absx = event.changedTouches[0].pageX - rect.left;
    let absy = event.changedTouches[0].pageY - rect.top;
    let relx = absx * game.canvas.width / game.canvas.style.width.slice(0,-2);
    let rely = absy * game.canvas.height / game.canvas.style.height.slice(0,-2);
    return {x: relx, y: rely};
  },
  isPointInRect(point, rect) {
    if (point === undefined) {return false;}
    return (point.x >= rect.x) && (point.x <= rect.x + rect.w) && (point.y <= rect.y + rect.h) && (point.y >= rect.y);
  },
  canvasMouseMove: function(event) {
    let pos = game.getCursorPosition(event);
    game.mousePos = pos;
  },
  createWall: function(x, y, width, height, type) {
    //x,y are the upper left corners
    var userData = {};
    userData.type = type || 'wall';
    userData.width = width;
    userData.height = height;

    var fDef = new b2FixtureDef();
    fDef.density = 1.0;
    fDef.friction = 0.5;
    fDef.friction = 0.1;
    fDef.restitution = 0.2;
    fDef.restitution = 0.1;
    fDef.shape = new b2PolygonShape();
    fDef.shape.SetAsBox(width / 2, height / 2);


    var bDef = new b2BodyDef();
    bDef.type = b2Body.b2_staticBody;

    bDef.position.x = x + width * 0.5;
    bDef.position.y = y + height * 0.5;

    var newBody;
    newBody = game.world.CreateBody(bDef);
    newBody.CreateFixture(fDef);
    newBody.SetUserData(userData);

    return newBody;
  },
  //x,y are upper left corners
  createBox: function(x, y, width, height, type) {
    var userData = {};
    userData.type = type;
    userData.width = width;
    userData.height = height;

    var fDef = new b2FixtureDef();
    fDef.density = 1.0;
    fDef.friction = 0.5;
    fDef.friction = 0.1;
    fDef.restitution = 0.2;
    fDef.restitution = 0.1;

    fDef.shape = new b2PolygonShape();
    fDef.shape.SetAsBox(width / 2, height / 2);

    var bDef = new b2BodyDef();
    bDef.type = b2Body.b2_dynamicBody;
    if (type === 'rabbit') {
      bDef.type = b2Body.b2_kinematicBody;
    }
    bDef.position.x = x + width * 0.5;
    bDef.position.y = y + height * 0.5;

    var newBody;
    newBody = game.world.CreateBody(bDef);
    newBody.CreateFixture(fDef);
    newBody.SetUserData(userData);

    return newBody;
  },
  createEgg: function(x, y, radius, value) {
    var userData = {};
    userData.type = 'egg';
    userData.radius = radius;
    userData.value = value;
    let eggImageCount = 4;
    userData.imgNum = Math.floor(Math.random() * eggImageCount);
    if (Math.random() > 0.98) {
      userData.imgNum = 4;
    }

    var fDef = new b2FixtureDef();
    fDef.density = 1.0;
    fDef.friction = 0.5;
    fDef.friction = 0.1;
    fDef.restitution = 0.2;
    fDef.restitution = 0.1;


    fDef.shape = new b2CircleShape();
    fDef.shape.SetRadius(radius);


    var bDef = new b2BodyDef();
    bDef.type = b2Body.b2_dynamicBody;
    bDef.position.x = x;
    bDef.position.y = y;

    var newBody;
    newBody = game.world.CreateBody(bDef);
    newBody.CreateFixture(fDef);
    newBody.SetUserData(userData);

    return newBody;
  },
  createPeg: function(x, y, radius) {
    var userData = {};
    userData.type = 'peg';
    userData.radius = radius;

    var fDef = new b2FixtureDef();
    fDef.density = 1.0;
    fDef.friction = 0.1;
    fDef.restitution = 0.1;


    fDef.shape = new b2CircleShape();
    fDef.shape.SetRadius(radius);


    var bDef = new b2BodyDef();
    bDef.type = b2Body.b2_staticBody;
    bDef.position.x = x;
    bDef.position.y = y;

    var newBody;
    newBody = game.world.CreateBody(bDef);
    newBody.CreateFixture(fDef);
    newBody.SetUserData(userData);

    newBody.SetAngle(Math.PI * 2 * Math.random());

    return newBody;
  },
  onkeydown: function(event) {
    game.pressedKeys[event.key] = true;
  },
  onkeyup: function(event) {
    delete game.pressedKeys[event.key];
  },
  onTouchStart: function(event) {
    event.preventDefault();
    game.touchScreen = true;
    let pos = game.getTouchPosition(event);
    game.buttons.forEach((v) => {
      if (game.isPointInRect(pos, v.rect)) {
        v.callback();
      }
    });
    game.mousePos = pos;
  },
  onTouchEnd: function(event) {
    let pos = game.getTouchPosition(event);
    game.buttons.forEach((v) => {
      if (game.isPointInRect(pos, v.rect)) {
        v.callback();
      }
    });
    game.mousePos = undefined;
    game.pressedKeys = {};
  },
  doLeftTouch: function() {
    game.pressedKeys.ArrowLeft = true;
  },
  doRightTouch: function() {
    game.pressedKeys.ArrowRight = true;
  },
  showDialogBox: function(msg, callback) {
    //stop physics
    game.physicsEnabled = false;
    game.dialogActive = true;
    game.dialogMsg = msg;
    game.dialogCallback = callback;
    //game.createButton(x, y, w, h, "30px 'Russo One'", bgcolor, fgcolor, '#000000', text, callback);
    let buttonWidth = 100;
    let buttonHeight = 40;
    game.createButton(game.canvas.width - buttonWidth - 110 - 10, game.canvas.height - buttonHeight - 110 - 10,
      buttonWidth, buttonHeight, "30px 'Russo One'", '#A5C4D2', '#000000', '#000000', 'OK', game.closeDialogBox, 'dialogBoxButton');
  },
  closeDialogBox: function() {
    game.physicsEnabled = true;
    game.dialogActive = false;
    if (game.dialogCallback) {
      game.dialogCallback();
    }
    //delete the button
    game.removeButtonByTag('dialogBoxButton');
  },
  removeButtonByTag: function(tag) {
    game.buttons = game.buttons.filter((v) => v.tag !== tag);
  },
  buyUpgrade: function(type) {
    let upgrade = game.upgrades[type][0];
    if (upgrade === undefined) {return;}

    if (upgrade.cost <= game.score) {
      game.score -= upgrade.cost;
      switch (type) {
        case 'look':
          game.lookLevel++;
          break;
        case 'speed':
          game.eggGenerateLimit = upgrade.newVal;
          break;
        case 'value':
          game.eggGenerateLimit = 0.99;
          game.upgrades.speed = game.speedUpgrades.slice();
          game.eggValue = upgrade.newVal;
          break;
      }
      game.upgrades[type].shift();
    }
  }
};

//bring Box2D items into global namespace
let b2Vec2 = Box2D.Common.Math.b2Vec2,
  b2BodyDef = Box2D.Dynamics.b2BodyDef,
  b2Body = Box2D.Dynamics.b2Body,
  b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
  b2Fixture = Box2D.Dynamics.b2Fixture,
  b2World = Box2D.Dynamics.b2World,
 	b2MassData = Box2D.Collision.Shapes.b2MassData,
 	b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
 	b2CircleShape = Box2D.Collision.Shapes.b2CircleShape,
	b2DebugDraw = Box2D.Dynamics.b2DebugDraw,
  b2RevoluteJointDef =  Box2D.Dynamics.Joints.b2RevoluteJointDef,
  b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef;

game.init();
