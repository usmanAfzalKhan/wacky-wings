// === Wacky Wings – iOS Final Performance Version (Canvas Score, No DOM Lag) ===

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJJ8FL79BXg4qA1XevOeD3Qqj_q87lN-o",
  authDomain: "wacky-wings.firebaseapp.com",
  projectId: "wacky-wings",
  storageBucket: "wacky-wings.appspot.com",
  messagingSenderId: "86787566584",
  appId: "1:86787566584:web:a4e421c1259763d061c40d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
canvas.width = 320;
canvas.height = 480;
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.imageSmoothingEnabled = false;

let soundOn = true;
const pointSound = new Audio("audio/point.mp3");
pointSound.volume = 0.35;
pointSound.playsInline = true;
pointSound.crossOrigin = "anonymous";

let bgLoaded = false;
const bgImg = new Image();
bgImg.src = "images/background.webp";
bgImg.onload = () => { bgLoaded = true; drawStartMenu(); };
bgImg.onerror = () => {
  bgImg.src = "images/background.png";
  bgImg.onload = () => { bgLoaded = true; drawStartMenu(); };
};

const birdImg = new Image();
birdImg.src = "images/bird.png";

const pipeImg = new Image();
pipeImg.src = "images/pipe.png";

let score = 0;
let gameOver = false;
let allowRestart = false;
let gameStarted = false;
let audioUnlocked = false;
let awaitingFirstFlap = false;
let tapCooldown = false;
let intervalId = null;

const pipeSpeed = 1.75;
const pipeSpacing = 145;
const pipeGap = 215;
const jumpStrength = -4.8;

const bird = {
  width: 40,
  height: 40,
  x: 80,
  y: 200,
  velocity: 0,
  gravity: 0.18,
  jumpStrength,
  maxVelocity: 6.3,
  angle: 0
};

const pipes = [];
const pipeWidth = 60;
const pipeTileHeight = 60;
let frameCount = 0;
let bgX = 0;

function unlockAudio() {
  if (!audioUnlocked) {
    try { pointSound.play().then(() => pointSound.pause()); } catch (_) {}
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
    bird.velocity = bird.jumpStrength;
    bird.angle = -30 * Math.PI / 180;
  }
}

function drawBackground() {
  if (!bgLoaded) return;
  bgX -= pipeSpeed / 2.3;
  if (bgX <= -canvas.width) bgX = 0;
  ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);
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

function drawCanvasScore() {
  ctx.font = "bold 20px 'Segoe UI'";
  ctx.fillStyle = "white";
  ctx.fillText(`Score: ${score}`, 12, 30);
}

function drawStartMenu() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawBird();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "16px 'Segoe UI'";
  ctx.fillText("Tap to flap", canvas.width / 2 - 50, 230);
  drawCyberButton(100, 250, 120, 40, "START GAME");
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
    for (let y = pipe.bottomY; y < canvas.height; y += pipeTileHeight) {
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
  return bird.y <= 0 || bird.y + bird.height >= canvas.height;
}

function drawFlatlined() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ff3366";
  ctx.font = "bold 28px 'Segoe UI'";
  ctx.fillText("FLATLINED", 90, 240);
  ctx.font = "18px 'Segoe UI'";
  ctx.fillStyle = "#fff";
  ctx.fillText(`Score: ${score}`, 120, 280);
  allowRestart = true;
}

function updateBird() {
  bird.velocity += bird.gravity;
  bird.velocity = Math.min(bird.velocity, bird.maxVelocity);
  bird.y += bird.velocity;
  bird.angle = bird.velocity > 0 ? Math.min(bird.angle + 0.04, Math.PI / 3) : -Math.PI / 6;
  if (bird.y + bird.height >= canvas.height) {
    gameOver = true;
    drawFlatlined();
    clearInterval(intervalId);
  }
  if (bird.y < 0) bird.y = 0;
}

function gameTick() {
  if (gameOver) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  updateBird();
  updatePipes();
  drawPipes();
  drawBird();
  drawCanvasScore();
  if (!gameOver && checkCollision()) {
    gameOver = true;
    drawFlatlined();
    clearInterval(intervalId);
  }
  frameCount++;
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
  intervalId = setInterval(gameTick, 1000 / 60);
}

canvas.addEventListener("touchstart", (e) => {
    if (tapCooldown) return;
    tapCooldown = true;
    setTimeout(() => tapCooldown = false, 150);
  
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
  
    // Log tap for debugging
    console.log("Tap at", x, y);
  
    if (!gameStarted) {
      gameStarted = true;
      awaitingFirstFlap = false;
      intervalId = setInterval(gameTick, 1000 / 60);
    } else if (gameOver && allowRestart) {
      restartGame();
    } else {
      flap();
    }
  }, { passive: false });
  

document.addEventListener("keydown", (e) => {
  unlockAudio();
  if (e.code === "Space") {
    if (!gameStarted) {
      gameStarted = true;
      awaitingFirstFlap = false;
      intervalId = setInterval(gameTick, 1000 / 60);
    } else {
      flap();
    }
  }
});
