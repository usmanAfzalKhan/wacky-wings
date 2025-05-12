// game.js

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("scoreDisplay");
let score = 0;
let gameOver = false;
let allowRestart = false;
let gameStarted = false;
let soundOn = true;
let audioUnlocked = false;
let awaitingFirstFlap = false;

const userAgent = navigator.userAgent || "";
const isiOS = /iPhone|iPad|iPod/.test(userAgent);
const isAndroid = /Android/.test(userAgent);
const isMobile = navigator.userAgentData?.mobile || isiOS || isAndroid;

const pipeSpeed = isMobile ? 2.8 : 3.3;
const pipeSpacing = isMobile ? 70 : 90;

const birdImg = new Image();
birdImg.src = "images/bird.png";

const pipeImg = new Image();
pipeImg.src = "images/pipe.png";

const bgImg = new Image();
bgImg.src = "images/background.png";

const flapSound = new Audio("audio/flap.mp3");
flapSound.volume = 0.35;
flapSound.playsInline = true;
flapSound.crossOrigin = "anonymous";

const deadSound = new Audio("audio/dead.mp3");
deadSound.volume = 0.25;
deadSound.playsInline = true;
deadSound.crossOrigin = "anonymous";

const pointSound = new Audio("audio/point.mp3");
pointSound.volume = 0.35;
pointSound.playsInline = true;
pointSound.crossOrigin = "anonymous";

const bird = {
  width: isMobile ? 26 : 40,
  height: isMobile ? 26 : 40,
  x: 80,
  y: 200,
  velocity: 0,
  gravity: isMobile ? 0.26 : 0.5,
  jumpStrength: isMobile ? -2.7 : -6.2,
  maxVelocity: 10,
  angle: 0
};

const pipes = [];
const pipeWidth = 60;
const pipeTileHeight = 60;
const pipeGap = 165;
let frameCount = 0;
let bgX = 0;

function unlockAudio() {
  if (!audioUnlocked) {
    [flapSound, deadSound, pointSound].forEach(sound => {
      try {
        sound.play().then(() => sound.pause());
      } catch (_) {}
    });
    audioUnlocked = true;
  }
}

function createPipe() {
  const minTopY = 50;
  const maxTopY = canvas.height - pipeGap - 50;
  const topY = Math.floor(Math.random() * (maxTopY - minTopY + 1)) + minTopY;
  pipes.push({ x: canvas.width, topY, bottomY: topY + pipeGap, passed: false });
}

function updatePipes() {
  pipes.forEach(pipe => pipe.x -= pipeSpeed);
  if (pipes.length && pipes[0].x + pipeWidth < 0) pipes.shift();
  if ((frameCount > 0 && frameCount % pipeSpacing === 0) || frameCount === 1) createPipe();
  pipes.forEach(pipe => {
    if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
      pipe.passed = true;
      score++;
      scoreDisplay.textContent = `Score: ${score}`;
      if (soundOn) {
        const point = pointSound.cloneNode(true);
        point.volume = 0.35;
        point.play();
      }
    }
  });
}

function drawBackground() {
  bgX -= pipeSpeed / 2;
  if (bgX <= -canvas.width) bgX = 0;
  ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);
}

function drawPipes() {
  pipes.forEach(pipe => {
    for (let y = 0; y < pipe.topY; y += pipeTileHeight) {
      ctx.save();
      ctx.translate(pipe.x, y + pipeTileHeight);
      ctx.scale(1, -1);
      ctx.drawImage(pipeImg, 0, 0, pipeWidth, pipeTileHeight);
      ctx.restore();
    }
    for (let y = pipe.bottomY; y < canvas.height; y += pipeTileHeight) {
      ctx.drawImage(pipeImg, pipe.x, y, pipeWidth, pipeTileHeight);
    }
  });
}

