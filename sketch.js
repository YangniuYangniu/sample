// ================================
// 综合版：页面跳转 + 选水果 + 正式游戏（面部识别控制）
// 新增：return按钮；模式分流（normal/crazy）；面控精度提升（追踪+平滑+归一化+滞回）
// 新增：fork.png 作为“自定义光标”（鼠标在画布内：隐藏系统光标，仅显示 fork）
// 新增：模式选择后“教学动效序列”（摄像头为背景，PNG 透明叠加）
// 新增：music.MP3 全程播放（受浏览器限制：首次点击后启动）
// ✅ 本次修改：流程改为【先选水果 -> 再选模式 -> 再过教程 -> 再开始游戏】
// ================================
//
// 重要：要播放 MP3，你必须引入 p5.sound
// 资源文件确保存在：
// step1.png, step2a.png, step2b.png
// normal_step3a.png~normal_step3d.png
// crazy_step3a.png~crazy_step3e.png
// music.MP3
//

let bgImg, appleImg, blueberryImg, moneyImg, boomImg, customFont;
let startImg, againImg, returnImg;
let page1Img, page1_1Img, page1_2Img, page2Img;

// ✅ fork 光标
let forkImg;
const forkSize = 80;
const forkHotspotX = 0;
const forkHotspotY = 0;

// ✅ 音乐（p5.sound）
let bgm;
let musicStarted = false;

// ✅ 教学动效素材
let step1Img, step2aImg, step2bImg;
let normalStep3Imgs = []; // a-d
let crazyStep3Imgs = [];  // a-e

// ✅ 教学动效时序（按你最新要求）
let tutorialStartTime = null;
const T_STEP1 = 3000;           // step1：3s

const T_STEP2_TOTAL = 6000;     // step2：总 6s
const STEP2_INTERVAL = 1000;    // step2：1s/张，a/b轮流

const STEP3_INTERVAL = 500;     // step3：0.5s/张
const T_NORMAL_STEP3 = 6000;    // normal step3：总 6s
const T_CRAZY_STEP3 = 7500;     // crazy step3：总 7.5s

// page2 选择用（_0 / _1）
let fruitImgs = {};
let fruitHoverImgs = {};
let p1TagImg, p2TagImg;

// 游戏用（*.png）
let gameFruitImgs = {};
let selectedFruit1 = "apple";      // P1
let selectedFruit2 = "blueberry";  // P2

let explosionImgs = [];
let explosions = [];

let heartOnImg, heartOffImg;

let gridPositions = [];
let applePositions = [];
let blueberryPositions = [];
let moneyPositions = [];
let boomPositions = [];

let appleScore = 0;
let blueberryScore = 0;

// ✅ 页面：0=start, 1=fruit(选水果page2), 2=mode(选模式page1), 3=tutorial(教学), 4=game
let currentPage = 0;
let gameOver = false;

// 模式：normal / crazy
let gameMode = "crazy";

const rows = 5;
const cols = 10;
const maxLives = 3;
let appleLives = maxLives;
let blueberryLives = maxLives;

const gridWidth = 1920 * 0.75;
const gridHeight = 1080 * 0.75;
const cellWidth = gridWidth / cols;
const cellHeight = gridHeight / rows;

const gridOffsetX = (1920 - gridWidth) / 2;
const gridOffsetY = (1080 - gridHeight) / 2 + 80;

let lastSpawnTime = 0;
let gameStartTime = 0;
let countdown = 30;

// page2 选择相关
let page2Selections = [];
let page2ClickCount = 0;
let page2FinishTime = null;

// page2 位置参数
const fruitBoxSize = 180;
const page2BaseX = 484;
const page2BaseY = 520;
const page2Dx = 300 * 0.75;
const page2Dy = 260 * 0.85;
const page2OffsetX = 30;
const page2OffsetY = 20;

const page2Fruits = [
  { name: "apple",       x: page2BaseX + page2Dx * 0 + page2OffsetX, y: page2BaseY + page2Dy * 0 + page2OffsetY },
  { name: "orange",      x: page2BaseX + page2Dx * 1 + page2OffsetX, y: page2BaseY + page2Dy * 0 + page2OffsetY },
  { name: "peach",       x: page2BaseX + page2Dx * 2 + page2OffsetX, y: page2BaseY + page2Dy * 0 + page2OffsetY },
  { name: "dragonfruit", x: page2BaseX + page2Dx * 0 + page2OffsetX, y: page2BaseY + page2Dy * 1 + page2OffsetY },
  { name: "blueberry",   x: page2BaseX + page2Dx * 1 + page2OffsetX, y: page2BaseY + page2Dy * 1 + page2OffsetY },
  { name: "lemon",       x: page2BaseX + page2Dx * 2 + page2OffsetX, y: page2BaseY + page2Dy * 1 + page2OffsetY }
];

