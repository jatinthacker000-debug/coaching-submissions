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

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }
    setCoachPassword(data.token);
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

    // Show Grade 10 (X), Grade 12 (XII) notes, worksheets, other materials, notifications, and CBSE resources
    const gradeXNotes = (notes || []).filter(note => 
      note.grade === "X" || note.grade === "X-Worksheet" || 
      note.grade === "X-Other" || note.grade === "XII" || 
      note.grade === "XII-Worksheet" || note.grade === "XII-Other" || 
      note.grade === "NOTIFICATION" || note.grade === "CBSE" || note.grade === "CBSE-XII"
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
      if (note.grade === "X-Worksheet" || note.grade === "XII-Worksheet") {
        typeLabel = "Worksheet";
        typeColor = "background: var(--accent-light); color: var(--accent);";
      } else if (note.grade === "X-Other" || note.grade === "XII-Other") {
        typeLabel = "Other Material";
        typeColor = "background: #fdf4ff; color: #d946ef;";
      } else if (note.grade === "XII") {
        typeLabel = "Study Note";
        typeColor = "background: var(--primary-light); color: var(--primary);";
      } else if (note.grade === "NOTIFICATION") {
        typeLabel = "Notification";
        typeColor = "background: var(--danger-hover); color: white;";
      } else if (note.grade === "CBSE" || note.grade === "CBSE-XII") {
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
      noteSubmitBtn.textContent = "Add Resource";
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
        grade: document.getElementById("cbse-grade").value,
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
      const checkedInstitutes = Array.from(document.querySelectorAll("#notif-institutes-container input:checked")).map(cb => cb.value);
      if (checkedInstitutes.length === 0) {
        throw new Error("Please select at least one institute.");
      }
      
      await createNote({
        title: document.getElementById("notif-message").value.trim(),
        grade: "NOTIFICATION",
        subject: checkedInstitutes.join(", "),
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
      const checkedGroups = Array.from(document.querySelectorAll("#exam-groups-container input:checked")).map(cb => cb.value);
      await createExam({
        name: examNameInput.value.trim(),
        total_marks: examTotalInput.value,
        target_groups: checkedGroups
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

// Global state for analytics
let globalExams = [];
let globalMarks = [];
let globalStudents = [];
let globalMarksByStudent = {};

async function loadExamData() {
    try {
      const [examsRes, marksRes, studentsRes] = await Promise.all([
        fetchExams(),
        fetchMarks(),
        fetchStudents()
      ]);
      
      globalExams = (examsRes.exams || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      globalMarks = marksRes.marks || [];
      globalStudents = studentsRes.students || [];
      
      renderExamsList(globalExams);
      applyGroupFilterAndRender();
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
  headerHtml += `<th style="padding: 1rem; font-weight: 600; color: var(--text-muted); text-align: right;">Action</th>`;
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
    
    rowHtml += `<td style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: right;">
      <button class="btn btn-danger small-btn delete-student-btn" data-id="${escapeHtml(student.id)}" data-name="${escapeHtml(student.name)}">Delete</button>
    </td>`;
    
    const tr = document.createElement("tr");
    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });
  
  // Attach event listeners for delete buttons
  document.querySelectorAll(".delete-student-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-id");
      const name = e.target.getAttribute("data-name");
      if (!confirm(`Are you sure you want to completely delete student "${name}"? This will also remove all their marks.`)) return;
      
      e.target.disabled = true;
      e.target.textContent = "Deleting...";
      
      try {
        const response = await fetch(`/api/students?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getCoachPassword()}`
          }
        });
        const data = await parseResponse(response);
        if (data.success) {
          await loadExamData(); // Refresh table
        }
      } catch (err) {
        alert("Error deleting student: " + err.message);
        e.target.disabled = false;
        e.target.textContent = "Delete";
      }
    });
  });
  
  globalMarksByStudent = marksByStudent;
  
  // Render Chart
  const studentSelectEl = document.getElementById("analytics-student");
  const selectedStudentIds = studentSelectEl ? Array.from(studentSelectEl.selectedOptions).map(o => o.value).filter(v => v !== "") : [];
  renderChart(exams, marksByStudent, selectedStudentIds);
}

