// Import Firebase modules for app, Firestore (DB), and authentication
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

// Firebase configuration object — identifies and connects to your Firebase project
const firebaseConfig = {
  apiKey: "AIzaSyDJJ8FL79BXg4qA1XevOeD3Qqj_q87lN-o",
  authDomain: "wacky-wings.firebaseapp.com",
  projectId: "wacky-wings",
  storageBucket: "wacky-wings.appspot.com",
  messagingSenderId: "86787566584",
  appId: "1:86787566584:web:a4e421c1259763d061c40d",
};

// Initialize Firebase app and services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Firestore database
const auth = getAuth(app); // Firebase Authentication

// Track currently logged-in user's UID
let currentUID = null;
onAuthStateChanged(auth, (user) => {
  if (user) currentUID = user.uid; // Save UID when user logs in
});

// === Save player's stats in Firebase Firestore after each game ===
function updatePlayerStats(finalScore) {
  if (!currentUID) return; // No user? Skip stats

  const userRef = doc(db, "users", currentUID); // Reference to user document

  getDoc(userRef).then((snap) => {
    if (!snap.exists()) return; // If user doc doesn't exist, skip

    const data = snap.data(); // Retrieve user data
    const prevHigh = data.highscore || 0; // Previous high score
    const plays = data.timesPlayed || 0; // Games played
    const avg = data.averageScore || 0; // Average score

    const newHigh = Math.max(prevHigh, finalScore); // Calculate new high score
    const newPlays = plays + 1; // Increment play count
    const newAvg = Math.round((avg * plays + finalScore) / newPlays); // New average

    // Save updated stats to Firestore
    updateDoc(userRef, {
      highscore: newHigh,
      timesPlayed: newPlays,
      averageScore: newAvg,
    });
  });
}

// === Canvas Setup ===
const canvas = document.getElementById("gameCanvas"); // Grab canvas element
const ctx = canvas.getContext("2d", { alpha: false }); // Get 2D context
canvas.width = 320; // Game width
canvas.height = 480; // Game height
ctx.imageSmoothingEnabled = false; // Keep pixels crisp
canvas.style.margin = "10px auto 60px auto"; // Center the canvas
canvas.style.display = "block"; // Ensure it's visible
document.body.style.overflowY = "scroll"; // Allow scroll for button access

// === Web Audio Setup ===
let soundOn = true; // Global toggle for sound
let audioContext; // Web Audio context
let pointBuffer, deadBuffer; // Audio buffers for point and death

// Load sound file and decode it
async function loadSound(url) {
  const res = await fetch(url); // Fetch file
  const arrayBuffer = await res.arrayBuffer(); // Get raw data
  return await audioContext.decodeAudioData(arrayBuffer); // Decode to usable sound
}

// Play a decoded sound if available and enabled
function playSound(buffer) {
  if (!soundOn || !audioContext || !buffer) return; // Skip if muted or unavailable
  const source = audioContext.createBufferSource(); // Create audio source node
  source.buffer = buffer; // Assign sound
  source.connect(audioContext.destination); // Output to speakers
  source.start(0); // Play now
}

// Required on iOS — audio must be unlocked by user interaction
function unlockAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)(); // Create context
    loadSound("audio/point.mp3").then((buf) => (pointBuffer = buf)); // Load sounds
    loadSound("audio/dead.mp3").then((buf) => (deadBuffer = buf));
  }
}

// === Sound Toggle Button (All Devices) ===
const soundBtn = document.createElement("div"); // Create button
soundBtn.textContent = "Sound: ON"; // Initial text
soundBtn.style.cssText = `
  margin: 6px auto; padding: 6px 12px;
  background-color: #101020; color: #00ffff;
  font-weight: bold; border: 2px solid #00ffff;
  border-radius: 8px; font-family: 'Segoe UI', sans-serif;
  cursor: pointer; width: fit-content;
`; // Styling
soundBtn.onclick = () => {
  soundOn = !soundOn; // Toggle sound
  soundBtn.textContent = `Sound: ${soundOn ? "ON" : "OFF"}`; // Update text
};
document.getElementById("scoreDisplay")?.after(soundBtn); // Insert after score

// === Load Game Assets ===
const bgImg = new Image();
bgImg.src = "images/background.png"; // Background
const birdImg = new Image();
birdImg.src = "images/bird.png"; // Bird sprite
const pipeImg = new Image();
pipeImg.src = "images/pipe.png"; // Pipe sprite

// === Game Variables ===
let score = 0; // Player's score
let gameOver = false; // Flag: game state
let allowRestart = false; // Flag: show restart button
let gameStarted = false; // Flag: has game started
let tapCooldown = false; // Prevent rapid taps
let intervalId = null; // Stores game loop timer

const pipeSpeed = 2.75; // How fast pipes move
const pipeSpacing = 85; // Gap between pipes
const pipeGap = 190; // Vertical space between top/bottom pipe

