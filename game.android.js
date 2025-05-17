// === Wacky Wings – Final Optimized iOS Version (Fixed Template Errors + CSS) ===

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

// === Firebase Config & Auth Setup ===
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

let currentUID = null;
onAuthStateChanged(auth, (user) => {
  if (user) currentUID = user.uid;
});

// === Update Player Stats in Firestore ===
function updatePlayerStats(finalScore) {
  if (!currentUID) return;
  const userRef = doc(db, "users", currentUID);
  getDoc(userRef).then((snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const prevHigh = data.highscore || 0;
    const plays = data.timesPlayed || 0;
    const avg = data.averageScore || 0;
    const newHigh = Math.max(prevHigh, finalScore);
    const newPlays = plays + 1;
    const newAvg = Math.round(((avg * plays) + finalScore) / newPlays);
    updateDoc(userRef, {
      highscore: newHigh,
      timesPlayed: newPlays,
      averageScore: newAvg
    });
  });
}

// === Canvas Setup ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
canvas.width = 320;
canvas.height = 480;
ctx.imageSmoothingEnabled = false;
canvas.style.margin = "10px auto 60px auto";
canvas.style.display = "block";
document.body.style.overflowY = "scroll";

// === Web Audio API Setup ===
let soundOn = true;
let audioContext;
let pointBuffer, deadBuffer;

async function loadSound(url) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

function playSound(buffer) {
  if (!soundOn || !audioContext || !buffer) return;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);
}

function unlockAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    loadSound("audio/point.mp3").then(buf => pointBuffer = buf);
    loadSound("audio/dead.mp3").then(buf => deadBuffer = buf);
  }
}

// === Sound Toggle Button (All Platforms) ===
const soundBtn = document.createElement("div");
soundBtn.textContent = "Sound: ON";
soundBtn.style.cssText = "margin: 6px auto; padding: 6px 12px; background-color: #101020; color: #00ffff; font-weight: bold; border: 2px solid #00ffff; border-radius: 8px; font-family: 'Segoe UI', sans-serif; cursor: pointer; width: fit-content;";
soundBtn.onclick = () => {
  soundOn = !soundOn;
  soundBtn.textContent = `Sound: ${soundOn ? "ON" : "OFF"}`;
};
document.getElementById("scoreDisplay")?.after(soundBtn);


// === Load Game Assets ===
const bgImg = new Image(); bgImg.src = "images/background.png";
const birdImg = new Image(); birdImg.src = "images/bird.png";
const pipeImg = new Image(); pipeImg.src = "images/pipe.png";

// === Game State Variables ===
let score = 0;
let gameOver = false;
let allowRestart = false;
let gameStarted = false;
let tapCooldown = false;
let intervalId = null;

const pipeSpeed = 2.75;
const pipeSpacing = 85;
const pipeGap = 215;

const bird = {
  width: 40,
  height: 40,
  x: 80,
  y: 200,
  velocity: 0,
  gravity: 0.285,
  jumpStrength: -5.45,
  maxVelocity: 6.3,
  angle: 0
};

const pipes = [];
const pipeWidth = 60;
const pipeTileHeight = 60;
let frameCount = 0;
let bgX = 0;

// === Controls and Game Logic ===
function flap() {
  if (!gameStarted) return;
  if (gameOver && allowRestart) return restartGame();
  bird.velocity = bird.jumpStrength;
  bird.angle = -30 * Math.PI / 180;
}

function drawBackground() {
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
    const passedMid = bird.x > pipe.x + pipeWidth / 2 && !pipe.passed;
    if (passedMid) {
      pipe.passed = true;
      score++;
      const scoreEl = document.getElementById("scoreDisplay");
      if (scoreEl) scoreEl.textContent = `Score: ${score}`;
      playSound(pointBuffer);
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
    const birdLeft = bird.x;
    const birdRight = bird.x + bird.width;
    const birdTop = bird.y;
    const birdBottom = bird.y + bird.height;
    const withinX = birdRight > pipe.x && birdLeft < pipe.x + pipeWidth;
    const hitsTop = birdTop <= pipe.topY;
    const hitsBottom = birdBottom >= pipe.bottomY;
    if (withinX && (hitsTop || hitsBottom)) return true;
  }
  return bird.y <= 0 || bird.y + bird.height >= canvas.height;
}

function drawGameOver() {
  updatePlayerStats(score);
  playSound(deadBuffer);

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ff3366";
  ctx.font = "bold 28px 'Segoe UI'";
  ctx.fillText("FLATLINED", 90, 220);

  ctx.font = "18px 'Segoe UI'";
  ctx.fillStyle = "#fff";
  ctx.fillText(`Score: ${score}`, 120, 260);

  drawCyberButton(80, 290, 160, 40, "REBOOT");

  allowRestart = true;
}

function updateBird() {
  bird.velocity += bird.gravity;
  bird.velocity = Math.min(bird.velocity, bird.maxVelocity);
  bird.y += bird.velocity;
  bird.angle = bird.velocity > 0 ? Math.min(bird.angle + 0.04, Math.PI / 3) : -Math.PI / 6;
  if (bird.y + bird.height >= canvas.height) {
    gameOver = true;
    drawGameOver();
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
  if (checkCollision()) {
    gameOver = true;
    drawGameOver();
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
  const scoreEl = document.getElementById("scoreDisplay");
  if (scoreEl) scoreEl.textContent = `Score: 0`;
  intervalId = setInterval(gameTick, 1000 / 60);
}

// === Input Event Handlers (Touch & Keyboard) ===
canvas.addEventListener("touchstart", (e) => {
  unlockAudioContext();
  if (tapCooldown) return;
  tapCooldown = true;
  setTimeout(() => tapCooldown = false, 150);
  if (!gameStarted) {
    gameStarted = true;
    intervalId = setInterval(gameTick, 1000 / 60);
  } else if (gameOver && allowRestart) {
    restartGame();
  } else {
    flap();
  }
}, { passive: false });

document.addEventListener("keydown", (e) => {
  unlockAudioContext();
  if (e.code === "Space") {
    if (!gameStarted) {
      gameStarted = true;
      intervalId = setInterval(gameTick, 1000 / 60);
    } else if (gameOver && allowRestart) {
      restartGame();
    } else {
      flap();
    }
  }
});

// === Initial Game Screen (On Image Load) ===
bgImg.onload = () => {
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  drawBird();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "16px 'Segoe UI'";
  ctx.fillText("Tap to flap", 110, 230);
  drawCyberButton(80, 250, 160, 40, "START GAME");
};

// === Draw a Stylized Button on Canvas ===
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
