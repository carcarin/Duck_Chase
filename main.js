function scaleGame() {
    const game = document.getElementById("game");
    const scaleX = window.innerWidth / 1400;
    const scaleY = window.innerHeight / 850;
    const scale = Math.min(scaleX, scaleY);
    game.style.transformOrigin = "top left";
    game.style.transform = `scale(${scale})`;
    game.style.position = "absolute";
    game.style.top = `${(window.innerHeight - 850 * scale) / 2}px`;
    game.style.left = `${(window.innerWidth - 1400 * scale) / 2}px`;
}

scaleGame();
window.addEventListener("resize", scaleGame);

const startBtn    = document.getElementById("btn-start");
const menu        = document.getElementById("menu-content");
const logoWrap    = document.getElementById("logo-wrap");
const curtain     = document.getElementById("curtainbg");
const overlay     = document.getElementById("overlay");
const cutscene1   = document.getElementById("cutscene1");
const topPanel    = document.querySelector(".top-panel");
const bottomPanel = document.querySelector(".bottom-panel");
const cutscene2   = document.getElementById("cutscene2");
const gameplay    = document.getElementById("gameplay");
const skipStartBtn = document.getElementById("skip-start-cutscene");
const skipEndBtn = document.getElementById("skip-end-cutscene");
// ============================================================
// SOUND SYSTEM
// ============================================================
const sfxCurtain    = new Audio("sound-2/curtain.mp3");
const sfxCountdown  = new Audio("sound-2/1 2 3 start.mp3");
const sfxGameOver   = new Audio("sound-2/Game Over 2.mp3");
const sfxClick1     = new Audio("sound-2/Click1.mp3");
sfxClick1.volume = 1.0; // ← add this
const sfxClick2     = new Audio("sound-2/Click2.mp3");
sfxClick2.volume = 1.0; 
const sfxSquawk     = new Audio("sound-2/squawk.wav");   
const bgmMenu     = new Audio("sound-2/Main menu.mp3");
const bgmGameplay = new Audio("sound-2/Gameplay BGM.mp3");
bgmMenu.loop = true;
bgmGameplay.loop = true;
bgmMenu.volume = 0.5;
bgmGameplay.volume = 0.5; 
bgmMenu.play();

const countFiles = [
    "Countdown/Count_3.png",
    "Countdown/Count_2.png",
    "Countdown/Count_1.png",
    "Countdown/Count_GO.png",
];

// Create countdown img element with updated larger scale settings
const countdownImg = document.createElement("img");
countdownImg.id = "countdown-img";
countdownImg.style.cssText = `
    position: absolute;
    left: 50%;
    top: -400px;                                  
    transform: translateX(-50%);
    width: 500px;                                 
    z-index: 200;
    transition: top 0.4s cubic-bezier(0.34, 1.5, 0.64, 1);
`;

function dropCountdown(index) {
    if (skipCountdown) return; // ← guard
    if (index === 0) {
        if (countdownRunning) return; // ← prevent double countdown
        countdownRunning = true;
    }

    if (!document.getElementById("countdown-img")) {
        gameplay.appendChild(countdownImg);
    }

    if (index >= countFiles.length) {
        setTimeout(() => {
            countdownImg.remove();
            document.getElementById("gameplay-dark-overlay").classList.add("hidden");
            countdownRunning = false; // ← reset when done
            bgmGameplay.currentTime = 0; // ← ADD
            bgmGameplay.play(); 
        }, 400);

        gameActive = true;
        startDuckRunningAnimation();
        requestAnimationFrame(processGameFrame);
        return;
    }

    countdownImg.src = countFiles[index];       
    countdownImg.getBoundingClientRect();          
    
    countdownImg.style.transition = "top 0.4s cubic-bezier(0.34, 1.5, 0.64, 1)";
    countdownImg.style.top = "0px";
    if (index === 0) {  // ← only play once at the start
        sfxCountdown.currentTime = 0;
        sfxCountdown.play();
    }           

    const holdTime = index === 3 ? 600 : 850;
    
    setTimeout(() => {
        countdownImg.style.transition = "top 0.3s ease-in";
        countdownImg.style.top = "-550px";         
        
        setTimeout(() => dropCountdown(index + 1), 350);
    }, holdTime);
}