// Bird's physics and display
const bird = {
  width: 40,
  height: 40, // Bird size
  x: 80,
  y: 200, // Starting position
  velocity: 0, // Current vertical speed
  gravity: 0.285, // Fall acceleration
  jumpStrength: -5.45, // How hard it jumps
  maxVelocity: 6.3, // Terminal fall speed
  angle: 0, // Rotation angle for falling animation
};

const pipes = []; // Holds all pipes in game
const pipeWidth = 60; // Width of pipe image
const pipeTileHeight = 60; // Height of pipe sprite
let frameCount = 0; // Counts game frames
let bgX = 0; // Background scroll position

// === Game Functions ===

// Make the bird jump
function flap() {
  if (!gameStarted) return; // Ignore before game start
  if (gameOver && allowRestart) return restartGame(); // Restart if allowed
  bird.velocity = bird.jumpStrength; // Set upward speed
  bird.angle = (-30 * Math.PI) / 180; // Tilt bird upward
}

// Scroll and draw background
function drawBackground() {
  bgX -= pipeSpeed / 2.3; // Scroll to the left
  if (bgX <= -canvas.width) bgX = 0; // Loop background
  ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height); // Draw current
  ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height); // Draw next
}

// Draw the bird with current rotation
function drawBird() {
  ctx.save(); // Save canvas state
  ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2); // Move origin
  ctx.rotate(bird.angle); // Rotate
  ctx.drawImage(
    birdImg,
    -bird.width / 2,
    -bird.height / 2,
    bird.width,
    bird.height
  ); // Draw bird
  ctx.restore(); // Restore canvas
}

// Generate a new top/bottom pipe pair
function createPipe() {
  const minTopY = 50;
  const maxTopY = canvas.height - pipeGap - 50;
  const topY = Math.floor(Math.random() * (maxTopY - minTopY + 1)) + minTopY;
  pipes.push({ x: canvas.width, topY, bottomY: topY + pipeGap, passed: false });
}

// Update all pipe positions and check for scoring
function updatePipes() {
  pipes.forEach((pipe) => (pipe.x -= pipeSpeed)); // Move left

  if (pipes.length && pipes[0].x + pipeWidth < 0) pipes.shift(); // Remove offscreen pipes

  if ((frameCount > 0 && frameCount % pipeSpacing === 0) || frameCount === 1)
    createPipe(); // Spawn pipe every X frames

  pipes.forEach((pipe) => {
    const passedMid = bird.x > pipe.x + pipeWidth / 2 && !pipe.passed;
    if (passedMid) {
      pipe.passed = true; // Mark pipe as passed
      score++; // Increase score
      const scoreEl = document.getElementById("scoreDisplay");
      if (scoreEl) scoreEl.textContent = `Score: ${score}`; // Update UI
      playSound(pointBuffer); // Play sound
    }
  });
}

// Render top and bottom pipes
function drawPipes() {
  pipes.forEach((pipe) => {
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

// Check if bird hits a pipe or wall
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
  return bird.y <= 0 || bird.y + bird.height >= canvas.height; // Hits top/bottom
}

// Display "Game Over" screen
function drawGameOver() {
  updatePlayerStats(score); // Save stats
  playSound(deadBuffer); // Play death sound

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height); // Dim background

  ctx.fillStyle = "#ff3366";
  ctx.font = "bold 28px 'Segoe UI'";
  ctx.fillText("FLATLINED", 90, 220); // Game over text

  ctx.font = "18px 'Segoe UI'";
  ctx.fillStyle = "#fff";
  ctx.fillText(`Score: ${score}`, 120, 260); // Show score

  drawCyberButton(80, 290, 160, 40, "REBOOT"); // Draw restart button
  allowRestart = true;
}

// Update bird's physics
function updateBird() {
  bird.velocity += bird.gravity; // Fall speed increases
  bird.velocity = Math.min(bird.velocity, bird.maxVelocity); // Cap fall speed
  bird.y += bird.velocity; // Apply movement
  bird.angle =
    bird.velocity > 0 ? Math.min(bird.angle + 0.04, Math.PI / 3) : -Math.PI / 6; // Rotate

  if (bird.y + bird.height >= canvas.height) {
    // Hit floor
    gameOver = true;
    drawGameOver();
    clearInterval(intervalId);
  }

  if (bird.y < 0) bird.y = 0; // Don’t fly off top
}

// Main game loop (called every frame)
function gameTick() {
  if (gameOver) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
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

// Restart game variables and loop
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

// === Input Listeners ===
// Handle tap (mobile)
canvas.addEventListener(
  "touchstart",
  (e) => {
    unlockAudioContext(); // Ensure audio works
    if (tapCooldown) return;
    tapCooldown = true;
    setTimeout(() => (tapCooldown = false), 150);
    if (!gameStarted) {
      gameStarted = true;
      intervalId = setInterval(gameTick, 1000 / 60);
    } else if (gameOver && allowRestart) {
      restartGame();
    } else {
      flap();
    }
  },
  { passive: false }
);

// Handle spacebar (desktop)
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

// === Start Screen Drawing ===
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

// === Draw Custom Button (Start/Restart) ===
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
