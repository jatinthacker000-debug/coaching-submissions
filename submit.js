const offlineNotice = document.getElementById("offline-notice");

function isOfflineFileMode() {
  return window.location.protocol === "file:";
}

// Parses "[Ch X] Chapter Title" format
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

// Converts chapter to sortable float value
function getChapterSortValue(resource) {
  const parsed = parseResourceTitle(resource.title || "");
  if (parsed.chapter) {
    const num = parseFloat(parsed.chapter);
    return isNaN(num) ? 999999 : num;
  }
  return 999999;
}

async function loadPDFNotes() {
  const notesXContainer = document.getElementById("notes-x-container");
  const noNotesX = document.getElementById("no-notes-x");
  const loadingIndicator = document.getElementById("loading-indicator");

  if (!notesXContainer) return;

  function renderNotesToDOM(notesList) {
    const notesXHistory = document.getElementById("notes-x-history");
    const notesXGeography = document.getElementById("notes-x-geography");
    const notesXCivics = document.getElementById("notes-x-civics");
    const notesXEconomics = document.getElementById("notes-x-economics");

    const worksheetsXHistory = document.getElementById("worksheets-x-history");
    const worksheetsXGeography = document.getElementById("worksheets-x-geography");
    const worksheetsXCivics = document.getElementById("worksheets-x-civics");
    const worksheetsXEconomics = document.getElementById("worksheets-x-economics");

    const otherXHistory = document.getElementById("other-x-history");
    const otherXGeography = document.getElementById("other-x-geography");

    notesXHistory.innerHTML = "";
    notesXGeography.innerHTML = "";
    notesXCivics.innerHTML = "";
    notesXEconomics.innerHTML = "";

    worksheetsXHistory.innerHTML = "";
    worksheetsXGeography.innerHTML = "";
    worksheetsXCivics.innerHTML = "";
    worksheetsXEconomics.innerHTML = "";

    if (otherXHistory) otherXHistory.innerHTML = "";
    if (otherXGeography) otherXGeography.innerHTML = "";

    const groups = {
      History: { 
        card: document.getElementById("group-x-history"),
        notesList: notesXHistory,
        notesSection: document.getElementById("section-x-history-notes"),
        worksheetsList: worksheetsXHistory,
        worksheetsSection: document.getElementById("section-x-history-worksheets"),
        otherList: otherXHistory,
        otherSection: document.getElementById("section-x-history-other")
      },
      Geography: { 
        card: document.getElementById("group-x-geography"),
        notesList: notesXGeography,
        notesSection: document.getElementById("section-x-geography-notes"),
        worksheetsList: worksheetsXGeography,
        worksheetsSection: document.getElementById("section-x-geography-worksheets"),
        otherList: otherXGeography,
        otherSection: document.getElementById("section-x-geography-other")
      },
      Civics: { 
        card: document.getElementById("group-x-civics"),
        notesList: notesXCivics,
        notesSection: document.getElementById("section-x-civics-notes"),
        worksheetsList: worksheetsXCivics,
        worksheetsSection: document.getElementById("section-x-civics-worksheets")
      },
      Economics: { 
        card: document.getElementById("group-x-economics"),
        notesList: notesXEconomics,
        notesSection: document.getElementById("section-x-economics-notes"),
        worksheetsList: worksheetsXEconomics,
        worksheetsSection: document.getElementById("section-x-economics-worksheets")
      },
    };

    Object.values(groups).forEach(g => {
      if (g.card) g.card.style.display = "none";
      if (g.notesSection) g.notesSection.style.display = "none";
      if (g.worksheetsSection) g.worksheetsSection.style.display = "none";
      if (g.otherSection) g.otherSection.style.display = "none";
    });

    const gradeXResources = (notesList || []).filter((n) => n.grade === "X" || n.grade === "X-Worksheet" || n.grade === "X-Other");

    gradeXResources.sort((a, b) => {
      const sortA = getChapterSortValue(a);
      const sortB = getChapterSortValue(b);
      if (sortA !== sortB) return sortA - sortB;
      
      const titleA = parseResourceTitle(a.title).cleanTitle;
      const titleB = parseResourceTitle(b.title).cleanTitle;
      return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
    });

    if (!gradeXResources.length) {
      if (noNotesX) noNotesX.style.display = "block";
    } else {
      if (noNotesX) noNotesX.style.display = "none";
      
      let renderedCount = 0;

      gradeXResources.forEach((resource) => {
        let subj = resource.subject;
        if (subj === "Macro Economics" || subj === "Indian Economics Development") {
          subj = "Economics";
        }
        
        const target = groups[subj];
        if (target) {
          const li = document.createElement("li");
          const parsed = parseResourceTitle(resource.title);
          const chapterBadge = parsed.chapter ? `<span class="note-chapter-tag">Ch ${escapeHtml(parsed.chapter)}</span> ` : "";
          
          if (resource.grade === "X-Other") {
            if (target.otherList) {
              li.innerHTML = `<a href="${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📚📁 ${chapterBadge}${escapeHtml(parsed.cleanTitle)}</a>`;
              target.otherList.appendChild(li);
              if (target.otherSection) target.otherSection.style.display = "block";
            }
          } else if (resource.grade === "X-Worksheet") {
            li.innerHTML = `<a href="${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📚📝 ${chapterBadge}${escapeHtml(parsed.cleanTitle)}</a>`;
            target.worksheetsList.appendChild(li);
            if (target.worksheetsSection) target.worksheetsSection.style.display = "block";
          } else {
            let prefix = "";
            if (resource.subject === "Macro Economics") prefix = `<span class="note-sub-tag">Macro</span> `;
            if (resource.subject === "Indian Economics Development") prefix = `<span class="note-sub-tag">IED</span> `;

            li.innerHTML = `<a href="${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📚📝 ${prefix}${chapterBadge}${escapeHtml(parsed.cleanTitle)}</a>`;
            target.notesList.appendChild(li);
            if (target.notesSection) target.notesSection.style.display = "block";
          }
          
          if (target.card) target.card.style.display = "flex";
          renderedCount++;
        }
      });

      if (renderedCount === 0 && noNotesX) {
        noNotesX.style.display = "block";
      }
    }
    
    // Grade 10 accordion logic
    document.querySelectorAll('.subject-card').forEach(card => {
      // Add a click listener to the header
      const header = card.querySelector('.card-header');
      if (header && !header.hasAttribute('data-accordion-init')) {
        header.setAttribute('data-accordion-init', 'true');
        header.style.cursor = 'pointer';
        header.innerHTML += `<span class="accordion-icon" style="margin-left: auto; transition: transform 0.2s;">▼</span>`;
        
        // Hide all sections initially
        const sections = card.querySelectorAll('.notes-section');
        sections.forEach(s => s.classList.add('collapsed'));

        header.addEventListener('click', () => {
          const icon = header.querySelector('.accordion-icon');
          const isExpanded = icon.style.transform === 'rotate(180deg)';
          
          if (isExpanded) {
            icon.style.transform = 'rotate(0deg)';
            sections.forEach(s => s.classList.add('collapsed'));
          } else {
            icon.style.transform = 'rotate(180deg)';
            sections.forEach(s => s.classList.remove('collapsed'));
          }
        });
      }
    });
    
    // Render CBSE resources dynamically
    const cbseGrid = document.getElementById("cbse-dynamic-container");
    if (cbseGrid) {
      const cbseResources = (notesList || []).filter(n => n.grade === "CBSE");
      cbseResources.sort((a, b) => a.title.localeCompare(b.title));
      
      if (cbseResources.length === 0) {
        cbseGrid.innerHTML = `<p class="muted-text text-center">No CBSE resources added yet.</p>`;
      } else {
        cbseGrid.innerHTML = "";
        
        const subjectsGrid = document.createElement("div");
        subjectsGrid.className = "notes-grid-subjects";
        
        const subjectCard = document.createElement("div");
        subjectCard.className = "subject-card";
        
        const docIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
        
        subjectCard.innerHTML = `
          <div class="card-header" style="cursor: pointer; display: flex; align-items: center;">
            <span class="subject-icon">📚</span>
            <h4>General Resources</h4>
            <span class="accordion-icon" style="margin-left: auto; transition: transform 0.2s;">▼</span>
          </div>
          <div class="notes-section collapsed">
            <ul class="notes-list">
              ${cbseResources.map(res => `
                <li>
                  <a href="${escapeHtml(res.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📚${docIcon} <span>${escapeHtml(res.title)}</span></a>
                </li>
              `).join('')}
            </ul>
          </div>
        `;
        
        // Accordion logic for CBSE subject card
        const header = subjectCard.querySelector('.card-header');
        const section = subjectCard.querySelector('.notes-section');
        const accIcon = subjectCard.querySelector('.accordion-icon');
        
        header.addEventListener('click', () => {
          const isExpanded = accIcon.style.transform === 'rotate(180deg)';
          if (isExpanded) {
            accIcon.style.transform = 'rotate(0deg)';
            section.classList.add('collapsed');
          } else {
            accIcon.style.transform = 'rotate(180deg)';
            section.classList.remove('collapsed');
          }
        });
        
        subjectsGrid.appendChild(subjectCard);
        cbseGrid.appendChild(subjectsGrid);
      }
    }

    const searchInput = document.getElementById("search-input");
    if (searchInput && searchInput.value) {
      searchInput.dispatchEvent(new Event("input"));
    }
  }

  try {
    let hasCache = false;
    let cachedNotesStr = localStorage.getItem("padhrahi_notes_cache");
    if (cachedNotesStr) {
      try {
        const cachedNotes = JSON.parse(cachedNotesStr);
        renderNotesToDOM(cachedNotes);
        renderNotifications(cachedNotes);
        hasCache = true;
      } catch (e) {}
    }

    if (!hasCache && loadingIndicator) {
      loadingIndicator.style.display = "block";
    }

    const { notes } = await fetchNotes();
    
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
    }
    
    if (JSON.stringify(notes) !== cachedNotesStr) {
      localStorage.setItem("padhrahi_notes_cache", JSON.stringify(notes));
      renderNotesToDOM(notes);
      renderNotifications(notes);
    } else {
      renderNotifications(notes);
    }
  } catch (err) {
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
    }
    if (noNotesX && !localStorage.getItem("padhrahi_notes_cache")) {
      const textEl = document.getElementById("no-notes-text");
      const iconEl = document.getElementById("no-notes-icon");
      if (textEl) textEl.textContent = "Failed to load resources.";
      if (iconEl) iconEl.textContent = "❌";
      noNotesX.style.display = "block";
    }
  }
}