startBtn.addEventListener("click", () => {
    gameStarted = false;
    sfxClick1.play();
    bgmMenu.pause();        // ← stop menu music
    bgmMenu.currentTime = 0;
    console.log("START CLICKED");
    startBtn.disabled = true;

    menu.classList.add("menu-hide");
    logoWrap.classList.add("menu-hide");

    setTimeout(() => {
    sfxCurtain.play();
    curtain.classList.add("curtain-open");
    }, 100);

    setTimeout(() => {
        overlay.classList.add("show");
    }, 1200);

    setTimeout(() => {
        cutscene1.style.display = "block"; 
        cutscene1.classList.add("show");
        topPanel.classList.add("show");
        bottomPanel.classList.add("show");
        skipStartBtn.style.display = "block"; 
    }, 2200);

    setTimeout(() => {
        cutscene1.style.transition = "opacity 0.7s ease";
        cutscene1.style.opacity = "0";
    }, 3200);

    setTimeout(() => {
        cutscene1.style.display = "none"; 
    }, 4000); 
    
    setTimeout(() => {
        cutscene2.style.display = "block"; 
        cutscene2.classList.add("show");
    }, 4500);

    setTimeout(() => {
        cutscene2.classList.remove("show");
        cutscene2.classList.add("fade-out"); 
    }, 5600); 

    setTimeout(() => {
        cutscene2.style.display = "none";
        cutscene2.classList.remove("fade-out"); 
    }, 6600);

    setTimeout(() => {
        gameplay.classList.add("show");
    }, 6800);

    setTimeout(() => {
        overlay.classList.remove("show");
    }, 7400);

    setTimeout(() => {
        curtain.classList.add("curtain-up");
    }, 8600);

   setTimeout(() => {
    if (!gameStarted) {  // ← only run if skip hasn't already started it
        initializeRunnerEngine();
        skipStartBtn.style.display = "none";
    }
}, 9600);
}); 

// ==========================================================================
// ENDLESS RUNNER CORE ENGINE STATE CONFIGURATION
// ==========================================================================
const LANE_WIDTH = 166.66;
const TRACK_LANES = [0, LANE_WIDTH, LANE_WIDTH * 2]; // For spawning objects cleanly


const DUCK_LANE_POSITIONS = [483, 649, 816];
let totalSeedsNonBoost = 0; // tracks seeds outside of boost only
let playerLane = 1;         // Spawns in the middle lane (Index 1)
let gameActive = false;
let gameSpeed = 6;          
let distanceTravelled = 0;
let seedCount = 0;
let isInvincible = false;
let spawnTimer = 0;
let spawnIntervalThreshold = 750; // Milliseconds between spawns (lower = more objects)
let lastSpeedMilestone = 0;       // Track multiples of 300 distance
let lastTimestamp = 0;            // Keeps track of the animation delta-time frame
let currentRenderX = 649; // Tracks the actual sliding position frame-by-frame
let targetLaneX = 649;    // Tracks the center coordinates of the lane you want to go to
// Animation System State Tracking
let duckAnimationInterval = null;
let currentRunFrame = 1;
let highScore = parseInt(localStorage.getItem("duckChaseHighScore")) || 0;
document.getElementById("menu-highscore").textContent = String(highScore).padStart(6, '0');
let lastObstacleSpawnY = -999; // tracks when last obstacle was spawned
let gameStarted = false;
let countdownRunning = false;
let gameOverSequenceActive = false;

// Track Element Selectors
const gameplayDuck = document.getElementById("gameplay-duck");
const duckSpriteImg = document.getElementById("duck-sprite");
const track1 = document.getElementById("map-track-1");
const track2 = document.getElementById("map-track-2");
const distanceDisplay = document.getElementById("distance-val");
const seedDisplay = document.getElementById("seed-val");
const stageArea = document.getElementById("stage-area");
const powerupButton = document.getElementById("powerup-btn");

// Arrays to update spawned object entities
let dynamicEntities = [];

// 1. INPUT INTERFACES (A/D & Left/Right Arrows)
window.addEventListener("keydown", (e) => {
    if (!gameActive) return;

    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
        if (playerLane > 0) {
            playerLane--;
            updateDuckPosition();
        }
    } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        if (playerLane < 2) {
            playerLane++;
            updateDuckPosition();
        }
    }
});

function updateDuckPosition() {
    // Instead of styling directly, we update the target destination coordinate
    targetLaneX = DUCK_LANE_POSITIONS[playerLane];
}

