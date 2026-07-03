const loginScreen = document.getElementById("login-screen");
const dashboardMain = document.getElementById("dashboard-main");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const tabs = document.querySelectorAll(".tab");
const tabPanels = {
  papers: document.getElementById("tab-papers"),
  submissions: document.getElementById("tab-submissions"),
  notes: document.getElementById("tab-notes"),
};

// Notes DOM Elements
const noteForm = document.getElementById("note-form");
const noteTitle = document.getElementById("note-title");
const noteGrade = document.getElementById("note-grade");
const noteLink = document.getElementById("note-link");
const noteSubmitBtn = document.getElementById("note-submit-btn");
const notesList = document.getElementById("notes-list");

const paperForm = document.getElementById("paper-form");
const paperTitle = document.getElementById("paper-title");
const answerKeyText = document.getElementById("answer-key-text");
const questionImagesInput = document.getElementById("question-images");
const answerKeyImagesInput = document.getElementById("answer-key-images");
const qpPreview = document.getElementById("qp-preview");
const akPreview = document.getElementById("ak-preview");
const paperSubmitBtn = document.getElementById("paper-submit-btn");
const paperProgress = document.getElementById("paper-progress");
const papersList = document.getElementById("papers-list");

const filterPaper = document.getElementById("filter-paper");
const grid = document.getElementById("submissions-grid");
const emptyState = document.getElementById("empty-state");
const totalCount = document.getElementById("total-count");
const todayCount = document.getElementById("today-count");

const lightbox = document.getElementById("lightbox");
const lightboxGallery = document.getElementById("lightbox-gallery");
const lightboxName = document.getElementById("lightbox-name");
const lightboxPaper = document.getElementById("lightbox-paper");
const lightboxDate = document.getElementById("lightbox-date");
const lightboxAi = document.getElementById("lightbox-ai");
const lightboxClose = document.getElementById("lightbox-close");
const lightboxDelete = document.getElementById("lightbox-delete");
const lightboxRegrade = document.getElementById("lightbox-regrade");
const lightboxPrint = document.getElementById("lightbox-print");

let activeSubmission = null;
let questionPapers = [];

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboardMain.classList.remove("hidden");
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  dashboardMain.classList.add("hidden");
}

function verdictClass(verdict) {
  if (!verdict) return "badge-neutral";
  const value = verdict.toLowerCase();
  if (value === "pass") return "badge-pass";
  if (value === "fail") return "badge-fail";
  return "badge-review";
}

function renderFilePreview(input, container) {
  container.innerHTML = "";
  [...input.files].forEach((file) => {
    const url = URL.createObjectURL(file);
    if (file.type === "application/pdf") {
      const div = document.createElement("div");
      div.className = "pdf-preview-block";
      div.innerHTML = `<span class="pdf-icon">📄</span> <span class="pdf-name">${escapeHtml(file.name)}</span>`;
      container.appendChild(div);
    } else {
      const img = document.createElement("img");
      img.src = url;
      img.alt = file.name;
      container.appendChild(img);
    }
  });
}

questionImagesInput.addEventListener("change", () => renderFilePreview(questionImagesInput, qpPreview));
answerKeyImagesInput.addEventListener("change", () => renderFilePreview(answerKeyImagesInput, akPreview));

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    Object.values(tabPanels).forEach((panel) => panel.classList.add("hidden"));
    tabPanels[tab.dataset.tab].classList.remove("hidden");
    if (tab.dataset.tab === "submissions") renderSubmissions();
    if (tab.dataset.tab === "notes") renderNotes();
  });
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  const password = document.getElementById("coach-password").value;
  setCoachPassword(password);

  try {
    await fetchSubmissions();
    showDashboard();
    await refreshAll();
  } catch (err) {
    clearCoachPassword();
    loginError.textContent = err.message || "Wrong password. Please try again.";
    loginError.classList.remove("hidden");
  }
});

async function refreshAll() {
  await loadQuestionPapers();
  await renderPapersList();
  await renderSubmissions();
  await renderNotes();
}