if (isOfflineFileMode() && offlineNotice) {
  offlineNotice.classList.remove("hidden");
}

loadPDFNotes();

const searchInput = document.getElementById("search-input");
const typeFilter = document.getElementById("type-filter");

function filterResources() {
  if (!searchInput) return;
  const term = searchInput.value.toLowerCase();
  const filterValue = typeFilter ? typeFilter.value : "all";
  
  const subjectCards = document.querySelectorAll(".subject-card");
  let totalVisible = 0;
  
  subjectCards.forEach(card => {
    let hasVisibleItems = false;
    const sections = card.querySelectorAll(".notes-section");
    
    sections.forEach(section => {
      const isWorksheets = section.id.includes("-worksheets");
      const isNotes = section.id.includes("-notes");
      const isOther = section.id.includes("-other");
      
      let hasVisibleInSection = false;
      const listItems = section.querySelectorAll("li");
      
      listItems.forEach(li => {
        const text = li.textContent.toLowerCase();
        const matchesSearch = text.includes(term);
        
        let matchesType = true;
        if (filterValue === "notes" && !isNotes) matchesType = false;
        if (filterValue === "worksheets" && !isWorksheets) matchesType = false;
        if (filterValue === "other" && !isOther) matchesType = false;
        
        if (matchesSearch && matchesType) {
          li.style.display = "";
          hasVisibleInSection = true;
          totalVisible++;
        } else {
          li.style.display = "none";
        }
      });
      
      if (hasVisibleInSection) {
        section.style.display = "block";
        hasVisibleItems = true;
      } else {
        section.style.display = "none";
      }
    });
    
    if (hasVisibleItems) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
  
  const noNotesX = document.getElementById("no-notes-x");
  const allItems = document.querySelectorAll(".notes-list li");
  if (noNotesX && allItems.length > 0) {
    if (totalVisible === 0) {
      noNotesX.style.display = "block";
      const textEl = document.getElementById("no-notes-text");
      const iconEl = document.getElementById("no-notes-icon");
      if (textEl) textEl.textContent = "No matching chapters found.";
      if (iconEl) iconEl.textContent = "🔍";
    } else {
      noNotesX.style.display = "none";
    }
  }
}

let debounceTimer;
function debouncedFilterResources() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(filterResources, 150);
}

if (searchInput) {
  searchInput.addEventListener("input", debouncedFilterResources);
}
if (typeFilter) {
  typeFilter.addEventListener("change", filterResources);
}

// Notifications Logic
let allNotifications = [];
function renderNotifications(notesList) {
  allNotifications = (notesList || []).filter(n => n.grade === "NOTIFICATION");
  const badge = document.getElementById("notif-badge");
  if (badge) {
    let unreadCount = 0;
    const lastSeenStr = localStorage.getItem("padhrahi_last_notif_seen");
    const lastSeenTime = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
    
    allNotifications.forEach(n => {
      const notifTime = new Date(n.created_at).getTime();
      if (notifTime > lastSeenTime) {
        unreadCount++;
      }
    });

    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }
  updateNotificationList("all");
}

function updateNotificationList(filterInst) {
  const notifList = document.getElementById("notif-list");
  if (!notifList) return;
  notifList.innerHTML = "";
  
  const filtered = allNotifications.filter(n => filterInst === "all" || n.subject === filterInst || n.subject === "All Institutes");
  
  if (filtered.length === 0) {
    notifList.innerHTML = `<p class="muted-text text-center" style="margin-top: 1rem;">No new notifications.</p>`;
    return;
  }
  
  filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).forEach(notif => {
    const li = document.createElement("li");
    li.className = "notif-item";
    
    let content = `
      <div class="notif-item-inst">${escapeHtml(notif.subject)}</div>
      <div class="notif-item-title">${escapeHtml(notif.title)}</div>
      <div class="notif-item-date">${formatDate(notif.created_at)}</div>
    `;
    
    if (notif.link && notif.link !== "#") {
      li.innerHTML = `<a href="${escapeHtml(notif.link)}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit;">${content}</a>`;
    } else {
      li.innerHTML = content;
    }
    
    notifList.appendChild(li);
  });
}

