// === Wacky Wings FINAL FIX: UI cleanup, iOS optimized ===

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

canvas.style.width = "400px";
canvas.style.height = "600px";
const scale = window.devicePixelRatio || 1;
canvas.width = 400 * scale;
canvas.height = 600 * scale;
ctx.setTransform(scale, 0, 0, scale, 0, 0);

// === REMAINING VARIABLES ===
let scoreDisplay = document.getElementById("scoreDisplay");
if (!scoreDisplay) {
  scoreDisplay = document.createElement("div");
  scoreDisplay.id = "scoreDisplay";
  scoreDisplay.style.marginTop = "60px";
  scoreDisplay.style.fontSize = "20px";
  scoreDisplay.style.fontWeight = "bold";
  scoreDisplay.style.color = "black";
  scoreDisplay.style.backgroundColor = "rgba(255,255,255,0.8)";
  scoreDisplay.style.padding = "6px 10px";
  scoreDisplay.style.borderRadius = "8px";
  scoreDisplay.style.display = "inline-block";
  scoreDisplay.textContent = "Score: 0";
  document.body.appendChild(scoreDisplay);
}

// === SOUND TOGGLE BUTTON ALIGNED RIGHT OF SCORE ===
let soundOn = true;
const soundBox = document.createElement("div");
soundBox.id = "soundToggleBox";
soundBox.style.display = "inline-block";
soundBox.style.marginLeft = "10px";
soundBox.style.backgroundColor = "#101020";
soundBox.style.border = "2px solid #00ffff";
soundBox.style.padding = "6px 12px";
soundBox.style.borderRadius = "10px";
soundBox.style.color = "#00ffff";
soundBox.style.fontWeight = "bold";
soundBox.style.fontFamily = "Segoe UI, sans-serif";
soundBox.style.userSelect = "none";
soundBox.style.cursor = "pointer";
soundBox.style.verticalAlign = "middle";
soundBox.textContent = `Sound: ${soundOn ? "ON" : "OFF"}`;
scoreDisplay.after(soundBox);

soundBox.addEventListener("click", () => {
  soundOn = !soundOn;
  soundBox.textContent = `Sound: ${soundOn ? "ON" : "OFF"}`;
});

let score = 0;
let gameOver = false;
let allowRestart = false;
let gameStarted = false;
let audioUnlocked = false;
let awaitingFirstFlap = false;
let justFlapped = false;

const userAgent = navigator.userAgent || "";
const isiOS = /iPhone|iPad|iPod/.test(userAgent);
const isAndroid = /Android/.test(userAgent);
const isMobile = /Mobi|Android|iPhone|iPad|iPod/.test(userAgent);

const pipeSpeed = isMobile ? 1.2 : 3.3;
const pipeSpacing = isMobile ? 150 : 90;
const pipeGap = isMobile ? 240 : 165;
const jumpStrength = isAndroid ? -3.8 : (isMobile ? -3.3 : -6.2);

const birdImg = new Image();
birdImg.src = "images/bird.png";

const pipeImg = new Image();
pipeImg.src = "images/pipe.png";

const bgImg = new Image();
bgImg.src = "images/background.png";

const flapSound = !isMobile ? new Audio("audio/flap.mp3") : null;
if (flapSound) {
  flapSound.volume = 0.35;
  flapSound.playsInline = true;
  flapSound.crossOrigin = "anonymous";
}

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
  gravity: isMobile ? 0.22 : 0.5,
  jumpStrength,
  maxVelocity: 8,
  angle: 0
};

// === REMAINING CODE UNCHANGED ===


const pipes = [];
const pipeWidth = 60;
const pipeTileHeight = 60;
let frameCount = 0;
let bgX = 0;

function unlockAudio() {
  if (!audioUnlocked) {
    [deadSound, pointSound, flapSound].forEach(sound => {
      if (sound) {
        try {
          sound.play().then(() => sound.pause());
        } catch (_) {}
      }
    });
    audioUnlocked = true;
  }
}

function flap() {
  if (!gameStarted || awaitingFirstFlap) {
    awaitingFirstFlap = false;
    return;
  }
  if (gameOver && allowRestart) restartGame();
  else if (!gameOver) {
    bird.velocity = bird.jumpStrength * 1.1;
    bird.angle = -30 * (Math.PI / 180);
    if (soundOn && flapSound) {
      flapSound.currentTime = 0;
      flapSound.play();
    }
  }
}

