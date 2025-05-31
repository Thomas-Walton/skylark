const startScreen = document.getElementById("startScreen");
const introContent = document.getElementById("introContent");
const gameScreen = document.getElementById("game");
const storyText = document.getElementById("storyText");
const choicesDiv = document.getElementById("choices");
const sceneImage = document.getElementById("sceneImage");
const scoreDisplay = document.getElementById("scoreDisplay");
const inventoryDisplay = document.getElementById("inventoryDisplay");
const muteButton = document.getElementById("muteButton");
const restartButton = document.getElementById("restart");
const toggleAnimationsButton = document.getElementById("toggleAnimations");
const startGameButton = document.getElementById("startGameButton");
const continueButton = document.getElementById("continueButton");
const backgroundMusic = document.getElementById("myAudio");
let gameData = null;
let state = null;
let isMuted = false;
let animationsEnabled = true;

// Fallback JSON if fetch fails
const fallbackData = {
  initialScene: "scene1",
  initialState: { inventory: [], alignment: "Seaton", score: 0 },
  scenes: {
    scene1: {
      id: "scene1",
      description: "Fallback: You are Richard Seaton in a Norlaminian lab. Rovol says, ‘DuQuesne threatens Dorothy. Act now!’ Will you pursue or prepare?",
      image: "images/fallback_scene.jpg",
      scoreChange: 0,
      choices: [
        { text: "Pursue DuQuesne.", nextScene: "scene1", stateChange: { score: 5 } },
        { text: "Prepare with Rovol.", nextScene: "scene1", stateChange: { score: 5 } }
      ]
    }
  }
};

async function initializeGame() {
  try {
    // Try primary path
    let response = await fetch("./scenes.json");
    if (!response.ok) {
      console.warn(`Fetch failed for ./scenes.json: ${response.status} ${response.statusText}`);
      // Retry alternate path
      response = await fetch("scenes.json");
      if (!response.ok) {
        throw new Error(`Failed to load scenes.json: ${response.status} ${response.statusText}`);
      }
    }
    gameData = await response.json();
    if (!gameData.initialScene || !gameData.scenes || !gameData.initialState) {
      throw new Error("Invalid scenes.json structure: missing initialScene, scenes, or initialState");
    }
    console.log("scenes.json loaded successfully:", gameData);
  } catch (error) {
    console.error("Fetch error, using fallback data:", error);
    gameData = fallbackData;
    showError(`Failed to load scenes: ${error.message}. Using fallback mode.`);
  }

  try {
    state = JSON.parse(JSON.stringify(gameData.initialState));
    startScreen.style.display = "block";
    introContent.style.display = "none";
    gameScreen.style.display = "none";
    scoreDisplay.textContent = `Score: ${state.score}`;
    inventoryDisplay.textContent = "Items: None";

    if (!startGameButton) {
      throw new Error("startGameButton element not found in DOM");
    }

    startGameButton.addEventListener("click", () => {
      console.log("StartGameButton clicked");
      startScreen.style.display = "none";
      introContent.style.display = "block";
      console.log("Showing introContent");
    });

    if (continueButton) {
      continueButton.addEventListener("click", () => {
        console.log("ContinueButton clicked");
        introContent.style.display = "none";
        gameScreen.style.display = "block";
        gameScreen.classList.remove("hidden");
        try {
          renderScene(gameData.initialScene);
          console.log(`Rendering scene: ${gameData.initialScene}`);
          if (!isMuted) {
            backgroundMusic.play().catch(err => console.error("Audio playback failed:", err));
          }
        } catch (err) {
          console.error("Render error:", err);
          showError(`Failed to render initial scene: ${err.message}`);
        }
      });
    }

    muteButton.addEventListener("click", toggleMute);
    restartButton.addEventListener("click", restartGame);
    toggleAnimationsButton.addEventListener("click", toggleAnimations);
  } catch (error) {
    console.error("Initialization error:", error);
    showError(`Error initializing game: ${error.message}`);
  }
}

