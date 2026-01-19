/* ============ EXPLORATION ============ */

const explorationSection = document.getElementById("exploration");
const sceneImage = document.getElementById("sceneImage");
const explorationVideo = document.getElementById("explorationVideo");
const hintText = document.getElementById("hint");
const collectablesLayer = document.getElementById("collectablesLayer");
const inventoryItems = document.getElementById("inventoryItems");

const explorationScenes = [
  {
    image: "assets/world/images/hub.png",
    duration: 180,
    video: "assets/world/videos/bye_hub.mp4",
    collectables: [
      { itemId: "key", x: "15%", y: "70%" }
    ]
  },
  {
    image: "assets/world/images/bridge_01_start.png",
    duration: 180,
    collectables: [
      { itemId: "scroll", x: "80%", y: "30%" }
    ]
  },
  {
    image: "assets/world/images/bridge_02_middle.png",
    duration: 900,
    intro: "assets/world/videos/traverse_bridge.mp4",
    collectables: [
      { itemId: "crystal", x: "50%", y: "20%" }
    ]
  },
  {
    image: "assets/world/images/transitional_area_01.png",
    duration: 180,
    beforeFight: true,
    collectables: [
      { itemId: "map", x: "25%", y: "60%" }
    ]
  },
  {
    image: "assets/world/images/transitional_area_01.png",
    duration: 180,
    afterFight: true
  },
  {
    image: "assets/world/images/spire_back.png",
    duration: 900,
    collectables: [
      { itemId: "gem", x: "75%", y: "40%" }
    ]
  }
];

let explorationIndex = 0;
let explorationLocked = false;
let nextExplorationSceneIndex = -1;

/* ============ ITEMS ============ */

const items = {
  key: { name: "Ornate Key", icon: "🔑", description: "A mysterious key" },
  scroll: { name: "Ancient Scroll", icon: "📜", description: "A weathered scroll" },
  crystal: { name: "Crystal", icon: "💎", description: "A glowing crystal" },
  map: { name: "Map Fragment", icon: "🗺️", description: "Part of a larger map" },
  gem: { name: "Gem", icon: "✨", description: "A precious gem" }
};

function showExplorationImage() {
  sceneImage.src = explorationScenes[explorationIndex].image;
  showCollectables();
}

function showCollectables() {
  collectablesLayer.innerHTML = "";
  const scene = explorationScenes[explorationIndex];
  
  if (!scene.collectables) return;
  
  scene.collectables.forEach((collectable, idx) => {
    const item = items[collectable.itemId];
    if (!item) return;
    
    const el = document.createElement("div");
    el.className = "collectable";
    el.textContent = item.icon;
    el.style.left = collectable.x;
    el.style.top = collectable.y;
    el.onclick = (e) => {
      e.stopPropagation();
      pickupItem(collectable.itemId, idx);
    };
    
    collectablesLayer.appendChild(el);
  });
}

function playExplorationVideo(src, callback) {
  explorationVideo.src = src;
  explorationVideo.style.display = "block";
  explorationVideo.currentTime = 0;
  explorationVideo.play();

  explorationVideo.onended = () => {
    explorationVideo.pause();
    explorationVideo.style.display = "none";
    explorationVideo.src = "";
    callback?.();
  };
}

function pickupItem(itemId, index) {
  const item = items[itemId];
  player.inventory.push(itemId);
  updateInventoryDisplay();
  
  // Remove from scene
  const scene = explorationScenes[explorationIndex];
  if (scene.collectables) {
    scene.collectables.splice(index, 1);
    showCollectables();
  }
}

function updateInventoryDisplay() {
  inventoryItems.innerHTML = "";
  if (player.inventory.length === 0) {
    inventoryItems.innerHTML = "<div style='color: rgba(255,255,255,0.5); font-size: 11px;'>Empty</div>";
    return;
  }
  
  player.inventory.forEach(itemId => {
    const item = items[itemId];
    const el = document.createElement("div");
    el.className = "inventoryItem";
    el.textContent = `${item.icon} ${item.name}`;
    inventoryItems.appendChild(el);
  });
}

function fadeToNextExplorationScene() {
  const duration = explorationScenes[explorationIndex].duration;
  sceneImage.style.transition = `opacity ${duration}ms ease`;
  sceneImage.style.opacity = 0;

  setTimeout(() => {
    explorationIndex += 1;

    // Loop back to hub if we've finished spire_back
    if (explorationIndex >= explorationScenes.length) {
      explorationIndex = 0;
      nextExplorationSceneIndex = -1; // Reset when looping
    }

    const currentScene = explorationScenes[explorationIndex];
    showExplorationImage();
    sceneImage.style.opacity = 1;

    const intro = currentScene.intro;
    if (intro) {
      playExplorationVideo(intro);
    }

    // Check if next click should trigger fight
    if (currentScene.beforeFight) {
      nextExplorationSceneIndex = explorationIndex + 1;
    } else {
      nextExplorationSceneIndex = -1;  // Clear it when NOT before fight
    }

    explorationLocked = false;
  }, duration);
}

