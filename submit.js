const MAX_PHOTOS = 10;
const form = document.getElementById("submit-form");
const paperSelect = document.getElementById("question-paper");
const filterSubject = document.getElementById("filter-subject");
const nameInput = document.getElementById("student-name");
const fileInput = document.getElementById("answer-sheet");
const uploadZone = document.getElementById("upload-zone");
const uploadPlaceholder = document.getElementById("upload-placeholder");
const previewGrid = document.getElementById("preview-grid");
const photoCount = document.getElementById("photo-count");
const submitBtn = document.getElementById("submit-btn");
const successMessage = document.getElementById("success-message");
const successDetail = document.getElementById("success-detail");
const uploadProgress = document.getElementById("upload-progress");
const offlineNotice = document.getElementById("offline-notice");

let selectedFiles = [];
let previewUrls = [];

function isOfflineFileMode() {
  return window.location.protocol === "file:";
}

function revokePreviewUrls() {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];
}

function renderPreviews() {
  revokePreviewUrls();
  previewGrid.innerHTML = "";

  if (!selectedFiles.length) {
    previewGrid.classList.add("hidden");
    photoCount.classList.add("hidden");
    uploadPlaceholder.classList.remove("hidden");
    return;
  }

  uploadPlaceholder.classList.add("hidden");
  previewGrid.classList.remove("hidden");
  photoCount.classList.remove("hidden");
  photoCount.textContent = `${selectedFiles.length} of ${MAX_PHOTOS} photos selected`;

  selectedFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);

    const item = document.createElement("div");
    item.className = "preview-item";
    item.innerHTML = `
      <img src="${url}" alt="Preview ${index + 1}">
      <button type="button" class="preview-remove" data-index="${index}" aria-label="Remove photo">×</button>
    `;
    previewGrid.appendChild(item);
  });

  previewGrid.querySelectorAll(".preview-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.index);
      selectedFiles.splice(index, 1);
      syncFileInput();
      renderPreviews();
    });
  });
}

function syncFileInput() {
  const dt = new DataTransfer();
  selectedFiles.forEach((file) => dt.items.add(file));
  fileInput.files = dt.files;
}

function addFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    if (selectedFiles.length >= MAX_PHOTOS) break;
    selectedFiles.push(file);
  }
  syncFileInput();
  renderPreviews();
}

fileInput.addEventListener("change", () => {
  addFiles([...fileInput.files]);
});

uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("dragover");
});

uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  addFiles([...e.dataTransfer.files]);
});

let allQuestionPapers = [];

async function loadQuestionPapers() {
  try {
    const { questionPapers } = await fetchQuestionPapers();
    allQuestionPapers = questionPapers;

    if (!questionPapers.length) {
      paperSelect.innerHTML = '<option value="">No tests available yet — ask your coach to add one</option>';
      paperSelect.disabled = true;
      submitBtn.disabled = true;
      filterSubject.innerHTML = '<option value="">No Subjects</option>';
      filterSubject.disabled = true;
      return;
    }

    // Populate the Subject filter dropdown
    filterSubject.innerHTML = '<option value="">All Subjects</option>';
    filterSubject.disabled = false;
    const subjects = [...new Set(questionPapers.map(p => p.subject).filter(Boolean))];
    subjects.sort().forEach(subj => {
      const option = document.createElement("option");
      option.value = subj;
      option.textContent = subj;
      filterSubject.appendChild(option);
    });

    renderFilteredPapers();
  } catch (err) {
    paperSelect.innerHTML = '<option value="">Could not load tests</option>';
    if (isOfflineFileMode()) {
      offlineNotice.classList.remove("hidden");
    }
  }
}

function renderFilteredPapers() {
  const selectedSubject = filterSubject.value;
  const filtered = selectedSubject
    ? allQuestionPapers.filter(p => p.subject === selectedSubject)
    : allQuestionPapers;

  paperSelect.innerHTML = "";
  paperSelect.disabled = false;
  submitBtn.disabled = false;

  if (!filtered.length) {
    paperSelect.innerHTML = '<option value="">No tests available for this subject</option>';
    paperSelect.disabled = true;
    submitBtn.disabled = true;
    return;
  }

  paperSelect.innerHTML = '<option value="">Select a test…</option>';
  filtered.forEach((paper) => {
    const option = document.createElement("option");
    option.value = paper.id;
    option.textContent = paper.title;
    paperSelect.appendChild(option);
  });
}

