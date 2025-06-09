// === Wacky Wings – Desktop Version (Fully Commented) ===

// Import required Firebase modules for app initialization, Firestore access, and user authentication
import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

// Firebase project configuration specific to the Wacky Wings project
const firebaseConfig = {
  apiKey: "AIzaSyDJJ8FL79BXg4qA1XevOeD3Qqj_q87lN-o",
  authDomain: "wacky-wings.firebaseapp.com",
  projectId: "wacky-wings",
  storageBucket: "wacky-wings.firebasestorage.app",
  messagingSenderId: "86787566584",
  appId: "1:86787566584:web:a4e421c1259763d061c48d",
  measurementId: "G-WYSDC4Q441",
};

// Initialize Firebase app once (or reuse existing)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// === Canvas Setup ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

canvas.style.width = "400px";
canvas.style.height = "600px";
canvas.width = 400;
canvas.height = 600;
ctx.setTransform(1, 0, 0, 1, 0, 0);

// === Score Display and Sound Toggle ===
let soundOn = true;
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

const soundBox = document.createElement("div");
soundBox.style.cssText = `
  display: inline-block;
  margin-left: 10px;
  background-color: #101020;
  border: 2px solid #00ffff;
  padding: 6px 12px;
  border-radius: 10px;
  color: #00ffff;
  font-weight: bold;
  font-family: 'Segoe UI', sans-serif;
  user-select: none;
  cursor: pointer;
  vertical-align: middle;
`;
soundBox.textContent = `Sound: ${soundOn ? "ON" : "OFF"}`;
scoreDisplay.after(soundBox);
soundBox.addEventListener("click", () => {
  soundOn = !soundOn;
  soundBox.textContent = `Sound: ${soundOn ? "ON" : "OFF"}`;
});

// === Game State and Config ===
let score = 0;
let gameOver = false;
let allowRestart = false;
let gameStarted = false;
let audioUnlocked = false;
let awaitingFirstFlap = false;

const pipeSpeed = 3.3;
const pipeSpacing = 90;
const pipeGap = 165;
const jumpStrength = -6.2;

// === Assets ===
const birdImg = new Image();
birdImg.src = "images/bird.png";
const pipeImg = new Image();
pipeImg.src = "images/pipe.png";
const bgImg = new Image();
bgImg.src = "images/background.png";

const flapSound = new Audio("audio/flap.mp3");
flapSound.volume = 0.35;
flapSound.playsInline = true;
const deadSound = new Audio("audio/dead.mp3");
deadSound.volume = 0.25;
deadSound.playsInline = true;
const pointSound = new Audio("audio/point.mp3");
pointSound.volume = 0.35;
pointSound.playsInline = true;

const bird = {
  width: 40,
  height: 40,
  x: 80,
  y: 200,
  velocity: 0,
  gravity: 0.5,
  jumpStrength,
  maxVelocity: 8,
  angle: 0,
};
const pipes = [];
const pipeWidth = 60;
const pipeTileHeight = 60;
let frameCount = 0;
let bgX = 0;