function nextExplorationScene() {
  if (explorationLocked) return;
  explorationLocked = true;

  // Check if current scene is beforeFight - start fight
  if (explorationScenes[explorationIndex].beforeFight) {
    nextExplorationSceneIndex = explorationIndex + 1;
    startCombatFromExploration(explorationIndex);
    return;
  }

  const outro = explorationScenes[explorationIndex].video;
  if (outro) {
    playExplorationVideo(outro, fadeToNextExplorationScene);
  } else {
    fadeToNextExplorationScene();
  }
}

/* ============ COMBAT ============ */

const gameSection = document.getElementById("game");
const gameSceneImage = document.getElementById("gameSceneImage");
const enemyLayer = document.getElementById("enemyLayer");
const gameVideo = document.getElementById("gameVideo");
const qteUI = document.getElementById("qte");
const deathScreen = document.getElementById("deathScreen");
const tryAgainBtn = document.getElementById("tryAgainBtn");

const playerHPBar = document.getElementById("playerHP");
const enemyHPBar = document.getElementById("enemyHP");

const player = {
  maxHp: 100,
  hp: 100,
  baseDamage: 18,
  inventory: []
};

let activeEnemy = null;
let qteActive = false;
let qteKey = null;
let qteTimer = null;
let qteResult = "fail";
let combatActive = false;

/* ---------------- ENEMIES ---------------- */

const enemies = {
  guardian: {
    name: "Guardian",
    maxHp: 120,
    hp: 120,
    damage: 22,

    idle: "assets/enemies/guardian/idle.png",
    defeated: "assets/enemies/guardian/defeated.png",
    dieVideo: "assets/enemies/guardian/die.mp4",

    attacks: [
        { video: "assets/enemies/guardian/attack0.mp4", qtes:[ { time: 0.9, key: "a", window: 0.9 } ] },
        { video: "assets/enemies/guardian/attack1.mp4", qtes:[ { time: 1.1, key: "d", window: 0.9 } ] },
        { video: "assets/enemies/guardian/attack2.mp4", qtes:[ { time: 0.6, key: "a", window: 0.8 }, { time: 1.6, key: "d", window: 0.8 } ] },
        { video: "assets/enemies/guardian/attack3.mp4", qtes:[ { time: 1.2, key: "d", window: 1.0 } ] }
      ]
  }
};

/* ---------------- SCENES ---------------- */

const scenes = {
  bridgeGuardian: {
    background: "assets/scenes/bridge.png",
    enemy: "guardian"
  }
};

function loadScene(sceneId) {
  const scene = scenes[sceneId];

  gameVideo.style.display = "none";
  gameSceneImage.style.display = "block";
  gameSceneImage.src = scene.background;

  enemyLayer.innerHTML = "";

  if (scene.enemy) spawnEnemy(scene.enemy);
}

/* ---------------- ENEMY ---------------- */

function spawnEnemy(enemyId) {
  activeEnemy = structuredClone(enemies[enemyId]);
  activeEnemy.hp = activeEnemy.maxHp;

  const img = document.createElement("img");
  img.src = activeEnemy.idle;
  img.style = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;cursor:pointer;";
  img.onclick = () => { combatActive = true; startEnemyAttack(); };

  enemyLayer.appendChild(img);
  activeEnemy.element = img;

  updateBars();
}

/* ---------------- COMBAT ---------------- */

function startEnemyAttack() {
  if (!activeEnemy || qteActive) return;

  const attack = activeEnemy.attacks[Math.floor(Math.random() * activeEnemy.attacks.length)];
  playVideo(attack, () => {
    // nothing to do here; QTEs happen during the video
  });
}

function startQTE(key, windowLen = 0.9, onComplete) {
  if (!activeEnemy) return;
  qteActive = true;
  qteKey = key;
  qteResult = "half";

  qteUI.textContent = `PRESS ${key.toUpperCase()}`;
  qteUI.style.opacity = 1;

  qteTimer = setTimeout(() => {
    // time elapsed without correct press
    endQTE();
    onComplete?.(qteResult);
  }, Math.round(windowLen * 1000));
}

function endQTE() {
  if (!qteActive) return;
  qteActive = false;
  qteUI.style.opacity = 0;
  clearTimeout(qteTimer);

  if (qteResult === "success") damageEnemy(player.baseDamage);
  else if (qteResult === "half") damagePlayer(activeEnemy.damage / 2);
  else damagePlayer(activeEnemy.damage);

  if (activeEnemy && activeEnemy.hp <= 0) killEnemy();
}

document.addEventListener("keydown", e => {
  if (!qteActive) return;

  qteResult = (e.key.toLowerCase() === qteKey) ? "success" : "fail";
  endQTE();
});

/* ---------------- DAMAGE ---------------- */

