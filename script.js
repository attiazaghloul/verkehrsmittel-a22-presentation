const slides = Array.from(document.querySelectorAll(".slide"));
const progressBar = document.getElementById("progressBar");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const scriptToggle = document.getElementById("scriptToggle");
const scriptDrawer = document.getElementById("scriptDrawer");
const closeScript = document.getElementById("closeScript");
const printBtn = document.getElementById("printBtn");
const audioBtn = document.getElementById("audioBtn");
const drawerAudioBtn = document.getElementById("drawerAudioBtn");
const audioSpeed = document.getElementById("audioSpeed");

let currentSlide = 0;
let currentStep = 0;
let audioManifest = [];
let flatAudioLines = [];
let isAudioPlaying = false;
let audioRunId = 0;
let activeAudio = null;
let currentAudioButton = null;

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
  if (audioBtn) {
    audioBtn.textContent = playing && currentAudioButton === audioBtn ? "Stop" : "Audio";
    audioBtn.setAttribute("aria-pressed", String(playing && currentAudioButton === audioBtn));
  }

  if (drawerAudioBtn) {
    drawerAudioBtn.textContent = playing && currentAudioButton === drawerAudioBtn ? "Stop" : "Play full script";
    drawerAudioBtn.setAttribute("aria-pressed", String(playing && currentAudioButton === drawerAudioBtn));
  }
}

function clearActiveScriptLine() {
  document.querySelectorAll(".script-content p.audio-active").forEach((line) => {
    line.classList.remove("audio-active");
  });
}

function setActiveScriptLine(line) {
  clearActiveScriptLine();
  if (!line?.element) return;
  line.element.classList.add("audio-active");
  if (scriptDrawer.classList.contains("open")) {
    line.element.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function getPlaybackRate() {
  const rate = Number(audioSpeed?.value || "1");
  return Number.isFinite(rate) ? rate : 1;
}

function stopAudio() {
  audioRunId += 1;
  isAudioPlaying = false;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  currentAudioButton = null;
  clearActiveScriptLine();
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
    currentAudioButton = null;
    clearActiveScriptLine();
    updateAudioButton(false);
    return;
  }

  const line = lines[index];
  setActiveScriptLine(line);
  activeAudio = new Audio(line.src);
  activeAudio.preload = "auto";
  activeAudio.playbackRate = getPlaybackRate();
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
  currentAudioButton = audioBtn;
  updateAudioButton(true);
  playAudioLines(lines, 0, audioRunId);
}

function playFullScriptAudio() {
  if (isAudioPlaying && currentAudioButton === drawerAudioBtn) {
    stopAudio();
    return;
  }
  stopAudio();
  if (!flatAudioLines.length) {
    alert("Audio-Dateien werden noch geladen. Bitte versuche es gleich noch einmal.");
    return;
  }

  audioRunId += 1;
  isAudioPlaying = true;
  currentAudioButton = drawerAudioBtn;
  updateAudioButton(true);
  playAudioLines(flatAudioLines, 0, audioRunId);
}

function playScriptFromLine(startIndex) {
  stopAudio();
  if (!flatAudioLines.length || startIndex < 0) return;

  audioRunId += 1;
  isAudioPlaying = true;
  currentAudioButton = drawerAudioBtn;
  updateAudioButton(true);
  playAudioLines(flatAudioLines.slice(startIndex), 0, audioRunId);
}

function wireScriptLineClicks() {
  const paragraphs = Array.from(document.querySelectorAll(".script-content article p"));
  flatAudioLines = audioManifest.flatMap((slide) => slide);

  paragraphs.forEach((paragraph, index) => {
    const line = flatAudioLines[index];
    if (!line) return;
    line.element = paragraph;
    paragraph.classList.add("script-line");
    paragraph.setAttribute("tabindex", "0");
    paragraph.setAttribute("role", "button");
    paragraph.setAttribute("title", "Ab hier vorlesen");
    paragraph.dataset.audioIndex = String(index);

    paragraph.addEventListener("click", () => playScriptFromLine(index));
    paragraph.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        playScriptFromLine(index);
      }
    });
  });
}

fetch("assets/audio/script-audio.json?v=audio-files-20260707")
  .then((response) => response.json())
  .then((manifest) => {
    audioManifest = manifest;
    wireScriptLineClicks();
  })
  .catch(() => {
    if (audioBtn) {
      audioBtn.disabled = true;
      audioBtn.textContent = "No Audio";
    }
    if (drawerAudioBtn) {
      drawerAudioBtn.disabled = true;
      drawerAudioBtn.textContent = "No Audio";
    }
  });

nextBtn.addEventListener("click", next);
prevBtn.addEventListener("click", prev);
printBtn.addEventListener("click", () => window.print());
audioBtn.addEventListener("click", playCurrentScriptAudio);
drawerAudioBtn.addEventListener("click", playFullScriptAudio);
audioSpeed.addEventListener("change", () => {
  if (activeAudio) activeAudio.playbackRate = getPlaybackRate();
});
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
