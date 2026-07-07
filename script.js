const slides = Array.from(document.querySelectorAll(".slide"));
const progressBar = document.getElementById("progressBar");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const scriptToggle = document.getElementById("scriptToggle");
const scriptDrawer = document.getElementById("scriptDrawer");
const closeScript = document.getElementById("closeScript");
const printBtn = document.getElementById("printBtn");
const audioBtn = document.getElementById("audioBtn");

let currentSlide = 0;
let currentStep = 0;
let audioManifest = [];
let isAudioPlaying = false;
let audioRunId = 0;
let activeAudio = null;

document.querySelectorAll("[data-image-ref]").forEach((element) => {
  const imageRef = element.getAttribute("data-image-ref");
  if (!imageRef) return;
  element.style.backgroundImage = `url("${imageRef}")`;
  element.classList.add("real-image");
});

function maxStepFor(slide) {
  return Number(slide.dataset.steps || "1");
}

function updateReveals(slide) {
  const reveals = slide.querySelectorAll(".reveal");
  reveals.forEach((item) => {
    const itemStep = Number(item.dataset.step || "1");
    item.classList.toggle("visible", itemStep <= currentStep);
  });
}

function updateSlide() {
  slides.forEach((slide, index) => {
    const isActive = index === currentSlide;
    slide.classList.toggle("active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
    if (isActive) updateReveals(slide);
  });

  const totalUnits = slides.reduce((sum, slide) => sum + maxStepFor(slide) + 1, 0);
  const previousUnits = slides
    .slice(0, currentSlide)
    .reduce((sum, slide) => sum + maxStepFor(slide) + 1, 0);
  const progress = ((previousUnits + currentStep + 1) / totalUnits) * 100;
  progressBar.style.width = `${Math.min(progress, 100)}%`;
}

function next() {
  stopAudio();
  const maxStep = maxStepFor(slides[currentSlide]);
  if (currentStep < maxStep) {
    currentStep += 1;
  } else if (currentSlide < slides.length - 1) {
    currentSlide += 1;
    currentStep = 0;
  }
  updateSlide();
}

function prev() {
  stopAudio();
  if (currentStep > 0) {
    currentStep -= 1;
  } else if (currentSlide > 0) {
    currentSlide -= 1;
    currentStep = maxStepFor(slides[currentSlide]);
  }
  updateSlide();
}

function openScript() {
  scriptDrawer.classList.add("open");
  scriptDrawer.setAttribute("aria-hidden", "false");
  scriptToggle.setAttribute("aria-expanded", "true");
}

function closeScriptDrawer() {
  scriptDrawer.classList.remove("open");
  scriptDrawer.setAttribute("aria-hidden", "true");
  scriptToggle.setAttribute("aria-expanded", "false");
}

function updateAudioButton(playing) {
  if (!audioBtn) return;
  audioBtn.textContent = playing ? "Stop" : "Audio";
  audioBtn.setAttribute("aria-pressed", String(playing));
}

function stopAudio() {
  audioRunId += 1;
  isAudioPlaying = false;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  updateAudioButton(false);
}

function getCurrentAudioLines() {
  return audioManifest[currentSlide] || [];
}

function playAudioLines(lines, index, runId) {
  if (!isAudioPlaying || runId !== audioRunId) return;
  if (index >= lines.length) {
    isAudioPlaying = false;
    activeAudio = null;
    updateAudioButton(false);
    return;
  }

  const line = lines[index];
  activeAudio = new Audio(line.src);
  activeAudio.preload = "auto";
  activeAudio.onended = () => playAudioLines(lines, index + 1, runId);
  activeAudio.onerror = () => playAudioLines(lines, index + 1, runId);
  activeAudio.play().catch(() => {
    isAudioPlaying = false;
    updateAudioButton(false);
    alert("Audio konnte nicht gestartet werden. Bitte tippe noch einmal auf Audio.");
  });
}

function playCurrentScriptAudio() {
  if (isAudioPlaying) {
    stopAudio();
    return;
  }

  const lines = getCurrentAudioLines();
  if (!lines.length) {
    alert("Audio-Dateien werden noch geladen. Bitte versuche es gleich noch einmal.");
    return;
  }

  audioRunId += 1;
  isAudioPlaying = true;
  updateAudioButton(true);
  playAudioLines(lines, 0, audioRunId);
}

fetch("assets/audio/script-audio.json?v=audio-files-20260707")
  .then((response) => response.json())
  .then((manifest) => {
    audioManifest = manifest;
  })
  .catch(() => {
    if (audioBtn) {
      audioBtn.disabled = true;
      audioBtn.textContent = "No Audio";
    }
  });

nextBtn.addEventListener("click", next);
prevBtn.addEventListener("click", prev);
printBtn.addEventListener("click", () => window.print());
audioBtn.addEventListener("click", playCurrentScriptAudio);
scriptToggle.addEventListener("click", () => {
  if (scriptDrawer.classList.contains("open")) {
    closeScriptDrawer();
  } else {
    openScript();
  }
});
closeScript.addEventListener("click", closeScriptDrawer);

document.addEventListener("keydown", (event) => {
  const activeElement = document.activeElement;
  const isTyping = activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
  if (isTyping) return;

  if (event.key === "ArrowRight" || event.key === " ") {
    event.preventDefault();
    next();
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    prev();
  }

  if (event.key === "Escape") {
    closeScriptDrawer();
  }
});

updateSlide();