// =========================
// 爆炸 tint：按水果映射
// =========================
function getFruitTintColor(fruitName) {
  switch (fruitName) {
    case "apple":       return color(255, 80, 120);
    case "orange":      return color(255, 150, 0);
    case "peach":       return color(255, 160, 190);
    case "dragonfruit": return color(220, 0, 140);
    case "blueberry":   return color(0, 120, 255);
    case "lemon":       return color(255, 230, 0);
    default:            return color(255, 255, 255);
  }
}

// ===================================================
// 面部识别（原逻辑接入 + 精度增强）
// ===================================================
let video;
let faceMesh;
let faces = [];

let player1_open, player1_close;
let player2_open, player2_close;

let player1_pos = { row: 2, col: 2 };
let player2_pos = { row: 2, col: 7 };

let player1_prevYaw = 0;
let player2_prevYaw = 0;
let player1_prevLipY = 0;
let player2_prevLipY = 0;

// 精度增强：平滑/追踪/滞回
let p1TrackX = null;
let p2TrackX = null;

let p1YawSm = 0, p2YawSm = 0;
let p1LipYSm = 0, p2LipYSm = 0;
let p1MouthState = false;
let p2MouthState = false;

let p1MouthXSm = null, p1MouthYSm = null;
let p2MouthXSm = null, p2MouthYSm = null;

const smoothAlpha = 0.35;

let moveCooldown = 180;
let lastMoveTime1 = 0;
let lastMoveTime2 = 0;

let mouthThreshold = 10;
let motionSensitivity = 4.2;
let motionSensitivityActive = 2.4;

let p1MouthOpen = false;
let p2MouthOpen = false;

// ===================================================

// canvas mouse over/out
let cnv;
let mouseInCanvas = false;

// ===================== preload =====================
function preload() {
  try {
    faceMesh = ml5.faceMesh({ maxFaces: 2, flipped: true });
  } catch (e) {
    faceMesh = ml5.faceMesh({ maxFaces: 2 });
  }

  // players
  player1_open  = loadImage("Player1_open.png");
  player1_close = loadImage("Player1_close.png");
  player2_open  = loadImage("Player2_open.png");
  player2_close = loadImage("Player2_close.png");

  // UI/images
  bgImg = loadImage("background.png");
  startImg = loadImage("start.png");
  againImg = loadImage("again.png");
  returnImg = loadImage("return.png");
  forkImg = loadImage("fork.png");

  page1Img = loadImage("page1.png");
  page1_1Img = loadImage("page1_1.png");
  page1_2Img = loadImage("page1_2.png");
  page2Img = loadImage("page2.png");

  // 教学动效
  step1Img = loadImage("step1.png");
  step2aImg = loadImage("step2a.png");
  step2bImg = loadImage("step2b.png");

  normalStep3Imgs = [
    loadImage("normal_step3a.png"),
    loadImage("normal_step3b.png"),
    loadImage("normal_step3c.png"),
    loadImage("normal_step3d.png")
  ];

  crazyStep3Imgs = [
    loadImage("crazy_step3a.png"),
    loadImage("crazy_step3b.png"),
    loadImage("crazy_step3c.png"),
    loadImage("crazy_step3d.png"),
    loadImage("crazy_step3e.png")
  ];

  // ✅ 音乐
  bgm = loadSound("music.MP3");

  // fruits
  const fruits = ["apple", "orange", "peach", "dragonfruit", "blueberry", "lemon"];

  for (let f of fruits) {
    fruitImgs[f] = loadImage(`${f}_0.png`);
    fruitHoverImgs[f] = loadImage(`${f}_1.png`);
  }
  for (let f of fruits) {
    gameFruitImgs[f] = loadImage(`${f}.png`);
  }

  // default
  appleImg = gameFruitImgs[selectedFruit1];
  blueberryImg = gameFruitImgs[selectedFruit2];

  p1TagImg = loadImage("P1.png");
  p2TagImg = loadImage("P2.png");

  moneyImg = loadImage("money.png");
  boomImg = loadImage("boom.png");

  heartOnImg = loadImage("heart_on.png");
  heartOffImg = loadImage("heart_off.png");

  customFont = loadFont("CHANGBANDIANSONG-12.TTF");

  for (let i = 1; i <= 4; i++) {
    explosionImgs.push(loadImage(`SE${i}.png`));
  }
}