function renderChart(exams, marksByStudent, studentIds = []) {
  if (!Array.isArray(studentIds)) {
    studentIds = studentIds ? [studentIds] : [];
  }
  
  const ctx = document.getElementById('performance-chart');
  if (!ctx) return;
  
  const labels = [];
  const classAvgData = [];
  
  exams.forEach(ex => {
    labels.push(ex.name);
    
    // Calculate Class Average for this exam
    let totalMarks = 0;
    let studentCount = 0;
    Object.values(marksByStudent).forEach(studentMarks => {
      if (studentMarks[ex.id] !== undefined) {
        totalMarks += (studentMarks[ex.id] / ex.total_marks) * 100;
        studentCount++;
      }
    });
    const avg = studentCount > 0 ? (totalMarks / studentCount) : 0;
    classAvgData.push(avg.toFixed(1));
  });

  const chartTitle = document.getElementById("chart-title");
  if (chartTitle) {
    if (studentIds.length === 1) {
      const studentObj = globalStudents.find(s => s.id === studentIds[0]);
      chartTitle.textContent = studentObj ? `${studentObj.name}'s Performance vs Class` : 'Student Performance vs Class';
    } else if (studentIds.length > 1) {
      chartTitle.textContent = 'Students Performance Comparison';
    } else {
      chartTitle.textContent = 'Class Performance Trend';
    }
  }

  if (window.performanceChartInstance) {
    window.performanceChartInstance.destroy();
  }

  const datasets = [];

  // Always show Class Average (as a line)
  datasets.push({
    type: 'line',
    label: 'Class Average (%)',
    data: classAvgData,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 1)',
    borderWidth: 2,
    tension: 0.3,
    borderDash: studentIds.length > 0 ? [5, 5] : [], // Dashed if comparing with student
    fill: studentIds.length === 0,
    pointBackgroundColor: 'rgba(139, 92, 246, 1)',
    datalabels: {
      display: true,
      align: 'top',
      anchor: 'end',
      backgroundColor: 'rgba(139, 92, 246, 0.9)',
      color: 'white',
      borderRadius: 4,
      padding: 4,
      font: { weight: 'bold', size: 10 },
      formatter: (value) => value + '%'
    }
  });

  const colors = [
    { bg: 'rgba(5, 150, 105, 0.6)', border: 'rgba(5, 150, 105, 1)' }, // Green
    { bg: 'rgba(239, 68, 68, 0.6)', border: 'rgba(239, 68, 68, 1)' },   // Red
    { bg: 'rgba(59, 130, 246, 0.6)', border: 'rgba(59, 130, 246, 1)' }, // Blue
    { bg: 'rgba(245, 158, 11, 0.6)', border: 'rgba(245, 158, 11, 1)' }  // Yellow
  ];

  // If students are selected, add their dataset as histograms
  studentIds.forEach((sId, index) => {
    const studentData = [];
    exams.forEach(ex => {
      const studentMarks = marksByStudent[sId] || {};
      if (studentMarks[ex.id] !== undefined) {
        const perc = (studentMarks[ex.id] / ex.total_marks) * 100;
        studentData.push(perc.toFixed(1));
      } else {
        studentData.push(null);
      }
    });

    const studentObj = globalStudents.find(s => s.id === sId);
    const color = colors[index % colors.length];

    datasets.push({
      type: 'bar',
      label: studentObj ? `${studentObj.name} (%)` : 'Student (%)',
      data: studentData,
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 1,
      datalabels: {
        display: true,
        align: 'end',
        anchor: 'end',
        color: color.border,
        font: { weight: 'bold', size: 11 },
        formatter: (value) => value ? `${studentObj ? studentObj.name.split(' ')[0] : ''}\n${value}%` : ''
      }
    });
  });

  // Build Chart Summary Data Table
  const summaryContainer = document.getElementById("chart-summary-container");
  if (summaryContainer) {
    if (studentIds.length > 0) {
      let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; font-size: 0.9rem;">
        <thead>
          <tr style="background: var(--surface-card); border-bottom: 1px solid var(--border);">
            <th style="padding: 0.75rem; text-align: left;">Student Name</th>`;
      
      exams.forEach(ex => {
        tableHtml += `<th style="padding: 0.75rem; text-align: center;">${escapeHtml(ex.name)}</th>`;
      });
      tableHtml += `<th style="padding: 0.75rem; text-align: center;">Overall Average</th></tr></thead><tbody>`;

      studentIds.forEach(sId => {
        const studentObj = globalStudents.find(s => s.id === sId);
        let studentTotalMax = 0;
        let studentTotalObtained = 0;
        let rowHtml = `<tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 0.75rem; font-weight: 500;">${studentObj ? escapeHtml(studentObj.name) : 'Unknown'}</td>`;
        
        exams.forEach(ex => {
          const studentMarks = marksByStudent[sId] || {};
          if (studentMarks[ex.id] !== undefined) {
            const marks = studentMarks[ex.id];
            const max = ex.total_marks;
            const perc = (marks / max) * 100;
            studentTotalMax += max;
            studentTotalObtained += marks;
            rowHtml += `<td style="padding: 0.75rem; text-align: center;">${marks}/${max} <br><span style="color: var(--text-muted); font-size: 0.8rem;">(${perc.toFixed(1)}%)</span></td>`;
          } else {
            rowHtml += `<td style="padding: 0.75rem; text-align: center; color: var(--text-muted);">N/A</td>`;
          }
        });

        const overallPerc = studentTotalMax > 0 ? ((studentTotalObtained / studentTotalMax) * 100).toFixed(1) : 'N/A';
        rowHtml += `<td style="padding: 0.75rem; text-align: center; font-weight: bold; color: var(--primary);">${overallPerc}%</td></tr>`;
        tableHtml += rowHtml;
      });

      tableHtml += `</tbody></table>`;
      summaryContainer.innerHTML = tableHtml;
      summaryContainer.style.display = "block";
    } else {
      summaryContainer.style.display = "none";
      summaryContainer.innerHTML = "";
    }
  }

  // Hide old overall average container
  const oldAvgContainer = document.getElementById("student-overall-avg-container");
  if (oldAvgContainer) oldAvgContainer.style.display = "none";

  window.performanceChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    plugins: [ChartDataLabels],
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: '#9ca3af' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        x: {
          ticks: { color: '#9ca3af' },
          grid: { display: false }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#9ca3af' }
        }
      }
    }
  });
}

// --- ANALYTICS FEATURE ---
function updateAnalyticsDropdowns(studentsToUse = globalStudents) {
  const studentSelect = document.getElementById("analytics-student");
  const examsSelect = document.getElementById("analytics-exams");
  
  if (!studentSelect || !examsSelect) return;
  
  // Save current values to restore them
  const currStudents = Array.from(studentSelect.selectedOptions).map(o => o.value);
  const currExams = Array.from(examsSelect.selectedOptions).map(o => o.value);

  // Populate students
  let studentHtml = `<option value="">-- Class Average --</option>`;
  studentsToUse.forEach(s => {
    studentHtml += `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`;
  });
  studentSelect.innerHTML = studentHtml;
  
  // Restore selected options
  Array.from(studentSelect.options).forEach(opt => {
    if (currStudents.includes(opt.value)) {
      opt.selected = true;
    }
  });

  // Populate exams
  let examHtml = ``;
  globalExams.forEach(ex => {
    examHtml += `<option value="${escapeHtml(ex.id)}">${escapeHtml(ex.name)}</option>`;
  });
  examsSelect.innerHTML = examHtml;
  
  Array.from(examsSelect.options).forEach(opt => {
    if (currExams.includes(opt.value)) opt.selected = true;
  });
}