const notifBellBtn = document.getElementById("notif-bell-btn");
const notifModal = document.getElementById("notif-modal");
const notifCloseBtn = document.getElementById("notif-close-btn");
const notifTabs = document.querySelectorAll(".notif-tab");

if (notifBellBtn && notifModal) {
  notifBellBtn.addEventListener("click", () => {
    notifModal.classList.remove("hidden");
    const badge = document.getElementById("notif-badge");
    if (badge) badge.style.display = "none";
    
    if (allNotifications.length > 0) {
      const latestTime = Math.max(...allNotifications.map(n => new Date(n.created_at).getTime()));
      localStorage.setItem("padhrahi_last_notif_seen", new Date(latestTime).toISOString());
    }
  });
}
if (notifCloseBtn && notifModal) {
  notifCloseBtn.addEventListener("click", () => {
    notifModal.classList.add("hidden");
  });
}
notifTabs.forEach(tab => {
  tab.addEventListener("click", (e) => {
    notifTabs.forEach(t => t.classList.remove("active"));
    e.target.classList.add("active");
    updateNotificationList(e.target.dataset.inst);
  });
});


// Marks Submission Logic
const marksForm = document.getElementById("marks-form");




// Exam Countdown Logic
document.addEventListener("DOMContentLoaded", () => {
  const totalEl = document.getElementById("cd-total");
  const effectiveEl = document.getElementById("cd-effective");
  
  if (totalEl && effectiveEl) {
    // Target date set to November 29, 2026 (75 days from Sept 15, 2026)
    const targetDate = new Date("2026-11-29T00:00:00");
    const today = new Date();
    
    // Calculate difference in milliseconds
    const diffTime = targetDate - today;
    
    // Calculate days and round up to next full day
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) diffDays = 0;
    
    const holidayDays = 20;
    let effectiveDays = diffDays - holidayDays;
    if (effectiveDays < 0) effectiveDays = 0;
    
    totalEl.textContent = diffDays;
    effectiveEl.textContent = effectiveDays;
  }
});