// ===================== setup =====================
function setup() {
  cnv = createCanvas(1920, 1080);

  imageMode(CENTER);
  textFont(customFont);
  textAlign(CENTER, CENTER);
  noStroke();

  cnv.mouseOver(() => {
    mouseInCanvas = true;
    noCursor();
  });
  cnv.mouseOut(() => {
    mouseInCanvas = false;
    cursor(ARROW);
  });

  // camera
  video = createCapture(VIDEO);
  video.size(1920, 1440);
  video.hide();

  faceMesh.detectStart(video, gotFaces);
}

function gotFaces(results) {
  faces = results;
}

// ===================== 音乐：首次交互后启动 =====================
function startMusicIfNeeded() {
  if (musicStarted) return;
  if (!bgm) return;

  try {
    bgm.setLoop(true);
    bgm.setVolume(0.6);
    bgm.play();
    musicStarted = true;
  } catch (e) {
    // ignore
  }
}

// ===================== fork 光标 =====================
function updateCursorMode() {
  if (mouseInCanvas) noCursor();
  else cursor(ARROW);
}

function drawForkCursor() {
  if (!forkImg) return;
  if (!mouseInCanvas) return;

  push();
  imageMode(CENTER);
  image(forkImg, mouseX + forkHotspotX, mouseY + forkHotspotY, forkSize, forkSize);
  pop();
}

// ===================== 摄像头底层绘制（镜像） =====================
function drawCameraBackground() {
  if (!video) return;

  push();
  imageMode(CORNER);
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, -150, width, height + 300);
  pop();
}

// ===================== 游戏初始化 =====================
function resetFacePlayers() {
  player1_pos = { row: 2, col: 2 };
  player2_pos = { row: 2, col: 7 };

  player1_prevYaw = 0;
  player2_prevYaw = 0;
  player1_prevLipY = 0;
  player2_prevLipY = 0;

  lastMoveTime1 = 0;
  lastMoveTime2 = 0;

  p1MouthOpen = false;
  p2MouthOpen = false;

  p1TrackX = null;
  p2TrackX = null;

  p1YawSm = 0; p2YawSm = 0;
  p1LipYSm = 0; p2LipYSm = 0;

  p1MouthState = false;
  p2MouthState = false;

  p1MouthXSm = null; p1MouthYSm = null;
  p2MouthXSm = null; p2MouthYSm = null;
}

function initializeGame() {
  gridPositions = [];
  applePositions = [];
  blueberryPositions = [];
  moneyPositions = [];
  boomPositions = [];
  explosions = [];

  appleScore = 0;
  blueberryScore = 0;

  appleLives = maxLives;
  blueberryLives = maxLives;

  gameOver = false;
  countdown = 30;
  gameStartTime = millis();
  lastSpawnTime = millis();

  resetFacePlayers();

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let x = gridOffsetX + j * cellWidth + cellWidth / 2;
      let y = gridOffsetY + i * cellHeight + cellHeight / 2;
      gridPositions.push({ x, y });
    }
  }

  gridPositions = shuffle(gridPositions);
  applePositions = gridPositions.slice(0, 12);
  blueberryPositions = gridPositions.slice(12, 24);

  let remain = gridPositions.slice(24);
  moneyPositions = remain.slice(0, floor(random(0, 6)));
  boomPositions = remain.slice(5, 5 + floor(random(0, 3)));
}

// ===================== 教学动效：启动/绘制/结束跳转 =====================
function startTutorialSequence() {
  tutorialStartTime = millis();
  currentPage = 3; // ✅ 教程页
}

