const slides = Array.from(document.querySelectorAll(".slide"));
const progressBar = document.getElementById("progressBar");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const audioBtn = document.getElementById("audioBtn");
const drawerAudioBtn = document.getElementById("drawerAudioBtn");
const audioSpeed = document.getElementById("audioSpeed");
const scriptToggle = document.getElementById("scriptToggle");
const scriptDrawer = document.getElementById("scriptDrawer");
const closeScript = document.getElementById("closeScript");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const printBtn = document.getElementById("printBtn");
const scriptArticles = Array.from(document.querySelectorAll("[data-script-slide]"));
const scriptLines = Array.from(document.querySelectorAll(".script-content article p"));
const audioPlayer = new Audio();

let currentSlide = 0;
let currentStep = 0;
let audioRun = 0;
let speaking = false;
let activeSpeechButton = null;
let activeAudio = audioPlayer;
let audioManifest = [];
let slideAudioLines = [];
let allAudioLines = [];
let touchStartX = 0;
let touchStartY = 0;

function maxStepFor(slide) {
  return Number(slide.dataset.steps || "0");
}

function updateReveals(slide) {
  slide.querySelectorAll(".reveal").forEach((item) => {
    const itemStep = Number(item.dataset.step || "1");
    item.classList.toggle("visible", itemStep <= currentStep);
  });
}

function updateSlide() {
  slides.forEach((slide, index) => {
    const active = index === currentSlide;
    slide.classList.toggle("active", active);
    slide.setAttribute("aria-hidden", String(!active));
    if (active) updateReveals(slide);
  });

  scriptArticles.forEach((article, index) => article.classList.toggle("current", index === currentSlide));

  const totalUnits = slides.reduce((sum, slide) => sum + maxStepFor(slide) + 1, 0);
  const pastUnits = slides.slice(0, currentSlide).reduce((sum, slide) => sum + maxStepFor(slide) + 1, 0);
  const progress = ((pastUnits + currentStep + 1) / totalUnits) * 100;
  progressBar.style.width = `${Math.min(progress, 100)}%`;

  const hash = `#folie-${currentSlide + 1}`;
  if (location.hash !== hash) history.replaceState(null, "", hash);
}

function next() {
  stopSpeech();
  const maxStep = maxStepFor(slides[currentSlide]);
  if (currentStep < maxStep) currentStep += 1;
  else if (currentSlide < slides.length - 1) {
    currentSlide += 1;
    currentStep = 0;
  }
  updateSlide();
}

function previous() {
  stopSpeech();
  if (currentStep > 0) currentStep -= 1;
  else if (currentSlide > 0) {
    currentSlide -= 1;
    currentStep = maxStepFor(slides[currentSlide]);
  }
  updateSlide();
}

