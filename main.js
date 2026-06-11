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
    if(!document.getElementById("countdown-img")) {
        gameplay.appendChild(countdownImg);
    }

    if (index >= countFiles.length) {
    setTimeout(() => {
        countdownImg.remove();
        // fade out the dark overlay
        document.getElementById("gameplay-dark-overlay").classList.add("hidden");
    }, 400);

    gameActive = true;
    startDuckRunningAnimation();
    requestAnimationFrame(processGameFrame);
    return;
}

    countdownImg.src = countFiles[index];
    countdownImg.style.transition = "none";
    countdownImg.style.top = "-550px";            
    countdownImg.getBoundingClientRect();          
    
    countdownImg.style.transition = "top 0.4s cubic-bezier(0.34, 1.5, 0.64, 1)";
    countdownImg.style.top = "0px"; // Brought down into clear frame vision               

    const holdTime = index === 3 ? 600 : 850;
    
    setTimeout(() => {
        countdownImg.style.transition = "top 0.3s ease-in";
        countdownImg.style.top = "-550px";         
        
        setTimeout(() => dropCountdown(index + 1), 350);
    }, holdTime);
}

startBtn.addEventListener("click", () => {
    console.log("START CLICKED");
    startBtn.disabled = true;

    menu.classList.add("menu-hide");
    logoWrap.classList.add("menu-hide");

    setTimeout(() => {
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
        initializeRunnerEngine();
        skipStartBtn.style.display = "none";
    }, 9600); 
}); 

// ==========================================================================
// ENDLESS RUNNER CORE ENGINE STATE CONFIGURATION
// ==========================================================================
const LANE_WIDTH = 166.66;
const TRACK_LANES = [0, LANE_WIDTH, LANE_WIDTH * 2]; // For spawning objects cleanly


const DUCK_LANE_POSITIONS = [483, 649, 816];
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
    playerLane = 1;
    spawnTimer = -500;
    gameSpeed = 6;
    distanceTravelled = 0;
    seedCount = 0;
    spawnIntervalThreshold = 750; 
    lastSpeedMilestone = 0;       
    dynamicEntities = [];
    lastTimestamp = 0;

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
                if (seedCount >= 10) activateHyperBoostMode();
            } else if (ent.type === "obstacle") {
                if (isInvincible) {
                    ent.element.remove();
                    dynamicEntities.splice(i, 1);
                } else {
                    gameActive = false;
                    stopDuckAnimation();
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
    if (!gameActive) return;
    gameActive = false;
    stopDuckAnimation();
    pauseModal.classList.add("show");
});



resumeBtn.addEventListener("click", () => {
    pauseModal.classList.remove("show");
    
    // Show dark overlay for countdown
    document.getElementById("gameplay-dark-overlay").classList.remove("hidden");
    
    // Drop countdown then start game
    dropCountdown(0);
});

retryBtn.addEventListener("click", () => {
    pauseModal.classList.remove("show");
    
    // Reset all game state
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
    skipEndBtn.style.display = "block";
    gameActive = false;
    stopDuckAnimation();
    document.getElementById("gameplay-pause-trigger").style.display = "none";

    // 1. Drop curtain down first
    curtain.classList.remove("curtain-up");
    curtain.classList.add("curtain-open");

    // 2. Only AFTER curtain fully covers screen, show overlay and cutscenes
    setTimeout(() => {
        overlay.classList.add("show");
    }, 1600); // wait for curtain animation (1.4s) to finish

    setTimeout(() => {
        endCutscene1.style.display = "block";
        endCutscene1.style.opacity = "1";
        endTopPanel.classList.add("animate-in");
        endBottomPanel.classList.add("animate-in");
    }, 2400);

    // 3. Slide in Panel 1 & Panel 2
    setTimeout(() => {
        endCutscene1.classList.add("show");
        endTopPanel.classList.add("animate-in");
        endBottomPanel.classList.add("animate-in");
    }, 2200);

    // 4. Fade out Panel 1 & Panel 2
    setTimeout(() => {
        endCutscene1.style.opacity = "0";
    }, 4500);

    // 5. Hide panel 1/2 container completely, then bring up Panel 3
    setTimeout(() => {
        endCutscene1.classList.remove("show");
        endCutscene2.classList.add("show");
    }, 5100);

    // 6. Fade out Panel 3
    setTimeout(() => {
        endCutscene2.style.opacity = "0";
    }, 7400);

    // 7. Hide Panel 3, switch the sheet entirely over to the Scoreboard Panel
    setTimeout(() => {
        skipEndBtn.style.display = "none";
        endCutscene2.classList.remove("show");
        
        if (distanceTravelled > highScore) {
            highScore = distanceTravelled;
            localStorage.setItem("duckChaseHighScore", highScore); // ← saves to browser
        }
        document.getElementById("menu-highscore").textContent = String(highScore).padStart(6, '0');
        document.getElementById("end-distance-val").textContent = String(distanceTravelled).padStart(6, '0');
        document.getElementById("end-highscore-val").textContent = String(highScore).padStart(6, '0');
        document.getElementById("end-seed-val").textContent = seedCount;
        // Reveal scoreboard panel box overlay
        statsScreen.classList.add("show");
    }, 8000);
}

// Reset everything smoothly on a GameOver board retry request
endRetryBtn.addEventListener("click", () => {
    statsScreen.classList.remove("show");
    overlay.classList.remove("show");
    
    // Reset properties to default conditions
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
    location.reload(); 
});


skipStartBtn.addEventListener("click", () => {
    skipStartBtn.style.display = "none";
    cutscene1.style.display = "none";
    cutscene1.style.opacity = "0";
    cutscene2.style.display = "none";
    cutscene2.classList.remove("show", "fade-out");
    overlay.classList.remove("show");
    curtain.classList.add("curtain-up");
    gameplay.classList.add("show");
    initializeRunnerEngine();
});

skipEndBtn.addEventListener("click", () => {
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
    overlay.classList.add("show");
    statsScreen.classList.add("show");
});