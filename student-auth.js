document.addEventListener("DOMContentLoaded", () => {
  const currentGrade = document.body.dataset.grade || (window.location.pathname.includes("grade10") ? "10" : "12");
  const isGrade12 = currentGrade === "12";

  const isCoachLoggedIn = () => {
    return Boolean(sessionStorage.getItem("coach_password") || localStorage.getItem("coach_password"));
  };

  // COACH DASHBOARD BYPASS:
  // If coach is logged in, grant full unrestricted access to both Grade 10 and Grade 12 without credentials!
  if (isCoachLoggedIn()) {
    const mainContent = document.querySelector(".main-content");
    if (mainContent) mainContent.style.display = "block";

    const headerActions = document.querySelector(".header-right-actions");
    if (headerActions && !document.getElementById("coach-badge-btn")) {
      const coachBadge = document.createElement("a");
      coachBadge.id = "coach-badge-btn";
      coachBadge.href = "dashboard.html";
      coachBadge.innerHTML = "<span>👑</span> <span>Coach Mode (Dashboard ⚙️)</span>";
      coachBadge.style.cssText = "display: inline-flex; align-items: center; gap: 0.35rem; color: #059669; font-weight: 700; padding: 0.4rem 0.85rem; border: 1.5px solid #10b981; border-radius: 99px; background: rgba(16, 185, 129, 0.12); text-decoration: none; font-size: 0.88rem; transition: background 0.2s;";
      headerActions.prepend(coachBadge);
    }

    if (typeof initStudentReport === "function") {
      initStudentReport();
    }
    return; // Exit early: coach has full unrestricted access!
  }

  const isNerdTutorsGroup = (groupName) => {
    if (!groupName) return false;
    const g = String(groupName).trim();
    return g === "Nerd Tutors" || g === "Nerd Tutors Nalanda";
  };

  const isStudentLoggedIn = () => {
    return Boolean(localStorage.getItem("student_token"));
  };

  const setupLogout = () => {
    if (document.getElementById("student-logout-btn")) return;
    const headerActions = document.querySelector(".header-right-actions");
    if (headerActions) {
      const logoutBtn = document.createElement("button");
      logoutBtn.id = "student-logout-btn";
      logoutBtn.textContent = "Log Out";
      logoutBtn.style.cssText = "background: none; border: 1px solid var(--danger); border-radius: 99px; padding: 0.4rem 0.8rem; cursor: pointer; color: var(--danger); font-weight: 500; font-size: 0.9rem; margin-left: 0.5rem; transition: background 0.2s;";
      
      logoutBtn.addEventListener("mouseover", () => {
         logoutBtn.style.background = "var(--danger)";
         logoutBtn.style.color = "white";
      });
      logoutBtn.addEventListener("mouseout", () => {
         logoutBtn.style.background = "none";
         logoutBtn.style.color = "var(--danger)";
      });
      
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("student_token");
        localStorage.removeItem("student_info");
        sessionStorage.removeItem("last_g12_visit_time");
        sessionStorage.removeItem("last_g10_visit_time");
        window.location.reload();
      });
      
      headerActions.appendChild(logoutBtn);
    }
  };

  const showGrade12BlockedModal = () => {
    const mainContent = document.querySelector(".main-content");
    if (mainContent) mainContent.style.display = "none";

    // Remove any existing modal
    const existing = document.getElementById("student-g12-block-modal");
    if (existing) existing.remove();

    const blockHtml = `
      <div id="student-g12-block-modal" class="modal-overlay" style="display: flex; background: rgba(0,0,0,0.85); z-index: 9999;">
        <div class="modal-content" style="max-width: 440px; text-align: center; padding: 2.5rem 2rem; border: 1px solid var(--border);">
          <div style="font-size: 3rem; margin-bottom: 0.75rem;">⚠️</div>
          <h2 style="margin-bottom: 0.75rem; color: var(--danger); font-size: 1.4rem;">Access Restricted</h2>
          <p style="margin-bottom: 1.75rem; color: var(--text); font-weight: 600; font-size: 1.1rem; line-height: 1.5;">
            Complete your Grade 10 work first
          </p>
          <p style="margin-bottom: 1.75rem; color: var(--text-muted); font-size: 0.9rem;">
            Grade 12 is strictly reserved for Nerd Tutors and Nerd Tutors Nalanda students.
          </p>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <a href="grade10.html" class="btn btn-primary" style="width: 100%; text-decoration: none; display: inline-flex; justify-content: center; align-items: center; gap: 0.5rem;">
              <span>🎓</span> <span>Go to Grade 10</span>
            </a>
            <a href="index.html" class="btn" style="width: 100%; text-decoration: none; background: var(--surface-card); border: 1px solid var(--border); color: var(--text);">
              ⬅️ Back to Home
            </a>
            <button id="student-block-logout-btn" style="background: none; border: none; color: var(--danger); font-size: 0.88rem; cursor: pointer; text-decoration: underline; margin-top: 0.5rem;">
              Log in with a different account
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", blockHtml);

    const blockLogout = document.getElementById("student-block-logout-btn");
    if (blockLogout) {
      blockLogout.addEventListener("click", () => {
        localStorage.removeItem("student_token");
        localStorage.removeItem("student_info");
        window.location.reload();
      });
    }
  };

  // CHECK LOGGED IN STATE
  if (!isStudentLoggedIn()) {
    // Hide main content
    const mainContent = document.querySelector(".main-content");
    if (mainContent) mainContent.style.display = "none";

    // Show login modal
    const modalHtml = `
      <div id="student-login-modal" class="modal-overlay" style="display: flex; background: rgba(0,0,0,0.8); z-index: 9999;">
        <div class="modal-content" style="max-width: 400px; text-align: center; padding: 2rem;">
          <h2 style="margin-bottom: 0.5rem;">Student Login</h2>
          <p style="margin-bottom: 1.5rem; color: var(--text-muted);">Please log in to access Grade ${currentGrade} materials.</p>
          <div class="form-group" style="text-align: left; margin-bottom: 1rem;">
            <label>Student ID</label>
            <input type="text" id="login-student-id" placeholder="e.g. 1508" style="width: 100%;">
          </div>
          <div class="form-group" style="text-align: left; margin-bottom: 1.5rem;">
            <label>Password</label>
            <input type="password" id="login-password" placeholder="Password" style="width: 100%;">
          </div>
          <button id="student-login-btn" class="btn btn-primary" style="width: 100%;">Log In</button>
          <a href="index.html" style="display: inline-block; margin-top: 1.25rem; color: var(--text-muted); text-decoration: none; font-size: 0.95rem; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'">&larr; Back to Home</a>
          <p id="student-login-error" style="color: var(--danger, red); margin-top: 1rem; display: none; font-weight: 600;"></p>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    const loginBtn = document.getElementById("student-login-btn");
    loginBtn.addEventListener("click", async () => {
      const idAlias = document.getElementById("login-student-id").value.trim();
      const pwd = document.getElementById("login-password").value.trim();
      const errEl = document.getElementById("student-login-error");
      
      if (!idAlias || !pwd) {
        errEl.textContent = "Please enter both ID and Password.";
        errEl.style.display = "block";
        return;
      }
      
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";
      errEl.style.display = "none";
      
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id_alias: idAlias, password: pwd })
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Login failed");
        }

        // Grade 12 Restriction Check:
        // Only "Nerd Tutors" and "Nerd Tutors Nalanda" students are allowed to enter Grade 12
        if (isGrade12 && !isNerdTutorsGroup(data.student && data.student.group_name)) {
          errEl.textContent = "Complete your Grade 10 work first";
          errEl.style.display = "block";
          loginBtn.disabled = false;
          loginBtn.textContent = "Log In";
          return;
        }
        
        localStorage.setItem("student_token", data.token);
        localStorage.setItem("student_info", JSON.stringify(data.student));
        sessionStorage.setItem(isGrade12 ? "last_g12_visit_time" : "last_g10_visit_time", String(Date.now()));
        
        // Remove modal and show content
        const loginModal = document.getElementById("student-login-modal");
        if (loginModal) loginModal.remove();
        if (mainContent) mainContent.style.display = "block";
        setupLogout();
        
        // Re-initialize the student performance report now that we have credentials
        if (typeof initStudentReport === "function") {
          initStudentReport();
        }

        // Trigger celebratory 3D countdown reveal on login
        if (typeof window.triggerCountdownRevealModal === "function") {
          setTimeout(() => {
            window.triggerCountdownRevealModal();
          }, 350);
        }
      } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = "block";
        loginBtn.disabled = false;
        loginBtn.textContent = "Log In";
      }
    });
  } else {
    // Student has a token stored. Check if Grade 12 permission applies.
    let studentInfo = null;
    try {
      studentInfo = JSON.parse(localStorage.getItem("student_info") || "null");
    } catch (_) {}

    if (isGrade12 && studentInfo && !isNerdTutorsGroup(studentInfo.group_name)) {
      showGrade12BlockedModal();
      return;
    }

    setupLogout();

    // Verify that the currently logged-in student has not been suspended & record visit
    (async () => {
      try {
        let studentId = studentInfo ? studentInfo.id : null;

        // Fallback: decode student_id from token payload if student_info was missing
        if (!studentId) {
          const token = localStorage.getItem("student_token");
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              studentId = payload.student_id;
            } catch (_) {}
          }
        }

        if (studentId) {
          const visitKey = isGrade12 ? "last_g12_visit_time" : "last_g10_visit_time";
          const lastVisit = parseInt(sessionStorage.getItem(visitKey) || "0", 10);
          const now = Date.now();
          // 5-second debounce against accidental double-clicks or rapid reloads
          const shouldRecord = (now - lastVisit) > 5000;
          if (shouldRecord) {
            sessionStorage.setItem(visitKey, String(now));
          }

          const res = await fetch(`/api/auth?student_id=${encodeURIComponent(studentId)}${shouldRecord ? '&record_session=true' : ''}`);
          if (res.ok) {
            const data = await res.json();
            if (data.is_active === false) {
              localStorage.removeItem("student_token");
              localStorage.removeItem("student_info");
              sessionStorage.removeItem("last_g12_visit_time");
              sessionStorage.removeItem("last_g10_visit_time");
              alert("Your account has been temporarily suspended. You have been logged out.");
              window.location.reload();
              return;
            } else if (data.student) {
              // Ensure stored student info is always up to date
              localStorage.setItem("student_info", JSON.stringify(data.student));

              // If on Grade 12 and the updated student group is not permitted, block
              if (isGrade12 && !isNerdTutorsGroup(data.student.group_name)) {
                showGrade12BlockedModal();
                return;
              }
            }
          }
        }
      } catch (err) {
        // Silently ignore background check failures
      }
    })();
  }
});
