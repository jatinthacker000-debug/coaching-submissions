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

    // Show Grade 10 (X) notes, worksheets, other materials, and notifications on the dashboard
    const gradeXNotes = (notes || []).filter(note => note.grade === "X" || note.grade === "X-Worksheet" || note.grade === "X-Other" || note.grade === "NOTIFICATION");

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