// --- STUDENT REPORT FEATURE ---
let publicStudents = [];
let publicExams = [];
let publicMarks = [];
let studentReportChart = null;

async function initStudentReport() {
  const selectEl = document.getElementById("student-report-select");
  if (!selectEl) return;
  
  try {
    // Fetch data using the existing api-client methods
    // Since we updated marks to not require coach auth for GET, these should work
    const [studentsRes, examsRes, marksRes] = await Promise.all([
      fetchStudents(),
      fetchExams(),
      fetchMarks() // Public now!
    ]);
    
    publicStudents = studentsRes.students || [];
    publicExams = examsRes.exams || [];
    publicMarks = marksRes.marks || [];
    
    // Sort exams chronologically
    publicExams.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    // Populate select
    let html = `<option value="">Select your name...</option>`;
    publicStudents.forEach(s => {
      html += `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`;
    });
    selectEl.innerHTML = html;
    
    selectEl.addEventListener("change", renderStudentReportContent);
  } catch (err) {
    console.error("Error loading student report data:", err);
    selectEl.innerHTML = `<option value="">Error loading data.</option>`;
  }
}

function renderStudentReportContent() {
  const selectEl = document.getElementById("student-report-select");
  const container = document.getElementById("student-report-content");
  
  if (!selectEl || !container) return;
  
  const studentId = selectEl.value;
  if (!studentId) {
    container.style.display = "none";
    return;
  }
  
  container.style.display = "block";
  
  const studentMarks = publicMarks.filter(m => m.student_id === studentId);
  
  let html = `<div class="submit-card" style="padding: 0; overflow: hidden;"><table style="width: 100%; border-collapse: collapse; text-align: left; background: var(--surface);">
    <thead>
      <tr style="border-bottom: 2px solid var(--border);">
        <th style="padding: 1rem; color: var(--text-muted); font-weight: 600;">Exam</th>
        <th style="padding: 1rem; color: var(--text-muted); font-weight: 600;">Marks</th>
        <th style="padding: 1rem; color: var(--text-muted); font-weight: 600;">Percentage</th>
        <th style="padding: 1rem; color: var(--text-muted); font-weight: 600;">Change</th>
      </tr>
    </thead>
    <tbody>`;

  let prevPercentage = null;
  let hasExams = false;

  publicExams.forEach(ex => {
    const markObj = studentMarks.find(m => m.exam_id === ex.id);
    if (markObj) {
      hasExams = true;
      const marksObtained = markObj.marks_obtained;
      const maxMarks = ex.total_marks;
      const perc = (marksObtained / maxMarks) * 100;
      
      let changeText = "�";
      let changeColor = "var(--text-muted)";
      if (prevPercentage !== null) {
        const diff = perc - prevPercentage;
        if (diff > 0) {
          changeText = "+" + diff.toFixed(1) + "%";
          changeColor = "#059669"; // green
        } else if (diff < 0) {
          changeText = diff.toFixed(1) + "%";
          changeColor = "#dc2626"; // red
        } else {
          changeText = "0%";
        }
      }
      prevPercentage = perc;

      html += `<tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 1rem;">${escapeHtml(ex.name)}</td>
        <td style="padding: 1rem; font-weight: 500;">${marksObtained}/${maxMarks}</td>
        <td style="padding: 1rem; color: var(--primary); font-weight: 600;">${perc.toFixed(1)}%</td>
        <td style="padding: 1rem; color: ${changeColor}; font-weight: 500;">${changeText}</td>
      </tr>`;
    }
  });

  if (!hasExams) {
    html += `<tr><td colspan="4" style="padding: 1rem; text-align: center; color: var(--text-muted);">No exam records found.</td></tr>`;
  }

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStudentReport);
} else {
  initStudentReport();
}

// Map Work New Badge Logic
document.addEventListener("DOMContentLoaded", () => {
  const mapBadge = document.getElementById("map-work-new-badge");
  const mapLink = document.getElementById("map-work-link");
  if (mapBadge && mapLink) {
    if (!localStorage.getItem("padhrahi_clicked_map_work")) {
      mapBadge.style.display = "inline-block";
    }
    mapLink.addEventListener("click", () => {
      localStorage.setItem("padhrahi_clicked_map_work", "true");
      mapBadge.style.display = "none";
    });
  }
});












