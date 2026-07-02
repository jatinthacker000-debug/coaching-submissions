const loginScreen = document.getElementById("login-screen");
const dashboardMain = document.getElementById("dashboard-main");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const tabs = document.querySelectorAll(".tab");
const tabPanels = {
  papers: document.getElementById("tab-papers"),
  submissions: document.getElementById("tab-submissions"),
};

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
    const img = document.createElement("img");
    img.src = url;
    img.alt = file.name;
    container.appendChild(img);
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
        <p class="muted-text">${paper.question_image_urls.length} question photo(s) · ${paper.answer_key_image_urls.length} answer key photo(s)</p>
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
