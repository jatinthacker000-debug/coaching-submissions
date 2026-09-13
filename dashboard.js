const loginScreen = document.getElementById("login-screen");
const dashboardMain = document.getElementById("dashboard-main");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

const noteForm = document.getElementById("note-form");
const noteChapter = document.getElementById("note-chapter");
const noteTitle = document.getElementById("note-title");
const noteSubject = document.getElementById("note-subject");
const noteType = document.getElementById("note-type");
const noteLink = document.getElementById("note-link");
const noteSubmitBtn = document.getElementById("note-submit-btn");
const notesList = document.getElementById("notes-list");

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboardMain.classList.remove("hidden");
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  dashboardMain.classList.add("hidden");
}

// Helper to parse "[Ch X] Title" format
function parseResourceTitle(rawTitle) {
  const match = (rawTitle || "").match(/^\[Ch\s+([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return {
      chapter: match[1].trim(),
      cleanTitle: match[2].trim()
    };
  }
  return {
    chapter: null,
    cleanTitle: rawTitle
  };
}

// Converts chapter to sortable float
function getChapterSortValue(resource) {
  const parsed = parseResourceTitle(resource.title || "");
  if (parsed.chapter) {
    const num = parseFloat(parsed.chapter);
    return isNaN(num) ? 999999 : num;
  }
  return 999999;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  const password = document.getElementById("coach-password").value;
  setCoachPassword(password);

  try {
    // Attempt to fetch submissions as a way to verify the coach password.
    await fetchSubmissions();
    showDashboard();
    await renderNotes();
  } catch (err) {
    clearCoachPassword();
    loginError.textContent = err.message || "Wrong password. Please try again.";
    loginError.classList.remove("hidden");
  }
});

async function renderNotes() {
  if (!notesList) return;
  notesList.innerHTML = '<p class="muted-text">Loading notes...</p>';

  try {
    const { notes } = await fetchNotes();
    notesList.innerHTML = "";

    // Show Grade 10 (X) notes, worksheets, other materials, notifications, and CBSE resources
    const gradeXNotes = (notes || []).filter(note => 
      note.grade === "X" || note.grade === "X-Worksheet" || 
      note.grade === "X-Other" || note.grade === "NOTIFICATION" || 
      note.grade === "CBSE"
    );

    if (!gradeXNotes.length) {
      notesList.innerHTML = '<p class="muted-text">No resources yet. Add one above.</p>';
      return;
    }

    // Sort chronologically by chapter number (Notifications go to top if we consider them chapterless, or we can just let them sort by title)
    gradeXNotes.sort((a, b) => {
      // Prioritize notifications to the top
      if (a.grade === "NOTIFICATION" && b.grade !== "NOTIFICATION") return -1;
      if (b.grade === "NOTIFICATION" && a.grade !== "NOTIFICATION") return 1;

      const sortA = getChapterSortValue(a);
      const sortB = getChapterSortValue(b);
      if (sortA !== sortB) return sortA - sortB;
      
      const titleA = parseResourceTitle(a.title).cleanTitle;
      const titleB = parseResourceTitle(b.title).cleanTitle;
      return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
    });

    gradeXNotes.forEach((note) => {
      let typeLabel = "Study Note";
      let typeColor = "background: var(--primary-light); color: var(--primary);";
      if (note.grade === "X-Worksheet") {
        typeLabel = "Worksheet";
        typeColor = "background: var(--accent-light); color: var(--accent);";
      } else if (note.grade === "X-Other") {
        typeLabel = "Other Material";
        typeColor = "background: #fdf4ff; color: #d946ef;";
      } else if (note.grade === "NOTIFICATION") {
        typeLabel = "Notification";
        typeColor = "background: var(--danger-hover); color: white;";
      } else if (note.grade === "CBSE") {
        typeLabel = "CBSE Folder";
        typeColor = "background: #fffbe3; color: #b45309;";
      }
      
      const parsed = parseResourceTitle(note.title);
      const chapterBadge = parsed.chapter ? `<span class="note-chapter-tag">Ch ${escapeHtml(parsed.chapter)}</span> ` : "";

      const card = document.createElement("article");
      card.className = "paper-card";
      card.innerHTML = `
        <div>
          <h3>
            ${chapterBadge}${escapeHtml(parsed.cleanTitle)} 
            <span class="score-pill" style="font-size: 0.75rem; margin-left: 0.5rem; background: var(--primary-light); color: var(--primary); font-weight: 600;">${escapeHtml(note.subject || "General")}</span>
            <span class="score-pill" style="font-size: 0.75rem; margin-left: 0.25rem; ${typeColor} font-weight: 600;">${typeLabel}</span>
          </h3>
          <p class="muted-text">Link: <a href="${escapeHtml(note.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(note.link)}</a></p>
        </div>
        <button class="btn btn-danger small-btn" data-id="${note.id}">Delete</button>
      `;
      card.querySelector("button").addEventListener("click", async () => {
        if (!confirm(`Delete resource "${parsed.cleanTitle}"?`)) return;
        try {
          await deleteNote(note.id);
          await renderNotes();
        } catch (err) {
          alert(err.message || "Could not delete resource.");
        }
      });
      notesList.appendChild(card);
    });
    
    const dashboardSearchInput = document.getElementById("dashboard-search-input");
    if (dashboardSearchInput && dashboardSearchInput.value) {
      dashboardSearchInput.dispatchEvent(new Event("input"));
    }
  } catch (err) {
    notesList.innerHTML = `<p class="error-text">Could not load resources: ${escapeHtml(err.message)}</p>`;
  }
}

const dashboardSearchInput = document.getElementById("dashboard-search-input");
if (dashboardSearchInput) {
  dashboardSearchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const articles = document.querySelectorAll("#notes-list .paper-card");
    let visibleCount = 0;
    
    articles.forEach(article => {
      const text = article.textContent.toLowerCase();
      if (text.includes(term)) {
        article.style.display = "flex";
        visibleCount++;
      } else {
        article.style.display = "none";
      }
    });
    
    let emptyMsg = document.getElementById("dashboard-empty-msg");
    if (!emptyMsg && articles.length > 0) {
      emptyMsg = document.createElement("p");
      emptyMsg.id = "dashboard-empty-msg";
      emptyMsg.className = "muted-text text-center";
      emptyMsg.style.marginTop = "2rem";
      document.getElementById("notes-list").appendChild(emptyMsg);
    }
    
    if (emptyMsg) {
      if (visibleCount === 0 && articles.length > 0) {
        emptyMsg.textContent = "No matching resources found.";
        emptyMsg.style.display = "block";
      } else {
        emptyMsg.style.display = "none";
      }
    }
  });
}