function drawTutorial() {
  background(0);

  // 摄像头作为背景
  drawCameraBackground();

  if (tutorialStartTime === null) tutorialStartTime = millis();
  const t = millis() - tutorialStartTime;

  let overlay = null;

  // 1) step1.png 3s
  if (t < T_STEP1) {
    overlay = step1Img;
  }
  // 2) step2a/step2b：1s 一张轮流，共 6s
  else if (t < T_STEP1 + T_STEP2_TOTAL) {
    const tt = t - T_STEP1;
    const idx = floor(tt / STEP2_INTERVAL) % 2;
    overlay = (idx === 0) ? step2aImg : step2bImg;
  }
  // 3) step3：按模式分流（0.5s/张）
  else {
    const tt = t - (T_STEP1 + T_STEP2_TOTAL);

    if (gameMode === "normal") {
      if (tt < T_NORMAL_STEP3) {
        const idx = floor(tt / STEP3_INTERVAL) % normalStep3Imgs.length;
        overlay = normalStep3Imgs[idx];
      } else {
        // ✅ 教程结束：直接进入游戏
        tutorialStartTime = null;
        currentPage = 4;
        initializeGame();
        return;
      }
    } else {
      // crazy
      if (tt < T_CRAZY_STEP3) {
        const idx = floor(tt / STEP3_INTERVAL) % crazyStep3Imgs.length;
        overlay = crazyStep3Imgs[idx];
      } else {
        // ✅ 教程结束：直接进入游戏
        tutorialStartTime = null;
        currentPage = 4;
        initializeGame();
        return;
      }
    }
  }

  // PNG 透明叠加在摄像头上
  if (overlay) {
    imageMode(CENTER);
    image(overlay, width / 2, height / 2, width, height);
  }
}

// ===================== 身份分配：固定 P1/P2 =====================
function assignFacesToPlayers(rawFaces) {
  if (!rawFaces || rawFaces.length === 0) return { p1: null, p2: null };

  let det = rawFaces.slice(0, 2).filter(f => f && f.keypoints && f.keypoints[1]);
  if (det.length === 0) return { p1: null, p2: null };

  let fx = det.map(f => f.keypoints[1].x);

  if (p1TrackX === null && p2TrackX === null) {
    if (det.length === 1) {
      p1TrackX = fx[0];
      return { p1: det[0], p2: null };
    } else {
      let idx0 = fx[0] <= fx[1] ? 0 : 1;
      let idx1 = 1 - idx0;
      p1TrackX = fx[idx0];
      p2TrackX = fx[idx1];
      return { p1: det[idx0], p2: det[idx1] };
    }
  }

  if (det.length === 1) {
    let dToP1 = (p1TrackX === null) ? Infinity : abs(fx[0] - p1TrackX);
    let dToP2 = (p2TrackX === null) ? Infinity : abs(fx[0] - p2TrackX);

    if (dToP1 <= dToP2) {
      p1TrackX = fx[0];
      return { p1: det[0], p2: null };
    } else {
      p2TrackX = fx[0];
      return { p1: null, p2: det[0] };
    }
  } else {
    if (p1TrackX === null || p2TrackX === null) {
      let idx0 = fx[0] <= fx[1] ? 0 : 1;
      let idx1 = 1 - idx0;
      p1TrackX = fx[idx0];
      p2TrackX = fx[idx1];
      return { p1: det[idx0], p2: det[idx1] };
    }

    let costA = abs(fx[0] - p1TrackX) + abs(fx[1] - p2TrackX);
    let costB = abs(fx[0] - p2TrackX) + abs(fx[1] - p1TrackX);

    if (costA <= costB) {
      p1TrackX = fx[0];
      p2TrackX = fx[1];
      return { p1: det[0], p2: det[1] };
    } else {
      p1TrackX = fx[1];
      p2TrackX = fx[0];
      return { p1: det[1], p2: det[0] };
    }
  }
}

