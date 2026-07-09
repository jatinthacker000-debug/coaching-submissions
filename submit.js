const offlineNotice = document.getElementById("offline-notice");

function isOfflineFileMode() {
  return window.location.protocol === "file:";
}

async function loadPDFNotes() {
  const notesXContainer = document.getElementById("notes-x-container");
  const noNotesX = document.getElementById("no-notes-x");

  if (!notesXContainer) return;

  try {
    const { notes } = await fetchNotes();

    // Notes DOM lists
    const notesXHistory = document.getElementById("notes-x-history");
    const notesXGeography = document.getElementById("notes-x-geography");
    const notesXCivics = document.getElementById("notes-x-civics");
    const notesXEconomics = document.getElementById("notes-x-economics");

    // Worksheets DOM lists
    const worksheetsXHistory = document.getElementById("worksheets-x-history");
    const worksheetsXGeography = document.getElementById("worksheets-x-geography");
    const worksheetsXCivics = document.getElementById("worksheets-x-civics");
    const worksheetsXEconomics = document.getElementById("worksheets-x-economics");

    // Reset lists
    notesXHistory.innerHTML = "";
    notesXGeography.innerHTML = "";
    notesXCivics.innerHTML = "";
    notesXEconomics.innerHTML = "";

    worksheetsXHistory.innerHTML = "";
    worksheetsXGeography.innerHTML = "";
    worksheetsXCivics.innerHTML = "";
    worksheetsXEconomics.innerHTML = "";

    // Set up group references
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

    // Hide all cards and sections initially
    Object.values(groups).forEach(g => {
      if (g.card) g.card.style.display = "none";
      if (g.notesSection) g.notesSection.style.display = "none";
      if (g.worksheetsSection) g.worksheetsSection.style.display = "none";
    });

    // Filter resources for Grade 10 (Notes: X, Worksheets: X-Worksheet)
    const gradeXResources = (notes || []).filter((n) => n.grade === "X" || n.grade === "X-Worksheet");

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
          
          if (resource.grade === "X-Worksheet") {
            // It's a worksheet
            li.innerHTML = `<a href="${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📝 ${escapeHtml(resource.title)}</a>`;
            target.worksheetsList.appendChild(li);
            if (target.worksheetsSection) target.worksheetsSection.style.display = "block";
          } else {
            // It's a study note
            let prefix = "";
            if (resource.subject === "Macro Economics") prefix = `<span class="note-sub-tag">Macro</span> `;
            if (resource.subject === "Indian Economics Development") prefix = `<span class="note-sub-tag">IED</span> `;

            li.innerHTML = `<a href="${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📄 ${prefix}${escapeHtml(resource.title)}</a>`;
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
  } catch (err) {
    if (noNotesX) noNotesX.textContent = "Failed to load resources.";
  }
}

if (isOfflineFileMode() && offlineNotice) {
  offlineNotice.classList.remove("hidden");
}

loadPDFNotes();
