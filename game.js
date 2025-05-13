// === Wacky Wings FINAL FIXED VERSION ===

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.style.width = "400px";
canvas.style.height = "600px";
const scale = window.devicePixelRatio || 1;
canvas.width = 400 * scale;
canvas.height = 600 * scale;
ctx.scale(scale, scale);

const scoreDisplay = document.getElementById("scoreDisplay");
let score = 0;
let gameOver = false;
let allowRestart = false;
let gameStarted = false;
let soundOn = true;
let audioUnlocked = false;
let awaitingFirstFlap = false;
let justFlapped = false;

const userAgent = navigator.userAgent || "";
const isiOS = /iPhone|iPad|iPod/.test(userAgent);
const isAndroid = /Android/.test(userAgent);
const isMobile = navigator.userAgentData?.mobile || isiOS || isAndroid;

const pipeSpeed = isMobile ? 1.3 : 3.3;
const pipeSpacing = isMobile ? 145 : 90;
const pipeGap = isMobile ? 230 : 165;
const jumpStrength = isAndroid ? -3.65 : (isMobile ? -3.1 : -6.2);

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
  gravity: isMobile ? 0.21 : 0.5,
  jumpStrength,
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
  if (gameOver && allowRestart) {
    restartGame();
  } else if (!gameOver) {
    bird.velocity = bird.jumpStrength;
    bird.angle = -30 * (Math.PI / 180);
    if (soundOn && flapSound) {
      flapSound.currentTime = 0;
      flapSound.play();
    }
  }
}

function getTouchOrClickPosition(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left;
  const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top;
  return { x, y };
}

function handleInput(e) {
  e.preventDefault();
  unlockAudio();
  const { x, y } = getTouchOrClickPosition(e);

  // Check sound toggle first
  if (x >= 290 && x <= 390 && y >= 10 && y <= 40) {
    soundOn = !soundOn;
    if (!gameStarted) drawStartMenu();
    else if (gameOver) drawFlatlined();
    return;
  }

  if (!gameStarted) {
    handleStartMenuClick(x, y);
  } else if (gameOver && allowRestart && x >= 140 && x <= 260 && y >= 310 && y <= 350) {
    restartGame();
  } else {
    if (justFlapped) return;
    justFlapped = true;
    flap();
    setTimeout(() => justFlapped = false, 120);
  }
}

canvas.addEventListener("touchstart", handleInput);
canvas.addEventListener("click", handleInput);

document.addEventListener("keydown", (e) => {
  unlockAudio();
  if (!gameStarted && e.code === "Space") {
    gameStarted = true;
    awaitingFirstFlap = true;
    gameLoop();
  } else if (e.code === "Space") flap();
});
