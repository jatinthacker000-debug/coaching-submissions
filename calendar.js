document.addEventListener("DOMContentLoaded", () => {
  const tabOsem = document.getElementById("tab-osem");
  const tabNalanda = document.getElementById("tab-nalanda");
  const sectionOsem = document.getElementById("section-osem");
  const sectionNalanda = document.getElementById("section-nalanda");

  if (tabOsem && tabNalanda) {
    tabOsem.addEventListener("click", () => {
      tabOsem.className = "btn btn-primary";
      tabOsem.style.background = "";
      tabOsem.style.color = "";
      
      tabNalanda.className = "btn";
      tabNalanda.style.background = "var(--surface-card)";
      tabNalanda.style.color = "var(--text)";
      
      sectionOsem.style.display = "block";
      sectionNalanda.style.display = "none";
    });

    tabNalanda.addEventListener("click", () => {
      tabNalanda.className = "btn btn-primary";
      tabNalanda.style.background = "";
      tabNalanda.style.color = "";
      
      tabOsem.className = "btn";
      tabOsem.style.background = "var(--surface-card)";
      tabOsem.style.color = "var(--text)";
      
      sectionNalanda.style.display = "block";
      sectionOsem.style.display = "none";
    });
  }

  // Calendar rendering for October 2026
  const renderCalendar = async (containerId, groupName) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Fetch links for the group
    let linksMap = {};
    try {
      const res = await fetch(`/api/homework-links?group_name=${encodeURIComponent(groupName)}`);
      const data = await res.json();
      if (data.links) {
        data.links.forEach(l => {
          linksMap[l.homework_date] = l.link;
        });
      }
    } catch (e) {
      console.error("Failed to load homework links", e);
    }

    const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    let html = `<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; max-width: 600px; margin: 0 auto; text-align: center;">`;
    
    // Headers
    daysOfWeek.forEach(d => {
      html += `<div style="background: #2b70a0; color: white; padding: 0.5rem; font-weight: bold; border-radius: 4px;">${d}</div>`;
    });

    // October 2026 starts on Thursday
    const blanks = 4;
    let prevDays = 30 - blanks + 1; // September has 30 days
    for (let i = 0; i < blanks; i++) {
      html += `<div style="padding: 1rem; color: #ccc; background: var(--surface-card); border-radius: 4px;">${prevDays++}</div>`;
    }

    // Days in Oct
    for (let day = 1; day <= 31; day++) {
      let bgColor = "var(--surface-card)";
      let color = "var(--text)";
      
      // Holidays
      if (day === 2 || day === 20) {
        bgColor = "#da291c"; // Red
        color = "white";
      } else if (day === 18 || day === 19 || day === 26 || day === 29) {
        bgColor = "#23883a"; // Green
        color = "white";
      }

      const dateStr = `2026-10-${day.toString().padStart(2, '0')}`;
      const hasHomework = linksMap[dateStr] ? true : false;
      const cursor = hasHomework ? "pointer" : "default";

      html += `<div class="cal-day" data-date="${dateStr}" data-group="${groupName}" data-link="${hasHomework ? linksMap[dateStr] : ''}" style="padding: 1rem; background: ${bgColor}; color: ${color}; border-radius: 4px; cursor: ${cursor}; font-weight: bold; transition: transform 0.1s;">${day}</div>`;
    }
    
    // Remaining days to fill grid
    const totalCells = blanks + 31;
    const remaining = Math.ceil(totalCells / 7) * 7 - totalCells;
    for (let i = 1; i <= remaining; i++) {
      html += `<div style="padding: 1rem; color: #ccc; background: var(--surface-card); border-radius: 4px;">${i}</div>`;
    }

    html += `</div>`;
    
    // Holiday Legend
    html += `
      <div style="max-width: 600px; margin: 2rem auto; background: var(--surface-card); padding: 1rem; border-radius: 8px;">
        <h4 style="background: #fcd116; color: black; padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem;">Holidays of the Month</h4>
        <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem;">
          <li style="display: flex; gap: 1rem; align-items: center;"><span style="background: #da291c; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">2</span> Mahatma Gandhi's Birthday (G)</li>
          <li style="display: flex; gap: 1rem; align-items: center;"><span style="background: #23883a; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">18</span> Dusshera (Saptami) (R)</li>
          <li style="display: flex; gap: 1rem; align-items: center;"><span style="background: #23883a; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">19</span> Dussehra (Mahashtami) (R)</li>
          <li style="display: flex; gap: 1rem; align-items: center;"><span style="background: #da291c; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">20</span> Dussehra (G) / (Mahanavmi) (R)</li>
          <li style="display: flex; gap: 1rem; align-items: center;"><span style="background: #23883a; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">26</span> Maharishi Valmiki's Birthday (R)</li>
          <li style="display: flex; gap: 1rem; align-items: center;"><span style="background: #23883a; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">29</span> Karaka Chaturthi (Karwa Chouth) (R)</li>
        </ul>
      </div>
    `;

    container.innerHTML = html;

    // Attach click listeners
    const days = container.querySelectorAll(".cal-day");
    days.forEach(dayEl => {
      dayEl.addEventListener("click", () => {
        const link = dayEl.getAttribute("data-link");
        const date = dayEl.getAttribute("data-date");
        const modal = document.getElementById("calendar-modal");
        const modalDate = document.getElementById("calendar-modal-date");
        const modalText = document.getElementById("calendar-modal-text");
        const modalLink = document.getElementById("calendar-modal-link");

        modalDate.textContent = `Homework for ${date}`;
        
        if (link) {
          modalText.textContent = "Click below to open your homework.";
          modalLink.href = link;
          modalLink.style.display = "inline-block";
        } else {
          // Placeholder message if no link is configured
          modalText.textContent = "No homework link has been set for this date yet. Check back later!";
          modalLink.style.display = "none";
        }
        
        modal.classList.remove("hidden");
      });
    });
  };

  const modalClose = document.getElementById("calendar-modal-close");
  if (modalClose) {
    modalClose.addEventListener("click", () => {
      document.getElementById("calendar-modal").classList.add("hidden");
    });
  }

  // Render both calendars
  renderCalendar("calendar-osem", "Osem");
  renderCalendar("calendar-nalanda", "Nalanda");
});