// 2. RUNNER ENGINE LIFECYCLE INITIALIZER
function initializeRunnerEngine() {
    totalSeedsNonBoost = 0;
    playerLane = 1;
    spawnTimer = -500;
    gameSpeed = 8;
    distanceTravelled = 0;
    seedCount = 0;
    spawnIntervalThreshold = 750; 
    lastSpeedMilestone = 0;       
    dynamicEntities = [];
    lastTimestamp = 0;
    skipCountdown = false; // ← ADD
    countdownRunning = false;

    // Force values back to the middle track lane instantly on startup
    targetLaneX = 650;
    currentRenderX = 650;
    if (gameplayDuck) {
        gameplayDuck.style.left = `${currentRenderX}px`;
    }

    lastTimestamp = performance.now(); 
    document.getElementById("gameplay-pause-trigger").style.display = "block"; // ← ADD THIS
    dropCountdown(0)
}

// Controls running sprite sheet swapping behavior
function startDuckRunningAnimation() {
    if (duckAnimationInterval) clearInterval(duckAnimationInterval);

    duckAnimationInterval = setInterval(() => {
        if (!gameActive || !duckSpriteImg) return; 

        if (currentRunFrame === 1) {
            // ◄ FIXED: Added explicit relative path indicator
            duckSpriteImg.src = "Duck_run1.png";
            currentRunFrame = 2;
        } else {
            // ◄ FIXED: Added explicit relative path indicator
            duckSpriteImg.src = "Duck_run2.png";
            currentRunFrame = 1;
        }
    }, 150); 
}

function stopDuckAnimation() {
    if (duckAnimationInterval) {
        clearInterval(duckAnimationInterval);
        duckAnimationInterval = null;
    }
    // ◄ FIXED: Added explicit relative path indicator
    if (duckSpriteImg) duckSpriteImg.src = "Duck_idle1.png";
}

// 3. CORE TICK LOOP FRAMES
// ◄ ADDED: 'timestamp' variable passed cleanly into the tick engine
function processGameFrame(timestamp) {
    if (!gameActive) return;

    // Delta time tracker stops map lag spikes across high-refresh monitors
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = Math.min(timestamp - lastTimestamp, 50);
    lastTimestamp = timestamp;

    // A. Track Vertical Parallax Map Scroller
    let currentY1 = parseFloat(track1.style.top || 0) + gameSpeed;
    let currentY2 = parseFloat(track2.style.top || -850) + gameSpeed;

    if (currentY1 >= 850) currentY1 = currentY2 - 850;
    if (currentY2 >= 850) currentY2 = currentY1 - 850;

    track1.style.top = `${currentY1}px`;
    track2.style.top = `${currentY2}px`;

    // B. Keep Track of Scoring Progress metrics
    distanceTravelled += Math.floor(gameSpeed / 4);
    if (distanceDisplay) {
        distanceDisplay.textContent = String(distanceTravelled).padStart(6, '0');
    }

    // ◄ NEW MECHANIC: PROGRESSIVE SPEED ACCELERATION AT MULTIPLES OF 300
    let currentMilestoneChunk = Math.floor(distanceTravelled / 300);
    if (currentMilestoneChunk > lastSpeedMilestone) {
        lastSpeedMilestone = currentMilestoneChunk;
        
        gameSpeed += 1.25; // Speeds up the scrolling map and moving objects
        
        // Decreases threshold interval so obstacles fly onto screen significantly faster
        spawnIntervalThreshold = Math.max(350, spawnIntervalThreshold - 80); 
        spawnRandomTrackItem();
        spawnRandomTrackItem();
    }
    // ◄ OLD GAME SMOOTH MOTION MOTOR ENGINE:
    // Glides a fraction of the remaining distance to the target lane every frame tick
    currentRenderX += (targetLaneX - currentRenderX) * 0.16; 
    
    if (gameplayDuck) {
        gameplayDuck.style.left = `${currentRenderX}px`;
    }
    // ◄ CHANGED: Spawner now counts milliseconds, making generation incredibly stable
    spawnTimer += deltaTime;
    if (spawnTimer >= spawnIntervalThreshold) { 
        spawnRandomTrackItem();
        spawnTimer = 0;
    }

    // D. Step Entity Vectors & Collision Intersections
    processEntities();

    // ◄ ADDED: Passes timestamp to keep loop running seamlessly
    requestAnimationFrame(processGameFrame);
}

