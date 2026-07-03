const MAX_PHOTOS = 10;
const form = document.getElementById("submit-form");
const paperSelect = document.getElementById("question-paper");
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

async function loadQuestionPapers() {
  try {
    const { questionPapers } = await fetchQuestionPapers();
    paperSelect.innerHTML = "";

    if (!questionPapers.length) {
      paperSelect.innerHTML = '<option value="">No tests available yet — ask your coach to add one</option>';
      paperSelect.disabled = true;
      submitBtn.disabled = true;
      return;
    }

    paperSelect.innerHTML = '<option value="">Select a test…</option>';
    questionPapers.forEach((paper) => {
      const option = document.createElement("option");
      option.value = paper.id;
      option.textContent = paper.title;
      paperSelect.appendChild(option);
    });
  } catch (err) {
    paperSelect.innerHTML = '<option value="">Could not load tests</option>';
    if (isOfflineFileMode()) {
      offlineNotice.classList.remove("hidden");
    }
  }
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
  const notesXList = document.getElementById("notes-grade-x");
  const notesXIIList = document.getElementById("notes-grade-xii");
  if (!notesXList || !notesXIIList) return;

  try {
    const { notes } = await fetchNotes();
    notesXList.innerHTML = "";
    notesXIIList.innerHTML = "";

    const gradeXNotes = notes.filter((n) => n.grade === "X");
    const gradeXIINotes = notes.filter((n) => n.grade === "XII");

    if (!gradeXNotes.length) {
      notesXList.innerHTML = '<li class="empty-notes">No notes available yet.</li>';
    } else {
      gradeXNotes.forEach((note) => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="${escapeHtml(note.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📄 ${escapeHtml(note.title)}</a>`;
        notesXList.appendChild(li);
      });
    }

    if (!gradeXIINotes.length) {
      notesXIIList.innerHTML = '<li class="empty-notes">No notes available yet.</li>';
    } else {
      gradeXIINotes.forEach((note) => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="${escapeHtml(note.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📄 ${escapeHtml(note.title)}</a>`;
        notesXIIList.appendChild(li);
      });
    }
  } catch (err) {
    notesXList.innerHTML = '<li class="error-notes">Failed to load notes.</li>';
    notesXIIList.innerHTML = '<li class="error-notes">Failed to load notes.</li>';
  }
}

if (isOfflineFileMode()) {
  offlineNotice.classList.remove("hidden");
}

loadQuestionPapers();
loadPDFNotes();