function damageEnemy(dmg) {
  activeEnemy.hp -= dmg;
  flash(enemyLayer);
  updateBars();
}

function damagePlayer(dmg) {
  player.hp -= dmg;
  flash(document.body);
  updateBars();

  if (player.hp <= 0) {
    combatActive = false;
    showDeathScreen();
  }
}

function updateBars() {
  playerHPBar.style.width = `${(player.hp / player.maxHp) * 100}%`;
  enemyHPBar.style.width = `${(activeEnemy.hp / activeEnemy.maxHp) * 100}%`;
}

/* ---------------- DEATH ---------------- */

function killEnemy() {
  combatActive = false;
  playVideo(activeEnemy.dieVideo, () => {
    activeEnemy.element.src = activeEnemy.defeated;
    activeEnemy.element.onclick = null;
    
    // Show continue prompt if we need to resume exploration
    if (nextExplorationSceneIndex >= 0) {
      hintText.style.display = "block";
      document.body.onclick = (event) => {
        event.stopPropagation();
        document.body.onclick = null;
        resumeExploration();
      };
    }
  });
}

function resumeExploration() {
  document.body.onclick = null;
  hintText.style.display = "none";
  explorationIndex = nextExplorationSceneIndex;
  nextExplorationSceneIndex = -1;
  gameSection.style.display = "none";
  explorationSection.style.display = "block";
  showExplorationImage();
  sceneImage.style.opacity = 1;
  explorationLocked = true; // Lock to prevent clicks during auto-advance
  
  // Auto-advance after showing the afterFight scene
  if (explorationScenes[explorationIndex].afterFight) {
    setTimeout(() => {
      fadeToNextExplorationScene();
    }, 2000);
  } else {
    explorationLocked = false;
  }
}

function showDeathScreen() {
  deathScreen.style.display = "flex";
}

/* ---------------- VIDEO ---------------- */

function playVideo(attackOrSrc, onEnd) {
  // attackOrSrc can be a string (simple video) or an attack object with .video and .qtes
  const isString = (typeof attackOrSrc === 'string');
  const attack = isString ? null : attackOrSrc;
  const src = isString ? attackOrSrc : attack.video;

  enemyLayer.style.display = "none";

  gameSceneImage.style.display = "none";
  gameVideo.style.display = "block";
  gameVideo.src = src;
  gameVideo.play();

  // if attack defines qtes, schedule them during playback
  if (attack && Array.isArray(attack.qtes)) {
    const events = attack.qtes.map(e => ({...e, triggered:false}));

    const onTimeUpdate = () => {
      const t = gameVideo.currentTime;
      for (const ev of events) {
        if (!ev.triggered && t >= ev.time) {
          ev.triggered = true;
          // open a QTE window; damage happens when QTE ends
          startQTE(ev.key, ev.window ?? 0.9, () => {});
        }
      }
    };

    gameVideo.addEventListener('timeupdate', onTimeUpdate);

    gameVideo.onended = () => {
      gameVideo.removeEventListener('timeupdate', onTimeUpdate);
      gameVideo.style.display = "none";
      gameSceneImage.style.display = "block";
      enemyLayer.style.display = "block";
      onEnd?.();
    };
  } else {
    gameVideo.onended = () => {
      gameVideo.style.display = "none";
      gameSceneImage.style.display = "block";
      enemyLayer.style.display = "block";
      onEnd?.();
    };
  }
}

/* ---------------- FX ---------------- */

function flash(el) {
  el.animate([{filter:"brightness(3)"},{filter:"brightness(1)"}],{duration:120});
}

/* ============ DEATH & RESTART ============ */

function tryAgain() {
  deathScreen.style.display = "none";
  player.hp = player.maxHp;
  activeEnemy = null;
  nextExplorationSceneIndex = -1;
  combatActive = false;
  
  // Go back to hub
  explorationIndex = 0;
  gameSection.style.display = "none";
  explorationSection.style.display = "block";
  showExplorationImage();
  sceneImage.style.opacity = 1;
  explorationLocked = false;
}

tryAgainBtn.onclick = tryAgain;

function startCombatFromExploration(resumeSceneIndex) {
  explorationSection.style.display = "none";
  gameSection.style.display = "block";
  // Don't override nextExplorationSceneIndex - it's already set by the caller
  loadScene("bridgeGuardian");
}

/* ============ INITIALIZATION ============ */

// Ensure exploration is shown and game is hidden
explorationSection.style.display = "block";
gameSection.style.display = "none";

// Start exploration
showExplorationImage();
if (explorationScenes[0].intro) playExplorationVideo(explorationScenes[0].intro);
updateInventoryDisplay();

document.body.addEventListener("click", () => {
  if (explorationSection.style.display !== "none") {
    nextExplorationScene();
  }
});

document.addEventListener("keydown", e => {
  if (explorationSection.style.display !== "none") {
    if (e.code === "Space" || e.code === "ArrowRight") nextExplorationScene();
  }
});