function computeMouthOpenWithHysteresis(prevState, upperLip, lowerLip, faceW) {
  let d = dist(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
  let ratio = faceW > 0 ? (d / faceW) : 0;

  const openRatio = 0.065;
  const closeRatio = 0.045;
  const openAbs = mouthThreshold;

  if (!prevState) {
    return (ratio > openRatio) || (d > openAbs);
  } else {
    return !((ratio < closeRatio) && (d < openAbs * 0.85));
  }
}

function applyFaceControl() {
  p1MouthOpen = false;
  p2MouthOpen = false;

  if (!faces || faces.length === 0) return;

  const assign = assignFacesToPlayers(faces);
  if (assign.p1) processOneFace(assign.p1, 1);
  if (assign.p2) processOneFace(assign.p2, 2);
}

function processOneFace(face, playerIndex) {
  let upperLip = face.keypoints[13];
  let lowerLip = face.keypoints[14];
  let nose = face.keypoints[1];
  let leftEar = face.keypoints[234];
  let rightEar = face.keypoints[454];

  if (!upperLip || !lowerLip || !nose || !leftEar || !rightEar) return;

  let faceW = dist(leftEar.x, leftEar.y, rightEar.x, rightEar.y);
  faceW = max(faceW, 1);

  let lipCenterX = (upperLip.x + lowerLip.x) / 2;
  let lipCenterY = (upperLip.y + lowerLip.y) / 2;

  let centerX = (leftEar.x + rightEar.x) / 2;

  let yawNorm = ((nose.x - centerX) / faceW) * 100.0;
  let lipYNorm = (lipCenterY / faceW) * 100.0;

  if (playerIndex === 1) {
    p1YawSm = lerp(p1YawSm, yawNorm, smoothAlpha);
    p1LipYSm = lerp(p1LipYSm, lipYNorm, smoothAlpha);

    p1MouthState = computeMouthOpenWithHysteresis(p1MouthState, upperLip, lowerLip, faceW);
    p1MouthOpen = p1MouthState;

    if (gameMode === "normal") {
      followMouthToGrid(lipCenterX, lipCenterY, 1);
    } else {
      handleMovement(p1YawSm, p1LipYSm, "player1", p1MouthOpen);
    }
  } else {
    p2YawSm = lerp(p2YawSm, yawNorm, smoothAlpha);
    p2LipYSm = lerp(p2LipYSm, lipYNorm, smoothAlpha);

    p2MouthState = computeMouthOpenWithHysteresis(p2MouthState, upperLip, lowerLip, faceW);
    p2MouthOpen = p2MouthState;

    if (gameMode === "normal") {
      followMouthToGrid(lipCenterX, lipCenterY, 2);
    } else {
      handleMovement(p2YawSm, p2LipYSm, "player2", p2MouthOpen);
    }
  }
}

function followMouthToGrid(mouthX, mouthY, playerIndex) {
  if (!video) return;

  let cx = map(mouthX, 0, video.width, 0, width);
  let cy = map(mouthY, 0, video.height, -150, height + 150);

  if (playerIndex === 1) {
    if (p1MouthXSm === null) {
      p1MouthXSm = cx; p1MouthYSm = cy;
    } else {
      p1MouthXSm = lerp(p1MouthXSm, cx, 0.45);
      p1MouthYSm = lerp(p1MouthYSm, cy, 0.45);
    }
    cx = p1MouthXSm; cy = p1MouthYSm;
  } else {
    if (p2MouthXSm === null) {
      p2MouthXSm = cx; p2MouthYSm = cy;
    } else {
      p2MouthXSm = lerp(p2MouthXSm, cx, 0.45);
      p2MouthYSm = lerp(p2MouthYSm, cy, 0.45);
    }
    cx = p2MouthXSm; cy = p2MouthYSm;
  }

  cx = constrain(cx, gridOffsetX + 1, gridOffsetX + gridWidth - 2);
  cy = constrain(cy, gridOffsetY + 1, gridOffsetY + gridHeight - 2);

  let col = floor((cx - gridOffsetX) / cellWidth);
  let row = floor((cy - gridOffsetY) / cellHeight);

  col = constrain(col, 0, cols - 1);
  row = constrain(row, 0, rows - 1);

  if (playerIndex === 1) {
    player1_pos.row = row;
    player1_pos.col = col;
  } else {
    player2_pos.row = row;
    player2_pos.col = col;
  }
}

function handleMovement(yaw, lipY, player, isMouthOpen) {
  let now = millis();
  let pos, lastTime, prevYaw, prevLipY;

  if (player === "player1") {
    pos = player1_pos;
    lastTime = lastMoveTime1;
    prevYaw = player1_prevYaw;
    prevLipY = player1_prevLipY;
  } else {
    pos = player2_pos;
    lastTime = lastMoveTime2;
    prevYaw = player2_prevYaw;
    prevLipY = player2_prevLipY;
  }

  let threshold = isMouthOpen ? motionSensitivityActive : motionSensitivity;

  let yawDiff = yaw - prevYaw;
  let lipYDiff = lipY - prevLipY;

  if (abs(yawDiff) < threshold * 0.35) yawDiff = 0;
  if (abs(lipYDiff) < threshold * 0.35) lipYDiff = 0;

  if (now - lastTime > moveCooldown) {
    if (lipYDiff < -threshold && pos.row > 0) {
      pos.row -= 1;
    } else if (lipYDiff > threshold && pos.row < rows - 1) {
      pos.row += 1;
    } else if (yawDiff > threshold && pos.col < cols - 1) {
      pos.col += 1;
    } else if (yawDiff < -threshold && pos.col > 0) {
      pos.col -= 1;
    }

    if (player === "player1") {
      lastMoveTime1 = now;
      player1_prevYaw = yaw;
      player1_prevLipY = lipY;
    } else {
      lastMoveTime2 = now;
      player2_prevYaw = yaw;
      player2_prevLipY = lipY;
    }
  }
}

function gridToXY(pos) {
  return {
    x: gridOffsetX + pos.col * cellWidth + cellWidth / 2,
    y: gridOffsetY + pos.row * cellHeight + cellHeight / 2
  };
}

function drawPlayers() {
  let p1 = gridToXY(player1_pos);
  let p2 = gridToXY(player2_pos);

  let img1 = p1MouthOpen ? player1_open : player1_close;
  let img2 = p2MouthOpen ? player2_open : player2_close;

  image(img1, p1.x, p1.y, 120, 120);
  image(img2, p2.x, p2.y, 120, 120);
}

// ===================== 主 draw =====================
function draw() {
  updateCursorMode();

  if (currentPage === 0) {
    image(startImg, width / 2, height / 2, width, height);
    drawForkCursor();
    return;
  }

  // ✅ 1：先选水果（page2）
  if (currentPage === 1) {
    drawPage2();
    drawForkCursor();
    return;
  }

  // ✅ 2：再选模式（page1）
  if (currentPage === 2) {
    drawPage1();
    drawForkCursor();
    return;
  }

  // ✅ 3：再过教程
  if (currentPage === 3) {
    drawTutorial();
    drawForkCursor();
    return;
  }

  // ================= 正式游戏（currentPage === 4）=================
  background(0);

  // 摄像头底层
  drawCameraBackground();

  // background 覆盖层
  image(bgImg, width / 2, height / 2, width, height);

  // 倒计时
  let elapsed = (millis() - gameStartTime) / 1000;
  countdown = max(0, 30 - floor(elapsed));

  if (countdown <= 0 || appleLives <= 0 || blueberryLives <= 0) {
    gameOver = true;
  }

  if (gameOver) {
    displayResultScreen();
    drawForkCursor();
    return;
  }

  applyFaceControl();

  let imgW = cellWidth * 0.8;
  let imgH = cellHeight * 0.7;
  let eatRadius = imgW / 2;

  let p1XY = gridToXY(player1_pos);
  let p2XY = gridToXY(player2_pos);

  for (let i = applePositions.length - 1; i >= 0; i--) {
    let pos = applePositions[i];

    if (p1MouthOpen && dist(p1XY.x, p1XY.y, pos.x, pos.y) < eatRadius) {
      explosions.push({ x: pos.x, y: pos.y, startTime: millis(), player: 1 });
      appleScore++;
      applePositions.splice(i, 1);
      continue;
    }
    image(appleImg, pos.x, pos.y, imgW, imgH);
  }

  for (let i = blueberryPositions.length - 1; i >= 0; i--) {
    let pos = blueberryPositions[i];

    if (p2MouthOpen && dist(p2XY.x, p2XY.y, pos.x, pos.y) < eatRadius) {
      explosions.push({ x: pos.x, y: pos.y, startTime: millis(), player: 2 });
      blueberryScore++;
      blueberryPositions.splice(i, 1);
      continue;
    }
    image(blueberryImg, pos.x, pos.y, imgW, imgH);
  }

  for (let i = moneyPositions.length - 1; i >= 0; i--) {
    let pos = moneyPositions[i];
    image(moneyImg, pos.x, pos.y, imgW, imgH);

    if (p1MouthOpen && dist(p1XY.x, p1XY.y, pos.x, pos.y) < eatRadius) {
      appleScore++;
      moneyPositions.splice(i, 3);
      continue;
    }
    if (p2MouthOpen && dist(p2XY.x, p2XY.y, pos.x, pos.y) < eatRadius) {
      blueberryScore++;
      moneyPositions.splice(i, 3);
      continue;
    }
  }

  for (let i = boomPositions.length - 1; i >= 0; i--) {
    let pos = boomPositions[i];
    image(boomImg, pos.x, pos.y, imgW, imgH);

    if (p1MouthOpen && dist(p1XY.x, p1XY.y, pos.x, pos.y) < eatRadius) {
      if (appleLives > 0) appleLives--;
      boomPositions.splice(i, 1);
      continue;
    }
    if (p2MouthOpen && dist(p2XY.x, p2XY.y, pos.x, pos.y) < eatRadius) {
      if (blueberryLives > 0) blueberryLives--;
      boomPositions.splice(i, 1);
      continue;
    }
  }

  playExplosions(imgW, imgH);
  drawScoresAndLives();

  fill(255, 255, 255);
  textSize(60);
  text(`00:00:${countdown}`, width / 2, 80);

  drawPlayers();
  drawForkCursor();

  if (millis() - lastSpawnTime >= 5000) {
    autoSpawn();
    lastSpawnTime = millis();
  }
}

// ===================== 自动生成物体 =====================
function autoSpawn() {
  let freeCells = [...gridPositions];
  let occupied = [...applePositions, ...blueberryPositions, ...moneyPositions, ...boomPositions];
  freeCells = freeCells.filter(c => !occupied.some(p => p.x === c.x && p.y === c.y));
  freeCells = shuffle(freeCells);

  function take(n) {
    let arr = freeCells.slice(0, n);
    freeCells = freeCells.slice(n);
    return arr;
  }

  applePositions.push(...take(3));
  blueberryPositions.push(...take(3));
  moneyPositions.push(...take(floor(random(0, 3))));
  boomPositions.push(...take(floor(random(0, 2))));
}

// ===================== 爆炸动画 =====================
function playExplosions(imgW, imgH) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    let ex = explosions[i];
    let elapsed = millis() - ex.startTime;

    if (elapsed > 500) {
      explosions.splice(i, 1);
      continue;
    }

    let index = floor(map(elapsed, 0, 500, 0, 4));
    index = constrain(index, 0, 3);

    let fruitName = (ex.player === 2) ? selectedFruit2 : selectedFruit1;
    let tintColor = getFruitTintColor(fruitName);

    push();
    tint(tintColor);
    image(explosionImgs[index], ex.x, ex.y, imgW, imgH);
    pop();
  }
}

