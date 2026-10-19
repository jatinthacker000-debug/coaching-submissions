document.addEventListener("DOMContentLoaded", () => {
  // Calendar state store per container { year, month }
  const now = new Date();
  const calendarStates = {};
  const linksCache = {};

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const escapeHtml = (str) => {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const getHomeworkData = async (groupName) => {
    if (linksCache[groupName]) return linksCache[groupName];
    let linksMap = {};
    let eventsMap = {};
    try {
      const res = await fetch(`/api/homework?group_name=${encodeURIComponent(groupName)}`);
      const data = await res.json();
      if (data.links) {
        data.links.forEach(l => {
          linksMap[l.homework_date] = l.link;
        });
      }
      if (data.events) {
        data.events.forEach(e => {
          eventsMap[e.event_date] = {
            id: e.id,
            title: e.title,
            color: e.color || 'blue'
          };
        });
      }
    } catch (e) {
      console.error("Failed to load homework & events for " + groupName, e);
    }
    const result = { linksMap, eventsMap };
    linksCache[groupName] = result;
    return result;
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
    const { linksMap, eventsMap } = await getHomeworkData(groupName);

    const eventColorStyles = {
      blue:   { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
      purple: { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' },
      green:  { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
      amber:  { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
      rose:   { bg: '#ffe4e6', color: '#be123c', border: '#fecdd3' }
    };

    const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let html = `<div style="width: 100%; max-width: 460px; margin: 0 auto; padding-bottom: 1rem;">`;

    // Month Navigation Header
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; width: 100%; gap: 0.5rem;">
        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text); white-space: nowrap;">${monthNames[month]} ${year}</h3>
        <div style="display: flex; gap: 0.4rem; align-items: center;">
          <button class="cal-prev-btn btn" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; background: var(--surface-card); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">‹ Prev</button>
          <button class="cal-next-btn btn" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; background: var(--surface-card); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">Next ›</button>
        </div>
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
      html += `
        <div style="min-height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.35rem 0.2rem; color: #9ca3af; background: var(--surface-card); opacity: 0.45; border-radius: 6px; font-size: 0.9rem; border: 1px dashed var(--border);">
          <span>${prevDays++}</span>
          <span style="font-size: 0.75rem; line-height: 1; margin-top: 2px; visibility: hidden;">&nbsp;</span>
        </div>`;
    }

    // Days in current month
    let readHomeworks = {};
    try { readHomeworks = JSON.parse(localStorage.getItem('readHomeworks') || '{}'); } catch(e){}

    for (let day = 1; day <= daysInMonth; day++) {
      const isSunday = (firstDayIndex + day - 1) % 7 === 0;
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const hasHomework = Boolean(linksMap[dateStr]);
      const event = eventsMap[dateStr];
      const hasEvent = Boolean(event);
      const isRead = readHomeworks[`${groupName}-${dateStr}`];

      let cellStyle = "";
      let innerContent = "";

      const ec = hasEvent ? (eventColorStyles[event.color] || eventColorStyles.blue) : null;
      const basePillStyle = `display: block; width: 100%; max-width: 95%; margin-top: 2px; padding: 1px 3px; font-size: 0.62rem; font-weight: 700; line-height: 1.15; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-sizing: border-box; text-align: center;`;

      if (hasHomework) {
        // High-contrast vibrant emerald green highlight with white text, shadow
        cellStyle = "min-height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.35rem 0.2rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; border-radius: 6px; cursor: pointer; font-weight: 700; box-shadow: 0 3px 8px rgba(16, 185, 129, 0.35); border: 1px solid #047857; position: relative; transition: transform 0.15s ease, box-shadow 0.15s ease;";
        const hwEventPill = hasEvent ? `<span class="cal-event-pill" title="${escapeHtml(event.title)}" style="${basePillStyle} background: rgba(255, 255, 255, 0.95); color: #047857; border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 1px 2px rgba(0,0,0,0.1);">${escapeHtml(event.title)}</span>` : '';

        innerContent = `
          ${!isRead ? `<span class="cal-hw-unread-dot" title="New Homework" style="position: absolute; top: 4px; right: 4px; width: 7px; height: 7px; background: #fbbf24; border-radius: 50%; box-shadow: 0 0 0 2px rgba(255,255,255,0.9);"></span>` : ''}
          <div style="display: flex; align-items: center; gap: 3px; line-height: 1.1;">
            <span style="font-size: 0.95rem;">${day}</span>
            <span style="font-size: 0.72rem;" title="Homework Uploaded">📝</span>
          </div>
          ${hasEvent ? hwEventPill : '<span style="font-size: 0.75rem; line-height: 1; margin-top: 2px; visibility: hidden;">&nbsp;</span>'}
        `;
      } else if (hasEvent) {
        // Event day with pastel pill and subtle border
        const eventPill = `<span class="cal-event-pill" title="${escapeHtml(event.title)}" style="${basePillStyle} background: ${ec.bg}; color: ${ec.color}; border: 1px solid ${ec.border};">${escapeHtml(event.title)}</span>`;
        const bg = isSunday ? '#fef3c7' : 'var(--surface-card)';
        cellStyle = `min-height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.35rem 0.2rem; background: ${bg}; color: var(--text); border: 1.5px solid ${ec.border}; border-radius: 6px; cursor: pointer; font-weight: 600; position: relative; transition: transform 0.15s ease, background 0.15s ease;`;
        innerContent = `
          <span style="font-size: 0.95rem; line-height: 1.1;">${day}</span>
          ${eventPill}
        `;
      } else if (isSunday) {
        cellStyle = "min-height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.35rem 0.2rem; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; border-radius: 6px; cursor: pointer; font-weight: 600; position: relative; transition: transform 0.15s ease;";
        innerContent = `
          <span style="font-size: 0.95rem; line-height: 1.1;">${day}</span>
          <span style="font-size: 0.75rem; line-height: 1; margin-top: 2px; visibility: hidden;">&nbsp;</span>
        `;
      } else {
        cellStyle = "min-height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.35rem 0.2rem; background: var(--surface-card); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-weight: 600; position: relative; transition: transform 0.15s ease, background 0.15s ease;";
        innerContent = `
          <span style="font-size: 0.95rem; line-height: 1.1;">${day}</span>
          <span style="font-size: 0.75rem; line-height: 1; margin-top: 2px; visibility: hidden;">&nbsp;</span>
        `;
      }

      html += `<div class="cal-day ${hasHomework ? 'cal-day-has-hw' : ''} ${hasEvent ? 'cal-day-has-event' : ''}" data-date="${dateStr}" data-group="${groupName}" data-link="${hasHomework ? linksMap[dateStr] : ''}" data-event-title="${hasEvent ? escapeHtml(event.title) : ''}" data-event-color="${hasEvent ? escapeHtml(event.color) : ''}" style="${cellStyle}">${innerContent}</div>`;
    }

    // Remaining days to fill grid
    const totalCells = firstDayIndex + daysInMonth;
    const remaining = Math.ceil(totalCells / 7) * 7 - totalCells;
    for (let i = 1; i <= remaining; i++) {
      html += `
        <div style="min-height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.35rem 0.2rem; color: #9ca3af; background: var(--surface-card); opacity: 0.45; border-radius: 6px; font-size: 0.9rem; border: 1px dashed var(--border);">
          <span>${i}</span>
          <span style="font-size: 0.75rem; line-height: 1; margin-top: 2px; visibility: hidden;">&nbsp;</span>
        </div>`;
    }

    html += `</div>`; // Close grid

    // Clean Legend
    html += `
      <div style="display: flex; gap: 1.25rem; justify-content: center; align-items: center; margin-top: 1.25rem; font-size: 0.85rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 22px; height: 22px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35); color: white;">📝</div>
          <span style="font-weight: 600; color: var(--text);">Homework Uploaded</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="min-width: 22px; height: 22px; padding: 0 6px; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; color: #0369a1;">Test</div>
          <span style="font-weight: 600; color: var(--text);">Scheduled Test / Event</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 22px; height: 22px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px;"></div>
          <span style="font-weight: 500; color: var(--text-muted);">Sunday</span>
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
        const eventTitle = dayEl.getAttribute("data-event-title");
        const modal = document.getElementById("calendar-modal");
        const modalDate = document.getElementById("calendar-modal-date");
        const modalText = document.getElementById("calendar-modal-text");
        const modalLink = document.getElementById("calendar-modal-link");

        if (!modal) return;

        modalDate.textContent = `${group} - ${date}`;

        let modalHtml = "";
        if (eventTitle) {
          modalHtml += `
            <div style="margin-bottom: 1rem; padding: 0.6rem 0.85rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; text-align: left; display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-size: 1.25rem;">📌</span>
              <div>
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Scheduled Test / Event</div>
                <div style="font-size: 1rem; font-weight: 700; color: var(--text); margin-top: 2px;">${escapeHtml(eventTitle)}</div>
              </div>
            </div>
          `;
        }

        if (link) {
          modalHtml += `<div style="font-size: 0.95rem; margin-bottom: 0.5rem; color: var(--text);">Click below to open your homework.</div>`;
          modalLink.href = link;
          modalLink.style.display = "inline-block";
          modalLink.onclick = () => {
            let hw = {};
            try { hw = JSON.parse(localStorage.getItem("readHomeworks") || "{}"); } catch(e){}
            hw[group + "-" + date] = true;
            localStorage.setItem("readHomeworks", JSON.stringify(hw));
            const badge = dayEl.querySelector(".cal-hw-unread-dot");
            if (badge) badge.remove();
          };
        } else {
          if (!eventTitle) {
            modalHtml += `<div style="font-size: 0.92rem; color: var(--text-muted);">No homework link or test has been set for this date yet. Check back later!</div>`;
          } else {
            modalHtml += `<div style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.25rem;">No separate homework link uploaded for this date.</div>`;
          }
          modalLink.style.display = "none";
        }

        modalText.innerHTML = modalHtml;
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
