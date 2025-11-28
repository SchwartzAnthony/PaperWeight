// modules/ui/reader_view.js
// Reading Room screen: lets you open text/PDF docs while the soundtrack keeps playing.

import { navigateTo } from "../core/router.js";
import { getUser, setUser } from "../core/state.js";
import { saveUser } from "../core/storage.js";

let readingCache = null;
let currentDocId = null;

// Adjust this if your JSON lives elsewhere:
//   "./data/reading_library.json"  -> if folder is /data/reading_library.json
//   "./assets/data/reading_library.json" -> if it's under /assets/data/...
const READING_LIBRARY_URL = "./data/reading_library.json";

// ---------- Reader settings helpers ----------

function getReaderSettings() {
  const user = getUser();
  if (!user || !user.settings || !user.settings.reader) return {};
  return user.settings.reader;
}

function updateReaderSettings(patch) {
  const user = getUser();
  if (!user) return;

  const prevSettings = user.settings || {};
  const prevReader = prevSettings.reader || {};

  const newReader = { ...prevReader, ...patch };
  const newSettings = { ...prevSettings, reader: newReader };
  const updatedUser = { ...user, settings: newSettings };

  setUser(updatedUser);
  saveUser(updatedUser);
}

// ---------- Data loading ----------

async function loadReadingLibrary() {
  if (readingCache) return readingCache;

  try {
    const res = await fetch(READING_LIBRARY_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    readingCache = data;
    return data;
  } catch (err) {
    console.error("[Reader] Failed to load reading library:", err);
    return [];
  }
}

// ---------- UI helpers ----------

function renderList(listEl, docs, onSelect, activeId) {
  listEl.innerHTML = "";

  if (!docs.length) {
    listEl.innerHTML =
      `<div class="reader-empty">No readings configured yet.</div>`;
    return;
  }

  docs.forEach((doc) => {
    const item = document.createElement("button");
    item.className = "reader-list-item";
    item.dataset.docId = doc.id;
    if (doc.id === activeId) {
      item.classList.add("is-active");
    }

    item.innerHTML = `
      <div class="reader-list-title">${doc.title}</div>
      <div class="reader-list-desc">${doc.description || ""}</div>
    `;

    item.addEventListener("click", () => {
      Array.from(listEl.querySelectorAll(".reader-list-item")).forEach(
        (btn) => btn.classList.toggle("is-active", btn === item)
      );
      onSelect(doc);
    });

    listEl.appendChild(item);
  });
}

async function loadDocumentContent(containerEl, doc) {
  if (!doc) return;

  currentDocId = doc.id;

  // Remember last opened doc (for both text and pdf)
  updateReaderSettings({ lastDocId: doc.id });

  // ---------- TEXT DOC ----------
  if (doc.type === "text") {
    try {
      containerEl.innerHTML = `<div class="reader-loading">Loading…</div>`;
      const res = await fetch(doc.file);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();

      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      containerEl.innerHTML = `
        <div class="reader-text-content">
          <pre>${escaped}</pre>
        </div>
      `;

      // Restore scroll position for this doc (if any)
      const settings = getReaderSettings();
      const scrollPositions = settings.scrollPositions || {};
      const savedPos = scrollPositions[doc.id] || 0;
      containerEl.scrollTop = savedPos;
    } catch (err) {
      console.error("[Reader] Failed to load text doc:", err);
      containerEl.innerHTML =
        `<div class="reader-error">Could not load this document.</div>`;
    }
    return;
  }

  // ---------- PDF DOC ----------
  if (doc.type === "pdf") {
    // We can’t reliably restore inside-iframe scroll,
    // but we do at least reopen the same PDF.
    containerEl.innerHTML = `
      <div class="reader-pdf-wrapper">
        <iframe
          src="${doc.file}"
          class="reader-pdf-frame"
          title="${doc.title}"
        ></iframe>
      </div>
      <div class="reader-note">
        Tip: pinch to zoom and scroll while the soundtrack keeps playing.
      </div>
    `;
    return;
  }

  containerEl.innerHTML =
    `<div class="reader-error">Unsupported document type: ${doc.type}</div>`;
}

// Persist scrollTop for the current doc (text docs)
function attachScrollPersistence(contentEl) {
  contentEl.addEventListener("scroll", () => {
    if (!currentDocId) return;

    const pos = contentEl.scrollTop;
    const settings = getReaderSettings();
    const existing = settings.scrollPositions || {};
    const updatedPositions = { ...existing, [currentDocId]: pos };

    updateReaderSettings({ scrollPositions: updatedPositions });
  });
}

// ---------- Main render ----------

export function renderReaderView() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div class="reader-container">
      <header class="reader-header">
        <button class="btn-secondary" id="reader-back-btn">← Back</button>
        <div class="reader-header-main">
          <h1>Reading Room</h1>
          <p>Read while you walk or cycle. Soundtrack keeps playing.</p>
        </div>
      </header>

      <div class="reader-layout">
        <main class="reader-main">
          <div id="reader-content" class="reader-content">
            <div class="reader-placeholder">
              Select a document below to start reading.
            </div>
          </div>
        </main>

        <aside class="reader-sidebar">
          <h2>Your Readings</h2>
          <div id="reader-list" class="reader-list"></div>
        </aside>
      </div>
    </div>
  `;

  const backBtn = document.getElementById("reader-back-btn");
  const listEl = document.getElementById("reader-list");
  const contentEl = document.getElementById("reader-content");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      navigateTo("dashboard");
    });
  }

  if (contentEl) {
    attachScrollPersistence(contentEl);
  }

  loadReadingLibrary().then((docs) => {
    if (!listEl || !contentEl) return;

    const settings = getReaderSettings();
    const lastId = settings.lastDocId;
    const initialDoc =
      (lastId && docs.find((d) => d.id === lastId)) || docs[0] || null;

    renderList(
      listEl,
      docs,
      (doc) => {
        loadDocumentContent(contentEl, doc);
      },
      initialDoc ? initialDoc.id : null
    );

    if (initialDoc) {
      loadDocumentContent(contentEl, initialDoc);
    }
  });
}