// ===================== UI：分数与生命 =====================
function drawScoresAndLives() {
  fill(255, 255, 255);
  textSize(60);
  text(`P1 ${appleScore}`, gridOffsetX - 70, gridOffsetY - 135);
  text(`P2 ${blueberryScore}`, gridOffsetX + gridWidth + 75, gridOffsetY - 135);

  let heartSize = 50;

  for (let i = 0; i < maxLives; i++) {
    let xLeft = width * 0.18 + i * (heartSize + 10);
    let xRight = width * 0.82 - i * (heartSize + 10);
    let y = gridOffsetY - 130;

    image(i < appleLives ? heartOnImg : heartOffImg, xLeft, y, heartSize, heartSize);
    image(i < blueberryLives ? heartOnImg : heartOffImg, xRight, y, heartSize, heartSize);
  }
}

// ===================== 结束界面（return 按钮） =====================
function displayResultScreen() {
  fill(255, 255, 255, 120);
  rectMode(CENTER);
  rect(width / 2, height / 2 + 45, 900, 640, 40);

  fill(255, 0, 0);
  textSize(90);
  text(`P1：${appleScore}`, width / 2, height / 2 - 140);

  fill(0, 120, 255);
  textSize(90);
  text(`P2：${blueberryScore}`, width / 2, height / 2 - 20);

  const btnW = 220, btnH = 90;
  const againX = width / 2;
  const againY = height / 2 + 150;
  image(againImg, againX, againY, btnW, btnH);

  const returnX = width / 2;
  const returnY = againY + btnH + 20;
  image(returnImg, returnX, returnY, btnW, btnH);
}