function unlockAudio() {
  if (!audioUnlocked) {
    [flapSound, deadSound, pointSound].forEach((s) => {
      try {
        s.play().then(() => s.pause());
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
  if (gameOver && allowRestart) restartGame();
  else if (!gameOver) {
    bird.velocity = bird.jumpStrength * 1.1;
    bird.angle = -Math.PI / 6;
    if (soundOn) {
      flapSound.currentTime = 0;
      flapSound.play();
    }
  }
}

function updatePlayerStats(finalScore) {
  const user = auth.currentUser;
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  getDoc(userRef).then((snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    const prevHigh = d.highscore || 0;
    const plays = d.timesPlayed || 0;
    const avg = d.averageScore || 0;
    const newHigh = Math.max(prevHigh, finalScore);
    const newPlays = plays + 1;
    const newAvg = Math.round((avg * plays + finalScore) / newPlays);
    updateDoc(userRef, {
      highscore: newHigh,
      timesPlayed: newPlays,
      averageScore: newAvg,
    });
  });
}

function drawBackground() {
  bgX -= pipeSpeed / 2;
  if (bgX <= -canvas.width) bgX = 0;
  ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);
}
function drawBird() {
  ctx.save();
  ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
  ctx.rotate(bird.angle);
  ctx.drawImage(
    birdImg,
    -bird.width / 2,
    -bird.height / 2,
    bird.width,
    bird.height
  );
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
  ctx.fillText(
    label,
    x + w / 2 - ctx.measureText(label).width / 2,
    y + h / 2 + 5
  );
}
function drawStartMenu() {
  drawBackground();
  drawBird();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "16px 'Segoe UI'";
  ctx.fillText("Press spacebar or click to start", 80, 230);
  drawCyberButton(140, 250, 120, 40, "START GAME");
}
function createPipe() {
  const minY = 50,
    maxY = canvas.height - pipeGap - 50;
  const topY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
  pipes.push({ x: canvas.width, topY, bottomY: topY + pipeGap, passed: false });
}
function updatePipes() {
  pipes.forEach((p) => (p.x -= pipeSpeed));
  if (pipes.length && pipes[0].x + pipeWidth < 0) pipes.shift();
  if (frameCount === 1 || (frameCount > 0 && frameCount % pipeSpacing === 0))
    createPipe();
  pipes.forEach((p) => {
    if (!p.passed && p.x + pipeWidth < bird.x) {
      p.passed = true;
      score++;
      scoreDisplay.textContent = `Score: ${score}`;
      if (soundOn) {
        const s = pointSound.cloneNode();
        s.volume = 0.35;
        s.play();
      }
    }
  });
}
function drawPipes() {
  pipes.forEach((p) => {
    for (let y = 0; y < p.topY; y += pipeTileHeight) {
      ctx.save();
      ctx.translate(p.x, y + pipeTileHeight);
      ctx.scale(1, -1);
      ctx.drawImage(pipeImg, 0, 0, pipeWidth, pipeTileHeight);
      ctx.restore();
    }
    for (let y = p.bottomY; y < canvas.height; y += pipeTileHeight) {
      ctx.drawImage(pipeImg, p.x, y, pipeWidth, pipeTileHeight);
    }
  });
}
function checkCollision() {
  for (const p of pipes) {
    const br = bird.x + bird.width,
      bb = bird.y + bird.height,
      withinX = br > p.x && bird.x < p.x + pipeWidth,
      hitTop = bird.y < p.topY,
      hitBot = bb > p.bottomY;
    if (withinX && (hitTop || hitBot)) return true;
  }
  return bird.y <= 0 || bird.y + bird.height >= canvas.height;
}
function drawFlatlined() {
  updatePlayerStats(score);
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
    const d = deadSound.cloneNode();
    d.volume = 0.25;
    d.play();
  }
}
function updateBird() {
  bird.velocity += bird.gravity;
  bird.velocity = Math.min(bird.velocity, bird.maxVelocity);
  bird.y += bird.velocity;
  bird.angle =
    bird.velocity > 0 ? Math.min(bird.angle + 0.04, Math.PI / 3) : -Math.PI / 6;
  if (bird.y + bird.height >= canvas.height) {
    gameOver = true;
    drawFlatlined();
    return;
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
    } else flap();
  }
});
canvas.addEventListener("mousedown", (e) => {
  unlockAudio();
  const r = canvas.getBoundingClientRect(),
    x = e.clientX - r.left,
    y = e.clientY - r.top;
  if (!gameStarted && x >= 140 && x <= 260 && y >= 250 && y <= 290) {
    gameStarted = true;
    awaitingFirstFlap = false;
    gameLoop();
  } else if (
    gameOver &&
    allowRestart &&
    x >= 140 &&
    x <= 260 &&
    y >= 310 &&
    y <= 350
  ) {
    restartGame();
  } else flap();
});

bgImg.onload = () => drawStartMenu();
