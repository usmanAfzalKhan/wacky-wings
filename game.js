const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Only scale if canvas has client dimensions
function scaleCanvas() {
  const scale = window.devicePixelRatio || 1;

  // Set display size (CSS pixels)
  const cssWidth = canvas.offsetWidth;
  const cssHeight = canvas.offsetHeight;

  if (cssWidth === 0 || cssHeight === 0) return; // Prevent scaling if layout not ready

  canvas.width = cssWidth * scale;
  canvas.height = cssHeight * scale;

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

window.addEventListener("load", scaleCanvas);
window.addEventListener("resize", scaleCanvas);



const scoreDisplay = document.getElementById("scoreDisplay");
let score = 0;
let gameOver = false;
let allowRestart = false;
let gameStarted = false;
let soundOn = true;
let audioUnlocked = false;
let awaitingFirstFlap = false;
let justFlapped = false; // Prevent double taps on iOS

const userAgent = navigator.userAgent || "";
const isiOS = /iPhone|iPad|iPod/.test(userAgent);
const isAndroid = /Android/.test(userAgent);
const isMobile = navigator.userAgentData?.mobile || isiOS || isAndroid;

const pipeSpeed = isMobile ? 1.3 : 3.3;
const pipeSpacing = isMobile ? 125 : 90;
const pipeGap = isMobile ? 200 : 165;

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
  width: isMobile ? 30 : 40,
  height: isMobile ? 30 : 40,
  x: 80,
  y: 200,
  velocity: 0,
  gravity: isMobile ? 0.21 : 0.5,
  jumpStrength: isMobile ? -2.95 : -6.2,
  maxVelocity: 8,
  angle: 0
};

const pipes = [];
const pipeWidth = 60;
const pipeTileHeight = 60;
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

function flap() {
  if (!gameStarted || awaitingFirstFlap) {
    awaitingFirstFlap = false;
    return;
  }
  if (gameOver && allowRestart) {
    restartGame();
  } else if (!gameOver) {
    bird.velocity = bird.jumpStrength;
    bird.angle = -30 * (Math.PI / 180);
    if (soundOn) {
      flapSound.currentTime = 0;
      flapSound.play();
    }
  }
}

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (justFlapped) return;
  justFlapped = true;
  flap();
  setTimeout(() => justFlapped = false, 120);
});

canvas.addEventListener("click", (e) => {
  if (justFlapped) return;
  justFlapped = true;
  flap();
  setTimeout(() => justFlapped = false, 120);
});

document.addEventListener("keydown", (e) => {
  unlockAudio();
  if (!gameStarted && e.code === "Space") {
    gameStarted = true;
    awaitingFirstFlap = true;
    gameLoop();
  } else if (e.code === "Space") flap();
});

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
      if (scoreDisplay.textContent !== `Score: ${score}`) {
        scoreDisplay.textContent = `Score: ${score}`;
      }
      if (soundOn) {
        pointSound.currentTime = 0;
        pointSound.play();
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
    deadSound.currentTime = 0;
    deadSound.play();
  }
  allowRestart = true;
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

bgImg.onload = () => drawStartMenu();