async function loadQuestionPapers() {
  const data = await fetchQuestionPapers();
  questionPapers = data.questionPapers;

  filterPaper.innerHTML = '<option value="">All question papers</option>';
  questionPapers.forEach((paper) => {
    const option = document.createElement("option");
    option.value = paper.id;
    option.textContent = paper.title;
    filterPaper.appendChild(option);
  });
}

async function renderPapersList() {
  papersList.innerHTML = "";

  if (!questionPapers.length) {
    papersList.innerHTML = '<p class="muted-text">No question papers yet. Create one above.</p>';
    return;
  }

  questionPapers.forEach((paper) => {
    const card = document.createElement("article");
    card.className = "paper-card";
    card.innerHTML = `
      <div>
        <h3>${escapeHtml(paper.title)}</h3>
        <p class="muted-text">${paper.question_image_urls.length} question file(s) · ${paper.answer_key_image_urls.length} answer key file(s)</p>
        <p class="muted-text">Created ${formatDate(paper.created_at)}</p>
      </div>
      <button class="btn btn-danger small-btn" data-id="${paper.id}">Delete</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      if (!confirm(`Delete "${paper.title}"? All linked submissions will also be deleted.`)) return;
      await deleteQuestionPaper(paper.id);
      await refreshAll();
    });
    papersList.appendChild(card);
  });
}

paperForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  paperProgress.classList.remove("hidden");
  paperSubmitBtn.disabled = true;

  try {
    const qpFiles = [...questionImagesInput.files];
    const akFiles = [...answerKeyImagesInput.files];

    if (!qpFiles.length && !answerKeyText.value.trim() && !akFiles.length) {
      throw new Error("Add at least a question paper photo or an answer key.");
    }

    const paperId = crypto.randomUUID();
    let questionImageUrls = [];
    let answerKeyImageUrls = [];

    if (qpFiles.length) {
      paperProgress.textContent = "Uploading question paper photos…";
      questionImageUrls = await uploadManyImages(
        qpFiles,
        `question-papers/${paperId}/questions`,
        true
      );
    }

    if (akFiles.length) {
      paperProgress.textContent = "Uploading answer key photos…";
      answerKeyImageUrls = await uploadManyImages(
        akFiles,
        `question-papers/${paperId}/answers`,
        true
      );
    }

    paperProgress.textContent = "Saving question paper…";
    await createQuestionPaper({
      id: paperId,
      title: paperTitle.value,
      answerKeyText: answerKeyText.value,
      questionImageUrls,
      answerKeyImageUrls,
    });

    paperForm.reset();
    qpPreview.innerHTML = "";
    akPreview.innerHTML = "";
    await refreshAll();
    alert("Question paper saved successfully.");
  } catch (err) {
    alert(err.message || "Could not save question paper.");
  } finally {
    paperSubmitBtn.disabled = false;
    paperProgress.classList.add("hidden");
  }
});

filterPaper.addEventListener("change", renderSubmissions);

async function renderSubmissions() {
  const { submissions } = await fetchSubmissions(filterPaper.value || undefined);
  grid.innerHTML = "";

  totalCount.textContent = submissions.length;
  todayCount.textContent = submissions.filter((s) => isToday(s.submitted_at)).length;

  if (!submissions.length) {
    emptyState.classList.remove("hidden");
    grid.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  grid.classList.remove("hidden");

  submissions.forEach((submission) => {
    const thumb = submission.image_urls[0] || "";
    const paperTitleText = submission.question_papers?.title || "Unknown test";
    const card = document.createElement("article");
    card.className = "submission-card";
    card.innerHTML = `
      <img src="${thumb}" alt="Answer sheet by ${escapeHtml(submission.student_name)}">
      <div class="submission-card-body">
        <h3>${escapeHtml(submission.student_name)}</h3>
        <p class="paper-label">${escapeHtml(paperTitleText)}</p>
        <div class="card-badges">
          <span class="badge ${verdictClass(submission.ai_verdict)}">${escapeHtml(submission.ai_verdict || submission.ai_status)}</span>
          ${submission.ai_score != null ? `<span class="score-pill">${submission.ai_score}/100</span>` : ""}
        </div>
        <time datetime="${submission.submitted_at}">${formatDate(submission.submitted_at)}</time>
      </div>
    `;
    card.addEventListener("click", () => openLightbox(submission));
    grid.appendChild(card);
  });
}

function renderAiBlock(submission) {
  if (submission.ai_status === "processing") {
    return `<p class="ai-status">AI is checking this submission…</p>`;
  }
  if (submission.ai_status === "failed") {
    return `<p class="ai-status error-text">${escapeHtml(submission.ai_feedback || "AI check failed.")}</p>`;
  }

  const details = submission.ai_details?.question_wise || [];
  const rows = details
    .map(
      (item) => `
      <div class="ai-row">
        <strong>${escapeHtml(item.question || "Question")}</strong>
        <span class="badge badge-${item.status || "review"}">${escapeHtml(item.status || "review")}</span>
        <p>${escapeHtml(item.feedback || "")}</p>
      </div>`
    )
    .join("");

  return `
    <div class="ai-summary">
      <div class="card-badges">
        <span class="badge ${verdictClass(submission.ai_verdict)}">${escapeHtml(submission.ai_verdict || "Needs Review")}</span>
        ${submission.ai_score != null ? `<span class="score-pill">${submission.ai_score}/100</span>` : ""}
      </div>
      <p>${escapeHtml(submission.ai_feedback || "")}</p>
    </div>
    ${rows ? `<div class="ai-details">${rows}</div>` : ""}
  `;
}

function openLightbox(submission) {
  activeSubmission = submission;
  lightboxGallery.innerHTML = submission.image_urls
    .map((url, i) => `<img src="${url}" alt="Answer sheet page ${i + 1}">`)
    .join("");
  lightboxName.textContent = submission.student_name;
  lightboxPaper.textContent = submission.question_papers?.title || "Unknown test";
  lightboxDate.textContent = formatDate(submission.submitted_at);
  lightboxAi.innerHTML = renderAiBlock(submission);
  lightbox.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.add("hidden");
  lightboxGallery.innerHTML = "";
  activeSubmission = null;
  document.body.style.overflow = "";
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !lightbox.classList.contains("hidden")) closeLightbox();
});

lightboxDelete.addEventListener("click", async () => {
  if (!activeSubmission) return;
  if (!confirm(`Delete submission from ${activeSubmission.student_name}?`)) return;
  await deleteSubmission(activeSubmission.id);
  closeLightbox();
  await renderSubmissions();
});

lightboxRegrade.addEventListener("click", async () => {
  if (!activeSubmission) return;
  lightboxRegrade.disabled = true;
  lightboxRegrade.textContent = "Checking…";
  try {
    const { submission } = await regradeSubmission(activeSubmission.id);
    activeSubmission = submission;
    lightboxAi.innerHTML = renderAiBlock(submission);
    await renderSubmissions();
  } catch (err) {
    alert(err.message || "Re-check failed.");
  } finally {
    lightboxRegrade.disabled = false;
    lightboxRegrade.textContent = "Re-check with AI";
  }
});

lightboxPrint.addEventListener("click", () => {
  if (!activeSubmission) return;
  generatePrintReport(activeSubmission);
});

function generatePrintReport(submission) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print reports.");
    return;
  }

  const paperTitle = submission.question_papers?.title || "Unknown Test";
  const dateStr = formatDate(submission.submitted_at);
  const scoreStr = submission.ai_score != null ? `${submission.ai_score}/100` : "N/A";
  const verdict = submission.ai_verdict || "Needs Review";

  const details = submission.ai_details?.question_wise || [];
  const rows = details.map((item) => {
    return `
      <div class="report-row">
        <div class="row-header">
          <strong>${escapeHtml(item.question || "Question")}</strong>
          <span class="badge ${verdictClass(item.status)}">${escapeHtml(item.status || "review")}</span>
        </div>
        <p class="feedback-text">${escapeHtml(item.feedback || "")}</p>
      </div>
    `;
  }).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Report - ${escapeHtml(submission.student_name)}</title>
      <style>
        body {
          font-family: 'DM Sans', -apple-system, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 40px;
          background: white;
        }
        .header {
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 20px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          font-size: 24px;
          font-weight: 700;
          color: #6366f1;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 30px;
          background: #f8fafc;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .meta-item {
          font-size: 15px;
        }
        .meta-item strong {
          color: #475569;
        }
        .score-box {
          text-align: right;
        }
        .score-value {
          font-size: 32px;
          font-weight: 800;
          color: #6366f1;
        }
        .section-title {
          font-size: 18px;
          font-weight: 700;
          margin-top: 30px;
          margin-bottom: 15px;
          color: #334155;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 5px;
        }
        .overall-feedback {
          font-size: 16px;
          line-height: 1.6;
          background: #f1f5f9;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 30px;
        }
        .report-row {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 15px;
          margin-bottom: 15px;
          page-break-inside: avoid;
        }
        .row-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          font-size: 15px;
        }
        .feedback-text {
          font-size: 14px;
          line-height: 1.5;
          color: #475569;
          margin: 0;
        }
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-pass, .badge-correct {
          background: #d1fae5;
          color: #065f46;
        }
        .badge-fail, .badge-incorrect {
          background: #fee2e2;
          color: #991b1b;
        }
        .badge-review, .badge-partial, .badge-neutral {
          background: #fef3c7;
          color: #92400e;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">📚 Nerd Tutors</div>
        <div class="score-box">
          <div class="score-value">${scoreStr}</div>
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">Score Received</div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><strong>Student Name:</strong> ${escapeHtml(submission.student_name)}</div>
        <div class="meta-item"><strong>Test Name:</strong> ${escapeHtml(paperTitle)}</div>
        <div class="meta-item"><strong>Evaluation Date:</strong> ${dateStr}</div>
        <div class="meta-item"><strong>Status:</strong> <span class="badge ${verdictClass(verdict)}">${escapeHtml(verdict)}</span></div>
      </div>

      <div class="section-title">Overall Performance Feedback</div>
      <div class="overall-feedback">
        ${escapeHtml(submission.ai_feedback || "No overall feedback provided.")}
      </div>

      <div class="section-title">Question-wise Correction Report</div>
      <div class="report-details">
        ${rows || '<p style="color: #64748b; font-style: italic;">No question-wise breakdown available.</p>'}
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

async function renderNotes() {
  if (!notesList) return;
  notesList.innerHTML = '<p class="muted-text">Loading notes...</p>';

  try {
    const { notes } = await fetchNotes();
    notesList.innerHTML = "";

    if (!notes || !notes.length) {
      notesList.innerHTML = '<p class="muted-text">No notes yet. Add one above.</p>';
      return;
    }

    notes.forEach((note) => {
      const card = document.createElement("article");
      card.className = "paper-card";
      card.innerHTML = `
        <div>
          <h3>${escapeHtml(note.title)}</h3>
          <p class="muted-text">Grade ${escapeHtml(note.grade)} · Link: <a href="${escapeHtml(note.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(note.link)}</a></p>
        </div>
        <button class="btn btn-danger small-btn" data-id="${note.id}">Delete</button>
      `;
      card.querySelector("button").addEventListener("click", async () => {
        if (!confirm(`Delete note "${note.title}"?`)) return;
        try {
          await deleteNote(note.id);
          await renderNotes();
        } catch (err) {
          alert(err.message || "Could not delete note.");
        }
      });
      notesList.appendChild(card);
    });
  } catch (err) {
    notesList.innerHTML = `<p class="error-text">Could not load notes: ${escapeHtml(err.message)}</p>`;
  }
}

if (noteForm) {
  noteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    noteSubmitBtn.disabled = true;
    noteSubmitBtn.textContent = "Adding...";

    try {
      await createNote({
        title: noteTitle.value,
        grade: noteGrade.value,
        link: noteLink.value,
      });

      noteForm.reset();
      await renderNotes();
      alert("Note added successfully.");
    } catch (err) {
      alert(err.message || "Could not add note.");
    } finally {
      noteSubmitBtn.disabled = false;
      noteSubmitBtn.textContent = "Add Note";
    }
  });
}

if (hasCoachPassword()) {
  fetchSubmissions()
    .then(() => {
      showDashboard();
      refreshAll();
    })
    .catch(showLogin);
} else {
  showLogin();
}
