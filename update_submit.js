const fs = require('fs');

let content = fs.readFileSync('submit.js', 'utf8');

// Remove early return if no notesXContainer
content = content.replace('if (!notesXContainer) return;', '');

// Refactor renderNotesToDOM
const oldRenderFn = `  function renderNotesToDOM(notesList) {
    const notesXHistory = document.getElementById("notes-x-history");`;

const newRenderFn = `  function renderNotesToDOM(notesList) {
    // --- GRADE 10 LOGIC ---
    const notesXContainer = document.getElementById("notes-x-container");
    if (notesXContainer) {
      const noNotesX = document.getElementById("no-notes-x");
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
        History: { card: document.getElementById("group-x-history"), notesList: notesXHistory, notesSection: document.getElementById("section-x-history-notes"), worksheetsList: worksheetsXHistory, worksheetsSection: document.getElementById("section-x-history-worksheets"), otherList: otherXHistory, otherSection: document.getElementById("section-x-history-other") },
        Geography: { card: document.getElementById("group-x-geography"), notesList: notesXGeography, notesSection: document.getElementById("section-x-geography-notes"), worksheetsList: worksheetsXGeography, worksheetsSection: document.getElementById("section-x-geography-worksheets"), otherList: otherXGeography, otherSection: document.getElementById("section-x-geography-other") },
        Civics: { card: document.getElementById("group-x-civics"), notesList: notesXCivics, notesSection: document.getElementById("section-x-civics-notes"), worksheetsList: worksheetsXCivics, worksheetsSection: document.getElementById("section-x-civics-worksheets") },
        Economics: { card: document.getElementById("group-x-economics"), notesList: notesXEconomics, notesSection: document.getElementById("section-x-economics-notes"), worksheetsList: worksheetsXEconomics, worksheetsSection: document.getElementById("section-x-economics-worksheets") },
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
          if (subj === "Macro Economics" || subj === "Indian Economics Development") subj = "Economics";
          const target = groups[subj];
          if (target) {
            const li = document.createElement("li");
            const parsed = parseResourceTitle(resource.title);
            const chapterBadge = parsed.chapter ? \`<span class="note-chapter-tag">Ch \${escapeHtml(parsed.chapter)}</span> \` : "";
            if (resource.grade === "X-Other") {
              if (target.otherList) {
                li.innerHTML = \`<a href="\${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📚📁 \${chapterBadge}\${escapeHtml(parsed.cleanTitle)}</a>\`;
                target.otherList.appendChild(li);
                if (target.otherSection) target.otherSection.style.display = "block";
              }
            } else if (resource.grade === "X-Worksheet") {
              li.innerHTML = \`<a href="\${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📚📝 \${chapterBadge}\${escapeHtml(parsed.cleanTitle)}</a>\`;
              target.worksheetsList.appendChild(li);
              if (target.worksheetsSection) target.worksheetsSection.style.display = "block";
            } else {
              let prefix = "";
              if (resource.subject === "Macro Economics") prefix = \`<span class="note-sub-tag">Macro</span> \`;
              if (resource.subject === "Indian Economics Development") prefix = \`<span class="note-sub-tag">IED</span> \`;
              li.innerHTML = \`<a href="\${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📚📝 \${prefix}\${chapterBadge}\${escapeHtml(parsed.cleanTitle)}</a>\`;
              target.notesList.appendChild(li);
              if (target.notesSection) target.notesSection.style.display = "block";
            }
            if (target.card) target.card.style.display = "flex";
            renderedCount++;
          }
        });
        if (renderedCount === 0 && noNotesX) noNotesX.style.display = "block";
      }
      
      // Accordion for grade 10
      document.querySelectorAll('#notes-x-container .subject-card').forEach(card => {
        const header = card.querySelector('.card-header');
        if (header && !header.hasAttribute('data-accordion-init')) {
          header.setAttribute('data-accordion-init', 'true');
          header.style.cursor = 'pointer';
          header.innerHTML += \`<span class="accordion-icon" style="margin-left: auto; transition: transform 0.2s;">▼</span>\`;
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
      
      const cbseGrid = document.getElementById("cbse-dynamic-container");
      if (cbseGrid) {
        const cbseResources = (notesList || []).filter(n => n.grade === "CBSE");
        cbseResources.sort((a, b) => a.title.localeCompare(b.title));
        if (cbseResources.length === 0) {
          cbseGrid.innerHTML = \`<p class="muted-text text-center">No CBSE resources added yet.</p>\`;
        } else {
          cbseGrid.innerHTML = "";
          const subjectsGrid = document.createElement("div");
          subjectsGrid.className = "notes-grid-subjects";
          const subjectCard = document.createElement("div");
          subjectCard.className = "subject-card";
          const docIcon = \`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>\`;
          subjectCard.innerHTML = \`
            <div class="card-header" style="cursor: pointer; display: flex; align-items: center;">
              <span class="subject-icon">📚</span>
              <h4>General Resources</h4>
              <span class="accordion-icon" style="margin-left: auto; transition: transform 0.2s;">▼</span>
            </div>
            <div class="notes-section collapsed">
              <ul class="notes-list">
                \${cbseResources.map(res => \`
                  <li>
                    <a href="\${escapeHtml(res.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📚\${docIcon} <span>\${escapeHtml(res.title)}</span></a>
                  </li>
                \`).join('')}
              </ul>
            </div>
          \`;
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
    }

    // --- GRADE 12 LOGIC ---
    const notesXIIContainer = document.getElementById("notes-xii-container");
    if (notesXIIContainer) {
      const noNotesXII = document.getElementById("no-notes-xii");
      
      const notesXIIAcc = document.getElementById("notes-xii-accountancy");
      const notesXIIBus = document.getElementById("notes-xii-business");
      const notesXIIEco = document.getElementById("notes-xii-economics");
      const worksheetsXIIAcc = document.getElementById("worksheets-xii-accountancy");
      const worksheetsXIIBus = document.getElementById("worksheets-xii-business");
      const worksheetsXIIEco = document.getElementById("worksheets-xii-economics");
      const otherXIIAcc = document.getElementById("other-xii-accountancy");
      const otherXIIBus = document.getElementById("other-xii-business");
      const otherXIIEco = document.getElementById("other-xii-economics");

      if(notesXIIAcc) notesXIIAcc.innerHTML = "";
      if(notesXIIBus) notesXIIBus.innerHTML = "";
      if(notesXIIEco) notesXIIEco.innerHTML = "";
      if(worksheetsXIIAcc) worksheetsXIIAcc.innerHTML = "";
      if(worksheetsXIIBus) worksheetsXIIBus.innerHTML = "";
      if(worksheetsXIIEco) worksheetsXIIEco.innerHTML = "";
      if(otherXIIAcc) otherXIIAcc.innerHTML = "";
      if(otherXIIBus) otherXIIBus.innerHTML = "";
      if(otherXIIEco) otherXIIEco.innerHTML = "";

      const groups = {
        Accountancy: { card: document.getElementById("group-xii-accountancy"), notesList: notesXIIAcc, notesSection: document.getElementById("section-xii-accountancy-notes"), worksheetsList: worksheetsXIIAcc, worksheetsSection: document.getElementById("section-xii-accountancy-worksheets"), otherList: otherXIIAcc, otherSection: document.getElementById("section-xii-accountancy-other") },
        "Business Studies": { card: document.getElementById("group-xii-business"), notesList: notesXIIBus, notesSection: document.getElementById("section-xii-business-notes"), worksheetsList: worksheetsXIIBus, worksheetsSection: document.getElementById("section-xii-business-worksheets"), otherList: otherXIIBus, otherSection: document.getElementById("section-xii-business-other") },
        Economics: { card: document.getElementById("group-xii-economics"), notesList: notesXIIEco, notesSection: document.getElementById("section-xii-economics-notes"), worksheetsList: worksheetsXIIEco, worksheetsSection: document.getElementById("section-xii-economics-worksheets"), otherList: otherXIIEco, otherSection: document.getElementById("section-xii-economics-other") },
      };

      Object.values(groups).forEach(g => {
        if (g.card) g.card.style.display = "none";
        if (g.notesSection) g.notesSection.style.display = "none";
        if (g.worksheetsSection) g.worksheetsSection.style.display = "none";
        if (g.otherSection) g.otherSection.style.display = "none";
      });

      const gradeXIIResources = (notesList || []).filter((n) => n.grade === "XII" || n.grade === "XII-Worksheet" || n.grade === "XII-Other");
      gradeXIIResources.sort((a, b) => {
        const sortA = getChapterSortValue(a);
        const sortB = getChapterSortValue(b);
        if (sortA !== sortB) return sortA - sortB;
        const titleA = parseResourceTitle(a.title).cleanTitle;
        const titleB = parseResourceTitle(b.title).cleanTitle;
        return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
      });

      if (!gradeXIIResources.length) {
        if (noNotesXII) noNotesXII.style.display = "block";
      } else {
        if (noNotesXII) noNotesXII.style.display = "none";
        let renderedCount = 0;
        gradeXIIResources.forEach((resource) => {
          const target = groups[resource.subject];
          if (target) {
            const li = document.createElement("li");
            const parsed = parseResourceTitle(resource.title);
            const chapterBadge = parsed.chapter ? \`<span class="note-chapter-tag">Ch \${escapeHtml(parsed.chapter)}</span> \` : "";
            if (resource.grade === "XII-Other") {
              if (target.otherList) {
                li.innerHTML = \`<a href="\${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📚📁 \${chapterBadge}\${escapeHtml(parsed.cleanTitle)}</a>\`;
                target.otherList.appendChild(li);
                if (target.otherSection) target.otherSection.style.display = "block";
              }
            } else if (resource.grade === "XII-Worksheet") {
              li.innerHTML = \`<a href="\${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📚📝 \${chapterBadge}\${escapeHtml(parsed.cleanTitle)}</a>\`;
              target.worksheetsList.appendChild(li);
              if (target.worksheetsSection) target.worksheetsSection.style.display = "block";
            } else {
              li.innerHTML = \`<a href="\${escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer" class="note-link">📚📝 \${chapterBadge}\${escapeHtml(parsed.cleanTitle)}</a>\`;
              target.notesList.appendChild(li);
              if (target.notesSection) target.notesSection.style.display = "block";
            }
            if (target.card) target.card.style.display = "flex";
            renderedCount++;
          }
        });
        if (renderedCount === 0 && noNotesXII) noNotesXII.style.display = "block";
      }
      
      // Accordion for grade 12
      document.querySelectorAll('#notes-xii-container .subject-card').forEach(card => {
        const header = card.querySelector('.card-header');
        if (header && !header.hasAttribute('data-accordion-init')) {
          header.setAttribute('data-accordion-init', 'true');
          header.style.cursor = 'pointer';
          header.innerHTML += \`<span class="accordion-icon" style="margin-left: auto; transition: transform 0.2s;">▼</span>\`;
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
    }

    const searchInput = document.getElementById("search-input");
    if (searchInput && searchInput.value) {
      searchInput.dispatchEvent(new Event("input"));
    }
  } // --- END RENDER ---
`;

// Extract from oldRenderFn up to searchInput logic
const startIndex = content.indexOf('  function renderNotesToDOM(notesList) {');
const endIndex = content.indexOf('    const searchInput = document.getElementById("search-input");');

if(startIndex > -1 && endIndex > -1) {
  content = content.substring(0, startIndex) + newRenderFn + "\n" + content.substring(endIndex + 172);
}

fs.writeFileSync('submit.js', content, 'utf8');
console.log("Updated submit.js");