function toggleMute() {
  isMuted = !isMuted;
  backgroundMusic.muted = isMuted;
  muteButton.textContent = isMuted ? "Unmute" : "Mute";
}

function toggleAnimations() {
  animationsEnabled = !animationsEnabled;
  document.body.classList.toggle("no-animations", !animationsEnabled);
  toggleAnimationsButton.textContent = animationsEnabled ? "Animations: On" : "Animations: Off";
}

function restartGame() {
  state = JSON.parse(JSON.stringify(gameData.initialState));
  scoreDisplay.textContent = `Score: ${state.score}`;
  inventoryDisplay.textContent = "Items: None";
  inventoryDisplay.classList.remove("active");
  document.body.classList.remove("no-animations");
  animationsEnabled = true;
  toggleAnimationsButton.textContent = "Animations: On";
  startScreen.style.display = "block";
  introContent.style.display = "none";
  gameScreen.style.display = "none";
}

function showError(message) {
  const errorDiv = document.getElementById("errorDisplay") || document.createElement("div");
  errorDiv.id = "errorDisplay";
  errorDiv.innerHTML = `${message}<br><button id="dismissError" aria-label="Dismiss error message">Dismiss</button>`;
  errorDiv.classList.add("active");
  gameScreen.appendChild(errorDiv);
  document.getElementById("dismissError").addEventListener("click", () => {
    errorDiv.classList.remove("active");
  });
}

function renderScene(sceneId) {
  const scene = gameData.scenes[sceneId];
  if (!scene) {
    console.error(`Scene not found: ${sceneId}`);
    showError(`Scene not found: ${sceneId}`);
    return;
  }

  console.log(`Rendering scene ${sceneId}:`, scene.description);

  const rovolScenes = ["scene1", "scene3", "scene6"];
  if (rovolScenes.includes(sceneId)) {
    storyText.classList.add("rovol");
  } else {
    storyText.classList.remove("rovol");
  }

  storyText.textContent = scene.description;

  // Preload image to avoid flicker
  const img = new Image();
  const imageSrc = scene.image || "images/fallback_scene.jpg";
  img.src = imageSrc;
  img.onload = () => {
    sceneImage.src = imageSrc;
    sceneImage.alt = scene.image ? `Scene: ${scene.id}` : "Default scene image";
  };
  img.onerror = () => {
    console.warn(`Image load failed, using fallback: ${scene.image}`);
    sceneImage.src = "images/fallback_scene.jpg";
    sceneImage.alt = "Default scene image";
  };

  choicesDiv.innerHTML = "";

  state.score += scene.scoreChange || 0;
  scoreDisplay.textContent = `Score: ${state.score}`;

  inventoryDisplay.textContent = `Items: ${state.inventory.join(", ") || "None"}`;
  inventoryDisplay.classList.toggle("active", state.inventory.length > 0);

  scene.choices.forEach((choice, index) => {
  if (!choice.condition || state.inventory.includes(choice.condition.inventory)) {
    const choiceCard = document.createElement("div");
    choiceCard.className = "choice-card";
    choiceCard.textContent = choice.text;
    choiceCard.addEventListener("click", () => {
      console.log(`Choice selected: ${choice.text}`);
      choiceCard.classList.add("selected");
      setTimeout(() => choiceCard.classList.remove("selected"), 500);
      if (choice.stateChange) {
        Object.keys(choice.stateChange).forEach(key => {
          if (key === "score") {
            state.score += choice.stateChange.score;
          } else if (Array.isArray(state[key])) {
            state[key].push(...choice.stateChange[key]);
          } else {
            state[key] = choice.stateChange[key];
          }
        });
      }
      scoreDisplay.textContent = `Score: ${state.score}`;
      inventoryDisplay.textContent = `Items: ${state.inventory.join(", ") || "None"}`;
      inventoryDisplay.classList.toggle("active", state.inventory.length > 0);
      renderScene(choice.nextScene);
    });
    choicesDiv.appendChild(choiceCard);
  }
});
}

initializeGame();