if (noteForm) {
  noteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    noteSubmitBtn.disabled = true;
    noteSubmitBtn.textContent = "Adding...";

    // Format title to prepend chapter info: "[Ch X] Title"
    const formattedTitle = `[Ch ${noteChapter.value.trim()}] ${noteTitle.value.trim()}`;

    try {
      await createNote({
        title: formattedTitle,
        grade: noteType.value, // Sends 'X' or 'X-Worksheet'
        subject: noteSubject.value,
        link: noteLink.value,
      });

      noteForm.reset();
      await renderNotes();
      alert("Resource added successfully.");
    } catch (err) {
      alert(err.message || "Could not add resource.");
    } finally {
      noteSubmitBtn.disabled = false;
      noteSubmitBtn.textContent = "Add Grade 10 Resource";
    }
  });
}

const cbseForm = document.getElementById("cbse-form");
if (cbseForm) {
  cbseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("cbse-submit-btn");
    btn.disabled = true;
    btn.textContent = "Adding...";

    try {
      await createNote({
        title: document.getElementById("cbse-title").value.trim(),
        grade: "CBSE",
        subject: "All",
        link: document.getElementById("cbse-link").value.trim()
      });

      cbseForm.reset();
      await renderNotes();
      alert("CBSE Folder added successfully.");
    } catch (err) {
      alert(err.message || "Could not add CBSE folder.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Add CBSE Folder";
    }
  });
}