// Add event listeners when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  const studentSelect = document.getElementById("analytics-student");
  const examsSelect = document.getElementById("analytics-exams");
  function refreshChartDisplay() {
    const finalStudentVals = Array.from(studentSelect.selectedOptions).map(o => o.value).filter(v => v !== "");
    const selectedExams = Array.from(examsSelect.selectedOptions).map(o => o.value).filter(v => v !== "");
    
    let examsToRender = globalExams;
    if (selectedExams.length > 0) {
      examsToRender = globalExams.filter(ex => selectedExams.includes(ex.id));
    }
    
    renderChart(examsToRender, globalMarksByStudent, finalStudentVals);
  }
  
  if (studentSelect) {
    studentSelect.addEventListener("change", () => {
      const selectedVals = Array.from(studentSelect.selectedOptions).map(o => o.value).filter(v => v !== "");
      
      // Limit to 4 selections
      if (selectedVals.length > 4) {
        alert("You can select a maximum of 4 students.");
        // Unselect the last clicked one by just ignoring it and resetting
        Array.from(studentSelect.options).forEach(opt => {
          if (!selectedVals.slice(0, 4).includes(opt.value)) opt.selected = false;
        });
      }
      
      refreshChartDisplay();
    });
  }
  
  if (examsSelect) {
    examsSelect.addEventListener("change", () => {
      refreshChartDisplay();
    });
  }
});

// --- EDIT OR DELETE MARKS FEATURE ---
let currentMarkId = null;

function updateEditMarksDropdowns(studentsToUse = globalStudents) {
  const studentSelect = document.getElementById("edit-mark-student");
  const examSelect = document.getElementById("edit-mark-exam");
  
  if (!studentSelect || !examSelect) return;
  
  const currStudent = studentSelect.value;
  const currExam = examSelect.value;

  let studentHtml = `<option value="">Select Student...</option>`;
  studentsToUse.forEach(s => {
    studentHtml += `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`;
  });
  studentSelect.innerHTML = studentHtml;
  studentSelect.value = currStudent;

  let examHtml = `<option value="">Select Exam...</option>`;
  globalExams.forEach(ex => {
    examHtml += `<option value="${escapeHtml(ex.id)}">${escapeHtml(ex.name)}</option>`;
  });
  examSelect.innerHTML = examHtml;
  examSelect.value = currExam;
  
  refreshEditMarkState();
}

function refreshEditMarkState() {
  const studentSelect = document.getElementById("edit-mark-student");
  const examSelect = document.getElementById("edit-mark-exam");
  const markInput = document.getElementById("edit-mark-value");
  const updateBtn = document.getElementById("edit-mark-update-btn");
  const deleteBtn = document.getElementById("edit-mark-delete-btn");
  const statusMsg = document.getElementById("edit-mark-status");
  
  if (!studentSelect || !examSelect) return;
  
  const sId = studentSelect.value;
  examSelect.disabled = !sId;
  
  if (!sId) {
    examSelect.value = "";
  }
  
  const eId = examSelect.value;
  markInput.disabled = true;
  updateBtn.disabled = true;
  deleteBtn.disabled = true;
  currentMarkId = null;
  statusMsg.style.display = "none";
  
  if (sId && eId) {
    // Find the mark
    const markObj = globalMarks.find(m => m.student_id === sId && m.exam_id === eId);
    if (markObj) {
      markInput.value = markObj.marks_obtained;
      currentMarkId = markObj.id;
      markInput.disabled = false;
      updateBtn.disabled = false;
      deleteBtn.disabled = false;
    } else {
      markInput.value = "";
      markInput.placeholder = "No mark found";
    }
  } else {
    markInput.value = "";
    markInput.placeholder = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const studentSelect = document.getElementById("edit-mark-student");
  const examSelect = document.getElementById("edit-mark-exam");
  const updateBtn = document.getElementById("edit-mark-update-btn");
  const deleteBtn = document.getElementById("edit-mark-delete-btn");
  const markInput = document.getElementById("edit-mark-value");
  const statusMsg = document.getElementById("edit-mark-status");
  
  if (studentSelect) studentSelect.addEventListener("change", refreshEditMarkState);
  if (examSelect) examSelect.addEventListener("change", refreshEditMarkState);
  
  function setStatus(msg, isError = false) {
    statusMsg.style.display = "block";
    statusMsg.textContent = msg;
    statusMsg.style.color = isError ? "var(--danger)" : "#059669";
  }
  
  if (updateBtn) {
    updateBtn.addEventListener("click", async () => {
      const sId = studentSelect.value;
      const eId = examSelect.value;
      const marks_obtained = markInput.value;
      
      if (!sId || !eId || marks_obtained === "") return;
      
      updateBtn.disabled = true;
      updateBtn.textContent = "Updating...";
      
      try {
        const response = await fetch("/api/marks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getCoachPassword()}`
          },
          body: JSON.stringify({
            student_id: sId,
            submissions: [{ exam_id: eId, marks_obtained }]
          })
        });
        
        const data = await parseResponse(response);
        if (data.success) {
          setStatus("Mark updated successfully!");
          await loadExamData(); // Refresh everything
        }
      } catch (err) {
        setStatus(err.message || "Failed to update.", true);
      } finally {
        updateBtn.disabled = false;
        updateBtn.textContent = "Update Mark";
      }
    });
  }
  
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!currentMarkId) return;
      if (!confirm("Are you sure you want to delete this mark?")) return;
      
      deleteBtn.disabled = true;
      deleteBtn.textContent = "Deleting...";
      
      try {
        const response = await fetch(`/api/marks?id=${encodeURIComponent(currentMarkId)}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getCoachPassword()}`
          }
        });
        
        const data = await parseResponse(response);
        if (data.success) {
          setStatus("Mark deleted successfully!");
          await loadExamData(); // Refresh everything
        }
      } catch (err) {
        setStatus(err.message || "Failed to delete.", true);
      } finally {
        deleteBtn.disabled = false;
        deleteBtn.textContent = "Delete Mark";
      }
    });
  }
});




