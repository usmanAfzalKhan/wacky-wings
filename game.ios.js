// === Wacky Wings – iOS Version (Fully Commented) ===

// Import required Firebase modules for app initialization, Firestore access, and user authentication
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

// Firebase project configuration specific to the Wacky Wings project
typing
const firebaseConfig = {
  apiKey: "AIzaSyDJJ8FL79BXg4qA1XevOeD3Qqj_q87lN-o",
  authDomain: "wacky-wings.firebaseapp.com",
  projectId: "wacky-wings",
  storageBucket: "wacky-wings.firebasestorage.app",
  messagingSenderId: "86787566584",
  appId: "1:86787566584:web:a4e421c1259763d061c48d",
  measurementId: "G-WYSDC4Q441"
};

// Initialize Firebase app once (or reuse existing)
const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// === Canvas Setup ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

// Set dimensions explicitly for iOS
canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 120;
ctx.setTransform(1, 0, 0, 1, 0, 0);

// === Score Display and Sound Toggle ===
let soundOn = true;
let scoreDisplay = document.getElementById("scoreDisplay");
if (!scoreDisplay) {
  scoreDisplay = document.createElement("div");
  scoreDisplay.id = "scoreDisplay";
  scoreDisplay.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 18px;
    background: rgba(255,255,255,0.8);
    padding: 6px 12px;
    border-radius: 8px;
    font-family: 'Segoe UI', sans-serif;
    font-weight: bold;
    color: #000;
  `;
  scoreDisplay.textContent = "Score: 0";
  document.body.appendChild(scoreDisplay);
}

const soundToggle = document.createElement("button");
soundToggle.textContent = "Sound: ON";
soundToggle.style.cssText = `
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 12px;
  background: #101020;
  color: #00ffff;
  border: 2px solid #00ffff;
  border-radius: 8px;
  font-family: 'Segoe UI', sans-serif;
  font-weight: bold;
`;
soundToggle.onclick = () => {
  soundOn = !soundOn;
  soundToggle.textContent = `Sound: ${soundOn ? 'ON' : 'OFF'}`;
};
document.body.appendChild(soundToggle);

// === Game State and Config ===
let score = 0;
let gameOver = false;
let allowRestart = false;
let gameStarted = false;
let audioContext;
let pointBuffer, deadBuffer;

const pipeSpeed = 2.75;
const pipeSpacing = 85;
const pipeGap = 190;

const bird = {
  width: 40,
  height: 40,
  x: canvas.width * 0.2,
  y: canvas.height * 0.4,
  velocity: 0,
  gravity: 0.285,
  jumpStrength: -5.45,
  maxVelocity: 6.3,
  angle: 0
};
const pipes = [];
let frameCount = 0;
let bgX = 0;

// === Load and play sounds via Web Audio API ===
async function unlockAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const load = async url => {
      const r = await fetch(url);
      const b = await r.arrayBuffer();
      return audioContext.decodeAudioData(b);
    };
    pointBuffer = await load('audio/point.mp3');
    deadBuffer  = await load('audio/dead.mp3');
  }
}
function play(buffer) {
  if (!soundOn || !audioContext || !buffer) return;
  const s = audioContext.createBufferSource();
  s.buffer = buffer;
  s.connect(audioContext.destination);
  s.start();
}

// === Flap Control ===
function flap() {
  if (!gameStarted) return;
  if (gameOver && allowRestart) {
    restartGame();
    return;
  }
  bird.velocity = bird.jumpStrength;
  bird.angle = -30 * Math.PI/180;
  play(pointBuffer);
}

// === Firestore Stats Update ===
function updatePlayerStats(finalScore) {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'users', user.uid);
  getDoc(ref).then(snap => {
    if (!snap.exists()) return;
    const d = snap.data() || {};
    const newHigh = Math.max(d.highscore||0, finalScore);
    const newPlays = (d.timesPlayed||0) + 1;
    const newAvg   = Math.round(((d.averageScore||0)*(newPlays-1) + finalScore)/newPlays);
    updateDoc(ref, { highscore: newHigh, timesPlayed: newPlays, averageScore: newAvg });
  });
}

// === Drawing & Game Loop ===
function drawBackground() {
  bgX -= pipeSpeed/2;
  if (bgX <= -canvas.width) bgX = 0;
  ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, bgX+canvas.width, 0, canvas.width, canvas.height);
}
function drawBird() {
  ctx.save();
  ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2);
  ctx.rotate(bird.angle);
  ctx.drawImage(birdImg, -bird.width/2, -bird.height/2, bird.width, bird.height);
  ctx.restore();
}
function createPipe() {
  const minY = 50, maxY = canvas.height - pipeGap - 50;
  const topY = Math.random()*(maxY-minY) + minY;
  pipes.push({ x:canvas.width, topY, bottomY:topY+pipeGap, passed:false });
}
function updatePipes() {
  pipes.forEach(p=>p.x -= pipeSpeed);
  if (pipes.length && pipes[0].x + pipeWidth < 0) pipes.shift();
  if (frameCount===1 || frameCount%pipeSpacing===0) createPipe();
  pipes.forEach(p => {
    if (!p.passed && p.x + pipeWidth < bird.x) {
      p.passed = true;
      score++;
      scoreDisplay.textContent = `Score: ${score}`;
      play(pointBuffer);
    }
  });
}
function drawPipes() {
  pipes.forEach(p => {
    for (let y=0;y<p.topY;y+=pipeTileHeight) {
      ctx.save();ctx.translate(p.x, y+pipeTileHeight);ctx.scale(1,-1);ctx.drawImage(pipeImg,0,0,pipeWidth,pipeTileHeight);ctx.restore();
    }
    for (let y=p.bottomY; y<canvas.height; y+=pipeTileHeight) {
      ctx.drawImage(pipeImg, p.x, y, pipeWidth, pipeTileHeight);
    }
  });
}
function checkCollision() {
  for (const p of pipes) {
    const br = bird.x+bird.width, bb = bird.y+bird.height;
    if (br>p.x && bird.x<p.x+pipeWidth && (bird.y<p.topY || bb>p.bottomY)) return true;
  }
  return bird.y<=0 || bird.y+bird.height>=canvas.height;
}
function drawGameOver() {
  updatePlayerStats(score);
  play(deadBuffer);
  ctx.fillStyle="rgba(0,0,0,0.6)";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#ff3366";ctx.font="bold 28px 'Segoe UI'";ctx.fillText("FLATLINED",90,220);
  ctx.font="18px 'Segoe UI'";ctx.fillStyle="#fff";ctx.fillText(`Score: ${score}`,120,260);
  drawCyberButton(80,290,160,40,"REBOOT");
  allowRestart=true;
}
function updateBird() {
  bird.velocity += bird.gravity;
  bird.velocity = Math.min(bird.velocity, bird.maxVelocity);
  bird.y += bird.velocity;
  bird.angle = bird.velocity>0?Math.min(bird.angle+0.04,Math.PI/3):-Math.PI/6;
  if (bird.y+bird.height>=canvas.height) { gameOver=true; drawGameOver(); clearInterval(loop); }
  if (bird.y<0) bird.y=0;
}
function gameTick() {
  if (gameOver) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawBackground(); updateBird(); updatePipes(); drawPipes(); drawBird();
  if (checkCollision()) { gameOver=true; drawGameOver(); clearInterval(loop); }
  frameCount++;
}
function restartGame() {
  score=0;gameOver=false;allowRestart=false;pipes.length=0;
  bird.y=canvas.height/2;bird.velocity=0;bird.angle=0;frameCount=0;
  scoreDisplay.textContent="Score: 0";
  loop = setInterval(gameTick,1000/60);
}

// Input handlers
canvas.addEventListener("touchstart",e=>{unlockAudio();e.preventDefault(); if(!gameStarted){gameStarted=true;loop=setInterval(gameTick,1000/60);} else if(gameOver&&allowRestart){restartGame();} else {flap();}});
document.addEventListener("keydown",e=>{ if(e.code==="Space"){unlockAudio(); if(!gameStarted){gameStarted=true;loop=setInterval(gameTick,1000/60);} else if(gameOver&&allowRestart){restartGame();} else flap();}});

// Start screen on load
bgImg.onload = () => { ctx.drawImage(bgImg,0,0,canvas.width,canvas.height);drawBird();ctx.fillStyle="rgba(0,0,0,0.6)";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#fff";ctx.font="16px 'Segoe UI'";ctx.fillText("Tap to flap",110,230);drawCyberButton(80,250,160,40,"START GAME");};

// Stylized button
function drawCyberButton(x,y,w,h,label){ctx.fillStyle="#00ffff";ctx.strokeStyle="#ff00ff";ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);ctx.fillRect(x,y,w,h);ctx.font="bold 14px 'Segoe UI'";ctx.fillStyle="#000";ctx.fillText(label,x+w/2-ctx.measureText(label).width/2,y+h/2+5);}
