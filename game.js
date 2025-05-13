// === Wacky Wings FINAL FIXED VERSION + RENDER RESTORE ===

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

function drawBackground() {
  bgX -= pipeSpeed / 2;
  if (bgX <= -400) bgX = 0;
  ctx.drawImage(bgImg, bgX, 0, 400, 600);
  ctx.drawImage(bgImg, bgX + 400, 0, 400, 600);
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
  ctx.rotate(bird.angle);
  ctx.drawImage(birdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
  ctx.restore();
}

function drawStartMenu() {
  drawBackground();
  drawBird();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, 400, 600);
  ctx.font = "16px 'Segoe UI'";
  const message = isMobile ? "Tap to flap" : "Press spacebar to flap";
  ctx.fillStyle = "#fff";
  ctx.fillText(message, 200 - ctx.measureText(message).width / 2, 230);
  drawCyberButton(140, 250, 120, 40, "START GAME");
  drawCyberButton(290, 10, 100, 30, "Sound: " + (soundOn ? "ON" : "OFF"));
}

bgImg.onload = () => drawStartMenu();
