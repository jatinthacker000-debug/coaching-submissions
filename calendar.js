document.addEventListener("DOMContentLoaded", () => {
  // Calendar state store per container { year, month }
  const now = new Date();
  const calendarStates = {};
  const linksCache = {};

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getHomeworkLinks = async (groupName) => {
    if (linksCache[groupName]) return linksCache[groupName];
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
      console.error("Failed to load homework links for " + groupName, e);
    }
    linksCache[groupName] = linksMap;
    return linksMap;
  };

  // Generic Tab Handler
  const setupTabs = (tabConfig) => {
    tabConfig.forEach(({ tabId, sectionId, containerId, groupName }) => {
      const tabEl = document.getElementById(tabId);
      if (!tabEl) return;
      tabEl.addEventListener("click", () => {
        tabConfig.forEach(item => {
          const t = document.getElementById(item.tabId);
          const s = document.getElementById(item.sectionId);
          if (!t || !s) return;
          if (item.tabId === tabId) {
            t.className = "btn btn-primary";
            t.style.background = "";
            t.style.color = "";
            s.style.display = "block";
            renderCalendar(item.containerId, item.groupName);
          } else {
            t.className = "btn";
            t.style.background = "var(--surface-card)";
            t.style.color = "var(--text)";
            s.style.display = "none";
          }
        });
      });
    });
  };

  // Dynamic Calendar rendering
  const renderCalendar = async (containerId, groupName) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!calendarStates[containerId]) {
      calendarStates[containerId] = {
        year: now.getFullYear(),
        month: now.getMonth()
      };
    }

    const { year, month } = calendarStates[containerId];
    const linksMap = await getHomeworkLinks(groupName);

    const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let html = `<div style="width: 100%; max-width: 460px; margin: 0 auto; padding-bottom: 1rem;">`;

    // Month Navigation Header
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; width: 100%;">
        <button class="cal-prev-btn btn" style="padding: 0.35rem 0.85rem; font-size: 0.85rem; background: var(--surface-card); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">‹ Prev</button>
        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text);">${monthNames[month]} ${year}</h3>
        <button class="cal-next-btn btn" style="padding: 0.35rem 0.85rem; font-size: 0.85rem; background: var(--surface-card); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">Next ›</button>
      </div>
    `;

    // Calendar Grid
    html += `<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center;">`;

    // Days of week header
    daysOfWeek.forEach(d => {
      html += `<div style="background: #2b70a0; color: white; padding: 0.5rem; font-weight: bold; border-radius: 4px; font-size: 0.85rem;">${d}</div>`;
    });

    // Blanks from previous month
    let prevDays = daysInPrevMonth - firstDayIndex + 1;
    for (let i = 0; i < firstDayIndex; i++) {
      html += `<div style="padding: 0.85rem 0.5rem; color: #9ca3af; background: var(--surface-card); opacity: 0.5; border-radius: 4px; font-size: 0.9rem;">${prevDays++}</div>`;
    }

    // Days in current month
    let readHomeworks = {};
    try { readHomeworks = JSON.parse(localStorage.getItem('readHomeworks') || '{}'); } catch(e){}

    for (let day = 1; day <= daysInMonth; day++) {
      const isSunday = (firstDayIndex + day - 1) % 7 === 0;
      let bgColor = isSunday ? "#fef3c7" : "var(--surface-card)";
      let color = isSunday ? "#92400e" : "var(--text)";

      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const hasHomework = Boolean(linksMap[dateStr]);
      const cursor = hasHomework ? "pointer" : "default";

      const isRead = readHomeworks[`${groupName}-${dateStr}`];
      const highlightStyle = (hasHomework && !isRead) ? "box-shadow: inset 0 0 0 3px #3b82f6;" : "";

      html += `<div class="cal-day" data-date="${dateStr}" data-group="${groupName}" data-link="${hasHomework ? linksMap[dateStr] : ''}" style="padding: 0.85rem 0.5rem; background: ${bgColor}; color: ${color}; border-radius: 4px; cursor: ${cursor}; font-weight: bold; transition: transform 0.1s; ${highlightStyle}">${day}</div>`;
    }

    // Remaining days to fill grid
    const totalCells = firstDayIndex + daysInMonth;
    const remaining = Math.ceil(totalCells / 7) * 7 - totalCells;
    for (let i = 1; i <= remaining; i++) {
      html += `<div style="padding: 0.85rem 0.5rem; color: #9ca3af; background: var(--surface-card); opacity: 0.5; border-radius: 4px; font-size: 0.9rem;">${i}</div>`;
    }

    html += `</div>`; // Close grid

    // Clean Legend (Holidays removed)
    html += `
      <div style="display: flex; gap: 1.5rem; justify-content: center; align-items: center; margin-top: 1.25rem; font-size: 0.85rem; color: var(--text-muted);">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 16px; height: 16px; box-shadow: inset 0 0 0 3px #3b82f6; border-radius: 4px; background: var(--surface-card);"></div>
          <span>Homework Uploaded</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 16px; height: 16px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 4px;"></div>
          <span>Sunday</span>
        </div>
      </div>
    `;

    html += `</div>`; // Close outer container
    container.innerHTML = html;

    // Attach navigation listeners
    const prevBtn = container.querySelector(".cal-prev-btn");
    const nextBtn = container.querySelector(".cal-next-btn");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        let { year, month } = calendarStates[containerId];
        month--;
        if (month < 0) {
          month = 11;
          year--;
        }
        calendarStates[containerId] = { year, month };
        renderCalendar(containerId, groupName);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        let { year, month } = calendarStates[containerId];
        month++;
        if (month > 11) {
          month = 0;
          year++;
        }
        calendarStates[containerId] = { year, month };
        renderCalendar(containerId, groupName);
      });
    }

    // Attach click listeners to calendar days
    const days = container.querySelectorAll(".cal-day");
    days.forEach(dayEl => {
      dayEl.addEventListener("click", () => {
        const link = dayEl.getAttribute("data-link");
        const date = dayEl.getAttribute("data-date");
        const group = dayEl.getAttribute("data-group");
        const modal = document.getElementById("calendar-modal");
        const modalDate = document.getElementById("calendar-modal-date");
        const modalText = document.getElementById("calendar-modal-text");
        const modalLink = document.getElementById("calendar-modal-link");

        if (!modal) return;

        modalDate.textContent = `Homework for ${date}`;

        if (link) {
          modalText.textContent = "Click below to open your homework.";
          modalLink.href = link;
          modalLink.style.display = "inline-block";
          modalLink.onclick = () => {
            let hw = {};
            try { hw = JSON.parse(localStorage.getItem("readHomeworks") || "{}"); } catch(e){}
            hw[group + "-" + date] = true;
            localStorage.setItem("readHomeworks", JSON.stringify(hw));
            dayEl.style.boxShadow = "";
          };
        } else {
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
      const modal = document.getElementById("calendar-modal");
      if (modal) modal.classList.add("hidden");
    });
  }

  // Close modal when clicking outside modal content
  const modal = document.getElementById("calendar-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  }

  // Initialize Grade 12 Calendars if present
  const g12Tabs = [
    { tabId: "tab-osem", sectionId: "section-osem", containerId: "calendar-osem", groupName: "Osem" },
    { tabId: "tab-nalanda", sectionId: "section-nalanda", containerId: "calendar-nalanda", groupName: "Nalanda" }
  ];
  if (document.getElementById("tab-osem")) {
    setupTabs(g12Tabs);
    renderCalendar("calendar-osem", "Osem");
  }

  // Initialize Grade 10 Calendars if present
  const g10Tabs = [
    { tabId: "tab-ignite", sectionId: "section-ignite", containerId: "calendar-ignite", groupName: "Ignite" },
    { tabId: "tab-velocity", sectionId: "section-velocity", containerId: "calendar-velocity", groupName: "Velocity" },
    { tabId: "tab-epsilon", sectionId: "section-epsilon", containerId: "calendar-epsilon", groupName: "Epsilon" }
  ];
  if (document.getElementById("tab-ignite")) {
    setupTabs(g10Tabs);
    renderCalendar("calendar-ignite", "Ignite");
  }
});
