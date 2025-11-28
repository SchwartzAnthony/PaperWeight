// modules/ui/soundtrack.js
// Global soundtrack bar that lives outside #app and keeps playing across screens.

import { getUser, setUser } from "../core/state.js";
import { saveUser } from "../core/storage.js";

// Adjust these to your actual file names and labels
const SOUNDTRACKS = {
  workout: {
    id: "workout",
    label: "Workout",
    tracks: [
      {
        title: "Round One",
        src: "./assets/audio/workout_round1.mp3",
      },
      {
        title: "Iron Pace",
        src: "./assets/audio/workout_ironpace.mp3",
      },
    ],
  },
  focus: {
    id: "focus",
    label: "Focus / TCG",
    tracks: [
      {
        title: "Sundream",
        src: "./assets/audio/sundream-327337.mp3",
      },
    ],
  },
  reading: {
    id: "reading",
    label: "Reading / Study",
    tracks: [
      {
        title: "Deep Focus",
        src: "./assets/audio/reading_deepfocus.mp3",
      },
    ],
  },
};



let audioEl = null;
let titleEl = null;
let playBtn = null;
let nextBtn = null;
let modeButtons = [];
let currentMode = "workout";
let currentIndex = 0;

function getCurrentPlaylist() {
  return SOUNDTRACKS[currentMode] || SOUNDTRACKS.workout;
}

function persistMode() {
  const user = getUser() || {};
  const newSettings = {
    ...(user.settings || {}),
    soundtrack_mode: currentMode,
  };
  const updatedUser = { ...user, settings: newSettings };
  setUser(updatedUser);
  saveUser(updatedUser);
}

function loadCurrentTrack() {
  const playlist = getCurrentPlaylist();
  if (!playlist || !playlist.tracks.length) {
    if (titleEl) titleEl.textContent = "No track configured";
    return;
  }

  const track = playlist.tracks[currentIndex];
  if (audioEl) {
    audioEl.src = track.src;
  }
  if (titleEl) {
    titleEl.textContent = `${track.title} · ${playlist.label}`;
  }
}

export function initSoundtrack(initialUser) {
  // Grab DOM elements from index.html
  audioEl = document.getElementById("global-soundtrack-audio");
  titleEl = document.getElementById("global-soundtrack-title");
  playBtn = document.getElementById("global-soundtrack-play");
  nextBtn = document.getElementById("global-soundtrack-next");
  modeButtons = Array.from(
    document.querySelectorAll("[data-global-soundtrack-mode]")
  );

  if (!audioEl || !playBtn || !nextBtn) {
    console.warn("[Soundtrack] Global elements not found; skipping init.");
    return;
  }

  // Initial mode from user settings or default
  const user = initialUser || getUser() || {};
  currentMode =
    (user.settings && user.settings.soundtrack_mode) || "workout";
  currentIndex = 0;

  // Mode buttons (Workout / Focus / Reading)
  modeButtons.forEach((btn) => {
    const mode = btn.dataset.globalSoundtrackMode;

    // Highlight the active one initially
    if (mode === currentMode) {
      btn.classList.add("is-active");
    }

    btn.addEventListener("click", () => {
      currentMode = mode;
      currentIndex = 0;

      // Update chip styling
      modeButtons.forEach((b) =>
        b.classList.toggle("is-active", b === btn)
      );

      persistMode();
      loadCurrentTrack();
      // Optional: auto-play on mode change
      audioEl
        .play()
        .catch((err) =>
          console.error("[Soundtrack] play error on mode change:", err)
        );
    });
  });

  // Play / Pause button
  playBtn.addEventListener("click", () => {
    if (!audioEl.src) {
      loadCurrentTrack();
    }
    if (audioEl.paused) {
      audioEl
        .play()
        .catch((err) =>
          console.error("[Soundtrack] play error:", err)
        );
    } else {
      audioEl.pause();
    }
  });

  // Next button
  nextBtn.addEventListener("click", () => {
    const playlist = getCurrentPlaylist();
    if (!playlist || !playlist.tracks.length) return;

    currentIndex = (currentIndex + 1) % playlist.tracks.length;
    loadCurrentTrack();
    audioEl
      .play()
      .catch((err) =>
        console.error("[Soundtrack] next/play error:", err)
      );
  });

  // Initial load
  loadCurrentTrack();
}