// --- ADVANCED ANALYTICS COMPUTATIONS ---
function calculateClassStats(exams, marksByStudent, validStudentIds = null) {
  let allPercentages = [];
  let d90 = 0, d75 = 0, d50 = 0, dBelow = 0;
  
  // Calculate average for each student over all exams they took
  Object.entries(marksByStudent).forEach(([studentId, studentMarks]) => {
    if (validStudentIds && !validStudentIds.has(studentId)) return;
    
    let studentTotalMax = 0;
    let studentTotalObtained = 0;
    
    exams.forEach(ex => {
      if (studentMarks[ex.id] !== undefined) {
        studentTotalMax += ex.total_marks;
        studentTotalObtained += studentMarks[ex.id];
      }
    });
    
    if (studentTotalMax > 0) {
      const perc = (studentTotalObtained / studentTotalMax) * 100;
      allPercentages.push(perc);
      
      if (perc >= 90) d90++;
      else if (perc >= 75) d75++;
      else if (perc >= 50) d50++;
      else dBelow++;
    }
  });

  const avgEl = document.getElementById("stat-class-avg");
  const highestEl = document.getElementById("stat-highest");
  const lowestEl = document.getElementById("stat-lowest");
  const medianEl = document.getElementById("stat-median");
  const below50El = document.getElementById("stat-below-50");
  
  if (!avgEl) return;
  
  if (allPercentages.length === 0) {
    avgEl.innerHTML = "&mdash;";
    highestEl.innerHTML = "&mdash;";
    lowestEl.innerHTML = "&mdash;";
    medianEl.innerHTML = "&mdash;";
    below50El.innerHTML = "&mdash;";
    return;
  }
  
  allPercentages.sort((a, b) => a - b);
  
  const sum = allPercentages.reduce((a, b) => a + b, 0);
  const avg = sum / allPercentages.length;
  const highest = allPercentages[allPercentages.length - 1];
  const lowest = allPercentages[0];
  
  let median;
  const mid = Math.floor(allPercentages.length / 2);
  if (allPercentages.length % 2 === 0) {
    median = (allPercentages[mid - 1] + allPercentages[mid]) / 2;
  } else {
    median = allPercentages[mid];
  }
  
  avgEl.textContent = avg.toFixed(1) + "%";
  highestEl.textContent = highest.toFixed(1) + "%";
  lowestEl.textContent = lowest.toFixed(1) + "%";
  medianEl.textContent = median.toFixed(1) + "%";
  below50El.textContent = dBelow;
  
  document.getElementById("dist-90").textContent = d90;
  document.getElementById("dist-75").textContent = d75;
  document.getElementById("dist-50").textContent = d50;
  document.getElementById("dist-below").textContent = dBelow;
}

function renderAttentionList(exams, marksByStudent, studentsToUse = globalStudents) {
  const attentionList = document.getElementById("attention-list");
  if (!attentionList) return;
  
  if (exams.length === 0) {
    attentionList.innerHTML = `<li style="color: var(--text-muted); text-align: center; padding: 1rem;">No exams available.</li>`;
    return;
  }
  
  const latestExam = exams[exams.length - 1];
  const previousExam = exams.length > 1 ? exams[exams.length - 2] : null;
  
  const attentionStudents = [];
  
  studentsToUse.forEach(student => {
    const sm = marksByStudent[student.id] || {};
    
    const latestMark = sm[latestExam.id];
    let latestPerc = null;
    let needsAttention = false;
    let reason = "";
    
    if (latestMark !== undefined) {
      latestPerc = (latestMark / latestExam.total_marks) * 100;
      if (latestPerc < 50) {
        needsAttention = true;
        reason = "Scored below 50% in the latest exam.";
      }
    }
    
    let previousPerc = null;
    let drop = null;
    if (previousExam && sm[previousExam.id] !== undefined) {
      previousPerc = (sm[previousExam.id] / previousExam.total_marks) * 100;
      if (latestPerc !== null) {
        drop = previousPerc - latestPerc;
        if (drop >= 10 && !needsAttention) {
          needsAttention = true;
          reason = `Performance dropped by ${drop.toFixed(1)}%.`;
        } else if (drop > 0 && needsAttention) {
          reason = `Scored below 50% and dropped by ${drop.toFixed(1)}%.`;
        }
      }
    }
    
    if (needsAttention) {
      attentionStudents.push({
        name: student.name,
        latestPerc: latestPerc,
        previousPerc: previousPerc,
        reason: reason,
        drop: drop || 0
      });
    }
  });
  
  // Sort by highest drop first
  attentionStudents.sort((a, b) => b.drop - a.drop);
  
  if (attentionStudents.length === 0) {
    attentionList.innerHTML = `<li style="color: #059669; text-align: center; padding: 1rem; font-weight: 500;">🎉 Great job! No students currently require immediate attention.</li>`;
    return;
  }
  
  let html = "";
  attentionStudents.forEach(s => {
    let statHtml = "";
    if (s.latestPerc !== null) {
      statHtml += `<span style="color: var(--danger); font-weight: bold;">${s.latestPerc.toFixed(1)}%</span> (Latest)`;
    } else {
      statHtml += `<span style="color: var(--text-muted);">Missed Latest Exam</span>`;
    }
    
    if (s.previousPerc !== null) {
      statHtml += ` <span style="color: var(--text-muted); margin: 0 0.5rem;">|</span> <span style="color: var(--text);">${s.previousPerc.toFixed(1)}%</span> (Previous)`;
    }
    
    html += `
      <li style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;">
        <div>
          <strong style="color: var(--text); font-size: 1.1rem; display: block; margin-bottom: 0.25rem;">${escapeHtml(s.name)}</strong>
          <span style="color: var(--danger); font-size: 0.85rem;">⚠️ ${s.reason}</span>
        </div>
        <div style="text-align: right; font-size: 0.95rem;">
          ${statHtml}
        </div>
      </li>
    `;
  });
  
  attentionList.innerHTML = html;
}