// 4. PRECISE LANE-LOCKED ITEM GENERATOR
function spawnRandomTrackItem() {
    const tooClose = dynamicEntities.some(e => 
        e.type === "obstacle" && e.topY < 150
    );
    if (tooClose) return;

    const totalLanesToSpawn = Math.random() > 0.65 ? 2 : 1;
    let lanesPicked = [];

    while (lanesPicked.length < totalLanesToSpawn) {
        let rLane = Math.floor(Math.random() * 3);
        if (!lanesPicked.includes(rLane)) lanesPicked.push(rLane);
    }

    lanesPicked.forEach((randomLaneIndex, index) => {
        const itemLaneX = TRACK_LANES[randomLaneIndex];
        // When 2 items spawn together, ALWAYS make second one a seed
        const isObstacle = totalLanesToSpawn === 2 
            ? index === 0  
            : Math.random() < 0.55;

        const entityElement = document.createElement("img");

        if (isObstacle) {
            let obstacleType = Math.random() > 0.5 ? "Obstacle_1.png" : "Obstacle_2.png";
            entityElement.src = `gameplay/Endless_runner_assets/${obstacleType}`;
            entityElement.className = "game-obstacle";
            entityElement.style.width = `${LANE_WIDTH}px`;
            entityElement.style.left = `${itemLaneX}px`;
            entityElement.style.top = "-120px";
            if (stageArea) stageArea.appendChild(entityElement);
            dynamicEntities.push({ element: entityElement, type: "obstacle", lane: randomLaneIndex, topY: -120 });
        } else {
            entityElement.src = "gameplay/Endless_runner_assets/coins.png";
            entityElement.className = "game-seed";
            entityElement.style.left = `${itemLaneX + (LANE_WIDTH - 45) / 2}px`;
            entityElement.style.top = "-120px";
            if (stageArea) stageArea.appendChild(entityElement);
            dynamicEntities.push({ element: entityElement, type: "seed", lane: randomLaneIndex, topY: -120 });
        }
    });
}

// 5. UPDATE AND PROCESS HITBOX OVERLAPS
function processEntities() {
    if (!gameplayDuck) return;
    const duckRect = gameplayDuck.getBoundingClientRect();
    const pad = 20; // shrink hitbox by 20px on each side

    for (let i = dynamicEntities.length - 1; i >= 0; i--) {
        const ent = dynamicEntities[i];
        ent.topY += gameSpeed;
        ent.element.style.top = `${ent.topY}px`;

        if (ent.topY > 850) {
            ent.element.remove();
            dynamicEntities.splice(i, 1);
            continue;
        }

        const entRect = ent.element.getBoundingClientRect();
        
        const hitDetect = !(
            duckRect.right - pad < entRect.left + pad || 
            duckRect.left + pad > entRect.right - pad || 
            duckRect.bottom - pad < entRect.top + pad || 
            duckRect.top + pad > entRect.bottom - pad
        );

        if (hitDetect) {
            if (ent.type === "seed") {
                seedCount++;
                if (seedDisplay) seedDisplay.textContent = seedCount;
                ent.element.remove();
                dynamicEntities.splice(i, 1);
                if (!isInvincible) {
                    totalSeedsNonBoost++; // ← only count if NOT in boost mode
                }
                if (seedCount >= 10) activateHyperBoostMode();
            } else if (ent.type === "obstacle") {
                if (isInvincible) {
                    ent.element.remove();
                    dynamicEntities.splice(i, 1);
                } else {
                    gameActive = false;
                    stopDuckAnimation();
                    sfxSquawk.play(); // ← ADD HERE
                    triggerGameOverSequence();  
                }
            }
        }
    }
}

// 6. AUTO-ACTIVATING 10 SEC HYPER-BOOST SYSTEM
function activateHyperBoostMode() {
    if (isInvincible) return; 
    
    isInvincible = true;
    const baseSpeed = gameSpeed;
    gameSpeed = baseSpeed * 2.2; 

    if (powerupButton) powerupButton.classList.remove("powerup-hidden");
    if (gameplayDuck) gameplayDuck.classList.add("invincible-flash");

    setTimeout(() => {
        isInvincible = false;
        gameSpeed = baseSpeed; 
        seedCount = 0;         
        if (seedDisplay) seedDisplay.textContent = seedCount;
        
        if (powerupButton) powerupButton.classList.add("powerup-hidden");
        if (gameplayDuck) gameplayDuck.classList.remove("invincible-flash");
    }, 5000); 
}

