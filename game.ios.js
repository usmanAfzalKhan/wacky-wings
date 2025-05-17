// === Function to unlock audio context by priming sounds ===
function unlockAudio() {
    if (!audioUnlocked) {
      [flapSound, deadSound, pointSound].forEach(sound => {
        try {
          sound.play().then(() => sound.pause()); // Play and immediately pause to prime
        } catch (_) {}
      });
      audioUnlocked = true;
    }
  }
  
  // === Handle bird flap ===
  function flap() {
    if (!gameStarted || awaitingFirstFlap) {
      awaitingFirstFlap = false;
      return;
    }
    if (gameOver && allowRestart) restartGame();
    else if (!gameOver) {
      bird.velocity = bird.jumpStrength * 1.1; // Apply upward force
      bird.angle = -30 * Math.PI / 180; // Tilt bird up
      if (soundOn) {
        flapSound.currentTime = 0;
        flapSound.play();
      }
    }
  }
  
  // === Draw scrolling background ===
  function drawBackground() {
    bgX -= pipeSpeed / 2; // Move background slowly to create parallax effect
    if (bgX <= -canvas.width) bgX = 0; // Reset loop when image scrolls off screen
    ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);
  }
  
  // === Draw bird with rotation for realism ===
  function drawBird() {
    ctx.save();
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    ctx.rotate(bird.angle); // Rotate based on velocity
    ctx.drawImage(birdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    ctx.restore();
  }
  
  // === Draw a stylized button on screen ===
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
  
  // === Start menu screen with instruction ===
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
  
  // === Create a pipe pair with a gap ===
  function createPipe() {
    const minTopY = 50;
    const maxTopY = canvas.height - pipeGap - 50;
    const topY = Math.floor(Math.random() * (maxTopY - minTopY + 1)) + minTopY;
    pipes.push({ x: canvas.width, topY, bottomY: topY + pipeGap, passed: false });
  }
  
  // === Move pipes, generate new ones, and increase score ===
  function updatePipes() {
    pipes.forEach(pipe => pipe.x -= pipeSpeed);
    if (pipes.length && pipes[0].x + pipeWidth < 0) pipes.shift(); // Remove off-screen pipes
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
  
  // === Draw pipes on screen ===
  function drawPipes() {
    pipes.forEach(pipe => {
      for (let y = 0; y < pipe.topY; y += pipeTileHeight) {
        ctx.save();
        ctx.translate(pipe.x, y + pipeTileHeight);
        ctx.scale(1, -1); // Flip top pipe upside down
        ctx.drawImage(pipeImg, 0, 0, pipeWidth, pipeTileHeight);
        ctx.restore();
      }
      for (let y = pipe.bottomY; y < canvas.height; y += pipeTileHeight) {
        ctx.drawImage(pipeImg, pipe.x, y, pipeWidth, pipeTileHeight);
      }
    });
  }
  
  // === Check if bird collides with any pipes or walls ===
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
  
  // === Draw game over screen and update stats ===
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
    updatePlayerStats(score);
    if (soundOn) {
      const dead = deadSound.cloneNode(true);
      dead.volume = 0.25;
      dead.play();
    }
  }
  
  // === Update bird position, velocity, and angle ===
  function updateBird() {
    bird.velocity += bird.gravity;
    bird.velocity = Math.min(bird.velocity, bird.maxVelocity);
    bird.y += bird.velocity;
    bird.angle = bird.velocity > 0 ? Math.min(bird.angle + 0.04, Math.PI / 3) : -Math.PI / 6;
    if (bird.y + bird.height >= canvas.height) {
      gameOver = true;
      drawFlatlined();
    }
    if (bird.y < 0) bird.y = 0;
  }
  
  // === Reset all variables to restart the game ===
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
  
  // === Core game loop to update and draw every frame ===
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
  
  // === Mouse input: start, restart, or flap ===
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
  
  // === Keyboard input: spacebar for start or flap ===
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
  
  // === Start menu once background image is loaded ===
  bgImg.onload = () => drawStartMenu();
  