const notifForm = document.getElementById("notif-form");
if (notifForm) {
  notifForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("notif-submit-btn");
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
      await createNote({
        title: document.getElementById("notif-message").value.trim(),
        grade: "NOTIFICATION",
        subject: document.getElementById("notif-institute").value,
        link: document.getElementById("notif-link").value.trim() || "#",
      });

      notifForm.reset();
      await renderNotes();
      alert("Notification sent successfully.");
    } catch (err) {
      alert(err.message || "Could not send notification.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Send Notification";
    }
  });
}

// Auto-login check
if (hasCoachPassword()) {
  fetchSubmissions()
    .then(() => {
      showDashboard();
      renderNotes();
    })
    .catch(showLogin);
} else {
  showLogin();
}

// --- TABS LOGIC ---
const tabNotes = document.getElementById("tab-notes");
const tabExams = document.getElementById("tab-exams");
const navTabResources = document.getElementById("nav-tab-resources");
const navTabExams = document.getElementById("nav-tab-exams");

if (navTabResources && navTabExams) {
  navTabResources.addEventListener("click", () => {
    tabNotes.classList.remove("hidden");
    tabExams.classList.add("hidden");
    navTabResources.style.background = "var(--primary)";
    navTabResources.style.color = "white";
    navTabExams.style.background = "var(--surface-card)";
    navTabExams.style.color = "var(--text)";
  });
  
  navTabExams.addEventListener("click", () => {
    tabNotes.classList.add("hidden");
    tabExams.classList.remove("hidden");
    navTabExams.style.background = "var(--primary)";
    navTabExams.style.color = "white";
    navTabResources.style.background = "var(--surface-card)";
    navTabResources.style.color = "var(--text)";
    loadExamData();
  });
}

// --- EXAM MANAGEMENT ---
const examForm = document.getElementById("exam-form");
const examNameInput = document.getElementById("exam-name");
const examTotalInput = document.getElementById("exam-total");
const examSubmitBtn = document.getElementById("exam-submit-btn");

if (examForm) {
  examForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    examSubmitBtn.disabled = true;
    examSubmitBtn.textContent = "Creating...";
    try {
      await createExam({
        name: examNameInput.value.trim(),
        total_marks: examTotalInput.value
      });
      examForm.reset();
      await loadExamData();
    } catch (err) {
      alert("Error creating exam: " + err.message);
    } finally {
      examSubmitBtn.disabled = false;
      examSubmitBtn.textContent = "Create Exam";
    }
  });
}

async function loadExamData() {
  try {
    const [examsRes, marksRes, studentsRes] = await Promise.all([
      fetchExams(),
      fetchMarks(),
      fetchStudents()
    ]);
    
    renderExamsList(examsRes.exams);
    renderPerformanceTable(examsRes.exams, marksRes.marks, studentsRes.students);
  } catch (err) {
    console.error("Error loading exam data:", err);
  }
}

function renderExamsList(exams) {
  const examsList = document.getElementById("exams-list");
  if (!examsList) return;
  examsList.innerHTML = "";
  if (!exams || exams.length === 0) {
    examsList.innerHTML = `<p class="muted-text">No exams created yet.</p>`;
    return;
  }
  
  exams.forEach(ex => {
    const li = document.createElement("li");
    li.className = "paper-card";
    li.innerHTML = `
      <div>
        <h3>${escapeHtml(ex.name)} <span class="score-pill">Total: ${ex.total_marks}</span></h3>
      </div>
      <button class="btn btn-danger small-btn" data-id="${ex.id}">Delete</button>
    `;
    li.querySelector("button").addEventListener("click", async () => {
      if (!confirm(`Delete exam "${ex.name}"? This will also delete all student marks for this exam!`)) return;
      try {
        await deleteExam(ex.id);
        await loadExamData();
      } catch (e) {
        alert("Error deleting exam: " + e.message);
      }
    });
    examsList.appendChild(li);
  });
}