// ===================== page1/page2 =====================
// page1：模式选择（normal/crazy）
function drawPage1() {
  let hoverNormal = mouseX >= 500 && mouseX <= 650 && mouseY >= 500 && mouseY <= 700;
  let hoverCrazy  = mouseX >= 800 && mouseX <= 950 && mouseY >= 500 && mouseY <= 700;

  if (hoverNormal) image(page1_1Img, width / 2, height / 2, width, height);
  else if (hoverCrazy) image(page1_2Img, width / 2, height / 2, width, height);
  else image(page1Img, width / 2, height / 2, width, height);
}

// page2：水果选择（P1/P2）
function drawPage2() {
  image(page2Img, width / 2, height / 2, width, height);

  const tagSize = 60 * 0.8;
  const tagOffset = 60 * 0.8;

  for (let f of page2Fruits) {
    let hovering = false;
    if (page2ClickCount < 2) {
      hovering =
        mouseX > f.x - fruitBoxSize / 2 &&
        mouseX < f.x + fruitBoxSize / 2 &&
        mouseY > f.y - fruitBoxSize / 2 &&
        mouseY < f.y + fruitBoxSize / 2;
    }

    const selected = page2Selections.find(s => s.x === f.x && s.y === f.y);

    image(
      selected ? fruitHoverImgs[f.name] : (hovering ? fruitHoverImgs[f.name] : fruitImgs[f.name]),
      f.x, f.y, fruitBoxSize, fruitBoxSize
    );

    if (selected) {
      image(
        selected.player === 1 ? p1TagImg : p2TagImg,
        f.x - tagOffset - 5,
        f.y - tagOffset - 25,
        tagSize * 1.6,
        tagSize * 0.9
      );
    }
  }

  // ✅ 选完两种水果后：不直接开游戏，而是进入“选模式”
  if (page2FinishTime && millis() - page2FinishTime > 2000) {
    selectedFruit1 = page2Selections[0].fruit;
    selectedFruit2 = page2Selections[1].fruit;

    appleImg = gameFruitImgs[selectedFruit1];
    blueberryImg = gameFruitImgs[selectedFruit2];

    // ✅ 进入模式选择页
    currentPage = 2;

    // 防止重复触发
    page2FinishTime = null;
  }
}

