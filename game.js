// game.js

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("scoreDisplay");
let score = 0;
let gameOver = false;
let allowRestart = false;

const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const pipeSpeed = isMobile ? 1.0 : 2;
const pipeSpacing = isMobile ? 200 : 120;

// Load images
const birdImg = new Image();
const pipeImg = new Image();
const bgImg = new Image();

let imagesLoaded = 0;
const totalImages = 3;

function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    gameLoop();
  }
}

birdImg.src = "images/bird.png";
pipeImg.src = "images/pipe.png";
bgImg.src = "images/background.png";

birdImg.onload = onImageLoad;
pipeImg.onload = onImageLoad;
bgImg.onload = onImageLoad;

const bird = {
  width: 40,
  height: 40,
  x: 80,
  y: 200,
  velocity: 0,
  gravity: isMobile ? 0.18 : 0.5,
  jumpStrength: isMobile ? -3.8 : -6,
  maxVelocity: 10,
  angle: 0
};

const pipes = [];
const pipeWidth = 60;
const pipeTileHeight = 60;
const pipeGap = 150;
let frameCount = 0;
let bgX = 0;

function createPipe() {
  const minTopY = 50;
  const maxTopY = canvas.height - pipeGap - 50;
  const topY = Math.floor(Math.random() * (maxTopY - minTopY + 1)) + minTopY;

  pipes.push({
    x: canvas.width,
    topY,
    bottomY: topY + pipeGap,
    passed: false
  });
}

function updatePipes() {
  pipes.forEach(pipe => {
    pipe.x -= pipeSpeed;
  });

  if (pipes.length && pipes[0].x + pipeWidth < 0) {
    pipes.shift();
  }

  if (frameCount > pipeSpacing && frameCount % pipeSpacing === 0) {
    createPipe();
  }

  pipes.forEach(pipe => {
    if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
      pipe.passed = true;
      score++;
      scoreDisplay.textContent = `Score: ${score}`;
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

  bird.angle = bird.velocity > 0
    ? Math.min(bird.angle + 0.04, maxDown)
    : maxUp;

  if (bird.y + bird.height > canvas.height) {
    bird.y = canvas.height - bird.height;
    bird.velocity = 0;
  }
  if (bird.y < 0) {
    bird.y = 0;
    bird.velocity = 0;
  }
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

function drawFlatlined() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ff3366";
  ctx.font = "bold 28px 'Segoe UI'";
  ctx.fillText("FLATLINED", canvas.width / 2 - 80, 240);
  ctx.font = "18px 'Segoe UI'";
  ctx.fillStyle = "#fff";
  ctx.fillText(`Score: ${score}`, canvas.width / 2 - 30, 280);

  ctx.fillStyle = "#fff";
  ctx.fillRect(140, 310, 120, 40);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(140, 310, 120, 40);
  ctx.fillStyle = "#000";
  ctx.font = "16px 'Segoe UI'";
  ctx.fillText("REBOOT", 170, 336);

  allowRestart = true;
}

function flap() {
  if (gameOver && allowRestart) {
    location.reload();
  } else if (!gameOver) {
    bird.velocity = bird.jumpStrength;
    bird.angle = -30 * (Math.PI / 180);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") flap();
});

if (isMobile) {
  window.addEventListener("touchstart", flap);
} else {
  canvas.addEventListener("click", flap);
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
