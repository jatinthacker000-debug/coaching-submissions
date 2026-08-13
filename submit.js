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

    notesXHistory.innerHTML = "";
    notesXGeography.innerHTML = "";
    notesXCivics.innerHTML = "";
    notesXEconomics.innerHTML = "";

    worksheetsXHistory.innerHTML = "";
    worksheetsXGeography.innerHTML = "";
    worksheetsXCivics.innerHTML = "";
    worksheetsXEconomics.innerHTML = "";

    const groups = {
      History: { 
        card: document.getElementById("group-x-history"),
        notesList: notesXHistory,
        notesSection: document.getElementById("section-x-history-notes"),
        worksheetsList: worksheetsXHistory,
        worksheetsSection: document.getElementById("section-x-history-worksheets")
      },
      Geography: { 
        card: document.getElementById("group-x-geography"),
        notesList: notesXGeography,
        notesSection: document.getElementById("section-x-geography-notes"),
        worksheetsList: worksheetsXGeography,
        worksheetsSection: document.getElementById("section-x-geography-worksheets")
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
    });

    const gradeXResources = (notesList || []).filter((n) => n.grade === "X" || n.grade === "X-Worksheet");

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
          
          if (resource.grade === "X-Worksheet") {
            li.innerHTML = `<a href="${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📝 ${chapterBadge}${escapeHtml(parsed.cleanTitle)}</a>`;
            target.worksheetsList.appendChild(li);
            if (target.worksheetsSection) target.worksheetsSection.style.display = "block";
          } else {
            let prefix = "";
            if (resource.subject === "Macro Economics") prefix = `<span class="note-sub-tag">Macro</span> `;
            if (resource.subject === "Indian Economics Development") prefix = `<span class="note-sub-tag">IED</span> `;

            li.innerHTML = `<a href="${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📄 ${prefix}${chapterBadge}${escapeHtml(parsed.cleanTitle)}</a>`;
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
        renderNotesToDOM(JSON.parse(cachedNotesStr));
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
    }
  } catch (err) {
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
    }
    if (noNotesX && !localStorage.getItem("padhrahi_notes_cache")) {
      noNotesX.textContent = "Failed to load resources.";
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
      
      let hasVisibleInSection = false;
      const listItems = section.querySelectorAll("li");
      
      listItems.forEach(li => {
        const text = li.textContent.toLowerCase();
        const matchesSearch = text.includes(term);
        
        let matchesType = true;
        if (filterValue === "notes" && !isNotes) matchesType = false;
        if (filterValue === "worksheets" && !isWorksheets) matchesType = false;
        
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
      noNotesX.textContent = "No matching chapters found.";
    } else {
      noNotesX.style.display = "none";
    }
  }
}

if (searchInput) {
  searchInput.addEventListener("input", filterResources);
}
if (typeFilter) {
  typeFilter.addEventListener("change", filterResources);
}