const pauseBtn = document.getElementById("gameplay-pause-trigger");
const pauseModal = document.getElementById("custom-pause-modal");
const resumeBtn = document.getElementById("pause-action-resume");
const retryBtn = document.getElementById("pause-action-retry");
const homeBtn = document.getElementById("pause-action-home");

pauseBtn.addEventListener("click", () => {
    sfxClick2.play();
    if (!gameActive) return;
    gameActive = false;
    stopDuckAnimation();
    pauseModal.classList.add("show");
});



resumeBtn.addEventListener("click", () => {
    sfxClick2.play();
    pauseModal.classList.remove("show");
    
    // Show dark overlay for countdown
    document.getElementById("gameplay-dark-overlay").classList.remove("hidden");
    
    // Drop countdown then start game
    dropCountdown(0);
});

retryBtn.addEventListener("click", () => {
    sfxClick1.play();
    pauseModal.classList.remove("show");
    
    // Reset all game state
    totalSeedsNonBoost = 0;
    distanceTravelled = 0;
    seedCount = 0;
    gameSpeed = 6;
    isInvincible = false;
    spawnTimer = 0;
    lastSpeedMilestone = 0;
    spawnIntervalThreshold = 750;
    
    // Clear all entities
    dynamicEntities.forEach(e => e.element.remove());
    dynamicEntities = [];
    lastTimestamp = 0;
    
    // Reset displays
    if (distanceDisplay) distanceDisplay.textContent = "000000";
    if (seedDisplay) seedDisplay.textContent = "0";
    if (powerupButton) powerupButton.classList.add("powerup-hidden");
    if (gameplayDuck) gameplayDuck.classList.remove("invincible-flash");
    
    // Reset track positions
    track1.style.top = "0px";
    track2.style.top = "-850px";
    
    // Show dark overlay again for countdown
    document.getElementById("gameplay-dark-overlay").classList.remove("hidden");
    
    // Restart engine (which calls dropCountdown)
    initializeRunnerEngine();
});

homeBtn.addEventListener("click", () => {
    sfxClick1.play();
    location.reload();
});




const endCutscene1 = document.getElementById("gameover-cutscene1");
const endCutscene2 = document.getElementById("gameover-cutscene2");
const endTopPanel  = document.querySelector(".end-top");
const endBottomPanel = document.querySelector(".end-bottom");
const statsScreen  = document.getElementById("gameover-stats-screen");
const endRetryBtn  = document.getElementById("end-action-retry");
const endHomeBtn   = document.getElementById("end-action-home");

function triggerGameOverSequence() {
    bgmGameplay.pause();        // ← ADD
    bgmGameplay.currentTime = 0;
    gameOverSequenceActive = true;
    skipEndBtn.style.display = "block";
    gameActive = false;
    stopDuckAnimation();
    document.getElementById("gameplay-pause-trigger").style.display = "none";
    
    curtain.classList.remove("curtain-up");
    curtain.classList.add("curtain-open");

    setTimeout(() => {
        if (!gameOverSequenceActive) return; // ← guard
        overlay.classList.add("show");
    }, 1600);

    setTimeout(() => {
        if (!gameOverSequenceActive) return; // ← guard
        endCutscene1.style.display = "block";
        endCutscene1.style.opacity = "1";
        endTopPanel.classList.add("animate-in");
        endBottomPanel.classList.add("animate-in");
    }, 2400);

    setTimeout(() => {
        if (!gameOverSequenceActive) return; // ← guard
        endCutscene1.classList.add("show");
        endTopPanel.classList.add("animate-in");
        endBottomPanel.classList.add("animate-in");
    }, 2200);

    setTimeout(() => {
        if (!gameOverSequenceActive) return; // ← guard
        endCutscene1.style.opacity = "0";
    }, 4500);

    setTimeout(() => {
        if (!gameOverSequenceActive) return;
        endCutscene1.classList.remove("show");
        endCutscene1.style.display = "none";
        endCutscene2.style.display = "block";
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                endCutscene2.classList.add("show");
            });
        });
    }, 5100);

    setTimeout(() => {
        if (!gameOverSequenceActive) return; // ← guard
        endCutscene2.style.opacity = "0";
    }, 7400);

    setTimeout(() => {
        if (!gameOverSequenceActive) return; // ← guard
        skipEndBtn.style.display = "none";
        endCutscene2.classList.remove("show");
        sfxGameOver.play();
        
        if (distanceTravelled > highScore) {
            highScore = distanceTravelled;
            localStorage.setItem("duckChaseHighScore", highScore);
        }
        document.getElementById("menu-highscore").textContent = String(highScore).padStart(6, '0');
        document.getElementById("end-distance-val").textContent = String(distanceTravelled).padStart(6, '0');
        document.getElementById("end-highscore-val").textContent = String(highScore).padStart(6, '0');
        document.getElementById("end-seed-val").textContent = seedCount;
        document.getElementById("end-seed-val").textContent = totalSeedsNonBoost;
        statsScreen.classList.add("show");
    }, 8000);
}