function drawBackground() {
  bgX -= pipeSpeed / 2;
  if (bgX <= -canvas.width / scale) bgX = 0;
  ctx.drawImage(bgImg, bgX, 0, canvas.width / scale, canvas.height / scale);
  ctx.drawImage(bgImg, bgX + canvas.width / scale, 0, canvas.width / scale, canvas.height / scale);
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
  ctx.rotate(bird.angle);
  ctx.drawImage(birdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
  ctx.restore();
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

function drawStartMenu() {
  drawBackground();
  drawBird();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);
  ctx.font = "16px 'Segoe UI'";
  const message = isMobile ? "Tap to flap" : "Press spacebar or click to start";
  ctx.fillStyle = "#fff";
  ctx.fillText(message, canvas.width / scale / 2 - ctx.measureText(message).width / 2, 230);
  drawCyberButton(140, 250, 120, 40, "START GAME");
}

function createPipe() {
  const minTopY = 50;
  const maxTopY = canvas.height / scale - pipeGap - 50;
  const topY = Math.floor(Math.random() * (maxTopY - minTopY + 1)) + minTopY;
  pipes.push({ x: canvas.width / scale, topY, bottomY: topY + pipeGap, passed: false });
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

function drawPipes() {
  pipes.forEach(pipe => {
    for (let y = 0; y < pipe.topY; y += pipeTileHeight) {
      ctx.save();
      ctx.translate(pipe.x, y + pipeTileHeight);
      ctx.scale(1, -1);
      ctx.drawImage(pipeImg, 0, 0, pipeWidth, pipeTileHeight);
      ctx.restore();
    }
    for (let y = pipe.bottomY; y < canvas.height / scale; y += pipeTileHeight) {
      ctx.drawImage(pipeImg, pipe.x, y, pipeWidth, pipeTileHeight);
    }
  });
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
  return bird.y <= 0 || bird.y + bird.height >= canvas.height / scale;
}

function drawFlatlined() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ff3366";
  ctx.font = "bold 28px 'Segoe UI'";
  ctx.fillText("FLATLINED", 120, 240);
  ctx.font = "18px 'Segoe UI'";
  ctx.fillStyle = "#fff";
  ctx.fillText(`Score: ${score}`, 170, 280);
  drawCyberButton(140, 310, 120, 40, "REBOOT");
  allowRestart = true;
  if (soundOn) {
    const dead = deadSound.cloneNode(true);
    dead.volume = 0.25;
    dead.play();
  }
}

function updateBird() {
  bird.velocity += bird.gravity;
  bird.velocity = Math.min(bird.velocity, bird.maxVelocity);
  bird.y += bird.velocity;
  const maxDown = 60 * Math.PI / 180;
  const maxUp = -30 * Math.PI / 180;
  bird.angle = bird.velocity > 0 ? Math.min(bird.angle + 0.04, maxDown) : maxUp;
  if (bird.y + bird.height >= canvas.height / scale) {
    gameOver = true;
    drawFlatlined();
  }
  if (bird.y < 0) bird.y = 0;
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
  updateBird();
  updatePipes();
  drawPipes();
  drawBird();
  if (!gameOver && checkCollision()) {
    gameOver = true;
    drawFlatlined();
    return;
  }
  frameCount++;
  if (!gameOver) requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", (e) => {
  unlockAudio();
  if (e.code === "Space") {
    if (!gameStarted) {
      gameStarted = true;
      awaitingFirstFlap = false;
      gameLoop();
    } else {
      flap();
    }
  }
});

canvas.addEventListener("mousedown", (e) => {
  unlockAudio();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (!gameStarted && x >= 140 && x <= 260 && y >= 250 && y <= 290) {
    gameStarted = true;
    awaitingFirstFlap = false;
    gameLoop();
  } else if (gameOver && allowRestart && x >= 140 && x <= 260 && y >= 310 && y <= 350) {
    restartGame();
  } else {
    flap();
  }
});

canvas.addEventListener("touchstart", (e) => {
  unlockAudio();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  if (!gameStarted) {
    if (x >= 140 && x <= 260 && y >= 250 && y <= 290) {
      gameStarted = true;
      awaitingFirstFlap = false;
      gameLoop();
    }
  } else if (gameOver && allowRestart && x >= 140 && x <= 260 && y >= 310 && y <= 350) {
    restartGame();
  } else {
    flap();
  }
});

bgImg.onload = () => drawStartMenu();