function updateBird() {
  bird.velocity += bird.gravity;
  bird.velocity = Math.min(bird.velocity, bird.maxVelocity);
  bird.y += bird.velocity;
  const maxDown = 60 * Math.PI / 180;
  const maxUp = -30 * Math.PI / 180;
  bird.angle = bird.velocity > 0 ? Math.min(bird.angle + 0.04, maxDown) : maxUp;
  if (bird.y + bird.height > canvas.height) bird.y = canvas.height - bird.height;
  if (bird.y < 0) bird.y = 0;
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
  ctx.rotate(bird.angle);
  ctx.drawImage(birdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
  ctx.restore();
}

function checkCollision() {
  for (const pipe of pipes) {
    const birdRight = bird.x + bird.width;
    const birdBottom = bird.y + bird.height;
    const withinPipeX = birdRight > pipe.x && bird.x < pipe.x + pipeWidth;
    const hitsTop = bird.y < pipe.topY;
    const hitsBottom = birdBottom > pipe.bottomY;
    if (withinPipeX && (hitsTop || hitsBottom)) return true;
  }
  return bird.y <= 0 || bird.y + bird.height >= canvas.height;
}

function drawCyberButton(x, y, w, h, label) {
  ctx.fillStyle = "#00ffff";
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillRect(x, y, w, h);
  ctx.font = "bold 14px 'Segoe UI'";
  ctx.fillStyle = "#000";
  ctx.fillText(label, x + w / 2 - ctx.measureText(label).width / 2, y + h / 2 + 5);
}

function drawFlatlined() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ff3366";
  ctx.font = "bold 28px 'Segoe UI'";
  ctx.fillText("FLATLINED", canvas.width / 2 - 80, 240);
  ctx.font = "18px 'Segoe UI'";
  ctx.fillStyle = "#fff";
  ctx.fillText(`Score: ${score}`, canvas.width / 2 - 30, 280);
  drawCyberButton(140, 310, 120, 40, "REBOOT");
  drawCyberButton(canvas.width - 110, 10, 100, 30, "Sound: " + (soundOn ? "ON" : "OFF"));
  if (soundOn) {
    const dead = deadSound.cloneNode(true);
    dead.volume = 0.25;
    dead.play();
  }
  allowRestart = true;
}

function flap() {
  if (!gameStarted || awaitingFirstFlap) {
    awaitingFirstFlap = false;
    return;
  }
  if (gameOver && allowRestart) restartGame();
  else if (!gameOver) {
    bird.velocity = bird.jumpStrength;
    bird.angle = -30 * (Math.PI / 180);
    if (soundOn) {
      const flap = flapSound.cloneNode(true);
      flap.volume = 0.35;
      flap.play();
    }
  }
}

function restartGame() {
  score = 0;
  gameOver = false;
  allowRestart = false;
  pipes.length = 0;
  bird.y = 200;
  bird.velocity = 0;
  bird.angle = 0;
  frameCount = 0;
  scoreDisplay.textContent = "Score: 0";
  gameLoop();
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  updatePipes();
  drawPipes();
  updateBird();
  drawBird();
  if (!gameOver && checkCollision()) {
    gameOver = true;
    drawFlatlined();
    return;
  }
  if (!gameOver) {
    frameCount++;
    requestAnimationFrame(gameLoop);
  }
}

function drawStartMenu() {
  drawBackground();
  drawBird();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "16px 'Segoe UI'";
  const message = isMobile ? "Tap to flap" : "Press spacebar to flap";
  ctx.fillStyle = "#fff";
  ctx.fillText(message, canvas.width / 2 - ctx.measureText(message).width / 2, 230);
  drawCyberButton(140, 250, 120, 40, "START GAME");
  drawCyberButton(canvas.width - 110, 10, 100, 30, "Sound: " + (soundOn ? "ON" : "OFF"));
}

function handleStartMenuClick(x, y) {
  if (x >= 140 && x <= 260 && y >= 250 && y <= 290) {
    gameStarted = true;
    awaitingFirstFlap = true;
    gameLoop();
  } else if (x >= canvas.width - 110 && x <= canvas.width - 10 && y >= 10 && y <= 40) {
    soundOn = !soundOn;
    if (!gameStarted) drawStartMenu();
    else if (gameOver) drawFlatlined();
  }
}

canvas.addEventListener("click", (e) => {
  unlockAudio();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (!gameStarted) handleStartMenuClick(x, y);
  else if (gameOver && allowRestart && x >= 140 && x <= 260 && y >= 310 && y <= 350) restartGame();
  else flap();
});

canvas.addEventListener("touchstart", (e) => {
  unlockAudio();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  if (!gameStarted) handleStartMenuClick(x, y);
  else if (gameOver && allowRestart && x >= 140 && x <= 260 && y >= 310 && y <= 350) restartGame();
  else flap();
});

document.addEventListener("keydown", (e) => {
  unlockAudio();
  if (!gameStarted && e.code === "Space") {
    gameStarted = true;
    awaitingFirstFlap = true;
    gameLoop();
  } else if (e.code === "Space") flap();
});

bgImg.onload = () => drawStartMenu();
