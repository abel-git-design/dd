document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  }

  // =====================
  // SHOOT BUTTON (MOBILE)
  // =====================
  let shootBtn = null;
  function createShootButton() {
    if (!shootBtn) {
      shootBtn = document.createElement('button');
      shootBtn.id = 'shootBtn';
      shootBtn.textContent = 'Shoot';
      shootBtn.style.position = 'fixed';
      shootBtn.style.left = '50%';
      shootBtn.style.bottom = '8vh';
      shootBtn.style.transform = 'translateX(-50%)';
      shootBtn.style.zIndex = '1001';
      shootBtn.style.padding = '22px 60px';
      shootBtn.style.fontSize = '2.2rem';
      shootBtn.style.background = '#27ae60';
      shootBtn.style.color = '#fff';
      shootBtn.style.border = 'none';
      shootBtn.style.borderRadius = '16px';
      shootBtn.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
      shootBtn.style.display = 'none';
      shootBtn.style.userSelect = 'none';
      shootBtn.style.touchAction = 'manipulation';
      document.body.appendChild(shootBtn);
    }
  }
  createShootButton();

  // =====================
  // VIRTUAL GAME SPACE
  // =====================
  let VIRTUAL_WIDTH = 900;
  let VIRTUAL_HEIGHT = 900;

  const ENEMY_RADIUS = Math.floor(VIRTUAL_WIDTH * 0.18); // ~160px for 900px
  const PLANET_LIGHT = "rgb(230,230,230)";
  const PLANET_DARK = "rgb(20,20,20)";
  const BG_COLOR = [120,120,120];
  const BASE_ENEMY_COLOR = [150,150,150];
  const BASE_BALL_COLOR = [200,200,200];

  const bgPlanets = [
    [VIRTUAL_WIDTH*0.13,VIRTUAL_HEIGHT*0.13,Math.floor(VIRTUAL_WIDTH*0.06),PLANET_LIGHT],
    [VIRTUAL_WIDTH*0.87,VIRTUAL_HEIGHT*0.13,Math.floor(VIRTUAL_WIDTH*0.055),PLANET_DARK],
    [VIRTUAL_WIDTH*0.13,VIRTUAL_HEIGHT*0.87,Math.floor(VIRTUAL_WIDTH*0.045),PLANET_DARK],
    [VIRTUAL_WIDTH*0.87,VIRTUAL_HEIGHT*0.87,Math.floor(VIRTUAL_WIDTH*0.07),PLANET_LIGHT],
    [VIRTUAL_WIDTH*0.10,VIRTUAL_HEIGHT*0.5,Math.floor(VIRTUAL_WIDTH*0.04),PLANET_LIGHT],
    [VIRTUAL_WIDTH*0.90,VIRTUAL_HEIGHT*0.5,Math.floor(VIRTUAL_WIDTH*0.04),PLANET_DARK]
  ];

  function resizeCanvas() {
    let aspect = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;
    let w = window.innerWidth;
    let h = window.innerHeight;
    if (isMobile()) {
      // Use the smallest dimension for a perfect square fit, minus a small margin
      let minDim = Math.min(w, h);
      let scale = (minDim * 0.995) / VIRTUAL_WIDTH; // 99.5% of min dimension
      canvas.width = VIRTUAL_WIDTH * scale;
      canvas.height = VIRTUAL_HEIGHT * scale;
      canvas.style.position = 'absolute';
      canvas.style.left = '50%';
      canvas.style.top = '50%';
      canvas.style.transform = 'translate(-50%, -50%)';
      canvas.style.maxWidth = '99vw';
      canvas.style.maxHeight = '99vh';
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    } else {
      let scale = Math.min(w / VIRTUAL_WIDTH, h / VIRTUAL_HEIGHT);
      canvas.width = VIRTUAL_WIDTH * scale;
      canvas.height = VIRTUAL_HEIGHT * scale;
      canvas.style.position = 'absolute';
      canvas.style.left = '50%';
      canvas.style.top = '50%';
      canvas.style.transform = 'translate(-50%, -50%)';
      canvas.style.maxWidth = '100vw';
      canvas.style.maxHeight = '100vh';
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const FPS = 60;

  // =====================
  // COLORS
  // =====================
  const CONTRAST_MAP = [
    0.00, 0.30, 0.40, 0.50, 0.65,
    0.75, 0.80, 0.85, 0.90, 0.95
  ];

  // =====================
  // LEVEL DATA
  // =====================
  const LEVELS = [
    {speed:1.0, balls:1, hits:5},
    {speed:1.0, balls:2, hits:5},
    {speed:1.0, balls:4, hits:6},
    {speed:1.0, balls:4, hits:6},
    {speed:1.0, balls:4, hits:7},
    {speed:1.0, balls:4, hits:7},
    {speed:1.0, balls:4, hits:7},
    {speed:1.0, balls:4, hits:7},
    {speed:1.0, balls:4, hits:7},
    {speed:1.0, balls:4, hits:7}
  ];

  // =====================
  // GAME STATE
  // =====================
  let levelIndex = 0;
  let enemyAngle = 0;
  let attachedAngles = [];
  let shooting = false;
  let shotY = VIRTUAL_HEIGHT - 50;
  let chances = 3;
  let hits = 0;
  let canShoot = false;

  let gameState = "COUNTDOWN";
  let stateStartTime = 0;
  let endMessage = "";

  // Track if the next startLevel is a replay or a new level
  let isReplay = false;

  // =====================
  // GAME STATS
  // =====================
  const levelStats = [];
  let totalReplays = 0;
  let levelStartTime = 0;
  let chancesUsedThisLevel = 0;

  // =====================
  // HELPERS
  // =====================
  function amblyopiaColor(base, bg, strength) {
    return `rgb(${base.map((v,i)=>
      Math.round(bg[i] + (v-bg[i])*(1-strength))
    ).join(",")})`;
  }

  function angleCollision(a1, a2) {
    const diff = Math.abs(a1 - a2) % 360;
    return diff < 14 || diff > 346;
  }

  function drawBackground() {
    ctx.fillStyle = `rgb(${BG_COLOR.join(",")})`;
    ctx.fillRect(0,0,VIRTUAL_WIDTH,VIRTUAL_HEIGHT);

    bgPlanets.forEach(p=>{
      ctx.fillStyle = p[3];
      ctx.beginPath();
      ctx.arc(p[0],p[1],p[2],0,Math.PI*2);
      ctx.fill();
    });
  }

  function drawCenteredText(txt, size=48, yOffset=0) {
    ctx.fillStyle = "black";
    ctx.font = `${size}px Arial`;
    const m = ctx.measureText(txt);
    ctx.fillText(
      txt,
      VIRTUAL_WIDTH/2 - m.width/2,
      VIRTUAL_HEIGHT/2 + yOffset
    );
  }

  function drawCleanOverlay() {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(0, VIRTUAL_HEIGHT/2 - 90, VIRTUAL_WIDTH, 180);
  }

  // =====================
  // LEVEL INIT (UPDATED)
  // =====================
  function startLevel() {
    if (levelIndex >= LEVELS.length) {
      gameState = "GAME_COMPLETE";
      return;
    }

    if (gameState === "LEVEL_END" && endMessage === "LEVEL FAILED!") {
      totalReplays++;
      isReplay = true;
    } else {
      isReplay = false;
      chancesUsedThisLevel = 0; // Reset for new level
    }

    const lvl = LEVELS[levelIndex];
    enemyAngle = 0;
    chances = 3;
    hits = 0;
    shooting = false;
    shotY = VIRTUAL_HEIGHT - 50;

    attachedAngles = [];
    for (let i = 0; i < lvl.balls; i++) {
      attachedAngles.push(i * (360 / lvl.balls));
    }

    // Only set levelStartTime if this is a new level, not a replay
    if (!isReplay) {
      levelStartTime = performance.now();
      totalReplays = 0; // Reset replays for the new level
    }

    gameState = "COUNTDOWN";
    stateStartTime = performance.now();
    canShoot = false;
  }

  // =====================
  // INPUT (DESKTOP)
  // =====================
  document.addEventListener("keydown", e=>{
    if (e.code === "Space" && canShoot && !shooting && gameState==="PLAYING") {
      shooting = true;
      shotY = VIRTUAL_HEIGHT - 50;
    }
  });

  // =====================
  // INPUT (MOBILE)
  // =====================
  canvas.addEventListener("touchstart", e=>{
    e.preventDefault();
    if (canShoot && !shooting && gameState==="PLAYING") {
      shooting = true;
      shotY = VIRTUAL_HEIGHT - 50;
    }
  }, { passive:false });

  // =====================
  // INPUT (MOBILE) - USE SHOOT BUTTON
  // =====================
  function showShootBtn() {
    if (shootBtn) shootBtn.style.display = 'block';
  }
  function hideShootBtn() {
    if (shootBtn) shootBtn.style.display = 'none';
  }
  if (shootBtn) {
    shootBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (canShoot && !shooting && gameState === "PLAYING") {
        shooting = true;
        shotY = VIRTUAL_HEIGHT - 50;
      }
    }, { passive: false });
    shootBtn.addEventListener('click', function(e) {
      if (canShoot && !shooting && gameState === "PLAYING") {
        shooting = true;
        shotY = VIRTUAL_HEIGHT - 50;
      }
    });
  }

  // =====================
  // GAME LOOP (UPDATED FOR MOBILE BUTTON)
  // =====================
  let quitTriggered = false;
  let userInfo = { name: "", age: "", sex: "", gamer: "" };

  // User info modal logic
  const userInfoModal = document.getElementById("userInfoModal");
  const userInfoForm = document.getElementById("userInfoForm");
  const userNameInput = document.getElementById("userName");
  const userAgeInput = document.getElementById("userAge");
  const userSexInput = document.getElementById("userSex");
  const userGamerInput = document.getElementById("userGamer");
  const userInfoError = document.getElementById("userInfoError");

  function showUserInfoModal() {
    userInfoModal.style.display = "flex";
  }
  function hideUserInfoModal() {
    userInfoModal.style.display = "none";
  }

  userInfoForm.addEventListener("submit", function(e) {
    e.preventDefault();
    userInfoError.style.display = "none";
    const name = userNameInput.value.trim();
    const age = userAgeInput.value.trim();
    const sex = userSexInput.value;
    const gamer = userGamerInput.value;
    if (!age || isNaN(Number(age)) || Number(age) < 1) {
      userInfoError.textContent = "Please enter a valid age.";
      userInfoError.style.display = "block";
      return;
    }
    if (!sex) {
      userInfoError.textContent = "Please select your sex.";
      userInfoError.style.display = "block";
      return;
    }
    if (!gamer) {
      userInfoError.textContent = "Please select if you often play games.";
      userInfoError.style.display = "block";
      return;
    }
    userInfo = { name, age, sex, gamer };
    hideUserInfoModal();
    startLevel();
    setInterval(gameLoop, 1000/FPS);
  });

  // Show modal before game starts
  showUserInfoModal();

  // Add quit button event
  document.getElementById("quitBtn").addEventListener("click", () => {
    quitTriggered = true;
    gameState = "GAME_QUIT";
  });

  // Make the shooting ball and preplaced balls the same size
  const BALL_RADIUS = Math.floor(VIRTUAL_WIDTH * 0.013); // ~12 for 900px

  function gameLoop() {
    drawBackground();
    const now = performance.now();

    // Show/hide shoot button for mobile
    if (isMobile() && gameState === "PLAYING") {
      showShootBtn();
    } else {
      hideShootBtn();
    }

    // Draw HUD (Level, Score, Chances)
    if (isMobile()) {
      // Old-style HUD for mobile: simple text at corners
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for HUD
      ctx.font = "bold 22px Arial";
      ctx.fillStyle = "#222";
      ctx.textBaseline = "top";
      ctx.fillText(`Level: ${levelIndex + 1}/10`, 18, 10);
      ctx.fillText(`Score: ${hits * 10}`, VIRTUAL_WIDTH / 2 - 40, 10);
      ctx.fillText(`Chances: ${chances}`, VIRTUAL_WIDTH - 160, 10);
      ctx.restore();
    } else {
      // New HUD bar for desktop
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for HUD
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillRect(0, 0, canvas.width, 54); // Simple top bar
      ctx.font = "bold 22px Arial";
      ctx.fillStyle = "#222";
      ctx.textBaseline = "middle";
      ctx.fillText(`Level: ${levelIndex + 1}/10`, 24, 27);
      ctx.fillText(`Score: ${hits * 10}`, canvas.width/2 - 50, 27);
      ctx.fillText(`Chances: ${chances}`, canvas.width - 160, 27);
      ctx.restore();
    }

    if (quitTriggered || gameState === "GAME_QUIT") {
      drawCleanOverlay();
      drawCenteredText("GAME QUIT", 44, -10);
      drawStatsTable();
      return;
    }

    if (gameState === "GAME_COMPLETE") {
      drawCleanOverlay();
      drawCenteredText("ALL LEVELS", 44, -10);
      drawCenteredText("COMPLETED", 44, 40);
      drawStatsTable();
      return;
    }

    if (gameState === "COUNTDOWN") {
      const t = now - stateStartTime;
      const txt =
        t < 800 ? "3" :
        t < 1600 ? "2" :
        t < 2400 ? "1" :
        t < 3200 ? "START" : "";

      if (txt) drawCenteredText(txt);
      else {
        gameState = "PLAYING";
        canShoot = true;
      }
      return;
    }

    if (gameState === "LEVEL_END") {
      drawCleanOverlay();
      drawCenteredText(endMessage);
      return;
    }

    const lvl = LEVELS[levelIndex];
    const strength = CONTRAST_MAP[levelIndex];

    const enemyColor = amblyopiaColor(BASE_ENEMY_COLOR, BG_COLOR, strength);
    const ballColor = amblyopiaColor(BASE_BALL_COLOR, BG_COLOR, strength);

    enemyAngle = (enemyAngle + (lvl.speed + levelIndex * 0.08)) % 360;

    ctx.fillStyle = enemyColor;
    ctx.beginPath();
    ctx.arc(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, ENEMY_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ballColor;
    attachedAngles.forEach(a => {
      const r = (a + enemyAngle) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(
        VIRTUAL_WIDTH / 2 + Math.cos(r) * ENEMY_RADIUS,
        VIRTUAL_HEIGHT / 2 + Math.sin(r) * ENEMY_RADIUS,
        BALL_RADIUS, 0, Math.PI * 2
      );
      ctx.fill();
    });

    if (!shooting) {
      ctx.beginPath();
      ctx.arc(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - 50, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    if (shooting) {
      shotY -= 12;
      ctx.beginPath();
      ctx.arc(VIRTUAL_WIDTH / 2, shotY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      if (shotY <= VIRTUAL_HEIGHT / 2 + ENEMY_RADIUS) {
        shooting = false;
        const hitAngle = (90 - enemyAngle + 360) % 360;

        if (attachedAngles.some(a => angleCollision(hitAngle, a))) {
          chances--;
        } else {
          attachedAngles.push(hitAngle);
          hits++;
        }
      }
    }

    if (chances <= 0) {
      chancesUsedThisLevel += 3; // Add 3 chances lost for this replay
      gameState = "LEVEL_END";
      endMessage = "LEVEL FAILED!";
      canShoot = false;
      setTimeout(startLevel, 1500);
    }

    if (hits >= lvl.hits) {
      chancesUsedThisLevel += (3 - chances); // Add remaining chances lost in this run
      const levelTime = Math.round((performance.now() - levelStartTime) / 1000); // Use performance.now() for accuracy
      levelStats.push({
        level: levelIndex + 1,
        time: levelTime,
        chancesUsed: chancesUsedThisLevel,
        replays: totalReplays,
        hits: hits // Store hits for this level
      });
      gameState = "LEVEL_END";
      endMessage = "LEVEL COMPLETE!";
      canShoot = false;
      levelIndex++;
      setTimeout(startLevel, 1500);
    }
    hideShareBtn();
  }

  // =====================
  // DRAW STATS TABLE (UPDATED)
  // =====================
  function drawStatsTable() {
    const tableX = 50;
    const tableY = 50;
    const tableWidth = VIRTUAL_WIDTH - 100;
    const tableHeight = VIRTUAL_HEIGHT - 100;
    ctx.fillStyle = "white";
    ctx.fillRect(tableX, tableY, tableWidth, tableHeight);

    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("Level", tableX + 50, tableY + 50);
    ctx.fillText("Time (s)", tableX + 150, tableY + 50);
    ctx.fillText("Chances Used", tableX + 270, tableY + 50);
    ctx.fillText("Replays", tableX + 420, tableY + 50);

    const totalStats = levelStats.reduce((acc, stat) => {
      acc.totalTime += stat.time; // Sum up total time across levels
      acc.totalChances += stat.chancesUsed; // Sum up total chances used across levels
      acc.totalReplays += stat.replays; // Sum up total replays across levels
      acc.totalScore += (stat.hits ? stat.hits * 10 : 0);
      return acc;
    }, { totalTime: 0, totalChances: 0, totalReplays: 0, totalScore: 0 });

    // Calculate dynamic Y for summary and info box
    const rowHeight = 30;
    const headerHeight = 50;
    const firstRowY = tableY + headerHeight + rowHeight;
    const lastRowY = tableY + headerHeight + levelStats.length * rowHeight;
    const summaryStartY = lastRowY + 30; // 30px gap after last row

    // Draw level rows
    levelStats.forEach((stat, index) => {
      const y = tableY + headerHeight + (index + 1) * rowHeight;
      ctx.fillText(stat.level, tableX + 50, y);
      ctx.fillText(stat.time, tableX + 150, y);
      ctx.fillText(stat.chancesUsed, tableX + 270, y);
      ctx.fillText(stat.replays, tableX + 420, y);
    });

    // Draw summary below last row
    ctx.fillText("Summary:", tableX + 50, summaryStartY);
    ctx.fillText(`Total Time: ${totalStats.totalTime}s`, tableX + 50, summaryStartY + 30);
    ctx.fillText(`Total Chances: ${totalStats.totalChances}`, tableX + 50, summaryStartY + 60);
    ctx.fillText(`Total Replays: ${totalStats.totalReplays}`, tableX + 50, summaryStartY + 90);
    ctx.fillText(`Total Score: ${totalStats.totalScore}`, tableX + 50, summaryStartY + 120);

    // Draw user info box to the right of the summary, aligned with summaryStartY
    const infoBoxWidth = 320;
    const infoBoxHeight = 120;
    const infoBoxX = tableX + tableWidth - infoBoxWidth - 20;
    const infoBoxY = summaryStartY;
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight);
    ctx.strokeStyle = "#bbb";
    ctx.strokeRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight);
    ctx.fillStyle = "black";
    ctx.font = "18px Arial";
    ctx.fillText("User Info:", infoBoxX + 10, infoBoxY + 28);
    ctx.font = "16px Arial";
    ctx.fillText(`Name: ${userInfo.name ? userInfo.name : "(Not provided)"}`, infoBoxX + 10, infoBoxY + 50);
    ctx.fillText(`Age: ${userInfo.age}`, infoBoxX + 10, infoBoxY + 70);
    ctx.fillText(`Sex: ${userInfo.sex}`, infoBoxX + 10, infoBoxY + 90);
    ctx.fillText(`Often plays games: ${userInfo.gamer}`, infoBoxX + 10, infoBoxY + 110);
    ctx.font = "20px Arial";

    // Show share button
    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn) shareBtn.style.display = "block";
  }

  // Hide share button when not on stats table
  function hideShareBtn() {
    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn) shareBtn.style.display = "none";
  }

  // Share button logic (share entire stats table area as image, trigger system share directly)
  document.getElementById("shareBtn").addEventListener("click", async function() {
    // Capture the entire stats table area as an image, accounting for canvas scaling
    const canvas = document.getElementById("gameCanvas");
    const VIRTUAL_WIDTH = 900;
    const VIRTUAL_HEIGHT = 900;
    const tableX = 50, tableY = 50, tableWidth = VIRTUAL_WIDTH - 100, tableHeight = VIRTUAL_HEIGHT - 100;

    // Calculate the scale between the actual canvas size and the virtual size
    const scaleX = canvas.width / VIRTUAL_WIDTH;
    const scaleY = canvas.height / VIRTUAL_HEIGHT;

    // Calculate the actual pixel area to copy
    const sx = tableX * scaleX;
    const sy = tableY * scaleY;
    const sw = tableWidth * scaleX;
    const sh = tableHeight * scaleY;

    // Create a temporary canvas to copy the full stats table area
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = sw;
    tempCanvas.height = sh;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    const dataUrl = tempCanvas.toDataURL("image/png");

    // Try to share directly using Web Share API (if supported)
    if (navigator.canShare && window.File && window.fetch) {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "planet-shooter-results.png", { type: "image/png" });
      try {
        await navigator.share({
          files: [file],
          title: "Planet Shooter Results",
          text: "Check out my Planet Shooter game results!"
        });
      } catch (e) {
        alert("Sharing was cancelled or not supported on this device.");
      }
    } else {
      // Fallback: show download link
      const shareModal = document.getElementById("shareImageModal");
      const sharePreview = document.getElementById("shareImagePreview");
      const shareDownload = document.getElementById("shareImageDownload");
      sharePreview.innerHTML = `<img src='${dataUrl}' alt='Stats Table' style='max-width:100%; border:1px solid #ccc; border-radius:8px;'/>`;
      shareDownload.innerHTML = `<a href='${dataUrl}' download='planet-shooter-results.png' style='font-size:15px;'>Download Image</a>`;
      shareModal.style.display = "flex";
      document.getElementById("closeShareImageModal").onclick = function() {
        shareModal.style.display = "none";
      };
    }
  });

});