if (filterSubject) {
  filterSubject.addEventListener("change", renderFilteredPapers);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  successMessage.classList.add("hidden");
  uploadProgress.classList.add("hidden");

  if (!paperSelect.value) {
    alert("Please select a question paper / test.");
    return;
  }
  if (!selectedFiles.length) {
    alert("Please upload at least one photo.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading…";

  try {
    const imageUrls = await uploadManyImages(
      selectedFiles,
      "submissions",
      false,
      (done, total) => {
        uploadProgress.classList.remove("hidden");
        uploadProgress.textContent = `Uploading photos ${done} of ${total}…`;
      }
    );

    submitBtn.textContent = "AI is checking…";
    uploadProgress.textContent = "AI is checking your answers…";

    const result = await submitAnswers({
      studentName: nameInput.value,
      questionPaperId: paperSelect.value,
      imageUrls,
    });

    const submission = result.submission;
    let detail = "Your answer sheet has been saved and sent for AI checking.";

    if (submission.ai_status === "completed") {
      detail = `AI Result: ${submission.ai_verdict} — Score ${submission.ai_score}/100. ${submission.ai_feedback}`;
    } else if (result.warning) {
      detail = result.warning;
    }

    successDetail.textContent = detail;
    successMessage.classList.remove("hidden");

    selectedFiles = [];
    syncFileInput();
    renderPreviews();
    form.reset();
    await loadQuestionPapers();
  } catch (err) {
    alert(err.message || "Submission failed. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Answer Sheet";
    uploadProgress.classList.add("hidden");
  }
});

async function loadPDFNotes() {
  const notesXContainer = document.getElementById("notes-x-container");
  const notesXIIContainer = document.getElementById("notes-xii-container");
  const noNotesX = document.getElementById("no-notes-x");
  const noNotesXII = document.getElementById("no-notes-xii");

  if (!notesXContainer || !notesXIIContainer) return;

  try {
    const { notes } = await fetchNotes();

    // 1. Render Grade X Notes
    const notesXHistory = document.getElementById("notes-x-history");
    const notesXGeography = document.getElementById("notes-x-geography");
    const notesXCivics = document.getElementById("notes-x-civics");
    const notesXEconomics = document.getElementById("notes-x-economics");

    notesXHistory.innerHTML = "";
    notesXGeography.innerHTML = "";
    notesXCivics.innerHTML = "";
    notesXEconomics.innerHTML = "";

    const groups = {
      History: { list: notesXHistory, wrapper: document.getElementById("group-x-history") },
      Geography: { list: notesXGeography, wrapper: document.getElementById("group-x-geography") },
      Civics: { list: notesXCivics, wrapper: document.getElementById("group-x-civics") },
      Economics: { list: notesXEconomics, wrapper: document.getElementById("group-x-economics") },
    };

    // Hide all wrappers initially
    Object.values(groups).forEach(g => {
      if (g.wrapper) g.wrapper.style.display = "none";
    });

    const gradeXNotes = notes.filter((n) => n.grade === "X");

    if (!gradeXNotes.length) {
      noNotesX.style.display = "block";
    } else {
      noNotesX.style.display = "none";
      gradeXNotes.forEach((note) => {
        let subj = note.subject;
        if (subj === "Macro Economics" || subj === "Indian Economics Development") {
          subj = "Economics";
        }
        const target = groups[subj];
        if (target) {
          const li = document.createElement("li");
          let prefix = "";
          if (note.subject === "Macro Economics") prefix = `<span class="note-sub-tag">Macro</span> `;
          if (note.subject === "Indian Economics Development") prefix = `<span class="note-sub-tag">IED</span> `;

          li.innerHTML = `<a href="${escapeHtml(note.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📄 ${prefix}${escapeHtml(note.title)}</a>`;
          target.list.appendChild(li);
          if (target.wrapper) target.wrapper.style.display = "block";
        }
      });
    }

    // 2. Render Grade XII Notes dynamically by subject
    notesXIIContainer.innerHTML = "";
    const gradeXIINotes = notes.filter((n) => n.grade === "XII");

    if (!gradeXIINotes.length) {
      noNotesXII.style.display = "block";
    } else {
      noNotesXII.style.display = "none";

      // Group by subject
      const xiiGroups = {};
      gradeXIINotes.forEach(note => {
        const subj = note.subject || "General";
        if (!xiiGroups[subj]) xiiGroups[subj] = [];
        xiiGroups[subj].push(note);
      });

      // Render each subject card
      Object.keys(xiiGroups).sort().forEach(subj => {
        const subjectNotes = xiiGroups[subj];
        const groupDiv = document.createElement("div");
        groupDiv.className = "subject-card";

        const cardHeader = document.createElement("div");
        cardHeader.className = "card-header";

        const iconSpan = document.createElement("span");
        iconSpan.className = "subject-icon";
        iconSpan.textContent = getSubjectIcon(subj);
        cardHeader.appendChild(iconSpan);

        const h4 = document.createElement("h4");
        h4.textContent = subj;
        cardHeader.appendChild(h4);

        groupDiv.appendChild(cardHeader);

        const ul = document.createElement("ul");
        ul.className = "notes-list";

        subjectNotes.forEach(note => {
          const li = document.createElement("li");
          li.innerHTML = `<a href="${escapeHtml(note.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📄 ${escapeHtml(note.title)}</a>`;
          ul.appendChild(li);
        });

        groupDiv.appendChild(ul);
        notesXIIContainer.appendChild(groupDiv);
      });
    }
  } catch (err) {
    if (noNotesX) noNotesX.textContent = "Failed to load notes.";
    if (noNotesXII) noNotesXII.textContent = "Failed to load notes.";
  }
}

function getSubjectIcon(subj) {
  const lower = subj.toLowerCase();
  if (lower.includes("history")) return "📜";
  if (lower.includes("geography")) return "🌍";
  if (lower.includes("civics") || lower.includes("political")) return "⚖️";
  if (lower.includes("economics") || lower.includes("macro") || lower.includes("indian")) return "📈";
  if (lower.includes("math")) return "📐";
  if (lower.includes("physics")) return "⚡";
  if (lower.includes("chemistry")) return "🧪";
  if (lower.includes("biology")) return "🧬";
  if (lower.includes("english")) return "✍️";
  if (lower.includes("science")) return "🔬";
  return "📚";
}

if (isOfflineFileMode()) {
  offlineNotice.classList.remove("hidden");
}

loadQuestionPapers();
loadPDFNotes();