function renderPerformanceTable(exams, marks, students) {
  const thead = document.getElementById("performance-table-head");
  const tbody = document.getElementById("performance-table-body");
  if (!thead || !tbody) return;
  
  // Build Header
  let headerHtml = `<th style="padding: 1rem; font-weight: 600; color: var(--text-muted);">Student</th>`;
  exams.forEach(ex => {
    headerHtml += `<th style="padding: 1rem; font-weight: 600; color: var(--text-muted); text-align: center;">${escapeHtml(ex.name)}<br><small style="font-weight:400; opacity:0.8;">(${ex.total_marks})</small></th>`;
  });
  headerHtml += `<th style="padding: 1rem; font-weight: 600; color: var(--text-muted); text-align: right;">Total %</th>`;
  thead.innerHTML = headerHtml;
  
  // Build Rows
  tbody.innerHTML = "";
  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="100%" class="text-center" style="padding: 2rem; color: var(--text-muted);">No students yet.</td></tr>`;
    return;
  }
  
  // Group marks by student_id
  const marksByStudent = {};
  (marks || []).forEach(m => {
    if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = {};
    marksByStudent[m.student_id][m.exam_id] = m.marks_obtained;
  });
  
  students.forEach(student => {
    const studentMarks = marksByStudent[student.id] || {};
    let rowHtml = `<td style="padding: 1rem; border-bottom: 1px solid var(--border);">${escapeHtml(student.name)}</td>`;
    
    let studentTotalObtained = 0;
    let studentTotalMax = 0;
    
    exams.forEach(ex => {
      const mark = studentMarks[ex.id];
      if (mark !== undefined) {
        rowHtml += `<td style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: center; color: var(--primary); font-weight: 500;">${mark}</td>`;
        studentTotalObtained += mark;
        studentTotalMax += ex.total_marks;
      } else {
        rowHtml += `<td style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: center; color: var(--text-muted);">&mdash;</td>`;
      }
    });
    
    let percentage = "&mdash;";
    if (studentTotalMax > 0) {
      percentage = ((studentTotalObtained / studentTotalMax) * 100).toFixed(1) + "%";
    }
    
    rowHtml += `<td style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: right; font-weight: 600;">${percentage}</td>`;
    
    const tr = document.createElement("tr");
    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });
  
  // Render Chart
  renderChart(exams, marksByStudent);
}

function renderChart(exams, marksByStudent) {
  const ctx = document.getElementById('performance-chart');
  if (!ctx) return;
  
  const labels = [];
  const data = [];
  
  exams.forEach(ex => {
    labels.push(ex.name);
    let totalMarks = 0;
    let studentCount = 0;
    
    Object.values(marksByStudent).forEach(studentMarks => {
      if (studentMarks[ex.id] !== undefined) {
        totalMarks += (studentMarks[ex.id] / ex.total_marks) * 100;
        studentCount++;
      }
    });
    
    const avg = studentCount > 0 ? (totalMarks / studentCount) : 0;
    data.push(avg.toFixed(1));
  });

  if (window.performanceChartInstance) {
    window.performanceChartInstance.destroy();
  }

  window.performanceChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Class Average (%)',
        data: data,
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: '#9ca3af'
          },
          grid: {
            color: 'rgba(255,255,255,0.1)'
          }
        },
        x: {
          ticks: {
            color: '#9ca3af'
          },
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#f3f4f6' }
        }
      }
    }
  });
}

