// === Wacky Wings – Unified Game Script (iOS & Android Aligned to Desktop Gameplay) ===

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

canvas.style.width = "400px";
canvas.style.height = "600px";
canvas.width = 400;
canvas.height = 600;
ctx.setTransform(1, 0, 0, 1, 0, 0);

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
let justTapped = false;
let tapCooldown = false;

const pipeSpeed = 2.3; // Slightly faster than before, but same across all mobile
const pipeSpacing = 90;
const pipeGap = 165;
const jumpStrength = -6.2;

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
  width: 40,
  height: 40,
  x: 80,
  y: 200,
  velocity: 0,
  gravity: 0.5,
  jumpStrength,
  maxVelocity: 8,
  angle: 0
};

canvas.addEventListener("touchstart", (e) => {
  if (tapCooldown) return;
  tapCooldown = true;
  setTimeout(() => tapCooldown = false, 200);

  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (!gameStarted && x >= 140 && x <= 260 && y >= 250 && y <= 290) {
    gameStarted = true;
    awaitingFirstFlap = false;
    gameLoop();
  } else if (gameOver && allowRestart && x >= 140 && x <= 260 && y >= 310 && y <= 350) {
    restartGame();
  } else {
    flap();
  }
}, { passive: false });