// STUDENT GROUPS MANAGEMENT
const manageGroupStudent = document.getElementById("manage-group-student");
const manageGroupSelect = document.getElementById("manage-group-select");
const manageGroupUpdateBtn = document.getElementById("manage-group-update-btn");
const manageGroupStatus = document.getElementById("manage-group-status");

async function populateGroupManager() {
  if (!manageGroupStudent) return;
  try {
    const { students } = await fetchStudents();
    manageGroupStudent.innerHTML = '<option value="">Select Student...</option>';
    students.forEach(s => {
      manageGroupStudent.innerHTML += `<option value="${s.id}" data-group="${s.group_name || ''}">${escapeHtml(s.name)} ${s.group_name ? `(${escapeHtml(s.group_name)})` : ''}</option>`;
    });
  } catch(e) {}
}

if (manageGroupStudent) {
  manageGroupStudent.addEventListener("change", (e) => {
    const opt = e.target.options[e.target.selectedIndex];
    manageGroupSelect.value = opt.getAttribute("data-group") || "";
  });
}

if (manageGroupUpdateBtn) {
  manageGroupUpdateBtn.addEventListener("click", async () => {
    const sid = manageGroupStudent.value;
    const grp = manageGroupSelect.value;
    if (!sid) return alert("Select student first");
    manageGroupUpdateBtn.disabled = true;
    try {
      const studentName = manageGroupStudent.options[manageGroupStudent.selectedIndex].text.split(" (")[0];
      await fetch("/api/students", {
         method: "POST",
         headers: { 
           "Content-Type": "application/json",
           "Authorization": `Bearer ${getCoachPassword()}`
         },
         body: JSON.stringify({ name: studentName, group_name: grp })
      });
      manageGroupStatus.textContent = "Group updated!";
      manageGroupStatus.style.display = "block";
      manageGroupStatus.style.color = "#059669";
      setTimeout(() => manageGroupStatus.style.display="none", 3000);
      await populateGroupManager();
      await loadExamData();
    } catch (e) {
      alert(e.message);
    }
    manageGroupUpdateBtn.disabled = false;
  });
}

document.addEventListener("DOMContentLoaded", populateGroupManager);

// GROUP FILTER LOGIC FOR SECTIONS
const perfGroupFilter = document.getElementById("performance-group-filter");
const overviewGroupFilter = document.getElementById("overview-table-group-filter");
const analyticsGroupFilter = document.getElementById("analytics-group-filter");
const attentionGroupFilter = document.getElementById("attention-group-filter");

function getFilteredStudents(filterEl) {
  if (!globalStudents) return [];
  const selectedGrp = filterEl ? filterEl.value : "";
  if (selectedGrp) {
    return globalStudents.filter(s => s.group_name === selectedGrp);
  }
  return globalStudents;
}

if (perfGroupFilter) perfGroupFilter.addEventListener("change", renderClassStatsSection);
if (overviewGroupFilter) overviewGroupFilter.addEventListener("change", renderOverviewTableSection);
if (analyticsGroupFilter) analyticsGroupFilter.addEventListener("change", renderAnalyticsSection);
if (attentionGroupFilter) attentionGroupFilter.addEventListener("change", renderAttentionAndGrowthSection);

function renderClassStatsSection() {
  if (!globalStudents || !globalExams) return;
  const filteredStudents = getFilteredStudents(perfGroupFilter);
  const validStudentIds = new Set(filteredStudents.map(s => s.id));
  calculateClassStats(globalExams, globalMarksByStudent, validStudentIds);
}

function renderOverviewTableSection() {
  if (!globalStudents || !globalExams) return;
  const filteredStudents = getFilteredStudents(overviewGroupFilter);
  const validStudentIds = new Set(filteredStudents.map(s => s.id));
  const filteredMarks = globalMarks.filter(m => validStudentIds.has(m.student_id));
  renderPerformanceTable(globalExams, filteredMarks, filteredStudents);
}

function renderAnalyticsSection() {
  if (!globalStudents || !globalExams) return;
  const filteredStudents = getFilteredStudents(analyticsGroupFilter);
  updateAnalyticsDropdowns(filteredStudents);
  if (typeof updateEditMarksDropdowns === "function") updateEditMarksDropdowns(filteredStudents);
  
  // Call the inner chart display refresh
  const event = new Event('change');
  document.getElementById("analytics-student")?.dispatchEvent(event);
}

