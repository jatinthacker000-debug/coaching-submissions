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
      const res = await fetch(`/api/homework?group_name=${encodeURIComponent(groupName)}`);
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
    
    // Outer horizontally scrollable container for mobile
    let html = `<div style="width: 100%; padding-bottom: 1rem;">`;
    
    // Inner flex container (forced side-by-side)
    html += `<div style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 2rem; justify-content: center; align-items: flex-start; margin: 0 auto;">`;
    
    // 1. Calendar Grid (fixed minimum width so days don't get squished)
    html += `<div style="flex: 1 1 100%; max-width: 450px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center;">`;
    
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
      
      const isSunday = (blanks + day - 1) % 7 === 0;

      // Assign colors based on holidays and Sundays
      if (day === 2 || day === 20) {
        bgColor = "#fee2e2"; // Light Red
        color = "#991b1b"; // Dark Red
      } else if (day === 18 || day === 19 || day === 26 || day === 29) {
        bgColor = "#dcfce7"; // Light Green
        color = "#166534"; // Dark Green
      } else if (isSunday) {
        bgColor = "#fef3c7"; // Light Amber
        color = "#92400e"; // Dark Amber
      }

      const dateStr = `2026-10-${day.toString().padStart(2, '0')}`;
      const hasHomework = linksMap[dateStr] ? true : false;
      const cursor = hasHomework ? "pointer" : "default";

      // Homework highlight indicator (blue inner border)
      const highlightStyle = hasHomework ? "box-shadow: inset 0 0 0 3px #3b82f6;" : "";

      html += `<div class="cal-day" data-date="${dateStr}" data-group="${groupName}" data-link="${hasHomework ? linksMap[dateStr] : ''}" style="padding: 1rem; background: ${bgColor}; color: ${color}; border-radius: 4px; cursor: ${cursor}; font-weight: bold; transition: transform 0.1s; ${highlightStyle}">${day}</div>`;
    }
    
    // Remaining days to fill grid
    const totalCells = blanks + 31;
    const remaining = Math.ceil(totalCells / 7) * 7 - totalCells;
    for (let i = 1; i <= remaining; i++) {
      html += `<div style="padding: 1rem; color: #ccc; background: var(--surface-card); border-radius: 4px;">${i}</div>`;
    }

    html += `</div>`; // Close grid container
    
    // 2. Holiday Legend (fixed minimum width so text is readable)
    html += `
      <div style="flex: 1 1 100%; max-width: 350px; background: var(--surface-card); padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow); margin-top: 0;">
        <h4 style="background: #fcd116; color: black; padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem; text-align: center;">Holidays of the Month</h4>
        <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.75rem;">
          <li style="display: flex; gap: 1rem; align-items: center;"><span style="background: #fee2e2; color: #991b1b; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: bold;">2</span> Mahatma Gandhi's Birthday (G)</li>
          <li style="display: flex; gap: 1rem; align-items: center;"><span style="background: #dcfce7; color: #166534; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: bold;">18</span> Dusshera (Saptami) (R)</li>
          <li style="display: flex; gap: 1rem; align-items: center;"><span style="background: #dcfce7; color: #166534; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: bold;">19</span> Dussehra (Mahashtami) (R)</li>
          <li style="display: flex; gap: 1rem; align-items: center;"><span style="background: #fee2e2; color: #991b1b; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: bold;">20</span> Dussehra (G) / (Mahanavmi) (R)</li>
          <li style="display: flex; gap: 1rem; align-items: center;"><span style="background: #dcfce7; color: #166534; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: bold;">26</span> Maharishi Valmiki's Birthday (R)</li>
          <li style="display: flex; gap: 1rem; align-items: center;"><span style="background: #dcfce7; color: #166534; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: bold;">29</span> Karaka Chaturthi (Karwa Chouth) (R)</li>
        </ul>
        
        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; color: var(--text);">
                <div style="width: 20px; height: 20px; box-shadow: inset 0 0 0 3px #3b82f6; border-radius: 4px;"></div>
                <span>Homework Uploaded</span>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; color: var(--text); margin-top: 0.5rem;">
                <div style="width: 20px; height: 20px; background: #fef3c7; border-radius: 4px;"></div>
                <span>Sunday</span>
            </div>
        </div>
      </div>
    </div></div>
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