// Reset everything smoothly on a GameOver board retry request
endRetryBtn.addEventListener("click", () => {
    sfxClick1.play();
    gameOverSequenceActive = false;
    statsScreen.classList.remove("show");
    overlay.classList.remove("show");
    
    // Reset properties to default conditions
    totalSeedsNonBoost = 0;
    distanceTravelled = 0;
    seedCount = 0;
    gameSpeed = 6;
    isInvincible = false;
    spawnTimer = 0;
    lastSpeedMilestone = 0;
    spawnIntervalThreshold = 750;
    lastTimestamp = 0;
    
    // Clear rendering styles and structures
    endCutscene1.style.opacity = "1";
    endCutscene2.style.opacity = "1";
    endTopPanel.classList.remove("animate-in");
    endBottomPanel.classList.remove("animate-in");
    
    dynamicEntities.forEach(e => e.element.remove());
    dynamicEntities = [];
    
    if (distanceDisplay) distanceDisplay.textContent = "000000";
    if (seedDisplay) seedDisplay.textContent = "0";
    if (powerupButton) powerupButton.classList.add("powerup-hidden");
    if (gameplayDuck) gameplayDuck.classList.remove("invincible-flash");
    
    track1.style.top = "0px";
    track2.style.top = "-850px";
    
    // Pull the curtain back up out of sight and reset game layout loops
    curtain.classList.add("curtain-up");
    
    setTimeout(() => {
        initializeRunnerEngine();
    }, 1000);
});

// Send back to dashboard main menu screen index state layout
endHomeBtn.addEventListener("click", () => {
    bgmGameplay.pause();
    sfxClick1.play();
    location.reload(); 
});


skipStartBtn.addEventListener("click", () => {
    gameStarted = true;     // ← set FIRST so 9600ms timeout is blocked
    skipStartBtn.style.display = "none";
    cutscene1.style.display = "none";
    cutscene1.style.opacity = "0";
    cutscene1.classList.remove("show");
    cutscene2.style.display = "none";
    cutscene2.style.opacity = "0";
    cutscene2.style.transform = "translate(-50%, -50%) scale(0)";
    cutscene2.classList.remove("show");
    cutscene2.classList.remove("fade-out");
    overlay.classList.remove("show");
    curtain.classList.add("curtain-up");
    gameplay.classList.add("show");
    document.getElementById("gameplay-dark-overlay").classList.remove("hidden");
    initializeRunnerEngine(); // ← skipCountdown resets inside here
});

skipEndBtn.addEventListener("click", () => {
    gameOverSequenceActive = false;
    sfxGameOver.play(); //
    skipEndBtn.style.display = "none";
    endCutscene1.style.display = "none";
    endCutscene1.style.opacity = "1";
    endCutscene2.style.display = "none";
    endCutscene2.style.opacity = "1";
    endCutscene2.classList.remove("show");
    
    if (distanceTravelled > highScore) {
        highScore = distanceTravelled;
        localStorage.setItem("duckChaseHighScore", highScore);
    }
    document.getElementById("end-distance-val").textContent = String(distanceTravelled).padStart(6, '0');
    document.getElementById("end-highscore-val").textContent = String(highScore).padStart(6, '0');
    document.getElementById("end-seed-val").textContent = seedCount;
    document.getElementById("menu-highscore").textContent = String(highScore).padStart(6, '0');
    document.getElementById("end-seed-val").textContent = totalSeedsNonBoost;
    overlay.classList.add("show");
    statsScreen.classList.add("show");
});




