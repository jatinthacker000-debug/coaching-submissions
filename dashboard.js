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

// Helper to parse "[Ch X]" or "[Sl X]" Title format
function parseResourceTitle(rawTitle) {
  const match = (rawTitle || "").match(/^\[(Ch|Sl)\s*([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return {
      prefix: match[1].trim(),
      chapter: match[2].trim(),
      cleanTitle: match[3].trim()
    };
  }
  return {
    prefix: null,
    chapter: null,
    cleanTitle: rawTitle
  };
}

// Converts chapter to sortable float
function getChapterSortValue(resource) {
  const parsed = parseResourceTitle(resource.title || "");
  if (parsed.chapter) {
    const num = parseFloat(parsed.chapter);
    if (!isNaN(num)) {
      if (parsed.prefix && parsed.prefix.toLowerCase() === 'sl') {
        return 10000 + num;
      }
      return num;
    }
  }
  return 999999;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  const password = document.getElementById("coach-password").value;

  try {
    const res = await fetch("/api/auth", {
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
    if (typeof loadHomeworkLinks === 'function') loadHomeworkLinks();
    if (typeof loadCalendarEvents === 'function') loadCalendarEvents();
    if (typeof loadStudentLogins === 'function') loadStudentLogins();
    if (typeof loadStudentQueries === 'function') loadStudentQueries();
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
      let badgeText = "";
      if (parsed.chapter) {
          const prefix = parsed.prefix && parsed.prefix.toLowerCase() === "sl" ? "Sl No." : "Ch";
          badgeText = `${prefix} ${escapeHtml(parsed.chapter)}`;
      }
      const chapterBadge = badgeText ? `<span class="note-chapter-tag">${badgeText}</span> ` : "";

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

    const chapterVal = noteChapter.value.trim();
    let formattedTitle = "";

    if (chapterVal === "") {
      try {
        const { notes } = await fetchNotes();
        let maxSl = 0;
        const sameTypeNotes = (notes || []).filter(n => n.grade === noteType.value);
        sameTypeNotes.forEach(n => {
          const parsed = parseResourceTitle(n.title);
          if (parsed.prefix && parsed.prefix.toLowerCase() === "sl") {
            const num = parseInt(parsed.chapter, 10);
            if (!isNaN(num) && num > maxSl) maxSl = num;
          }
        });
        formattedTitle = `[Sl ${maxSl + 1}] ${noteTitle.value.trim()}`;
      } catch (err) {
        console.error(err);
        formattedTitle = `[Sl 1] ${noteTitle.value.trim()}`;
      }
    } else {
      formattedTitle = `[Ch ${chapterVal}] ${noteTitle.value.trim()}`;
    }

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
      if (typeof loadHomeworkLinks === 'function') loadHomeworkLinks();
      if (typeof loadCalendarEvents === 'function') loadCalendarEvents();
      if (typeof loadStudentLogins === 'function') loadStudentLogins();
      if (typeof loadStudentQueries === 'function') loadStudentQueries();
    })
    .catch(showLogin);
} else {
  showLogin();
}

// --- TABS LOGIC ---
const tabNotes = document.getElementById("tab-notes");
const tabExams = document.getElementById("tab-exams");
const tabQueries = document.getElementById("tab-queries");
const navTabResources = document.getElementById("nav-tab-resources");
const navTabExams = document.getElementById("nav-tab-exams");
const navTabQueries = document.getElementById("nav-tab-queries");

function switchDashboardTab(tab) {
  if (tabNotes) tabNotes.classList.add("hidden");
  if (tabExams) tabExams.classList.add("hidden");
  if (tabQueries) tabQueries.classList.add("hidden");

  if (navTabResources) {
    navTabResources.style.background = "var(--surface-card)";
    navTabResources.style.color = "var(--text)";
  }
  if (navTabExams) {
    navTabExams.style.background = "var(--surface-card)";
    navTabExams.style.color = "var(--text)";
  }
  if (navTabQueries) {
    navTabQueries.style.background = "var(--surface-card)";
    navTabQueries.style.color = "var(--text)";
  }

  if (tab === "resources") {
    if (tabNotes) tabNotes.classList.remove("hidden");
    if (navTabResources) {
      navTabResources.style.background = "var(--primary)";
      navTabResources.style.color = "white";
    }
  } else if (tab === "exams") {
    if (tabExams) tabExams.classList.remove("hidden");
    if (navTabExams) {
      navTabExams.style.background = "var(--primary)";
      navTabExams.style.color = "white";
    }
    loadExamData();
    if (typeof loadStudentLogins === 'function') loadStudentLogins();
  } else if (tab === "queries") {
    if (tabQueries) tabQueries.classList.remove("hidden");
    if (navTabQueries) {
      navTabQueries.style.background = "var(--primary)";
      navTabQueries.style.color = "white";
    }
    if (typeof loadStudentQueries === 'function') loadStudentQueries();
  }
}

if (navTabResources) navTabResources.addEventListener("click", () => switchDashboardTab("resources"));
if (navTabExams) navTabExams.addEventListener("click", () => switchDashboardTab("exams"));
if (navTabQueries) navTabQueries.addEventListener("click", () => switchDashboardTab("queries"));

// --- EXAM MANAGEMENT ---
const examForm = document.getElementById("exam-form");
const examNameInput = document.getElementById("exam-name");
const examTotalInput = document.getElementById("exam-total");
const examSubmitBtn = document.getElementById("exam-submit-btn");
const examSubjectInput = document.getElementById("exam-subject");

if (examSubjectInput) {
  examSubjectInput.addEventListener("change", (e) => {
    if (e.target.value === "Business Studies") {
      document.querySelectorAll("#exam-groups-container input[type='checkbox']").forEach(cb => {
        if (cb.value === "Nerd Tutors" || cb.value === "Nerd Tutors Nalanda") {
          cb.checked = true;
        } else {
          cb.checked = false;
        }
      });
    }
  });
}

if (examForm) {
  examForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    examSubmitBtn.disabled = true;
    examSubmitBtn.textContent = "Creating...";
    try {
      const checkedGroups = Array.from(document.querySelectorAll("#exam-groups-container input:checked")).map(cb => cb.value);
      const subject = examSubjectInput ? examSubjectInput.value : "";
      let target_groups = checkedGroups;
      if (subject === "Business Studies") {
        if (target_groups.length === 0) {
          target_groups = ["Nerd Tutors", "Nerd Tutors Nalanda"];
        } else {
          target_groups = target_groups.filter(g => isNerdGroup(g));
          if (target_groups.length === 0) {
            target_groups = ["Nerd Tutors", "Nerd Tutors Nalanda"];
          }
        }
      }
      await createExam({
        name: examNameInput.value.trim(),
        total_marks: examTotalInput.value,
        target_groups: target_groups,
        subject: subject
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

// Helpers for Business Studies & Nerd Tutors Groups
function isBusinessStudiesExam(ex) {
  if (!ex) return false;
  const s = (ex.subject || "").toLowerCase().trim();
  const n = (ex.name || "").toLowerCase().trim();
  return s.includes("business") || s === "bst" || n.includes("business studies") || /\bbst\b/i.test(n);
}

function isNerdGroup(groupName) {
  if (!groupName) return false;
  const g = groupName.trim();
  return g === "Nerd Tutors" || g === "Nerd Tutors Nalanda" || g.startsWith("Nerd Tutors");
}

// Global state for analytics
let globalExams = [];
let globalMarks = [];
let globalStudents = [];
let globalMarksByStudent = {};

function getExamTermRank(name = "") {
  const n = (name || "").toLowerCase().trim();

  // 1. Pre-Mid Term (Grade 12)
  if (n.includes("pre mid") || n.includes("pre-mid") || n.startsWith("pre ") || n === "pre") return 10;

  // 2. Post-Mid Term (Grade 12) - check before generic mid term
  if (n.includes("post mid") || n.includes("post-mid") || n.startsWith("post ") || n === "post") {
    return 30;
  }

  // 3. Unit Test 1 / UT1 (Grade 10)
  if (
    n.includes("ut 1") || n.includes("ut-1") || n.includes("ut1") ||
    n.includes("unit test 1") || n.includes("unit test1") ||
    n === "ut" || n === "unit test"
  ) {
    return 11;
  }

  // 4. Class Tests / Test 1 / Test 2 (Grade 10)
  if (
    n.includes("class test") || n.includes("class ttest") || n.includes("class-test") ||
    n.includes("classtest") || n.startsWith("ct") || n.includes("weekly test") ||
    /^test\s*\d+/i.test(n) || n === "test"
  ) {
    const match = n.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 1;
    return 14 + Math.min(num, 4); // Test 1 = 15, Test 2 = 16, Test 3 = 17, etc.
  }

  // 5. Half Yearly / Term 1 / Mid Term (Grade 10 / Grade 12)
  if (
    n.includes("half yearly") || n.includes("half-yearly") || n.includes("halfyearly") ||
    n.includes("term 1") || n.includes("term-1") || n.includes("term1") ||
    n.includes("mid term") || n.includes("mid-term") || n.includes("midterm") || n === "mid"
  ) {
    return 20;
  }

  // 6. Unit Test 2 / UT2
  if (
    n.includes("ut 2") || n.includes("ut-2") || n.includes("ut2") ||
    n.includes("unit test 2") || n.includes("unit test2")
  ) {
    return 25;
  }

  // 7. Term 2 / Pre Board
  if (n.includes("term 2") || n.includes("term-2") || n.includes("term2")) return 35;
  if (n.includes("pre board") || n.includes("pre-board") || n.includes("preboard")) return 40;

  // 8. Final / Annual / Board
  if (n.includes("final") || n.includes("annual") || n.includes("board")) return 50;

  return 100;
}

function getSubjectRank(subject = "") {
  const s = (subject || "").toLowerCase().trim();
  if (s.includes("account")) return 1;
  if (s.includes("business") || s === "bst") return 2;
  if (s.includes("econom")) return 3;
  if (s.includes("social")) return 4;
  return 10;
}

function sortExams(exams = []) {
  return [...exams].sort((a, b) => {
    const rankA = getExamTermRank(a.name);
    const rankB = getExamTermRank(b.name);
    if (rankA !== rankB) return rankA - rankB;

    const subjA = getSubjectRank(a.subject);
    const subjB = getSubjectRank(b.subject);
    if (subjA !== subjB) return subjA - subjB;

    const sCmp = (a.subject || "").localeCompare(b.subject || "");
    if (sCmp !== 0) return sCmp;

    const nCmp = (a.name || "").localeCompare(b.name || "");
    if (nCmp !== 0) return nCmp;

    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });
}

// Robust Excel export helper using SheetJS with UTF-8 BOM CSV fallback
function exportToExcel(filename, aoaData, sheetName = "Sheet1") {
  if (window.XLSX && window.XLSX.utils) {
    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet(aoaData);
    window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
    window.XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
  } else {
    // CSV fallback with UTF-8 BOM for Excel compatibility
    let csv = aoaData.map(row => 
      row.map(cell => {
        let val = (cell === null || cell === undefined) ? "" : String(cell);
        if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return `"${val}"`;
      }).join(",")
    ).join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename.replace(/\.xlsx$/, '')}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Chronological exam terms grouping helper for a student
function getStudentExamTerms(student, exams, marksByStudent, selectedSubject = "") {
  if (!student || !exams || exams.length === 0) return [];

  const isStudentNerd = student.group_name && student.group_name.startsWith("Nerd Tutors");
  const studentSubjs = Array.isArray(student.subjects) && student.subjects.length > 0
    ? student.subjects
    : (isStudentNerd ? ["Accountancy", "Economics", "Business Studies"] : []);

  const applicableExams = exams.filter(ex => {
    if (selectedSubject && ex.subject && ex.subject !== selectedSubject) return false;
    if (isStudentNerd && ex.subject && !studentSubjs.includes(ex.subject)) return false;
    if (ex.target_groups && ex.target_groups.length > 0 && student.group_name && !ex.target_groups.includes(student.group_name)) return false;
    return true;
  });

  if (applicableExams.length === 0) return [];

  const sm = marksByStudent[student.id] || {};
  const termMap = new Map();

  applicableExams.forEach(ex => {
    const termName = ex.name ? ex.name.trim() : "Exam";
    const termRank = getExamTermRank(termName);
    const key = `${termRank}___${termName}`;

    if (!termMap.has(key)) {
      termMap.set(key, {
        termName: termName,
        termRank: termRank,
        exams: [],
        createdAt: new Date(ex.created_at || 0).getTime()
      });
    }
    const tObj = termMap.get(key);
    tObj.exams.push(ex);
    if (ex.created_at) {
      const exTime = new Date(ex.created_at).getTime();
      if (exTime < tObj.createdAt) tObj.createdAt = exTime;
    }
  });

  const sortedTerms = Array.from(termMap.values()).sort((a, b) => {
    if (a.termRank !== b.termRank) return a.termRank - b.termRank;
    return a.createdAt - b.createdAt;
  });

  const termResults = [];

  sortedTerms.forEach(term => {
    let termObtained = 0;
    let termMax = 0;
    let attemptedCount = 0;
    const subjectScores = [];

    term.exams.forEach(ex => {
      const mark = sm[ex.id];
      if (mark !== undefined && mark !== null) {
        termObtained += mark;
        termMax += ex.total_marks;
        attemptedCount++;
        const perc = (mark / ex.total_marks) * 100;
        subjectScores.push({
          examId: ex.id,
          examName: ex.name,
          subject: ex.subject || "General",
          marks: mark,
          totalMarks: ex.total_marks,
          perc: perc
        });
      }
    });

    if (attemptedCount > 0 && termMax > 0) {
      termResults.push({
        termName: term.termName,
        termRank: term.termRank,
        totalObtained: termObtained,
        totalMax: termMax,
        averagePerc: (termObtained / termMax) * 100,
        attemptedCount: attemptedCount,
        totalExamsInTerm: term.exams.length,
        subjectScores: subjectScores
      });
    }
  });

  return termResults;
}

// Export All Students Marks from Performance Overview
function exportAllStudentsMarks() {
  const selectedGrp = overviewGroupFilter ? overviewGroupFilter.value : "";
  const selectedSubj = overviewSubjectFilter ? overviewSubjectFilter.value : "";
  
  let filteredStudents = getFilteredStudents(overviewGroupFilter);
  const searchInput = document.getElementById("overview-search");
  if (searchInput && searchInput.value.trim() !== "") {
    const term = searchInput.value.trim().toLowerCase();
    filteredStudents = filteredStudents.filter(s => s.name.toLowerCase().includes(term) || (s.student_id_alias && s.student_id_alias.toLowerCase().includes(term)));
  }

  const groupExams = globalExams.filter(ex => {
    if (selectedGrp && !isNerdGroup(selectedGrp) && isBusinessStudiesExam(ex)) return false;
    if (selectedGrp && ex.target_groups && ex.target_groups.length > 0 && !ex.target_groups.includes(selectedGrp)) return false;
    if (selectedSubj && ex.subject && ex.subject !== selectedSubj) return false;
    return true;
  });

  if (filteredStudents.length === 0 || groupExams.length === 0) {
    return alert("No student or exam data available to export.");
  }

  const termGroups = [];
  const termGroupMap = new Map();
  groupExams.forEach(ex => {
    const termName = ex.name ? ex.name.trim() : "Exam";
    if (!termGroupMap.has(termName)) {
      const grp = { termName: termName, exams: [] };
      termGroupMap.set(termName, grp);
      termGroups.push(grp);
    }
    termGroupMap.get(termName).exams.push(ex);
  });
  const hasMultiSubjectTerms = termGroups.some(g => g.exams.length > 1);

  const headerRow = ["Student Name", "Group", "Subjects"];
  termGroups.forEach(grp => {
    grp.exams.forEach(ex => {
      headerRow.push(`${ex.name}${ex.subject ? ` [${ex.subject}]` : ''} (${ex.total_marks})`);
    });
    if (hasMultiSubjectTerms && grp.exams.length > 1) {
      headerRow.push(`${grp.termName} Average %`);
    }
  });
  headerRow.push("Total Obtained");
  headerRow.push("Total Max Marks");
  headerRow.push("Overall %");

  const aoaData = [headerRow];

  filteredStudents.forEach(student => {
    const isStudentNerd = student.group_name && student.group_name.startsWith("Nerd Tutors");
    const studentSubjs = Array.isArray(student.subjects) && student.subjects.length > 0
      ? student.subjects
      : (isStudentNerd ? ["Accountancy", "Economics", "Business Studies"] : []);

    const sm = globalMarksByStudent[student.id] || {};
    let studentObtained = 0;
    let studentMax = 0;

    const row = [student.name, student.group_name || "-", studentSubjs.join(", ") || "-"];

    termGroups.forEach(grp => {
      let termObt = 0;
      let termMx = 0;
      let termAttempted = 0;

      grp.exams.forEach(ex => {
        const isOpted = !isStudentNerd || !ex.subject || studentSubjs.includes(ex.subject);
        if (!isOpted) {
          row.push("Not Opted");
        } else if (sm[ex.id] !== undefined && sm[ex.id] !== null) {
          const mark = sm[ex.id];
          row.push(mark);
          studentObtained += mark;
          studentMax += ex.total_marks;
          termObt += mark;
          termMx += ex.total_marks;
          termAttempted++;
        } else {
          row.push("-");
          studentMax += ex.total_marks;
        }
      });

      if (hasMultiSubjectTerms && grp.exams.length > 1) {
        if (termAttempted > 0 && termMx > 0) {
          row.push(((termObt / termMx) * 100).toFixed(1) + "%");
        } else {
          row.push("-");
        }
      }
    });

    row.push(studentObtained);
    row.push(studentMax);
    row.push(studentMax > 0 ? ((studentObtained / studentMax) * 100).toFixed(1) + "%" : "-");

    aoaData.push(row);
  });

  const avgRow = ["Group Average", "-", "-"];
  let overallSum = 0;
  let overallMax = 0;

  termGroups.forEach(grp => {
    let termClassObt = 0;
    let termClassMx = 0;

    grp.exams.forEach(ex => {
      let exSum = 0;
      let exCount = 0;
      filteredStudents.forEach(s => {
        const sm = globalMarksByStudent[s.id] || {};
        if (sm[ex.id] !== undefined && sm[ex.id] !== null) {
          exSum += sm[ex.id];
          exCount++;
          overallSum += sm[ex.id];
          overallMax += ex.total_marks;
          termClassObt += sm[ex.id];
          termClassMx += ex.total_marks;
        }
      });
      avgRow.push(exCount > 0 ? (exSum / exCount).toFixed(1) : "-");
    });

    if (hasMultiSubjectTerms && grp.exams.length > 1) {
      avgRow.push(termClassMx > 0 ? ((termClassObt / termClassMx) * 100).toFixed(1) + "%" : "-");
    }
  });

  avgRow.push(overallSum);
  avgRow.push(overallMax);
  avgRow.push(overallMax > 0 ? ((overallSum / overallMax) * 100).toFixed(1) + "%" : "-");
  aoaData.push(avgRow);

  const groupLabel = selectedGrp ? selectedGrp.replace(/\s+/g, '_') : 'All_Groups';
  const subjLabel = selectedSubj ? `_${selectedSubj}` : '';
  exportToExcel(`Student_Marks_${groupLabel}${subjLabel}.xlsx`, aoaData, "Student Marks");
}

// Export Student Logins & Credentials
function exportStudentsCredentials() {
  const students = (window.credentialsStudentsData && window.credentialsStudentsData.length > 0) 
    ? window.credentialsStudentsData 
    : (globalStudents || []);

  if (!students || students.length === 0) {
    return alert("No student records available to export.");
  }
  const headers = ["#", "Student Name", "Group", "Subjects", "Student ID", "Password", "Status"];
  const aoaData = [headers];

  students.forEach((s, idx) => {
    const isStudentNerd = s.group_name && s.group_name.startsWith("Nerd Tutors");
    const subjs = Array.isArray(s.subjects) && s.subjects.length > 0 
      ? s.subjects.join(", ") 
      : (isStudentNerd ? "Accountancy, Economics, Business Studies" : "-");

    aoaData.push([
      idx + 1,
      s.name,
      s.group_name || "-",
      subjs,
      s.student_id_alias || s.id,
      s.password || s.password_plain || "Protected",
      s.is_active === false ? "Suspended" : "Active"
    ]);
  });

  exportToExcel("Student_Logins_Credentials.xlsx", aoaData, "Credentials");
}

// Export Chart Summary Table
function exportChartSummaryTable(termGroups, hasMultiSubjectTerms, studentIds, marksByStudent, classAvgData, overallClassAvg) {
  const headers = ["Student Name"];
  termGroups.forEach(grp => {
    grp.exams.forEach(ex => {
      headers.push(`${ex.name}${ex.subject ? ` [${ex.subject}]` : ''} (${ex.total_marks})`);
    });
    if (hasMultiSubjectTerms && grp.exams.length > 1) {
      headers.push(`${grp.termName} Average %`);
    }
  });
  headers.push("Overall Average %");

  const aoaData = [headers];

  studentIds.forEach(sId => {
    const studentObj = globalStudents.find(s => s.id === sId);
    let studentTotalMax = 0;
    let studentTotalObtained = 0;
    const row = [studentObj ? studentObj.name : "Unknown"];

    termGroups.forEach(grp => {
      let termObtained = 0;
      let termMax = 0;
      let termAttempted = 0;

      grp.exams.forEach(ex => {
        const sm = marksByStudent[sId] || {};
        if (sm[ex.id] !== undefined && sm[ex.id] !== null) {
          const marks = sm[ex.id];
          studentTotalObtained += marks;
          studentTotalMax += ex.total_marks;
          termObtained += marks;
          termMax += ex.total_marks;
          termAttempted++;
          const perc = (marks / ex.total_marks) * 100;
          row.push(`${marks}/${ex.total_marks} (${perc.toFixed(1)}%)`);
        } else {
          row.push("N/A");
        }
      });

      if (hasMultiSubjectTerms && grp.exams.length > 1) {
        if (termAttempted > 0 && termMax > 0) {
          row.push(((termObtained / termMax) * 100).toFixed(1) + "%");
        } else {
          row.push("N/A");
        }
      }
    });

    const overallPerc = studentTotalMax > 0 ? ((studentTotalObtained / studentTotalMax) * 100).toFixed(1) + "%" : "N/A";
    row.push(overallPerc);
    aoaData.push(row);
  });

  const classRow = ["Class Average"];
  let examIdx = 0;
  termGroups.forEach(grp => {
    let termClassPercSum = 0;
    let termClassCount = 0;

    grp.exams.forEach(ex => {
      const avg = classAvgData[examIdx] || "0";
      examIdx++;
      termClassPercSum += parseFloat(avg) || 0;
      termClassCount++;
      classRow.push(`${avg}%`);
    });

    if (hasMultiSubjectTerms && grp.exams.length > 1) {
      const termAvg = termClassCount > 0 ? (termClassPercSum / termClassCount).toFixed(1) + "%" : "0%";
      classRow.push(termAvg);
    }
  });

  classRow.push(`${overallClassAvg}%`);
  aoaData.push(classRow);

  exportToExcel("Student_Performance_Comparison.xlsx", aoaData, "Performance");
}

async function loadExamData() {
    try {
      const [examsRes, marksRes, studentsRes] = await Promise.all([
        fetchExams(),
        fetchMarks(),
        fetchStudents()
      ]);
      
      globalExams = sortExams(examsRes.exams || []);
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
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.gap = "1rem";
    li.style.flexWrap = "wrap";
    
    const currSubj = ex.subject || "";
    
    li.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; flex: 1;">
        <h3 style="margin: 0;">${escapeHtml(ex.name)} <span class="score-pill">Total: ${ex.total_marks}</span></h3>
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <label style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">Subject:</label>
          <select class="exam-subject-edit" data-id="${escapeHtml(ex.id)}" style="padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.85rem; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer;">
            <option value="" ${currSubj === '' ? 'selected' : ''}>General / None</option>
            <option value="Economics" ${currSubj === 'Economics' ? 'selected' : ''}>Economics</option>
            <option value="Accountancy" ${currSubj === 'Accountancy' ? 'selected' : ''}>Accountancy</option>
            <option value="Business Studies" ${currSubj === 'Business Studies' ? 'selected' : ''}>Business Studies</option>
            <option value="Social Science" ${currSubj === 'Social Science' ? 'selected' : ''}>Social Science</option>
          </select>
          <span class="exam-save-status" style="font-size: 0.8rem; color: #059669; font-weight: 600; display: none;">Saved!</span>
        </div>
      </div>
      <button class="btn btn-danger small-btn" data-id="${ex.id}">Delete</button>
    `;

    const selectEl = li.querySelector(".exam-subject-edit");
    const saveStatus = li.querySelector(".exam-save-status");
    if (selectEl) {
      selectEl.addEventListener("change", async (e) => {
        const newSubj = e.target.value;
        selectEl.disabled = true;
        try {
          const payload = { subject: newSubj };
          if (newSubj === "Business Studies") {
            payload.target_groups = ["Nerd Tutors", "Nerd Tutors Nalanda"];
            ex.target_groups = ["Nerd Tutors", "Nerd Tutors Nalanda"];
          }
          await updateExam(ex.id, payload);
          ex.subject = newSubj;
          if (saveStatus) {
            saveStatus.textContent = "Saved!";
            saveStatus.style.color = "#059669";
            saveStatus.style.display = "inline";
            setTimeout(() => { saveStatus.style.display = "none"; }, 2000);
          }
          applyGroupFilterAndRender();
        } catch (err) {
          if (saveStatus) {
            saveStatus.textContent = "Failed";
            saveStatus.style.color = "#dc2626";
            saveStatus.style.display = "inline";
          }
          alert("Error updating exam subject: " + err.message);
        } finally {
          selectEl.disabled = false;
        }
      });
    }

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
  
  const isNerdGroupView = (students || []).some(s => s.group_name && s.group_name.startsWith("Nerd Tutors"));

  let headerHtml = `<th style="padding: 1rem; font-weight: 600; color: var(--text-muted); cursor: pointer;" onclick="setOverviewSort('name')">Student${getSortIcon('name')}</th>`;
  if (isNerdGroupView) {
    headerHtml += `<th style="padding: 1rem; font-weight: 600; color: var(--text-muted);">Subjects</th>`;
  }
  exams.forEach(ex => {
    const subjSub = ex.subject ? `<br><small style="font-weight:600; color:#6366f1;">${escapeHtml(ex.subject)}</small>` : '';
    headerHtml += `<th style="padding: 1rem; font-weight: 600; color: var(--text-muted); text-align: center; cursor: pointer;" onclick="setOverviewSort('exam_${ex.id}')">${escapeHtml(ex.name)}${getSortIcon('exam_'+ex.id)}${subjSub}<br><small style="font-weight:400; opacity:0.8;">(${ex.total_marks})</small></th>`;
  });
  headerHtml += `<th style="padding: 1rem; font-weight: 600; color: var(--text-muted); text-align: right; cursor: pointer;" onclick="setOverviewSort('total')">Total %${getSortIcon('total')}</th>`;
  headerHtml += `<th style="padding: 1rem; font-weight: 600; color: var(--text-muted); text-align: right;">Action</th>`;
  thead.innerHTML = headerHtml;
  
  tbody.innerHTML = "";
  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="100%" class="text-center" style="padding: 2rem; color: var(--text-muted);">No students yet.</td></tr>`;
    return;
  }
  
  const marksByStudent = {};
  (marks || []).forEach(m => {
    if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = {};
    marksByStudent[m.student_id][m.exam_id] = m.marks_obtained;
  });
  
  let tableData = students.map(student => {
    const studentMarks = marksByStudent[student.id] || {};
    let studentTotalObtained = 0;
    let studentTotalMax = 0;
    let examScores = {};
    
    const isStudentNerd = student.group_name && student.group_name.startsWith("Nerd Tutors");
    const studentSubjs = Array.isArray(student.subjects) && student.subjects.length > 0
      ? student.subjects
      : (isStudentNerd ? ["Accountancy", "Economics", "Business Studies"] : []);

    exams.forEach(ex => {
      const isOpted = !isStudentNerd || !ex.subject || studentSubjs.includes(ex.subject);
      if (isOpted) {
        const mark = studentMarks[ex.id];
        if (mark !== undefined) {
          examScores[ex.id] = mark;
          studentTotalObtained += mark;
          studentTotalMax += ex.total_marks;
        } else {
          examScores[ex.id] = null;
          studentTotalMax += ex.total_marks;
        }
      } else {
        examScores[ex.id] = "NOT_OPTED";
      }
    });
    
    let percentageNum = studentTotalMax > 0 ? ((studentTotalObtained / studentTotalMax) * 100) : -1;
    let percentageStr = studentTotalMax > 0 ? percentageNum.toFixed(1) + "%" : "&mdash;";
    
    return { student, examScores, percentageNum, percentageStr, studentSubjs, isStudentNerd };
  });

  tableData.sort((a, b) => {
    let valA, valB;
    if (window.overviewSort.key === 'name') {
      valA = a.student.name.toLowerCase();
      valB = b.student.name.toLowerCase();
    } else if (window.overviewSort.key === 'total') {
      valA = a.percentageNum;
      valB = b.percentageNum;
    } else if (window.overviewSort.key.startsWith('exam_')) {
      const examId = window.overviewSort.key.split('_')[1];
      valA = (a.examScores[examId] !== null && a.examScores[examId] !== "NOT_OPTED") ? a.examScores[examId] : -1;
      valB = (b.examScores[examId] !== null && b.examScores[examId] !== "NOT_OPTED") ? b.examScores[examId] : -1;
    }
    
    if (valA < valB) return window.overviewSort.asc ? -1 : 1;
    if (valA > valB) return window.overviewSort.asc ? 1 : -1;
    return 0;
  });

  tableData.forEach(row => {
    let rowHtml = `<td style="padding: 1rem; border-bottom: 1px solid var(--border); font-weight: 500;">${escapeHtml(row.student.name)}</td>`;
    
    if (isNerdGroupView) {
      const badges = row.studentSubjs.map(sb => `<span class="score-pill" style="font-size: 0.72rem; padding: 0.15rem 0.35rem; background: rgba(59, 130, 246, 0.12); color: #2563eb; margin: 1px;">${escapeHtml(sb)}</span>`).join(" ");
      rowHtml += `<td style="padding: 1rem; border-bottom: 1px solid var(--border);">${badges || "-"}</td>`;
    }

    exams.forEach(ex => {
      const mark = row.examScores[ex.id];
      if (mark === "NOT_OPTED") {
        rowHtml += `<td style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: center; color: var(--text-muted); opacity: 0.4;" title="Not opted for ${escapeHtml(ex.subject || 'this subject')}">&mdash;</td>`;
      } else if (mark !== null) {
        rowHtml += `<td style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: center; color: var(--primary); font-weight: 500;">${mark}</td>`;
      } else {
        rowHtml += `<td style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: center; color: var(--text-muted);">&mdash;</td>`;
      }
    });
    
    let trendHtml = '';
    const studentTerms = getStudentExamTerms(row.student, exams, marksByStudent);
    if (studentTerms.length >= 2) {
       const lastTerm = studentTerms[studentTerms.length - 1];
       const prevTerm = studentTerms[studentTerms.length - 2];
       const diff = lastTerm.averagePerc - prevTerm.averagePerc;
       if (diff > 0) {
          trendHtml = `<span style="color: #10b981; font-size: 0.85rem; margin-left: 0.5rem;" title="Up ${diff.toFixed(1)}% (${escapeHtml(prevTerm.termName)} → ${escapeHtml(lastTerm.termName)})">&#9650;</span>`;
       } else if (diff < 0) {
          trendHtml = `<span style="color: #ef4444; font-size: 0.85rem; margin-left: 0.5rem;" title="Down ${Math.abs(diff).toFixed(1)}% (${escapeHtml(prevTerm.termName)} → ${escapeHtml(lastTerm.termName)})">&#9660;</span>`;
       } else {
          trendHtml = `<span style="color: #6b7280; font-size: 0.85rem; margin-left: 0.5rem;" title="No change">&#9644;</span>`;
       }
    }

    rowHtml += `<td style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: right; font-weight: 600;">${row.percentageStr}${trendHtml}</td>`;
    
    rowHtml += `<td style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: right;">
      <button class="btn btn-danger small-btn delete-student-btn" data-id="${escapeHtml(row.student.id)}" data-name="${escapeHtml(row.student.name)}">Delete</button>
    </td>`;
    
    const tr = document.createElement("tr");
    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });

  const tfoot = document.getElementById("performance-table-foot");
  if (tfoot) {
    let footHtml = `<tr><th style="padding: 1rem; font-weight: 700; color: var(--text); border-top: 2px solid var(--border);">Group Average</th>`;
    if (isNerdGroupView) {
      footHtml += `<th style="padding: 1rem; border-top: 2px solid var(--border);"></th>`;
    }
    let overallObtained = 0;
    let overallMax = 0;

    exams.forEach(ex => {
      let sum = 0;
      let count = 0;
      tableData.forEach(row => {
        if (row.examScores[ex.id] !== null && row.examScores[ex.id] !== "NOT_OPTED") {
          sum += row.examScores[ex.id];
          count++;
          overallObtained += row.examScores[ex.id];
          overallMax += ex.total_marks;
        }
      });
      if (count > 0) {
        let avg = sum / count;
        footHtml += `<th style="padding: 1rem; font-weight: 700; color: var(--primary); text-align: center; border-top: 2px solid var(--border);">${avg.toFixed(1)}</th>`;
      } else {
        footHtml += `<th style="padding: 1rem; font-weight: 700; color: var(--text-muted); text-align: center; border-top: 2px solid var(--border);">&mdash;</th>`;
      }
    });

    let overallPerc = overallMax > 0 ? ((overallObtained / overallMax) * 100).toFixed(1) + "%" : "&mdash;";
    footHtml += `<th style="padding: 1rem; font-weight: 700; color: var(--text); text-align: right; border-top: 2px solid var(--border);">${overallPerc}</th>`;
    footHtml += `<th style="padding: 1rem; border-top: 2px solid var(--border);"></th></tr>`;
    tfoot.innerHTML = footHtml;
  }
  
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
    const label = ex.subject ? `${ex.name} [${ex.subject}]` : ex.name;
    labels.push(label);
    
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
        align: 'center', anchor: 'center', color: '#ffffff', backgroundColor: color.border, borderRadius: 4, padding: 4,
        font: { weight: 'bold', size: 11 },
        formatter: (value) => value ? `${studentObj ? studentObj.name.split(' ')[0] : ''}\n${value}%` : ''
      }
    });
  });

  // Build Chart Summary Data Table
  const summaryContainer = document.getElementById("chart-summary-container");
  if (summaryContainer) {
    if (studentIds.length > 0) {
      // Group exams by term name
      const termGroups = [];
      const termGroupMap = new Map();

      exams.forEach(ex => {
        const termName = ex.name ? ex.name.trim() : "Exam";
        if (!termGroupMap.has(termName)) {
          const grp = { termName: termName, exams: [] };
          termGroupMap.set(termName, grp);
          termGroups.push(grp);
        }
        termGroupMap.get(termName).exams.push(ex);
      });

      const hasMultiSubjectTerms = termGroups.some(g => g.exams.length > 1);

      let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
          <h3 style="margin: 0; color: var(--text); font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>Student Performance & Average Breakdown</span>
            ${hasMultiSubjectTerms ? `<span style="font-size: 0.75rem; font-weight: 500; color: #6366f1; background: rgba(99, 102, 241, 0.1); padding: 0.15rem 0.5rem; border-radius: 99px;">Term Averages Included</span>` : ''}
          </h3>
          <button type="button" class="btn btn-primary small-btn" id="export-summary-table-btn" style="padding: 0.4rem 0.85rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; background: #059669; font-weight: 600;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export Table to Excel
          </button>
        </div>
      `;

      html += `<div style="overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1.5rem; background: var(--surface);">`;
      html += `<table id="chart-summary-table" style="width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 650px;">
        <thead>
          <tr style="background: var(--surface-card); border-bottom: 2px solid var(--border);">
            <th style="padding: 0.75rem 1rem; text-align: left; font-weight: 700; color: var(--text);">Student Name</th>`;

      termGroups.forEach(grp => {
        grp.exams.forEach(ex => {
          html += `<th style="padding: 0.75rem; text-align: center; color: var(--text);">
            <div style="font-weight: 600;">${escapeHtml(ex.name)}</div>
            ${ex.subject ? `<div style="font-weight: 600; color: #6366f1; font-size: 0.8rem; margin-top: 2px;">${escapeHtml(ex.subject)}</div>` : ''}
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 400; opacity: 0.8;">(${ex.total_marks})</div>
          </th>`;
        });
        if (hasMultiSubjectTerms && grp.exams.length > 1) {
          html += `<th style="padding: 0.75rem; text-align: center; background: rgba(99, 102, 241, 0.08); border-left: 2px solid rgba(99, 102, 241, 0.25); border-right: 2px solid rgba(99, 102, 241, 0.25);">
            <div style="font-weight: 700; color: #4338ca;">${escapeHtml(grp.termName)}</div>
            <div style="font-size: 0.75rem; font-weight: 600; color: #6366f1;">Average</div>
          </th>`;
        }
      });

      html += `<th style="padding: 0.75rem 1rem; text-align: center; font-weight: 700; color: #8b5cf6; background: rgba(139, 92, 246, 0.1);">Overall Average</th>
        </tr>
      </thead>
      <tbody>`;

      // Student Rows
      studentIds.forEach(sId => {
        const studentObj = globalStudents.find(s => s.id === sId);
        let studentTotalMax = 0;
        let studentTotalObtained = 0;

        html += `<tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text);">${studentObj ? escapeHtml(studentObj.name) : 'Unknown'}</td>`;

        termGroups.forEach(grp => {
          let termObtained = 0;
          let termMax = 0;
          let termAttempted = 0;

          grp.exams.forEach(ex => {
            const studentMarks = marksByStudent[sId] || {};
            if (studentMarks[ex.id] !== undefined && studentMarks[ex.id] !== null) {
              const marks = studentMarks[ex.id];
              const max = ex.total_marks;
              const perc = (marks / max) * 100;
              studentTotalMax += max;
              studentTotalObtained += marks;
              termObtained += marks;
              termMax += max;
              termAttempted++;
              html += `<td style="padding: 0.75rem; text-align: center;">${marks}/${max}<br><span style="color: var(--text-muted); font-size: 0.8rem;">(${perc.toFixed(1)}%)</span></td>`;
            } else {
              html += `<td style="padding: 0.75rem; text-align: center; color: var(--text-muted); opacity: 0.6;">N/A</td>`;
            }
          });

          if (hasMultiSubjectTerms && grp.exams.length > 1) {
            if (termAttempted > 0 && termMax > 0) {
              const termPerc = (termObtained / termMax) * 100;
              html += `<td style="padding: 0.75rem; text-align: center; font-weight: 600; color: #4338ca; background: rgba(99, 102, 241, 0.04); border-left: 2px solid rgba(99, 102, 241, 0.25); border-right: 2px solid rgba(99, 102, 241, 0.25);">
                ${termObtained}/${termMax}<br><span style="font-weight: 700; color: #6366f1;">(${termPerc.toFixed(1)}%)</span>
              </td>`;
            } else {
              html += `<td style="padding: 0.75rem; text-align: center; color: var(--text-muted); background: rgba(99, 102, 241, 0.04); border-left: 2px solid rgba(99, 102, 241, 0.25); border-right: 2px solid rgba(99, 102, 241, 0.25);">N/A</td>`;
            }
          }
        });

        const overallPerc = studentTotalMax > 0 ? ((studentTotalObtained / studentTotalMax) * 100).toFixed(1) : 'N/A';
        html += `<td style="padding: 0.75rem 1rem; text-align: center; font-weight: 700; color: var(--primary); font-size: 1rem; background: rgba(139, 92, 246, 0.06);">${overallPerc}%</td></tr>`;
      });

      // Class Average Row
      html += `<tr style="background: rgba(139, 92, 246, 0.08); font-weight: 600; border-top: 2px solid rgba(139, 92, 246, 0.35);">
        <td style="padding: 0.75rem 1rem; color: #8b5cf6; font-weight: 700;">Class Average</td>`;

      let examIdx = 0;
      let totalClassPercSum = 0;
      let totalClassExamCount = 0;

      termGroups.forEach(grp => {
        let termClassPercSum = 0;
        let termClassExamCount = 0;

        grp.exams.forEach(ex => {
          const avg = classAvgData[examIdx] || "0";
          examIdx++;
          const numAvg = parseFloat(avg) || 0;
          termClassPercSum += numAvg;
          termClassExamCount++;
          totalClassPercSum += numAvg;
          totalClassExamCount++;

          html += `<td style="padding: 0.75rem; text-align: center; color: #8b5cf6; font-weight: 600;">${avg}%</td>`;
        });

        if (hasMultiSubjectTerms && grp.exams.length > 1) {
          const termAvg = termClassExamCount > 0 ? (termClassPercSum / termClassExamCount).toFixed(1) : "0";
          html += `<td style="padding: 0.75rem; text-align: center; font-weight: 700; color: #6366f1; background: rgba(99, 102, 241, 0.12); border-left: 2px solid rgba(99, 102, 241, 0.25); border-right: 2px solid rgba(99, 102, 241, 0.25);">
            ${termAvg}%
          </td>`;
        }
      });

      const overallClassAvg = totalClassExamCount > 0 ? (totalClassPercSum / totalClassExamCount).toFixed(1) : "0";
      html += `<td style="padding: 0.75rem 1rem; text-align: center; font-weight: 700; color: #8b5cf6; font-size: 1rem; background: rgba(139, 92, 246, 0.15);">${overallClassAvg}%</td>
      </tr>`;

      html += `</tbody></table></div>`;
      summaryContainer.innerHTML = html;
      summaryContainer.style.display = "block";

      const exportSummaryBtn = document.getElementById("export-summary-table-btn");
      if (exportSummaryBtn) {
        exportSummaryBtn.onclick = () => {
          exportChartSummaryTable(termGroups, hasMultiSubjectTerms, studentIds, marksByStudent, classAvgData, overallClassAvg);
        };
      }
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
  const selectedGrp = analyticsGroupFilter ? analyticsGroupFilter.value : "";
  const selectedSubj = document.getElementById("analytics-subject-filter") ? document.getElementById("analytics-subject-filter").value : "";
  const groupExams = globalExams.filter(ex => {
    if (selectedGrp && !isNerdGroup(selectedGrp) && isBusinessStudiesExam(ex)) return false;
    if (selectedGrp && ex.target_groups && ex.target_groups.length > 0 && !ex.target_groups.includes(selectedGrp)) return false;
    if (selectedSubj && ex.subject && ex.subject !== selectedSubj) return false;
    return true;
  });

  let examHtml = ``;
  groupExams.forEach(ex => {
    const subjTag = ex.subject ? ` [${ex.subject}]` : '';
    examHtml += `<option value="${escapeHtml(ex.id)}">${escapeHtml(ex.name)}${subjTag}</option>`;
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
    
    const selectedGrp = analyticsGroupFilter ? analyticsGroupFilter.value : "";
    const selectedSubj = document.getElementById("analytics-subject-filter") ? document.getElementById("analytics-subject-filter").value : "";
    const groupExams = globalExams.filter(ex => {
      if (selectedGrp && !isNerdGroup(selectedGrp) && isBusinessStudiesExam(ex)) return false;
      if (selectedGrp && ex.target_groups && ex.target_groups.length > 0 && !ex.target_groups.includes(selectedGrp)) return false;
      if (selectedSubj && ex.subject && ex.subject !== selectedSubj) return false;
      return true;
    });

    let examsToRender = groupExams;
    if (selectedExams.length > 0) {
      examsToRender = groupExams.filter(ex => selectedExams.includes(ex.id));
    }
    
    const filteredStudents = getFilteredStudents(analyticsGroupFilter);
    const groupStudentIds = new Set(filteredStudents.map(s => s.id));
    
    const groupMarksByStudent = {};
    Object.keys(globalMarksByStudent).forEach(sId => {
       if (groupStudentIds.has(sId)) {
         groupMarksByStudent[sId] = globalMarksByStudent[sId];
       }
    });

    renderChart(examsToRender, groupMarksByStudent, finalStudentVals);
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

function renderAttentionList(exams, marksByStudent, studentsToUse = globalStudents, selectedSubject = "") {
  const attentionList = document.getElementById("attention-list");
  if (!attentionList) return;
  
  if (exams.length === 0) {
    attentionList.innerHTML = `<li style="color: var(--text-muted); text-align: center; padding: 1rem;">No exams available for this filter.</li>`;
    return;
  }

  const attentionStudents = [];

  studentsToUse.forEach(student => {
    const terms = getStudentExamTerms(student, exams, marksByStudent, selectedSubject);
    if (!terms || terms.length === 0) return;

    const latestTerm = terms[terms.length - 1];
    const previousTerm = terms.length > 1 ? terms[terms.length - 2] : null;

    let needsAttention = false;
    let reason = "";
    let drop = 0;

    if (previousTerm) {
      drop = previousTerm.averagePerc - latestTerm.averagePerc;
    }

    // 1. Latest term average < 50%
    if (latestTerm.averagePerc < 50) {
      needsAttention = true;
      reason = `Scored below 50% average in ${latestTerm.termName} (${latestTerm.averagePerc.toFixed(1)}%).`;
    }

    // 2. Term average dropped by >= 10%
    if (drop >= 10) {
      needsAttention = true;
      if (latestTerm.averagePerc < 50) {
        reason = `Scored below 50% in ${latestTerm.termName} and dropped by ${drop.toFixed(1)}% (was ${previousTerm.averagePerc.toFixed(1)}% in ${previousTerm.termName}).`;
      } else {
        reason = `Term average dropped by ${drop.toFixed(1)}% (from ${previousTerm.termName} to ${latestTerm.termName}).`;
      }
    }

    // 3. Subject-level checks (when looking at All Subjects)
    if (!selectedSubject && latestTerm.subjectScores && latestTerm.subjectScores.length > 0) {
      const failedSubjs = latestTerm.subjectScores.filter(s => s.perc < 50);
      // Note any failed individual subjects in the reason
      if (failedSubjs.length > 0) {
        needsAttention = true;
        const failedStr = failedSubjs.map(s => `${s.subject} (${s.perc.toFixed(1)}%)`).join(", ");
        if (drop >= 10) {
          reason += ` Also scored below 50% in: ${failedStr}.`;
        } else if (latestTerm.averagePerc >= 50) {
          reason = `Scored below 50% in ${latestTerm.termName} [${failedStr}].`;
        }
      }
    }

    if (needsAttention) {
      attentionStudents.push({
        student: student,
        name: student.name,
        group: student.group_name || "",
        latestTermName: latestTerm.termName,
        latestPerc: latestTerm.averagePerc,
        previousTermName: previousTerm ? previousTerm.termName : null,
        previousPerc: previousTerm ? previousTerm.averagePerc : null,
        reason: reason,
        drop: drop > 0 ? drop : (latestTerm.averagePerc < 50 ? (50 - latestTerm.averagePerc) : 0)
      });
    }
  });

  // Sort by highest drop / severity
  attentionStudents.sort((a, b) => b.drop - a.drop);

  if (attentionStudents.length === 0) {
    attentionList.innerHTML = `<li style="color: #059669; text-align: center; padding: 1rem; font-weight: 500;">&#127881; Great job! No students currently require immediate attention based on exam averages.</li>`;
    return;
  }

  let html = "";
  attentionStudents.forEach(s => {
    let statHtml = "";
    if (s.latestPerc !== null) {
      statHtml += `<span style="color: var(--danger); font-weight: bold;">${s.latestPerc.toFixed(1)}%</span> <span style="font-size: 0.8rem; color: var(--text-muted);">(${escapeHtml(s.latestTermName)})</span>`;
    }
    if (s.previousPerc !== null) {
      statHtml += ` <span style="color: var(--text-muted); margin: 0 0.4rem;">|</span> <span style="color: var(--text);">${s.previousPerc.toFixed(1)}%</span> <span style="font-size: 0.8rem; color: var(--text-muted);">(${escapeHtml(s.previousTermName)})</span>`;
    }

    html += `
      <li style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; gap: 1rem; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <strong style="color: var(--text); font-size: 1.05rem;">${escapeHtml(s.name)}</strong>
            ${s.group ? `<span class="score-pill" style="font-size: 0.72rem; padding: 0.1rem 0.4rem; background: rgba(99, 102, 241, 0.1); color: #6366f1;">${escapeHtml(s.group)}</span>` : ''}
          </div>
          <span style="color: var(--danger); font-size: 0.85rem; line-height: 1.4; display: block;">&#9888; ${s.reason}</span>
        </div>
        <div style="text-align: right; font-size: 0.95rem; white-space: nowrap;">
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
      const res = await fetch("/api/students", {
         method: "PUT",
         headers: { 
           "Content-Type": "application/json",
           "Authorization": `Bearer ${getCoachPassword()}`
         },
         body: JSON.stringify({ id: sid, group_name: grp })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to update group");
      }
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

// GROUP & SUBJECT FILTER LOGIC FOR SECTIONS
const perfGroupFilter = document.getElementById("performance-group-filter");
const perfSubjectFilter = document.getElementById("performance-subject-filter");
const overviewGroupFilter = document.getElementById("overview-table-group-filter");
const overviewSubjectFilter = document.getElementById("overview-subject-filter");
const analyticsGroupFilter = document.getElementById("analytics-group-filter");
const analyticsSubjectFilter = document.getElementById("analytics-subject-filter");
const attentionGroupFilter = document.getElementById("attention-group-filter");
const attentionSubjectFilter = document.getElementById("attention-subject-filter");

function getFilteredStudents(filterEl) {
  if (!globalStudents) return [];
  const selectedGrp = filterEl ? filterEl.value : "";
  if (selectedGrp) {
    return globalStudents.filter(s => s.group_name === selectedGrp);
  }
  return globalStudents;
}

if (perfGroupFilter) perfGroupFilter.addEventListener("change", renderClassStatsSection);
if (perfSubjectFilter) perfSubjectFilter.addEventListener("change", renderClassStatsSection);
if (overviewGroupFilter) overviewGroupFilter.addEventListener("change", renderOverviewTableSection);
if (overviewSubjectFilter) overviewSubjectFilter.addEventListener("change", renderOverviewTableSection);
const overviewSearch = document.getElementById("overview-search");
if (overviewSearch) overviewSearch.addEventListener("input", renderOverviewTableSection);
if (analyticsGroupFilter) analyticsGroupFilter.addEventListener("change", renderAnalyticsSection);
if (analyticsSubjectFilter) analyticsSubjectFilter.addEventListener("change", renderAnalyticsSection);
if (attentionGroupFilter) attentionGroupFilter.addEventListener("change", renderAttentionAndGrowthSection);
if (attentionSubjectFilter) attentionSubjectFilter.addEventListener("change", renderAttentionAndGrowthSection);

function renderClassStatsSection() {
  if (!globalStudents || !globalExams) return;
  const filteredStudents = getFilteredStudents(perfGroupFilter);
  const validStudentIds = new Set(filteredStudents.map(s => s.id));
  
  const selectedGrp = perfGroupFilter ? perfGroupFilter.value : "";
  const selectedSubj = perfSubjectFilter ? perfSubjectFilter.value : "";
  const groupExams = globalExams.filter(ex => {
    if (selectedGrp && !isNerdGroup(selectedGrp) && isBusinessStudiesExam(ex)) return false;
    if (selectedGrp && ex.target_groups && ex.target_groups.length > 0 && !ex.target_groups.includes(selectedGrp)) return false;
    if (selectedSubj && ex.subject && ex.subject !== selectedSubj) return false;
    return true;
  });

  calculateClassStats(groupExams, globalMarksByStudent, validStudentIds);
}

  // NEW SORT STATE
  window.overviewSort = { key: 'name', asc: true };

  window.setOverviewSort = function(key) {
    if (window.overviewSort.key === key) {
      window.overviewSort.asc = !window.overviewSort.asc;
    } else {
      window.overviewSort.key = key;
      window.overviewSort.asc = (key === 'name'); // default asc for name, desc for scores
    }
    renderOverviewTableSection();
  };

  window.getSortIcon = function(key) {
    if (window.overviewSort.key !== key) return '';
    return window.overviewSort.asc ? ' &#9650;' : ' &#9660;';
  }
function renderOverviewTableSection() {
  if (!globalStudents || !globalExams) return;
  let filteredStudents = getFilteredStudents(overviewGroupFilter);
  
  const searchInput = document.getElementById("overview-search");
  if (searchInput && searchInput.value.trim() !== "") {
    const term = searchInput.value.trim().toLowerCase();
    filteredStudents = filteredStudents.filter(s => s.name.toLowerCase().includes(term) || (s.student_id_alias && s.student_id_alias.toLowerCase().includes(term)));
  }

  const validStudentIds = new Set(filteredStudents.map(s => s.id));
  const filteredMarks = globalMarks.filter(m => validStudentIds.has(m.student_id));
  
  const selectedGrp = overviewGroupFilter ? overviewGroupFilter.value : "";
  const selectedSubj = overviewSubjectFilter ? overviewSubjectFilter.value : "";
  const groupExams = globalExams.filter(ex => {
    if (selectedGrp && !isNerdGroup(selectedGrp) && isBusinessStudiesExam(ex)) return false;
    if (selectedGrp && ex.target_groups && ex.target_groups.length > 0 && !ex.target_groups.includes(selectedGrp)) return false;
    if (selectedSubj && ex.subject && ex.subject !== selectedSubj) return false;
    return true;
  });

  renderPerformanceTable(groupExams, filteredMarks, filteredStudents);
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
  
  const selectedGrp = attentionGroupFilter ? attentionGroupFilter.value : "";
  const selectedSubj = attentionSubjectFilter ? attentionSubjectFilter.value : "";
  const groupExams = globalExams.filter(ex => {
    if (selectedGrp && !isNerdGroup(selectedGrp) && isBusinessStudiesExam(ex)) return false;
    if (selectedGrp && ex.target_groups && ex.target_groups.length > 0 && !ex.target_groups.includes(selectedGrp)) return false;
    if (selectedSubj && ex.subject && ex.subject !== selectedSubj) return false;
    return true;
  });

  renderAttentionList(groupExams, globalMarksByStudent, filteredStudents, selectedSubj);
  renderGrowthList(groupExams, globalMarksByStudent, filteredStudents, selectedSubj);
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
  const addStudentGroupEl = document.getElementById("add-student-group");
  const addStudentSubjWrapper = document.getElementById("add-student-subjects-wrapper");
  if (addStudentGroupEl && addStudentSubjWrapper) {
    addStudentGroupEl.addEventListener("change", () => {
      const val = addStudentGroupEl.value;
      if (val && val.startsWith("Nerd Tutors")) {
        addStudentSubjWrapper.style.display = "block";
      } else {
        addStudentSubjWrapper.style.display = "none";
      }
    });
  }

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

      // Check if student name already exists
      if (Array.isArray(globalStudents) && globalStudents.some(s => s.name && s.name.trim().toLowerCase() === name.toLowerCase())) {
        statusEl.textContent = "name already taken";
        statusEl.style.color = "#dc2626";
        statusEl.style.display = "block";
        alert("name already taken");
        setTimeout(() => { statusEl.style.display = "none"; }, 3000);
        return;
      }

      let subjects = [];
      if (group_name && group_name.startsWith("Nerd Tutors")) {
        if (document.getElementById("add-subj-acc")?.checked) subjects.push("Accountancy");
        if (document.getElementById("add-subj-eco")?.checked) subjects.push("Economics");
        if (document.getElementById("add-subj-bst")?.checked) subjects.push("Business Studies");
        if (subjects.length === 0) {
          return alert("Please select at least one opted subject for Nerd Tutors.");
        }
      }
      
      addStudentBtn.disabled = true;
      addStudentBtn.textContent = "Adding...";
      try {
        await createStudent({ name, group_name, student_id_alias, password, subjects });
        statusEl.textContent = "Student added successfully!";
        statusEl.style.color = "#059669";
        statusEl.style.display = "block";
        nameEl.value = "";
        groupEl.value = "";
        if (idAliasEl) idAliasEl.value = "";
        if (passwordEl) passwordEl.value = "";
        if (addStudentSubjWrapper) addStudentSubjWrapper.style.display = "none";
        
        if (typeof populateGroupManager === "function") await populateGroupManager();
        if (typeof loadExamData === "function") await loadExamData();
        if (typeof window.loadCredentialsTable === "function") await window.loadCredentialsTable();
      } catch (err) {
        const isTaken = (err.message || "").toLowerCase().includes("name already taken");
        statusEl.textContent = isTaken ? "name already taken" : ("Error: " + err.message);
        statusEl.style.color = "#dc2626";
        statusEl.style.display = "block";
        if (isTaken) {
          alert("name already taken");
        }
      }
      addStudentBtn.disabled = false;
      addStudentBtn.textContent = "Add Student";
      setTimeout(() => { statusEl.style.display = "none"; }, 3000);
    });
  }

  // ============================================================
  // SPREADSHEET-STYLE EDITABLE STUDENT CREDENTIALS TABLE
  // ============================================================
  const credTableBody = document.getElementById("credentials-table-body");
  const credSearch = document.getElementById("credentials-search");
  const credGroupFilter = document.getElementById("credentials-group-filter");
  const credSaveAllBtn = document.getElementById("cred-save-all-btn");
  const credSaveStatus = document.getElementById("cred-save-status");

  const STANDARD_GROUPS = [
    "Osem",
    "Nalanda",
    "Nerd Tutors",
    "Nerd Tutors Nalanda",
    "Ignite",
    "Velocity",
    "Epsilon"
  ];

  window.credentialsStudentsData = [];

  window.loadCredentialsTable = async function() {
    if (!credTableBody) return;
    try {
      const res = await fetch("/api/students", {
        cache: "no-store",
        headers: { "Authorization": `Bearer ${getCoachPassword()}` }
      });
      const data = await res.json();
      if (data.students) {
        window.credentialsStudentsData = data.students;
        renderCredentialsSpreadsheet();
      }
    } catch (e) {
      credTableBody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center; padding: 1.5rem;">Failed to load credentials: ${escapeHtml(e.message)}</td></tr>`;
    }
  };

  function renderCredentialsSpreadsheet() {
    if (!credTableBody) return;
    const students = window.credentialsStudentsData || [];
    const filterGroup = credGroupFilter ? credGroupFilter.value.trim().toLowerCase() : "";
    const searchTerm = credSearch ? credSearch.value.trim().toLowerCase() : "";

    const filtered = students.filter(s => {
      const sGroup = (s.group_name || "").toLowerCase();
      const sName = (s.name || "").toLowerCase();
      const sAlias = (s.student_id_alias || "").toLowerCase();

      if (filterGroup && sGroup !== filterGroup) {
        return false;
      }
      if (searchTerm) {
        const matches = sName.includes(searchTerm) || sGroup.includes(searchTerm) || sAlias.includes(searchTerm);
        if (!matches) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      credTableBody.innerHTML = `<tr><td colspan="7" style="color: var(--text-muted); text-align:center; padding: 2rem;">No students found matching current filters.</td></tr>`;
      return;
    }

    let rowsHtml = "";
    filtered.forEach(s => {
      const isNerd = s.group_name && s.group_name.startsWith("Nerd Tutors");
      const subjsList = Array.isArray(s.subjects) && s.subjects.length > 0
        ? s.subjects
        : (isNerd ? ["Accountancy", "Economics", "Business Studies"] : []);
      const subjsText = subjsList.join(", ");
      const isActive = s.is_active !== false;

      // Group options
      const currentGroup = s.group_name || "";
      let groupOptionsHtml = "";
      let foundInStandard = false;
      STANDARD_GROUPS.forEach(g => {
        const isSel = currentGroup.toLowerCase() === g.toLowerCase();
        if (isSel) foundInStandard = true;
        groupOptionsHtml += `<option value="${escapeHtml(g)}" ${isSel ? "selected" : ""}>${escapeHtml(g)}</option>`;
      });
      if (currentGroup && !foundInStandard) {
        groupOptionsHtml += `<option value="${escapeHtml(currentGroup)}" selected>${escapeHtml(currentGroup)}</option>`;
      }
      if (!currentGroup) {
        groupOptionsHtml = `<option value="" selected>-- Select Group --</option>` + groupOptionsHtml;
      }

      rowsHtml += `
        <tr id="cred-row-${s.id}" data-student-id="${s.id}">
          <td style="padding: 0.5rem;">
            <input type="text" class="cred-cell-input cred-cell-name" data-student-id="${s.id}" value="${escapeHtml(s.name)}" placeholder="Student Name" required />
          </td>
          <td style="padding: 0.5rem;">
            <select class="cred-cell-select cred-cell-group" data-student-id="${s.id}">
              ${groupOptionsHtml}
            </select>
          </td>
          <td style="padding: 0.5rem;">
            <input type="text" class="cred-cell-input cred-cell-subjects" data-student-id="${s.id}" value="${escapeHtml(subjsText)}" placeholder="e.g. Economics, Accountancy" />
          </td>
          <td style="padding: 0.5rem;">
            <input type="text" class="cred-cell-input cred-cell-alias" data-student-id="${s.id}" value="${escapeHtml(s.student_id_alias || '')}" placeholder="ID (e.g. 1508)" style="font-family: monospace;" />
          </td>
          <td style="padding: 0.5rem;">
            <input type="text" class="cred-cell-input cred-cell-password" data-student-id="${s.id}" value="${escapeHtml(s.password || '')}" placeholder="Password" style="font-family: monospace;" />
          </td>
          <td style="padding: 0.5rem;">
            <select class="cred-cell-select cred-cell-status" data-student-id="${s.id}">
              <option value="true" ${isActive ? "selected" : ""}>Active</option>
              <option value="false" ${!isActive ? "selected" : ""}>Suspended</option>
            </select>
          </td>
          <td style="padding: 0.5rem; text-align: center; white-space: nowrap;">
            <button type="button" class="btn cred-row-save-btn" data-student-id="${s.id}" style="padding: 0.35rem 0.65rem; font-size: 0.8rem; margin-right: 0.35rem; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
              💾 Save
            </button>
            <button type="button" class="btn btn-danger" onclick="deleteStudent('${s.id}')" title="Delete Student" style="padding: 0.35rem 0.6rem; font-size: 0.8rem; border-radius: 6px; cursor: pointer;">
              🗑️
            </button>
          </td>
        </tr>
      `;
    });

    credTableBody.innerHTML = rowsHtml;

    // Attach row modification trackers
    credTableBody.querySelectorAll(".cred-cell-input, .cred-cell-select").forEach(el => {
      el.addEventListener("input", markRowModified);
      el.addEventListener("change", markRowModified);
    });

    // Attach row-save handlers
    credTableBody.querySelectorAll(".cred-row-save-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        saveStudentRow(btn.dataset.studentId);
      });
    });
  }

  function markRowModified(e) {
    const sId = e.target.dataset.studentId;
    const row = document.getElementById(`cred-row-${sId}`);
    if (row && !row.classList.contains("cred-row-modified")) {
      row.classList.add("cred-row-modified");
    }
  }

  // Save single student row
  window.saveStudentRow = async function(id) {
    const row = document.getElementById(`cred-row-${id}`);
    if (!row) return;

    const nameInput = row.querySelector(".cred-cell-name");
    const groupSelect = row.querySelector(".cred-cell-group");
    const subjectsInput = row.querySelector(".cred-cell-subjects");
    const aliasInput = row.querySelector(".cred-cell-alias");
    const passInput = row.querySelector(".cred-cell-password");
    const statusSelect = row.querySelector(".cred-cell-status");
    const saveBtn = row.querySelector(".cred-row-save-btn");

    const name = nameInput.value.trim();
    if (!name) {
      alert("Student name cannot be empty.");
      nameInput.focus();
      return;
    }

    const group_name = groupSelect.value.trim();
    const subjsStr = subjectsInput.value;
    const subjects = subjsStr.split(",").map(x => x.trim()).filter(Boolean);
    const student_id_alias = aliasInput.value.trim() || null;
    const password = passInput.value.trim() || null;
    const is_active = statusSelect.value === "true";

    const prevBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = "⏳ Saving...";

    try {
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${getCoachPassword()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id,
          name,
          group_name,
          subjects,
          student_id_alias,
          password,
          is_active
        })
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.error || "Failed to update student.");
      }

      // Update in memory cache
      const cached = (window.credentialsStudentsData || []).find(s => s.id === id);
      if (cached) {
        cached.name = name;
        cached.group_name = group_name;
        cached.subjects = subjects;
        cached.student_id_alias = student_id_alias;
        cached.password = password;
        cached.is_active = is_active;
      }

      row.classList.remove("cred-row-modified");
      row.classList.add("cred-row-saved");
      saveBtn.innerHTML = "✓ Saved";
      saveBtn.style.background = "#10b981";

      setTimeout(() => {
        saveBtn.innerHTML = prevBtnText;
        saveBtn.style.background = "#059669";
        saveBtn.disabled = false;
        row.classList.remove("cred-row-saved");
      }, 2000);

      if (typeof loadExamData === "function") loadExamData();
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = prevBtnText;
      alert("Error saving: " + err.message);
    }
  };

  // Bulk save all students
  window.saveAllCredentials = async function() {
    if (!credTableBody) return;
    const rows = credTableBody.querySelectorAll("tr[data-student-id]");
    if (rows.length === 0) return;

    if (!credSaveAllBtn) return;
    const prevBtnHtml = credSaveAllBtn.innerHTML;
    credSaveAllBtn.disabled = true;
    credSaveAllBtn.innerHTML = "<span>⏳</span> <span>Saving All Changes...</span>";

    if (credSaveStatus) credSaveStatus.style.display = "none";

    const studentsPayload = [];
    rows.forEach(tr => {
      const id = tr.dataset.studentId;
      const name = tr.querySelector(".cred-cell-name")?.value.trim() || "";
      const group_name = tr.querySelector(".cred-cell-group")?.value.trim() || "";
      const subjsStr = tr.querySelector(".cred-cell-subjects")?.value || "";
      const subjects = subjsStr.split(",").map(x => x.trim()).filter(Boolean);
      const student_id_alias = tr.querySelector(".cred-cell-alias")?.value.trim() || null;
      const password = tr.querySelector(".cred-cell-password")?.value.trim() || null;
      const is_active = tr.querySelector(".cred-cell-status")?.value === "true";

      studentsPayload.push({
        id,
        name,
        group_name,
        subjects,
        student_id_alias,
        password,
        is_active
      });
    });

    try {
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${getCoachPassword()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ students: studentsPayload })
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.error || "Failed to bulk update students.");
      }

      // Remove modified styling
      rows.forEach(tr => {
        tr.classList.remove("cred-row-modified");
        tr.classList.add("cred-row-saved");
        setTimeout(() => tr.classList.remove("cred-row-saved"), 1500);
      });

      if (credSaveStatus) {
        credSaveStatus.textContent = `✓ Successfully saved ${d.count || studentsPayload.length} student records!`;
        credSaveStatus.style.background = "rgba(16, 185, 129, 0.15)";
        credSaveStatus.style.color = "#059669";
        credSaveStatus.style.border = "1px solid rgba(16, 185, 129, 0.3)";
        credSaveStatus.style.display = "block";
        setTimeout(() => { credSaveStatus.style.display = "none"; }, 4000);
      }

      await window.loadCredentialsTable();
      if (typeof loadExamData === "function") loadExamData();
    } catch (err) {
      if (credSaveStatus) {
        credSaveStatus.textContent = "Error saving changes: " + err.message;
        credSaveStatus.style.background = "rgba(239, 68, 68, 0.15)";
        credSaveStatus.style.color = "#dc2626";
        credSaveStatus.style.border = "1px solid rgba(239, 68, 68, 0.3)";
        credSaveStatus.style.display = "block";
      }
      alert("Error: " + err.message);
    } finally {
      credSaveAllBtn.disabled = false;
      credSaveAllBtn.innerHTML = prevBtnHtml;
    }
  };

  if (credSaveAllBtn) {
    credSaveAllBtn.addEventListener("click", window.saveAllCredentials);
  }
  if (credGroupFilter) {
    credGroupFilter.addEventListener("change", renderCredentialsSpreadsheet);
  }
  if (credSearch) {
    credSearch.addEventListener("input", renderCredentialsSpreadsheet);
  }

  window.deleteStudent = async function(id) {
    if (!confirm("Are you sure you want to delete this student? All their marks will also be deleted.")) return;
    try {
      const res = await fetch(`/api/students?id=${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${getCoachPassword()}` }
      });
      if (res.ok) {
        window.loadCredentialsTable();
        loadExamData(); // reload dashboard data
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete");
      }
    } catch (e) { alert(e.message); }
  };

  // ============================================================
  // STUDENT HELP DESK & QUERIES (COACH MANAGEMENT)
  // ============================================================
  let coachQueriesList = [];

  window.loadStudentQueries = async function() {
    const tableBody = document.getElementById("coach-queries-table-body");
    const unreadBadge = document.getElementById("tab-queries-unread-badge");
    if (!tableBody) return;

    try {
      const res = await fetch("/api/students?type=queries", {
        cache: "no-store",
        headers: { "Authorization": `Bearer ${getCoachPassword()}` }
      });
      const data = await res.json();
      coachQueriesList = data.queries || [];

      // Update badge
      const pendingCount = coachQueriesList.filter(q => q.status === "pending" || !q.coach_reply).length;
      if (unreadBadge) {
        if (pendingCount > 0) {
          unreadBadge.textContent = pendingCount;
          unreadBadge.style.display = "inline-block";
        } else {
          unreadBadge.style.display = "none";
        }
      }

      renderCoachQueries();
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="6" style="padding: 2rem; color: #dc2626; text-align: center;">Failed to load queries: ${escapeHtml(err.message)}</td></tr>`;
    }
  };

  window.renderCoachQueries = function() {
    const tableBody = document.getElementById("coach-queries-table-body");
    if (!tableBody) return;

    const filterStatus = document.getElementById("queries-filter-status")?.value || "";
    const filterGroup = document.getElementById("queries-filter-group")?.value || "";
    const searchVal = (document.getElementById("queries-search-input")?.value || "").toLowerCase().trim();

    const filtered = coachQueriesList.filter(q => {
      const isResolved = q.status === "resolved" || Boolean(q.coach_reply);
      if (filterStatus === "pending" && isResolved) return false;
      if (filterStatus === "resolved" && !isResolved) return false;

      if (filterGroup && (q.group_name || "").toLowerCase() !== filterGroup.toLowerCase()) {
        return false;
      }

      if (searchVal) {
        const text = `${q.student_name || ""} ${q.group_name || ""} ${q.subject || ""} ${q.title || ""} ${q.message || ""}`.toLowerCase();
        if (!text.includes(searchVal)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="padding: 2.5rem; color: var(--text-muted); text-align: center;">No queries match the selected filters.</td></tr>`;
      return;
    }

    let rowsHtml = "";
    filtered.forEach(q => {
      const isResolved = q.status === "resolved" || Boolean(q.coach_reply);
      const statusBadge = isResolved
        ? `<span style="background: rgba(16, 185, 129, 0.15); color: #059669; padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.3);">✓ Resolved</span>`
        : `<span style="background: rgba(245, 158, 11, 0.15); color: #d97706; padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(245, 158, 11, 0.3);">⏳ Pending</span>`;

      let replySnippet = "";
      if (q.coach_reply) {
        replySnippet = `
          <div style="margin-top: 0.4rem; padding: 0.35rem 0.6rem; background: rgba(59, 130, 246, 0.08); border-left: 2.5px solid var(--primary); border-radius: 0 4px 4px 0; font-size: 0.78rem; color: var(--text);">
            <strong style="color: #2563eb;">Coach Reply:</strong> ${escapeHtml(q.coach_reply)}
          </div>
        `;
      }

      const formattedDate = q.created_at ? new Date(q.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }) : "-";

      rowsHtml += `
        <tr>
          <td style="padding: 0.75rem;">
            <strong style="color: var(--text);">${escapeHtml(q.student_name)}</strong>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(q.group_name || "General")}</div>
          </td>
          <td style="padding: 0.75rem;">
            <span class="score-pill" style="font-size: 0.72rem; padding: 0.15rem 0.45rem; background: rgba(59, 130, 246, 0.12); color: #2563eb;">${escapeHtml(q.subject || "General")}</span>
          </td>
          <td style="padding: 0.75rem; max-width: 380px;">
            <div style="font-weight: 600; color: var(--text); margin-bottom: 0.2rem;">${escapeHtml(q.title)}</div>
            <div style="font-size: 0.82rem; color: var(--text); opacity: 0.85; line-height: 1.4; white-space: pre-wrap; max-height: 80px; overflow-y: auto;">${escapeHtml(q.message)}</div>
            ${replySnippet}
          </td>
          <td style="padding: 0.75rem; font-size: 0.8rem; color: var(--text-muted);">${formattedDate}</td>
          <td style="padding: 0.75rem;">${statusBadge}</td>
          <td style="padding: 0.75rem; text-align: center; white-space: nowrap;">
            <button type="button" class="btn btn-primary" onclick="openQueryReplyModal('${q.id}')" style="padding: 0.35rem 0.65rem; font-size: 0.8rem; margin-right: 0.35rem; cursor: pointer;">
              ${q.coach_reply ? "✏️ Edit Reply" : "💬 Reply"}
            </button>
            <button type="button" class="btn btn-danger" onclick="deleteStudentQuery('${q.id}')" title="Delete Query" style="padding: 0.35rem 0.55rem; font-size: 0.8rem; cursor: pointer;">
              🗑️
            </button>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = rowsHtml;
  };

  // Reply Modal
  window.openQueryReplyModal = function(queryId) {
    const q = coachQueriesList.find(x => x.id === queryId);
    if (!q) return;

    const modal = document.getElementById("query-reply-modal");
    if (!modal) return;

    document.getElementById("reply-query-id").value = q.id;
    document.getElementById("reply-modal-subject-badge").textContent = q.subject || "General";
    document.getElementById("reply-modal-title").textContent = q.title || "Question";
    document.getElementById("reply-modal-student-info").textContent = `From: ${q.student_name} (${q.group_name || "General"})`;
    document.getElementById("reply-modal-message").textContent = q.message || "";
    document.getElementById("coach-reply-input").value = q.coach_reply || "";
    document.getElementById("reply-mark-resolved").checked = true;
    document.getElementById("reply-submit-status").style.display = "none";

    const dateEl = document.getElementById("reply-modal-date");
    if (dateEl && q.created_at) {
      dateEl.textContent = "Asked on " + new Date(q.created_at).toLocaleString("en-IN");
    }

    modal.style.display = "flex";
  };

  window.closeQueryReplyModal = function() {
    const modal = document.getElementById("query-reply-modal");
    if (modal) modal.style.display = "none";
  };

  const replyCloseBtn = document.getElementById("reply-modal-close-btn");
  const replyCancelBtn = document.getElementById("reply-cancel-btn");
  if (replyCloseBtn) replyCloseBtn.addEventListener("click", window.closeQueryReplyModal);
  if (replyCancelBtn) replyCancelBtn.addEventListener("click", window.closeQueryReplyModal);

  // Submit coach reply
  const coachReplyForm = document.getElementById("coach-reply-form");
  if (coachReplyForm) {
    coachReplyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const qId = document.getElementById("reply-query-id").value;
      const replyText = document.getElementById("coach-reply-input").value.trim();
      const markResolved = document.getElementById("reply-mark-resolved").checked;
      const statusEl = document.getElementById("reply-submit-status");
      const submitBtn = document.getElementById("reply-submit-btn");

      if (!replyText) {
        alert("Please enter a reply.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending Reply...";
      statusEl.style.display = "none";

      try {
        const res = await fetch("/api/students", {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${getCoachPassword()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "queries",
            query_id: qId,
            coach_reply: replyText,
            status: markResolved ? "resolved" : "pending"
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to submit reply.");
        }

        statusEl.textContent = "✓ Reply sent successfully!";
        statusEl.style.color = "#059669";
        statusEl.style.display = "block";

        setTimeout(() => {
          window.closeQueryReplyModal();
          window.loadStudentQueries();
        }, 800);
      } catch (err) {
        statusEl.textContent = err.message;
        statusEl.style.color = "#dc2626";
        statusEl.style.display = "block";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Reply";
      }
    });
  }

  // Delete query
  window.deleteStudentQuery = async function(queryId) {
    if (!confirm("Are you sure you want to delete this query?")) return;
    try {
      const res = await fetch(`/api/students?type=queries&query_id=${encodeURIComponent(queryId)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${getCoachPassword()}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete query.");
      }
      window.loadStudentQueries();
    } catch (err) {
      alert("Error deleting query: " + err.message);
    }
  };

  // Filters listeners
  const qStatusFilter = document.getElementById("queries-filter-status");
  const qGroupFilter = document.getElementById("queries-filter-group");
  const qSearchInput = document.getElementById("queries-search-input");
  const qRefreshBtn = document.getElementById("queries-refresh-btn");

  if (qStatusFilter) qStatusFilter.addEventListener("change", window.renderCoachQueries);
  if (qGroupFilter) qGroupFilter.addEventListener("change", window.renderCoachQueries);
  if (qSearchInput) qSearchInput.addEventListener("input", window.renderCoachQueries);
  if (qRefreshBtn) qRefreshBtn.addEventListener("click", window.loadStudentQueries);

  if (hasCoachPassword()) {
    window.loadCredentialsTable();
    window.loadStudentQueries();
  }

  // EXPORT TO EXCEL - Performance Overview Marks
  const exportBtn = document.getElementById("export-excel-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportAllStudentsMarks();
    });
  }

  // EXPORT TO EXCEL - Student Credentials / Logins
  const exportCredsBtn = document.getElementById("export-credentials-excel-btn");
  if (exportCredsBtn) {
    exportCredsBtn.addEventListener("click", () => {
      exportStudentsCredentials();
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

      bulkStudents = (studentsRes.students || []).filter(s => s.group_name === group);
      
      const isSelectedGroupNerd = isNerdGroup(group);
      // Filter exams: either target_groups is empty/null, or contains the selected group
      // Business Studies exams are strictly restricted to Nerd Tutors and Nerd Tutors Nalanda
      bulkExams = (examsRes.exams || []).filter(ex => {
        if (!isSelectedGroupNerd && isBusinessStudiesExam(ex)) return false;
        if (!ex.target_groups || ex.target_groups.length === 0) return true;
        return ex.target_groups.includes(group);
      });
      // Sort exams by Term (Pre Mid -> Mid -> Post Mid) and Subject
      bulkExams = sortExams(bulkExams);
      
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
    const subjBadge = ex.subject ? `<br><span style="font-size: 0.75rem; color: #3b82f6; font-weight: 600;">${escapeHtml(ex.subject)}</span>` : '';
    headHtml += `<th title="${ex.name} (Max: ${ex.total_marks})" style="text-align: center; min-width: 100px; padding: 0.5rem;">
      ${ex.name}${subjBadge}<br>
      <small style="font-weight:normal; color: var(--text-muted);">Max: ${ex.total_marks}</small>
    </th>`;
  });
  headHtml += `</tr>`;
  bulkGridHead.innerHTML = headHtml;

  // Body
  let bodyHtml = "";
  bulkStudents.forEach((st, sIdx) => {
    const isStudentNerd = st.group_name && st.group_name.startsWith("Nerd Tutors");
    const studentSubjs = Array.isArray(st.subjects) && st.subjects.length > 0
      ? st.subjects
      : (isStudentNerd ? ["Accountancy", "Economics", "Business Studies"] : []);

    bodyHtml += `<tr>
      <td style="text-align: center; padding: 0.5rem;">${sIdx + 1}</td>
      <td style="font-weight: 500; padding: 0.5rem;">${escapeHtml(st.name)}</td>`;
    
    bulkExams.forEach(ex => {
      const isBst = isBusinessStudiesExam(ex);
      const isOpted = (!isStudentNerd && !isBst) || (isStudentNerd && (!ex.subject || studentSubjs.includes(ex.subject)));
      if (!isOpted) {
        bodyHtml += `<td style="text-align: center; padding: 0.5rem; color: var(--text-muted); opacity: 0.5; font-size: 0.85rem;" title="Not opted for ${escapeHtml(ex.subject || '')}">&mdash;</td>`;
        return;
      }

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
      
      // Refresh marks list
      await loadExamData();
      
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



// HOMEWORK LINK MANAGER & AUTO-FILL
let cachedHomeworkLinks = [];

function autoFillHomeworkLink() {
  const dateInput = document.getElementById('hw-date');
  const groupSelect = document.getElementById('hw-group');
  const linkInput = document.getElementById('hw-link');
  const indicator = document.getElementById('hw-autofill-indicator');
  if (!dateInput || !groupSelect || !linkInput) return;

  const date = dateInput.value;
  const group = groupSelect.value;
  if (!date || !group) return;

  let matchingLink = null;
  if (group === 'ALL_GRADE_10') {
    matchingLink = cachedHomeworkLinks.find(l =>
      l.homework_date === date && ['Ignite', 'Velocity', 'Epsilon'].includes(l.group_name)
    );
  } else {
    matchingLink = cachedHomeworkLinks.find(l =>
      l.homework_date === date && l.group_name === group
    );
  }

  if (matchingLink && matchingLink.link) {
    linkInput.value = matchingLink.link;
    if (indicator) {
      indicator.textContent = group === 'ALL_GRADE_10' 
        ? `✓ Auto-filled link (${matchingLink.group_name})`
        : `✓ Auto-filled link`;
      indicator.style.display = 'inline';
    }
  } else {
    if (indicator && indicator.style.display !== 'none') {
      linkInput.value = '';
      indicator.style.display = 'none';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const hwDateInput = document.getElementById('hw-date');
  if (hwDateInput && !hwDateInput.value) hwDateInput.value = todayStr;
  const hwTrackDateInput = document.getElementById('hw-track-date');
  if (hwTrackDateInput && !hwTrackDateInput.value) hwTrackDateInput.value = todayStr;

  const hwGroupSelect = document.getElementById('hw-group');
  const hwLinkInput = document.getElementById('hw-link');
  const indicator = document.getElementById('hw-autofill-indicator');
  const quickG10Btn = document.getElementById('hw-quick-all-g10');

  if (hwDateInput) {
    hwDateInput.addEventListener('change', autoFillHomeworkLink);
  }
  if (hwGroupSelect) {
    hwGroupSelect.addEventListener('change', autoFillHomeworkLink);
  }
  if (quickG10Btn && hwGroupSelect) {
    quickG10Btn.addEventListener('click', () => {
      hwGroupSelect.value = 'ALL_GRADE_10';
      autoFillHomeworkLink();
    });
  }
  if (hwLinkInput) {
    hwLinkInput.addEventListener('input', () => {
      if (indicator) indicator.style.display = 'none';
    });
  }

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
        const payload = { homework_date: date, link };
        if (group === 'ALL_GRADE_10') {
          payload.group_name = 'ALL_GRADE_10';
          payload.group_names = ['Ignite', 'Velocity', 'Epsilon'];
        } else {
          payload.group_name = group;
        }

        const res = await fetch('/api/homework', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getCoachPassword() },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save');

        status.textContent = group === 'ALL_GRADE_10'
          ? 'Saved successfully for 3 classes (Ignite, Velocity, Epsilon)!'
          : 'Saved successfully!';
        status.style.color = 'green';
        status.style.display = 'block';

        if (typeof loadHomeworkLinks !== 'undefined') {
          await loadHomeworkLinks();
          autoFillHomeworkLink();
        }
      } catch (e) {
        status.textContent = e.message;
        status.style.color = 'red';
        status.style.display = 'block';
      } finally {
        hwBtn.disabled = false;
        hwBtn.textContent = 'Save Homework Link';
        setTimeout(() => status.style.display = 'none', 3500);
      }
    });
  }
});


if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

function renderGrowthList(exams, marksByStudent, studentsToUse = globalStudents, selectedSubject = "") {
  const growthList = document.getElementById('growth-list');
  if (!growthList) return;

  const growthStudents = [];

  studentsToUse.forEach(student => {
    const terms = getStudentExamTerms(student, exams, marksByStudent, selectedSubject);
    if (!terms || terms.length < 2) return;

    const latestTerm = terms[terms.length - 1];
    const previousTerm = terms[terms.length - 2];

    const growth = latestTerm.averagePerc - previousTerm.averagePerc;

    if (growth > 0) {
      let bestSubj = null;
      let maxSubjGain = 0;
      if (!selectedSubject && latestTerm.subjectScores && previousTerm.subjectScores) {
        latestTerm.subjectScores.forEach(ls => {
          const ps = previousTerm.subjectScores.find(p => p.subject === ls.subject);
          if (ps) {
            const gain = ls.perc - ps.perc;
            if (gain > maxSubjGain) {
              maxSubjGain = gain;
              bestSubj = ls.subject;
            }
          }
        });
      }

      growthStudents.push({
        student: student,
        name: student.name,
        group: student.group_name || "",
        latestTermName: latestTerm.termName,
        latestPerc: latestTerm.averagePerc,
        previousTermName: previousTerm.termName,
        previousPerc: previousTerm.averagePerc,
        growth: growth,
        bestSubj: bestSubj,
        maxSubjGain: maxSubjGain
      });
    }
  });

  growthStudents.sort((a, b) => b.growth - a.growth);

  if (growthStudents.length === 0) {
    growthList.innerHTML = `<li style="color: var(--text-muted); text-align: center; padding: 1rem;">No positive growth recorded between consecutive terms.</li>`;
    return;
  }

  let html = "";
  growthStudents.forEach(s => {
    let boostHtml = "";
    if (s.bestSubj && s.maxSubjGain >= 5) {
      boostHtml = `<div style="font-size: 0.8rem; color: #2563eb; margin-top: 2px;">🌟 Top boost: ${escapeHtml(s.bestSubj)} (+${s.maxSubjGain.toFixed(1)}%)</div>`;
    }

    html += `
      <li style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; gap: 1rem; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <strong style="color: var(--text); font-size: 1.05rem;">${escapeHtml(s.name)}</strong>
            ${s.group ? `<span class="score-pill" style="font-size: 0.72rem; padding: 0.1rem 0.4rem; background: rgba(99, 102, 241, 0.1); color: #6366f1;">${escapeHtml(s.group)}</span>` : ''}
          </div>
          <span style="color: #059669; font-size: 0.85rem; font-weight: 600;">&#8593; Overall grew by ${s.growth.toFixed(1)}% (from ${escapeHtml(s.previousTermName)} to ${escapeHtml(s.latestTermName)})</span>
          ${boostHtml}
        </div>
        <div style="text-align: right; font-size: 0.95rem; white-space: nowrap;">
          <span style="color: #059669; font-weight: bold;">${s.latestPerc.toFixed(1)}%</span> <span style="font-size: 0.8rem; color: var(--text-muted);">(${escapeHtml(s.latestTermName)})</span>
          <span style="color: var(--text-muted); margin: 0 0.4rem;">|</span> <span style="color: var(--text);">${s.previousPerc.toFixed(1)}%</span> <span style="font-size: 0.8rem; color: var(--text-muted);">(${escapeHtml(s.previousTermName)})</span>
        </div>
      </li>
    `;
  });

  growthList.innerHTML = html;
}

// ACCORDION LOGIC
document.addEventListener('DOMContentLoaded', () => {
  function setupAccordion(headerId, contentId, iconId, displayType = 'block') {
    const header = document.getElementById(headerId);
    const content = document.getElementById(contentId);
    const icon = document.getElementById(iconId);

    if (header && content && icon) {
      header.addEventListener('click', () => {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? displayType : 'none';
        icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      });
    }
  }

  setupAccordion('overview-header', 'overview-content', 'overview-toggle-icon', 'block');
  setupAccordion('insights-header', 'insights-content', 'insights-toggle-icon', 'grid');
  setupAccordion('analytics-header', 'analytics-content', 'analytics-toggle-icon', 'block');
  setupAccordion('exams-header', 'exams-content', 'exams-toggle-icon', 'block');
  setupAccordion('credentials-header', 'credentials-content', 'credentials-toggle-icon', 'block');
  setupAccordion('logins-header', 'logins-content', 'logins-toggle-icon', 'block');
});

// HOMEWORK LINKS LOADING AND DELETION
async function loadHomeworkLinks() {
  const tbody = document.getElementById('hw-links-tbody');
  if (!tbody) return;
  try {
    const res = await fetch('/api/homework', {
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + getCoachPassword() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch links');
    
    const links = data.links || [];
    cachedHomeworkLinks = links;
    if (typeof autoFillHomeworkLink === 'function') {
      autoFillHomeworkLink();
    }

    if (links.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: var(--text-muted);">No links found.</td></tr>';
      return;
    }
    
    // Sort by date descending
    links.sort((a, b) => new Date(b.homework_date) - new Date(a.homework_date));
    
    tbody.innerHTML = links.map(link => `
      <tr>
        <td style="padding: 1rem; border-bottom: 1px solid var(--border);">${link.homework_date}</td>
        <td style="padding: 1rem; border-bottom: 1px solid var(--border);">${link.group_name}</td>
        <td style="padding: 1rem; border-bottom: 1px solid var(--border);"><a href="${link.link}" target="_blank" style="color: var(--primary);">View Link</a></td>
        <td style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: right;">
          <button class="btn" onclick="deleteHomeworkLink('${link.id}')" style="background: #ef4444; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #ef4444;">Error: ${e.message}</td></tr>`;
  }
}

window.deleteHomeworkLink = async function(id) {
  if (!confirm('Are you sure you want to delete this homework link?')) return;
  try {
    const res = await fetch('/api/homework?id=' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getCoachPassword() }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete');
    }
    loadHomeworkLinks(); // Reload the list
  } catch (e) {
    alert('Error deleting link: ' + e.message);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadHomeworkLinks();
  loadCalendarEvents();
  loadStudentLogins();
  if (typeof setupStudentLoginsUI === 'function') setupStudentLoginsUI();
  
  // Hook into the save button to reload the list after saving
  const hwBtn = document.getElementById('hw-submit-btn');
  if (hwBtn) {
    // We can just add an event listener because multiple listeners are fine,
    // we just want to refresh after a short delay to let the original listener finish.
    hwBtn.addEventListener('click', () => {
      setTimeout(loadHomeworkLinks, 1000); // 1 second delay to ensure save completes
    });
  }

  const calDateInput = document.getElementById('cal-event-date');
  if (calDateInput && !calDateInput.value) {
    calDateInput.value = new Date().toISOString().split('T')[0];
  }

  const calQuickG10Btn = document.getElementById('cal-event-quick-g10');
  const calGroupSelect = document.getElementById('cal-event-group');
  if (calQuickG10Btn && calGroupSelect) {
    calQuickG10Btn.addEventListener('click', () => {
      calGroupSelect.value = 'ALL_GRADE_10';
    });
  }

  const calSubmitBtn = document.getElementById('cal-event-submit-btn');
  if (calSubmitBtn) {
    calSubmitBtn.addEventListener('click', async () => {
      const date = document.getElementById('cal-event-date').value;
      const group = document.getElementById('cal-event-group').value;
      const title = document.getElementById('cal-event-title').value.trim();
      const color = document.getElementById('cal-event-color').value;
      const status = document.getElementById('cal-event-status');

      if (!date || !group || !title) {
        return alert('Please select a date, group, and enter an event or test name.');
      }

      calSubmitBtn.disabled = true;
      calSubmitBtn.textContent = 'Saving...';
      try {
        const payload = { event_date: date, title, color };
        if (group === 'ALL_GRADE_10') {
          payload.group_name = 'ALL_GRADE_10';
          payload.group_names = ['Ignite', 'Velocity', 'Epsilon'];
        } else {
          payload.group_name = group;
        }

        const res = await fetch('/api/homework', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getCoachPassword()
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save event');

        status.textContent = group === 'ALL_GRADE_10'
          ? 'Event saved successfully for all 3 Grade 10 classes (Ignite, Velocity, Epsilon)!'
          : 'Event saved successfully!';
        status.style.color = '#059669';
        status.style.display = 'block';

        document.getElementById('cal-event-title').value = '';
        await loadCalendarEvents();
      } catch (e) {
        status.textContent = e.message;
        status.style.color = '#ef4444';
        status.style.display = 'block';
      } finally {
        calSubmitBtn.disabled = false;
        calSubmitBtn.textContent = 'Save Calendar Event';
        setTimeout(() => { if (status) status.style.display = 'none'; }, 3500);
      }
    });
  }
});

// CALENDAR EVENTS & IMPORTANT DATES LOADING AND MANAGEMENT
async function loadCalendarEvents() {
  const tbody = document.getElementById('cal-events-tbody');
  if (!tbody) return;
  if (!getCoachPassword()) return;
  try {
    const res = await fetch('/api/homework?type=events', {
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + getCoachPassword() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch events');

    const events = data.events || [];
    if (events.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 1rem; color: var(--text-muted);">No calendar events or test dates found.</td></tr>';
      return;
    }

    // Sort by event_date descending
    events.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

    const colorBadgeMap = {
      blue: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', label: 'Soft Blue' },
      purple: { bg: '#ede9fe', color: '#5b21b6', border: '#ddd6fe', label: 'Soft Purple' },
      green: { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0', label: 'Soft Green' },
      amber: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'Soft Amber' },
      rose: { bg: '#ffe4e6', color: '#9f1239', border: '#fecdd3', label: 'Soft Rose' }
    };

    tbody.innerHTML = events.map(ev => {
      const c = colorBadgeMap[ev.color] || colorBadgeMap.blue;
      return `
        <tr>
          <td style="padding: 1rem; border-bottom: 1px solid var(--border); font-weight: 500;">${escapeHtml(ev.event_date)}</td>
          <td style="padding: 1rem; border-bottom: 1px solid var(--border);"><span style="font-weight: 600;">${escapeHtml(ev.group_name)}</span></td>
          <td style="padding: 1rem; border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text);">${escapeHtml(ev.title)}</td>
          <td style="padding: 1rem; border-bottom: 1px solid var(--border);">
            <span style="background: ${c.bg}; color: ${c.color}; border: 1px solid ${c.border}; padding: 0.2rem 0.55rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600;">${c.label}</span>
          </td>
          <td style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: right;">
            <button class="btn" onclick="deleteCalendarEvent('${ev.id}')" style="background: #ef4444; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1rem; color: #ef4444;">Error: ${escapeHtml(e.message)}</td></tr>`;
  }
}

window.deleteCalendarEvent = async function(id) {
  if (!confirm('Are you sure you want to delete this event/test date?')) return;
  try {
    const res = await fetch('/api/homework?event_id=' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getCoachPassword() }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete event');
    }
    loadCalendarEvents();
  } catch (e) {
    alert('Error deleting calendar event: ' + e.message);
  }
};


// --- HOMEWORK TRACKING ---
const hwTrackDateInput = document.getElementById("hw-track-date");
const hwTrackGroupSelect = document.getElementById("hw-track-group");
const hwTrackLoadBtn = document.getElementById("hw-track-load-btn");
const hwTrackContainer = document.getElementById("hw-track-container");
const hwTrackBody = document.getElementById("hw-track-body");
const hwTrackSaveBtn = document.getElementById("hw-track-save-btn");
const hwTrackSaveStatus = document.getElementById("hw-track-save-status");

if (hwTrackLoadBtn) {
  let currentHwTrackingData = [];
  
  hwTrackLoadBtn.addEventListener("click", async () => {
    const date = hwTrackDateInput.value;
    const group = hwTrackGroupSelect.value;
    
    if (!date || !group) {
      return alert("Please select both a date and a group.");
    }
    
    hwTrackLoadBtn.disabled = true;
    hwTrackLoadBtn.textContent = "Loading...";
    
    try {
      const res = await fetch(`/api/homework?homework_date=${date}&group_name=${encodeURIComponent(group)}`, {
        headers: { "Authorization": `Bearer ${getCoachPassword()}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        currentHwTrackingData = data.students || [];
        const existingStatuses = data.statuses || [];
        
        let bodyHtml = "";
        currentHwTrackingData.forEach((st, idx) => {
          const existingRecord = existingStatuses.find(s => s.student_id === st.id);
          const statusVal = existingRecord ? existingRecord.status : "Done";
          
          bodyHtml += `<tr>
            <td style="text-align: center; padding: 0.5rem;">${idx + 1}</td>
            <td style="font-weight: 500; padding: 0.5rem;">${escapeHtml(st.name)}</td>
            <td style="padding: 0.5rem;">
              <select class="hw-status-select" data-student-id="${st.id}" style="padding: 0.5rem; border-radius: 4px; border: 1px solid var(--border); background: var(--surface);">
                <option value="Done" ${statusVal === 'Done' ? 'selected' : ''}>Done</option>
                <option value="Partial" ${statusVal === 'Partial' ? 'selected' : ''}>Partial</option>
                <option value="Incomplete" ${statusVal === 'Incomplete' ? 'selected' : ''}>Incomplete</option>
              </select>
            </td>
          </tr>`;
        });
        
        if (currentHwTrackingData.length === 0) {
          bodyHtml = `<tr><td colspan="3" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No students found in this group.</td></tr>`;
          hwTrackSaveBtn.style.display = "none";
        } else {
          hwTrackSaveBtn.style.display = "inline-block";
        }
        
        hwTrackBody.innerHTML = bodyHtml;
        hwTrackContainer.style.display = "block";
      } else {
        alert(data.error || "Failed to load students.");
      }
    } catch (e) {
      alert("Error loading homework tracking data.");
    }
    
    hwTrackLoadBtn.disabled = false;
    hwTrackLoadBtn.textContent = "Load Students";
  });
  
  if (hwTrackSaveBtn) {
    hwTrackSaveBtn.addEventListener("click", async () => {
      const date = hwTrackDateInput.value;
      if (!date) return alert("Please select a date.");
      
      const selects = document.querySelectorAll(".hw-status-select");
      const updates = [];
      selects.forEach(sel => {
        updates.push({
          homework_date: date,
          student_id: sel.dataset.studentId,
          status: sel.value
        });
      });
      
      if (updates.length === 0) return;
      
      hwTrackSaveBtn.disabled = true;
      hwTrackSaveBtn.textContent = "Saving...";
      hwTrackSaveStatus.textContent = "Saving...";
      
      try {
        const res = await fetch("/api/homework", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getCoachPassword()}`
          },
          body: JSON.stringify({ updates })
        });
        
        const data = await res.json();
        if (res.ok) {
          hwTrackSaveStatus.textContent = "Saved successfully!";
          hwTrackSaveStatus.style.color = "#059669";
          setTimeout(() => { hwTrackSaveStatus.textContent = ""; }, 3000);
        } else {
          hwTrackSaveStatus.textContent = data.error || "Failed to save.";
          hwTrackSaveStatus.style.color = "#ef4444";
        }
      } catch (e) {
        hwTrackSaveStatus.textContent = "Error saving data.";
        hwTrackSaveStatus.style.color = "#ef4444";
      }
      
      hwTrackSaveBtn.disabled = false;
      hwTrackSaveBtn.textContent = "Save Homework Status";
    });
  }
}

// ==========================================
// STUDENT LOGINS TRACKER (GRADE 12 ACTIVITY)
// ==========================================
let cachedStudentLogins = [];
let activeLoginFilter = 'today'; // 'today' | 'yesterday' | 'custom' | 'all'
let customLoginFilterDate = '';
let loginSortDescending = true; // true = newest first, false = oldest first
let loginSearchQuery = '';

function getLocalDateString(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRelativeTime(timestamp) {
  const diffSec = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

async function loadStudentLogins() {
  const tbody = document.getElementById('student-logins-tbody');
  if (!tbody) return;
  if (!getCoachPassword()) return;

  try {
    const res = await fetch('/api/auth?type=logins', {
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + getCoachPassword() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch student logins');

    cachedStudentLogins = Array.isArray(data.logins) ? data.logins : [];
    renderStudentLogins();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 1.5rem; text-align: center; color: #ef4444;">Error loading logins: ${escapeHtml(err.message)}</td></tr>`;
    }
  }
}

function renderStudentLogins() {
  const tbody = document.getElementById('student-logins-tbody');
  if (!tbody) return;

  const todayDateStr = getLocalDateString(new Date());
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayDateStr = getLocalDateString(yesterdayObj);

  // 1. Day filtering
  let filtered = cachedStudentLogins.filter(item => {
    if (!item.logged_in_at) return false;
    const itemDate = new Date(item.logged_in_at);
    const itemDateStr = getLocalDateString(itemDate);

    if (activeLoginFilter === 'today') {
      return itemDateStr === todayDateStr;
    } else if (activeLoginFilter === 'yesterday') {
      return itemDateStr === yesterdayDateStr;
    } else if (activeLoginFilter === 'custom') {
      return customLoginFilterDate ? itemDateStr === customLoginFilterDate : true;
    } else if (activeLoginFilter === 'all') {
      return true;
    }
    return true;
  });

  // 2. Search query filtering
  if (loginSearchQuery) {
    const q = loginSearchQuery.toLowerCase();
    filtered = filtered.filter(item => {
      const nameMatch = (item.student_name || '').toLowerCase().includes(q);
      const groupMatch = (item.group_name || '').toLowerCase().includes(q);
      const aliasMatch = (item.student_id_alias || '').toLowerCase().includes(q);
      return nameMatch || groupMatch || aliasMatch;
    });
  }

  // 3. Chronological Time Sorting
  filtered.sort((a, b) => {
    const timeA = new Date(a.logged_in_at).getTime();
    const timeB = new Date(b.logged_in_at).getTime();
    return loginSortDescending ? timeB - timeA : timeA - timeB;
  });

  // Update Summary Pill & Label
  const statusSummary = document.getElementById('login-status-summary');
  const countPill = document.getElementById('login-count-pill');
  if (statusSummary) {
    let label = 'Today';
    if (activeLoginFilter === 'yesterday') label = 'Yesterday';
    else if (activeLoginFilter === 'custom') label = customLoginFilterDate ? `Date: ${customLoginFilterDate}` : 'Selected Date';
    else if (activeLoginFilter === 'all') label = 'All Recent Days';
    statusSummary.innerHTML = `Showing logins for <strong>${escapeHtml(label)}</strong>`;
  }

  if (countPill) {
    const uniqueStudents = new Set(filtered.map(f => f.student_name || f.student_id)).size;
    countPill.textContent = `${filtered.length} login${filtered.length === 1 ? '' : 's'} (${uniqueStudents} unique student${uniqueStudents === 1 ? '' : 's'})`;
  }

  if (filtered.length === 0) {
    let emptyMsg = "No student logins recorded for today yet.";
    if (activeLoginFilter === 'yesterday') emptyMsg = "No student logins recorded for yesterday.";
    else if (activeLoginFilter === 'custom') emptyMsg = customLoginFilterDate ? `No student logins recorded for ${customLoginFilterDate}.` : "Please pick a date to view logins.";
    else if (activeLoginFilter === 'all') emptyMsg = "No student logins recorded yet.";
    if (loginSearchQuery) emptyMsg = `No student logins matching "${escapeHtml(loginSearchQuery)}".`;

    tbody.innerHTML = `<tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--text-muted);">${emptyMsg}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((item, idx) => {
    const itemDate = new Date(item.logged_in_at);
    const itemDateStr = getLocalDateString(itemDate);
    const timeStr = itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const relTime = getRelativeTime(item.logged_in_at);

    let dateBadge = "";
    if (itemDateStr === todayDateStr) {
      dateBadge = '<span style="color: #059669; font-weight: 600;">Today</span>';
    } else if (itemDateStr === yesterdayDateStr) {
      dateBadge = '<span style="color: #d97706; font-weight: 600;">Yesterday</span>';
    } else {
      dateBadge = itemDate.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    }

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 0.75rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">${idx + 1}</td>
        <td style="padding: 0.75rem; font-weight: 600; color: var(--text);">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span style="font-size: 1rem;">👤</span>
            <span>${escapeHtml(item.student_name)}</span>
          </div>
        </td>
        <td style="padding: 0.75rem;">
          <span style="background: rgba(59, 130, 246, 0.1); color: var(--primary); padding: 0.2rem 0.55rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600;">
            ${escapeHtml(item.group_name || 'Grade 12')}
          </span>
        </td>
        <td style="padding: 0.75rem; font-family: monospace; font-weight: 500; color: var(--text-muted);">
          ${escapeHtml(item.student_id_alias || '-')}
        </td>
        <td style="padding: 0.75rem;">
          <div style="font-weight: 700; color: var(--text); font-size: 0.95rem;">${timeStr}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${relTime}</div>
        </td>
        <td style="padding: 0.75rem; font-size: 0.85rem;">${dateBadge}</td>
        <td style="padding: 0.75rem; text-align: right;">
          <button class="btn" onclick="deleteStudentLogin('${item.id}')" title="Delete login log" style="background: #ef4444; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.deleteStudentLogin = async function(id) {
  if (!confirm('Are you sure you want to delete this login record?')) return;
  try {
    const res = await fetch('/api/auth?login_id=' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getCoachPassword() }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete login record');
    }
    cachedStudentLogins = cachedStudentLogins.filter(item => item.id !== id);
    renderStudentLogins();
  } catch (err) {
    alert('Error deleting login: ' + err.message);
  }
};

function setupStudentLoginsUI() {
  const btnToday = document.getElementById('login-filter-today');
  const btnYesterday = document.getElementById('login-filter-yesterday');
  const btnCustom = document.getElementById('login-filter-custom-btn');
  const btnAll = document.getElementById('login-filter-all');
  const dateInput = document.getElementById('login-filter-date');
  const searchInput = document.getElementById('login-search-input');
  const sortBtn = document.getElementById('login-sort-btn');
  const sortLabel = document.getElementById('login-sort-label');
  const refreshBtn = document.getElementById('login-refresh-btn');

  const setFilterActive = (activeType) => {
    activeLoginFilter = activeType;
    const btns = [btnToday, btnYesterday, btnCustom, btnAll];
    btns.forEach(btn => {
      if (!btn) return;
      if (btn.dataset.filter === activeType) {
        btn.className = "btn btn-primary login-day-btn";
        btn.style.background = "";
        btn.style.color = "";
        btn.style.border = "";
      } else {
        btn.className = "btn login-day-btn";
        btn.style.background = "var(--surface-card)";
        btn.style.color = "var(--text)";
        btn.style.border = "1px solid var(--border)";
      }
    });

    if (dateInput) {
      if (activeType === 'custom') {
        dateInput.style.display = 'inline-block';
        if (!dateInput.value) {
          dateInput.value = getLocalDateString(new Date());
        }
        customLoginFilterDate = dateInput.value;
      } else {
        dateInput.style.display = 'none';
      }
    }
    renderStudentLogins();
  };

  if (btnToday) btnToday.addEventListener('click', () => setFilterActive('today'));
  if (btnYesterday) btnYesterday.addEventListener('click', () => setFilterActive('yesterday'));
  if (btnCustom) btnCustom.addEventListener('click', () => setFilterActive('custom'));
  if (btnAll) btnAll.addEventListener('click', () => setFilterActive('all'));

  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      customLoginFilterDate = e.target.value;
      renderStudentLogins();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      loginSearchQuery = e.target.value.trim();
      renderStudentLogins();
    });
  }

  if (sortBtn && sortLabel) {
    sortBtn.addEventListener('click', () => {
      loginSortDescending = !loginSortDescending;
      sortLabel.textContent = loginSortDescending ? 'Latest First ▾' : 'Oldest First ▴';
      renderStudentLogins();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing...';
      await loadStudentLogins();
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄 Refresh';
    });
  }
}