// ===================== 点击逻辑 =====================
function mousePressed() {
  // ✅ 首次交互启动音乐（全程播放）
  startMusicIfNeeded();

  // start页 -> 先进入水果选择
  if (currentPage === 0) {
    if (mouseX >= 830 && mouseX <= 1090 && mouseY >= 852 && mouseY <= 952) {
      // 进入水果选择前清一次状态
      page2Selections = [];
      page2ClickCount = 0;
      page2FinishTime = null;

      tutorialStartTime = null;
      currentPage = 1; // ✅ fruit
    }
    return;
  }

  // ✅ currentPage=1：水果选择
  if (currentPage === 1) {
    if (page2ClickCount >= 2) return;

    for (let f of page2Fruits) {
      if (
        mouseX > f.x - fruitBoxSize / 2 &&
        mouseX < f.x + fruitBoxSize / 2 &&
        mouseY > f.y - fruitBoxSize / 2 &&
        mouseY < f.y + fruitBoxSize / 2
      ) {
        if (page2ClickCount < 2 && !page2Selections.find(s => s.x === f.x && s.y === f.y)) {
          page2ClickCount++;
          page2Selections.push({
            fruit: f.name,
            x: f.x,
            y: f.y,
            player: page2ClickCount
          });
          if (page2ClickCount === 2) page2FinishTime = millis();
        }
        break;
      }
    }
    return;
  }

  // ✅ currentPage=2：模式选择（选完模式 -> 进教程）
  if (currentPage === 2) {
    // 普通模式
    if ((mouseX >= 500 && mouseX <= 650) && (mouseY >= 500 && mouseY <= 700)) {
      gameMode = "normal";
      startTutorialSequence();
      return;
    }

    // 困难/疯狂模式
    if ((mouseX >= 800 && mouseX <= 950) && (mouseY >= 500 && mouseY <= 700)) {
      gameMode = "crazy";
      startTutorialSequence();
      return;
    }
    return;
  }

  // 教学动效页：无需点击
  if (currentPage === 3) return;

  // 游戏结束按钮
  if (currentPage === 4 && gameOver) {
    const btnW = 220, btnH = 90;

    const againX = width / 2;
    const againY = height / 2 + 150;

    const returnX = width / 2;
    const returnY = againY + btnH + 20;

    // again：直接重开（不回教程、不重新选）
    if (
      mouseX >= againX - btnW / 2 && mouseX <= againX + btnW / 2 &&
      mouseY >= againY - btnH / 2 && mouseY <= againY + btnH / 2
    ) {
      gameOver = false;
      initializeGame();
      return;
    }

    // return：回到“水果选择”（符合新流程：先水果再模式）
    if (
      mouseX >= returnX - btnW / 2 && mouseX <= returnX + btnW / 2 &&
      mouseY >= returnY - btnH / 2 && mouseY <= returnY + btnH / 2
    ) {
      gameOver = false;

      // 回到水果选择前清理状态
      page2Selections = [];
      page2ClickCount = 0;
      page2FinishTime = null;

      tutorialStartTime = null;

      currentPage = 1; // ✅ fruit
      return;
    }
  }
}