function openScriptDrawer() {
  scriptDrawer.classList.add("open");
  scriptDrawer.inert = false;
  scriptToggle.setAttribute("aria-expanded", "true");
  scriptToggle.textContent = "Skript schließen";
  scriptArticles[currentSlide]?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function closeScriptDrawer() {
  scriptDrawer.classList.remove("open");
  scriptDrawer.inert = true;
  scriptToggle.setAttribute("aria-expanded", "false");
  scriptToggle.textContent = "Skript zeigen";
}

function clearActiveSpeechLine() {
  scriptLines.forEach((line) => line.classList.remove("audio-active"));
}

function updateSpeechButtons() {
  audioBtn.textContent = speaking && activeSpeechButton === audioBtn ? "Stopp" : "Audio";
  audioBtn.setAttribute("aria-pressed", String(speaking && activeSpeechButton === audioBtn));
  drawerAudioBtn.textContent = speaking && activeSpeechButton === drawerAudioBtn ? "Vorlesen stoppen" : "Ganzes Skript vorlesen";
}

function stopSpeech() {
  audioRun += 1;
  speaking = false;
  activeSpeechButton = null;
  activeAudio.pause();
  activeAudio.onended = null;
  activeAudio.onerror = null;
  activeAudio.removeAttribute("src");
  activeAudio.load();
  clearActiveSpeechLine();
  updateSpeechButtons();
}

async function playLines(lines, index, runId) {
  if (!speaking || runId !== audioRun) return;
  if (index >= lines.length) {
    stopSpeech();
    return;
  }

  const line = lines[index].element;
  clearActiveSpeechLine();
  line.classList.add("audio-active");
  if (scriptDrawer.classList.contains("open")) line.scrollIntoView({ block: "center", behavior: "smooth" });

  activeAudio.src = lines[index].src;
  activeAudio.playbackRate = Number(audioSpeed.value || ".95");
  activeAudio.onended = () => playLines(lines, index + 1, runId);
  activeAudio.onerror = () => playLines(lines, index + 1, runId);
  try {
    await activeAudio.play();
  } catch {
    if (runId === audioRun) stopSpeech();
  }
}

function startSpeech(lines, button) {
  if (!lines.length) return;
  stopSpeech();
  audioRun += 1;
  const runId = audioRun;
  speaking = true;
  activeSpeechButton = button;
  updateSpeechButtons();
  playLines(lines, 0, runId);
}

function toggleCurrentSlideSpeech() {
  if (speaking && activeSpeechButton === audioBtn) return stopSpeech();
  startSpeech(slideAudioLines[currentSlide] || [], audioBtn);
}

function toggleFullSpeech() {
  if (speaking && activeSpeechButton === drawerAudioBtn) return stopSpeech();
  startSpeech(allAudioLines, drawerAudioBtn);
}

async function loadAudioManifest() {
  audioBtn.disabled = true;
  drawerAudioBtn.disabled = true;
  try {
    const response = await fetch("assets/audio/script-audio.json?v=2");
    if (!response.ok) throw new Error("Audiodateien konnten nicht geladen werden.");
    audioManifest = await response.json();
    let lineIndex = 0;
    slideAudioLines = audioManifest.map((slide) => slide.map((entry) => ({
      ...entry,
      element: scriptLines[lineIndex++],
    })));
    allAudioLines = slideAudioLines.flat();
    if (lineIndex !== scriptLines.length || allAudioLines.some((line) => !line.element)) {
      throw new Error("Skript und Audiodateien passen nicht zusammen.");
    }
    audioBtn.disabled = false;
    drawerAudioBtn.disabled = false;
  } catch (error) {
    audioBtn.title = error.message;
    drawerAudioBtn.title = error.message;
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}

prevBtn.addEventListener("click", previous);
nextBtn.addEventListener("click", next);
audioBtn.addEventListener("click", toggleCurrentSlideSpeech);
drawerAudioBtn.addEventListener("click", toggleFullSpeech);
audioSpeed.addEventListener("change", () => {
  if (activeAudio) activeAudio.playbackRate = Number(audioSpeed.value || ".95");
});
scriptToggle.addEventListener("click", () => scriptDrawer.classList.contains("open") ? closeScriptDrawer() : openScriptDrawer());
closeScript.addEventListener("click", closeScriptDrawer);
fullscreenBtn.addEventListener("click", toggleFullscreen);
printBtn.addEventListener("click", () => window.print());

scriptLines.forEach((line, index) => {
  line.tabIndex = 0;
  line.setAttribute("role", "button");
  line.setAttribute("title", "Ab hier vorlesen");
  const playFromHere = () => startSpeech(allAudioLines.slice(index), drawerAudioBtn);
  line.addEventListener("click", playFromHere);
  line.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      playFromHere();
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
    event.preventDefault();
    next();
  }
  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    previous();
  }
  if (event.key === "Escape") closeScriptDrawer();
});

document.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].screenX;
  touchStartY = event.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener("touchend", (event) => {
  if (scriptDrawer.classList.contains("open")) return;
  const dx = event.changedTouches[0].screenX - touchStartX;
  const dy = event.changedTouches[0].screenY - touchStartY;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) dx < 0 ? next() : previous();
}, { passive: true });

window.addEventListener("hashchange", () => {
  const match = location.hash.match(/folie-(\d+)/);
  if (!match) return;
  const index = Math.min(slides.length - 1, Math.max(0, Number(match[1]) - 1));
  if (index !== currentSlide) {
    currentSlide = index;
    currentStep = 0;
    stopSpeech();
    updateSlide();
  }
});

const initialMatch = location.hash.match(/folie-(\d+)/);
if (initialMatch) currentSlide = Math.min(slides.length - 1, Math.max(0, Number(initialMatch[1]) - 1));
updateSlide();
loadAudioManifest();
