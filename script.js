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
let voices = [];
let isAudioPlaying = false;
let audioRunId = 0;

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

function loadVoices() {
  if (!("speechSynthesis" in window)) return [];
  voices = window.speechSynthesis.getVoices();
  return voices;
}

function getGermanVoices() {
  const allVoices = voices.length ? voices : loadVoices();
  return allVoices.filter((voice) => {
    const lang = voice.lang || "";
    const name = voice.name || "";
    return /^de([-_]|$)/i.test(lang) || /deutsch|german/i.test(name);
  });
}

function scoreVoice(voice, speaker) {
  const name = (voice.name || "").toLowerCase();
  const lang = (voice.lang || "").toLowerCase();
  const femaleHints = ["katja", "hedda", "anna", "vicki", "marlene", "female", "frau"];
  const maleHints = ["conrad", "stefan", "klaus", "male", "mann"];
  const speakerHints = speaker === "Attia" ? maleHints : femaleHints;
  let score = 0;

  if (lang === "de-de") score += 80;
  if (lang.startsWith("de")) score += 40;
  if (/natural|neural|online/.test(name)) score += 28;
  if (/microsoft/.test(name)) score += 18;
  if (/google/.test(name)) score += 12;
  if (speakerHints.some((hint) => name.includes(hint))) score += 80;
  if (/deutsch|german/.test(name)) score += 20;

  return score;
}

function chooseVoice(speaker) {
  const germanVoices = getGermanVoices();
  if (!germanVoices.length) return null;
  return germanVoices
    .slice()
    .sort((a, b) => scoreVoice(b, speaker) - scoreVoice(a, speaker))[0];
}

function getCurrentScriptLines() {
  const articles = Array.from(document.querySelectorAll(".script-content article"));
  const article = articles[currentSlide];
  if (!article) return [];

  return Array.from(article.querySelectorAll("p"))
    .map((paragraph) => {
      const text = paragraph.textContent.trim();
      const speakerMatch = text.match(/^(Laila|Attia):\s*(.+)$/);
      if (!speakerMatch) return null;
      return {
        speaker: speakerMatch[1],
        text: speakerMatch[2],
      };
    })
    .filter(Boolean);
}

function updateAudioButton(playing) {
  if (!audioBtn) return;
  audioBtn.textContent = playing ? "Stop" : "Audio";
  audioBtn.setAttribute("aria-pressed", String(playing));
}

function stopAudio() {
  if (!("speechSynthesis" in window)) return;
  audioRunId += 1;
  isAudioPlaying = false;
  window.speechSynthesis.cancel();
  updateAudioButton(false);
}

function speakLines(lines, index, runId) {
  if (!isAudioPlaying || runId !== audioRunId) return;
  if (index >= lines.length) {
    isAudioPlaying = false;
    updateAudioButton(false);
    return;
  }

  const line = lines[index];
  const utterance = new SpeechSynthesisUtterance(line.text);
  utterance.lang = "de-DE";
  utterance.voice = chooseVoice(line.speaker);
  utterance.rate = line.speaker === "Attia" ? 0.9 : 0.94;
  utterance.pitch = line.speaker === "Attia" ? 0.86 : 1.08;
  utterance.volume = 1;

  utterance.onend = () => speakLines(lines, index + 1, runId);
  utterance.onerror = () => speakLines(lines, index + 1, runId);
  window.speechSynthesis.speak(utterance);
}

function playCurrentScriptAudio() {
  if (!("speechSynthesis" in window)) {
    alert("Audio wird in diesem Browser leider nicht unterstützt.");
    return;
  }

  if (isAudioPlaying) {
    stopAudio();
    return;
  }

  const lines = getCurrentScriptLines();
  if (!lines.length) return;

  loadVoices();
  audioRunId += 1;
  isAudioPlaying = true;
  updateAudioButton(true);
  speakLines(lines, 0, audioRunId);
}

if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

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