// ==========================================================================
// OPTIONS & CREDITS ACTIVE LIFECYCLE HANDLERS
// ==========================================================================

// Element Selectors References
const optionBtn    = document.querySelectorAll(".menu-btn")[1]; // Targets second dashboard button
const creditsBtn   = document.querySelectorAll(".menu-btn")[2]; // Targets third dashboard button

const optionModal  = document.getElementById("option-modal");
const optionClose  = document.getElementById("option-close");
const creditsModal = document.getElementById("credits-modal");
const creditsClose = document.getElementById("credits-close");
const creditsRoll  = document.getElementById("credits-roll");

const musicSlider  = document.getElementById("music-volume");
const sfxSlider    = document.getElementById("sfx-volume");

// Array reference to audio objects to dynamically change volume settings on feedback change
const sfxAssetsList = [sfxCurtain, sfxCountdown, sfxGameOver, sfxClick1, sfxClick2, sfxSquawk];

// --- OPTIONS MODAL LOGIC ---
optionBtn.addEventListener("click", () => {
    sfxClick1.play();
    optionModal.style.display = "flex";
});

optionClose.addEventListener("click", () => {
    sfxClick2.play();
    optionModal.style.display = "none";
});

// Sound FX Volume Slider Tracker Updates
sfxSlider.addEventListener("input", (e) => {
    const targetVolume = parseFloat(e.target.value);
    sfxAssetsList.forEach(sfxTrack => {
        if (sfxTrack) sfxTrack.volume = targetVolume;
    });
});

// Music Slider Tracker Updates (Placeholder for when you add game background music tracks)
musicSlider.addEventListener("input", (e) => {
    const targetVolume = parseFloat(e.target.value);
    bgmMenu.volume = targetVolume;
    bgmGameplay.volume = targetVolume;
});


// --- CREDITS  LOGIC ---
// --- CREDITS MODAL LOGIC ---
creditsBtn.addEventListener("click", () => {
    sfxClick1.play();
    
    // Hide main menu title logo and links layout smoothly
    menu.classList.add("menu-hide");
    logoWrap.classList.add("menu-hide");

    // Close the stage curtain over the left panel display view
    sfxCurtain.play();
    curtain.classList.remove("curtain-up");
    curtain.classList.add("curtain-open");

    // Once the curtain is fully expanded, bring up the dark overlay wrapper
    setTimeout(() => {
        creditsModal.style.display = "flex";
        
        // ╔════════════════════════════════════════════════════════════╗
        // ║ FIX: Change "visible" to "fade-in" to match your style.css  ║
        // ╚════════════════════════════════════════════════════════════╝
        requestAnimationFrame(() => {
            creditsModal.classList.add("fade-in"); 
        });

        // Safe animation restart clean cycle
        creditsRoll.classList.remove("start-credits-animation");
        creditsRoll.getBoundingClientRect(); // Layout engine reflow trigger
        creditsRoll.classList.add("start-credits-animation");
    }, 1400); // 1.4s matches curtain extension time exactly
});

creditsClose.addEventListener("click", () => {
    sfxClick2.play();
    
    // 1. Fade out the black screen overlay smoothly
    creditsModal.classList.remove("fade-in");

    // Wait for the black fade to finish before messing with the curtain
    setTimeout(() => {
        creditsRoll.classList.remove("start-credits-animation");
        creditsModal.style.display = "none";

        // 2. CONTRACT THE CURTAIN TO THE RIGHT (Removes 100% width, returns to original 45%)
        curtain.classList.remove("curtain-open");
        
        sfxCurtain.currentTime = 0;
        sfxCurtain.play();

        // 3. Bring the home menu and logos back once the curtain is contracted
        setTimeout(() => {
            menu.classList.remove("menu-hide");
            logoWrap.classList.remove("menu-hide");
        }, 1400); // 1.4s matches your CSS curtain transition time

    }, 600); // 600ms matches your black screen fade-out time
});


musicVolume.addEventListener("input", (e) => {
    const vol = parseFloat(e.target.value);
    bgmMenu.volume = vol;
    bgmGameplay.volume = vol;
});