function renderAttentionAndGrowthSection() {
  if (!globalStudents || !globalExams) return;
  const filteredStudents = getFilteredStudents(attentionGroupFilter);
  renderAttentionList(globalExams, globalMarksByStudent, filteredStudents);
  renderGrowthList(globalExams, globalMarksByStudent, filteredStudents);
}

function applyGroupFilterAndRender() {
  renderClassStatsSection();
  renderOverviewTableSection();
  renderAnalyticsSection();
  renderAttentionAndGrowthSection();
}



// DELETE ALL FUNCTIONALITY
document.addEventListener("DOMContentLoaded", () => {
  const delAllNotesBtn = document.getElementById("delete-all-notes-btn");
  if (delAllNotesBtn) {
    delAllNotesBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete ALL Grade 10 Resources? This cannot be undone!")) return;
      delAllNotesBtn.disabled = true;
      delAllNotesBtn.textContent = "Deleting...";
      try {
        await fetch("/api/notes?delete_all=true&type=notes", { method: "DELETE", headers: { Authorization: `Bearer ${getCoachPassword()}` } });
        await renderNotes();
      } catch (err) { alert(err.message); }
      delAllNotesBtn.disabled = false;
      delAllNotesBtn.textContent = "Delete All Resources";
    });
  }

  const delAllCbseBtn = document.getElementById("delete-all-cbse-btn");
  if (delAllCbseBtn) {
    delAllCbseBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete ALL CBSE Resources? This cannot be undone!")) return;
      delAllCbseBtn.disabled = true;
      delAllCbseBtn.textContent = "Deleting...";
      try {
        await fetch("/api/notes?delete_all=true&type=cbse", { method: "DELETE", headers: { Authorization: `Bearer ${getCoachPassword()}` } });
        await renderNotes();
      } catch (err) { alert(err.message); }
      delAllCbseBtn.disabled = false;
      delAllCbseBtn.textContent = "Delete All CBSE Resources";
    });
  }

  const delAllExamsBtn = document.getElementById("delete-all-exams-btn");
  if (delAllExamsBtn) {
    delAllExamsBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete ALL Exams and their associated marks? This cannot be undone!")) return;
      delAllExamsBtn.disabled = true;
      delAllExamsBtn.textContent = "Deleting...";
      try {
        await fetch("/api/exams?delete_all=true", { method: "DELETE", headers: { Authorization: `Bearer ${getCoachPassword()}` } });
        await loadExamData();
      } catch (err) { alert(err.message); }
      delAllExamsBtn.disabled = false;
      delAllExamsBtn.textContent = "Delete All Exams";
    });
  }

  const delAllStudentsBtn = document.getElementById("delete-all-students-btn");
  if (delAllStudentsBtn) {
    delAllStudentsBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete ALL Students and their marks? This cannot be undone!")) return;
      delAllStudentsBtn.disabled = true;
      delAllStudentsBtn.textContent = "Deleting...";
      try {
        await fetch("/api/students?delete_all=true", { method: "DELETE", headers: { Authorization: `Bearer ${getCoachPassword()}` } });
        await populateGroupManager();
        await loadExamData();
      } catch (err) { alert(err.message); }
      delAllStudentsBtn.disabled = false;
      delAllStudentsBtn.textContent = "Delete All Students";
    });
  }
});




// ADD NEW STUDENT
document.addEventListener("DOMContentLoaded", () => {
  const addStudentBtn = document.getElementById("add-student-btn");
  if (addStudentBtn) {
    addStudentBtn.addEventListener("click", async () => {
      const nameEl = document.getElementById("add-student-name");
      const groupEl = document.getElementById("add-student-group");
      const idAliasEl = document.getElementById("add-student-id-alias");
      const passwordEl = document.getElementById("add-student-password");
      const statusEl = document.getElementById("add-student-status");
      
      const name = nameEl.value.trim();
      const group_name = groupEl.value;
      const student_id_alias = idAliasEl ? idAliasEl.value.trim() : "";
      const password = passwordEl ? passwordEl.value.trim() : "";
      
      if (!name) return alert("Please enter student name.");
      
      addStudentBtn.disabled = true;
      addStudentBtn.textContent = "Adding...";
      try {
        await createStudent({ name, group_name, student_id_alias, password });
        statusEl.textContent = "Student added/updated successfully!";
        statusEl.style.color = "green";
        statusEl.style.display = "block";
        nameEl.value = "";
        groupEl.value = "";
        if (idAliasEl) idAliasEl.value = "";
        if (passwordEl) passwordEl.value = "";
        
        if (typeof populateGroupManager === "function") await populateGroupManager();
        if (typeof loadExamData === "function") await loadExamData();
        if (typeof loadCredentialsTable === "function") await loadCredentialsTable();
      } catch (err) {
        statusEl.textContent = "Error: " + err.message;
        statusEl.style.color = "red";
        statusEl.style.display = "block";
      }
      addStudentBtn.disabled = false;
      addStudentBtn.textContent = "Add Student";
      setTimeout(() => { statusEl.style.display = "none"; }, 3000);
    });
  }

  // Credentials table logic
  const credTableBody = document.getElementById("credentials-table-body");
  window.loadCredentialsTable = async function() {
    if (!credTableBody) return;
    try {
      const res = await fetch("/api/students", {
        headers: { "Authorization": `Bearer ${getCoachPassword()}` }
      });
      const data = await res.json();
      if (data.students) {
        credTableBody.innerHTML = "";
        data.students.forEach(s => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td style="padding: 0.75rem;">${escapeHtml(s.name)}</td>
            <td style="padding: 0.75rem;">${escapeHtml(s.group_name || "-")}</td>
            <td style="padding: 0.75rem;">${escapeHtml(s.student_id_alias || "-")}</td>
            <td style="padding: 0.75rem; font-family: monospace;">${escapeHtml(s.password || "-")}</td>
          `;
          credTableBody.appendChild(tr);
        });
      }
    } catch (e) {
      credTableBody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Failed to load credentials</td></tr>`;
    }
  };
  
  if (hasCoachPassword()) {
    window.loadCredentialsTable();
  }

  // EXPORT TO EXCEL
  const exportBtn = document.getElementById("export-excel-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const table = document.querySelector("#performance-table-body").closest("table");
      if (!table) return alert("No table found to export.");
      
      let csv = [];
      const rows = table.querySelectorAll("tr");
      
      rows.forEach(row => {
        // Skip hidden rows (like filtered out students)
        if (row.style.display === "none") return;
        
        let rowData = [];
        const cols = row.querySelectorAll("th, td");
        
        // Exclude the last "Action" column (Delete button)
        for (let i = 0; i < cols.length - 1; i++) {
          let text = cols[i].innerText.replace(/"/g, '"').trim();
          rowData.push('"' + text + '"');
        }
        if (rowData.length > 0) csv.push(rowData.join(","));
      });
      
      const csvStr = csv.join("\n");
      const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "student_performance_data.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
});


// --- BULK MARKS ENTRY ---
const bulkGroupSelect = document.getElementById("bulk-group-select");
const bulkLoadBtn = document.getElementById("bulk-load-btn");
const bulkGridContainer = document.getElementById("bulk-grid-container");
const bulkGridHead = document.getElementById("bulk-grid-head");
const bulkGridBody = document.getElementById("bulk-grid-body");
const bulkSaveBtn = document.getElementById("bulk-save-btn");
const bulkSaveStatus = document.getElementById("bulk-save-status");

let bulkExams = [];
let bulkStudents = [];
let bulkExistingMarks = [];

if (bulkLoadBtn) {
  bulkLoadBtn.addEventListener("click", async () => {
    const group = bulkGroupSelect.value;
    if (!group) {
      alert("Please select a group");
      return;
    }

    bulkLoadBtn.textContent = "Loading...";
    bulkGridContainer.style.display = "none";
    
    try {
      // Fetch all necessary data
      const [studentsRes, examsRes, marksRes] = await Promise.all([
        fetchStudents(),
        fetchExams(),
        fetchMarks()
      ]);

      bulkStudents = (studentsRes.students || []).filter(s => s.group_name === group || (group === "Epsilon" && s.group_name === "Velocity"));
      
      // Filter exams: either target_groups is empty/null, or contains the selected group
      bulkExams = (examsRes.exams || []).filter(ex => {
        if (!ex.target_groups || ex.target_groups.length === 0) return true;
        return ex.target_groups.includes(group) || (group === "Epsilon" && ex.target_groups.includes("Velocity"));
      });
      // Sort exams chronologically
      bulkExams.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      bulkExistingMarks = marksRes.marks || [];

      if (bulkStudents.length === 0) {
        alert("No students found in this group.");
        bulkLoadBtn.textContent = "Load Grid";
        return;
      }
      
      renderBulkGrid();
      bulkGridContainer.style.display = "block";
    } catch (err) {
      alert("Failed to load data: " + err.message);
    } finally {
      bulkLoadBtn.textContent = "Load Grid";
    }
  });
}

function renderBulkGrid() {
  // Head
  let headHtml = `<tr>
    <th style="width: 50px; text-align: center; padding: 0.5rem;">Sl no</th>
    <th style="min-width: 150px; padding: 0.5rem;">Name of the student</th>`;
  
  if (bulkExams.length === 0) {
    headHtml += `<th style="padding: 0.5rem;">No exams assigned to this group. Please create an exam first.</th></tr>`;
    bulkGridHead.innerHTML = headHtml;
    bulkGridBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No exams available to enter marks.</td></tr>`;
    bulkSaveBtn.style.display = "none";
    return;
  }

  bulkSaveBtn.style.display = "inline-block";

  bulkExams.forEach((ex, idx) => {
    headHtml += `<th title="${ex.name} (Max: ${ex.total_marks})" style="text-align: center; min-width: 100px; padding: 0.5rem;">
      ${ex.name}<br>
      <small style="font-weight:normal; color: var(--text-muted);">Max: ${ex.total_marks}</small>
    </th>`;
  });
  headHtml += `</tr>`;
  bulkGridHead.innerHTML = headHtml;

  // Body
  let bodyHtml = "";
  bulkStudents.forEach((st, sIdx) => {
    bodyHtml += `<tr>
      <td style="text-align: center; padding: 0.5rem;">${sIdx + 1}</td>
      <td style="font-weight: 500; padding: 0.5rem;">${escapeHtml(st.name)}</td>`;
    
    bulkExams.forEach(ex => {
      // Find existing mark
      const existing = bulkExistingMarks.find(m => m.student_id === st.id && m.exam_id === ex.id);
      const val = existing && existing.marks_obtained !== null ? existing.marks_obtained : "";
      
      bodyHtml += `<td style="text-align: center; padding: 0.5rem;">
        <input type="number" 
               step="0.5" 
               min="0" 
               max="${ex.total_marks}" 
               data-student-id="${st.id}" 
               data-exam-id="${ex.id}" 
               value="${val}" 
               class="bulk-mark-input" 
               style="width: 70px; padding: 0.4rem; text-align: center; border: 1px solid #d1d5db; border-radius: 4px;" />
      </td>`;
    });
    bodyHtml += `</tr>`;
  });
  bulkGridBody.innerHTML = bodyHtml;
}

if (bulkSaveBtn) {
  bulkSaveBtn.addEventListener("click", async () => {
    const inputs = document.querySelectorAll(".bulk-mark-input");
    
    // Group inputs by student
    const studentSubmissions = {};
    
    inputs.forEach(input => {
      const val = input.value.trim();
      if (val !== "") {
        const sId = input.dataset.studentId;
        const eId = input.dataset.examId;
        const maxMarks = Number(input.getAttribute("max"));
        const marksObtained = Number(val);
        
        if (marksObtained < 0 || marksObtained > maxMarks) {
          alert(`Invalid mark ${marksObtained} for exam (Max: ${maxMarks})`);
          throw new Error("Invalid mark");
        }
        
        if (!studentSubmissions[sId]) {
          studentSubmissions[sId] = [];
        }
        studentSubmissions[sId].push({
          exam_id: eId,
          marks_obtained: marksObtained
        });
      }
    });

    if (Object.keys(studentSubmissions).length === 0) {
      alert("No marks entered.");
      return;
    }

    bulkSaveBtn.disabled = true;
    bulkSaveBtn.textContent = "Saving...";
    bulkSaveStatus.textContent = "Saving...";
    bulkSaveStatus.style.color = "var(--text)";

    try {
      // Send one request per student
      const promises = Object.keys(studentSubmissions).map(sId => {
        return submitMarks({
          student_id: sId,
          submissions: studentSubmissions[sId]
        });
      });
      
      await Promise.all(promises);
      
      bulkSaveStatus.textContent = "Marks saved successfully!";
      bulkSaveStatus.style.color = "#059669";
      
      // Refresh marks list if needed
      if (typeof fetchAndRenderPerformance === 'function') {
        fetchAndRenderPerformance();
      }
      
      setTimeout(() => {
        bulkSaveStatus.textContent = "";
      }, 3000);
    } catch (err) {
      alert("Error saving marks: " + err.message);
      bulkSaveStatus.textContent = "Error saving marks.";
      bulkSaveStatus.style.color = "#dc2626";
    } finally {
      bulkSaveBtn.disabled = false;
      bulkSaveBtn.textContent = "Save All Marks";
    }
  });
}



// HOMEWORK LINK MANAGER
document.addEventListener('DOMContentLoaded', () => {
  const hwBtn = document.getElementById('hw-submit-btn');
  if (hwBtn) {
    hwBtn.addEventListener('click', async () => {
      const date = document.getElementById('hw-date').value;
      const group = document.getElementById('hw-group').value;
      const link = document.getElementById('hw-link').value.trim();
      const status = document.getElementById('hw-status');

      if (!date || !group || !link) return alert('All fields are required');

      hwBtn.disabled = true;
      hwBtn.textContent = 'Saving...';
      try {
        const res = await fetch('/api/homework-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getCoachPassword() },
          body: JSON.stringify({ homework_date: date, group_name: group, link })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save');

        status.textContent = 'Saved successfully!';
        status.style.color = 'green';
        status.style.display = 'block';
        document.getElementById('hw-link').value = '';
      } catch (e) {
        status.textContent = e.message;
        status.style.color = 'red';
        status.style.display = 'block';
      } finally {
        hwBtn.disabled = false;
        hwBtn.textContent = 'Save Homework Link';
        setTimeout(() => status.style.display = 'none', 3000);
      }
    });
  }
});


if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

function renderGrowthList(exams, marksByStudent, studentsToUse = globalStudents) {
  const growthList = document.getElementById('growth-list');
  if (!growthList) return;
  
  if (exams.length < 2) {
    growthList.innerHTML = `<li style="color: var(--text-muted); text-align: center; padding: 1rem;">Not enough exams to compare growth.</li>`;
    return;
  }
  
  const latestExam = exams[exams.length - 1];
  const previousExam = exams[exams.length - 2];
  
  const growthStudents = [];
  
  studentsToUse.forEach(student => {
    const sm = marksByStudent[student.id] || {};
    const latestMark = sm[latestExam.id];
    const previousMark = sm[previousExam.id];
    
    if (latestMark !== undefined && previousMark !== undefined) {
      const latestPerc = (latestMark / latestExam.total_marks) * 100;
      const previousPerc = (previousMark / previousExam.total_marks) * 100;
      const growth = latestPerc - previousPerc;
      
      if (growth > 0) {
        growthStudents.push({
          name: student.name,
          latestPerc: latestPerc,
          previousPerc: previousPerc,
          growth: growth
        });
      }
    }
  });
  
  growthStudents.sort((a, b) => b.growth - a.growth);
  
  if (growthStudents.length === 0) {
    growthList.innerHTML = `<li style="color: var(--text-muted); text-align: center; padding: 1rem;">No positive growth recorded.</li>`;
    return;
  }
  
  let html = "";
  growthStudents.forEach(s => {
    html += `
      <li style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;">
        <div>
          <strong style="color: var(--text); font-size: 1.1rem; display: block; margin-bottom: 0.25rem;">${escapeHtml(s.name)}</strong>
          <span style="color: #059669; font-size: 0.85rem; font-weight: bold;">&#8593; Grew by ${s.growth.toFixed(1)}%</span>
        </div>
        <div style="text-align: right; font-size: 0.95rem;">
          <span style="color: #059669; font-weight: bold;">${s.latestPerc.toFixed(1)}%</span> (Latest)
          <span style="color: var(--text-muted); margin: 0 0.5rem;">|</span> <span style="color: var(--text);">${s.previousPerc.toFixed(1)}%</span> (Previous)
        </div>
      </li>
    `;
  });
  
  growthList.innerHTML = html;
}
