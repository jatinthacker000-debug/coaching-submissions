document.addEventListener("DOMContentLoaded", () => {
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
        window.location.reload();
      });
      
      headerActions.appendChild(logoutBtn);
    }
  };

  if (!isStudentLoggedIn()) {
    // Hide main content
    const mainContent = document.querySelector(".main-content");
    if (mainContent) mainContent.style.display = "none";

    // Show login modal
    const modalHtml = `
      <div id="student-login-modal" class="modal-overlay" style="display: flex; background: rgba(0,0,0,0.8); z-index: 9999;">
        <div class="modal-content" style="max-width: 400px; text-align: center; padding: 2rem;">
          <h2 style="margin-bottom: 1rem;">Student Login</h2>
          <p style="margin-bottom: 1.5rem; color: var(--text-muted);">Please log in to access Grade 12 materials.</p>
          <div class="form-group" style="text-align: left; margin-bottom: 1rem;">
            <label>Student ID</label>
            <input type="text" id="login-student-id" placeholder="e.g. 1508" style="width: 100%;">
          </div>
          <div class="form-group" style="text-align: left; margin-bottom: 1.5rem;">
            <label>Password</label>
            <input type="password" id="login-password" placeholder="Password" style="width: 100%;">
          </div>
          <button id="student-login-btn" class="btn btn-primary" style="width: 100%;">Log In</button>
          <p id="student-login-error" style="color: red; margin-top: 1rem; display: none;"></p>
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
      
      try {
        const res = await fetch("/api/student-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id_alias: idAlias, password: pwd })
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Login failed");
        }
        
        localStorage.setItem("student_token", data.token);
        localStorage.setItem("student_info", JSON.stringify(data.student));
        
        // Remove modal and show content
        document.getElementById("student-login-modal").remove();
        if (mainContent) mainContent.style.display = "block";
        setupLogout();
      } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = "block";
        loginBtn.disabled = false;
        loginBtn.textContent = "Log In";
      }
    });
  } else {
    setupLogout();
  }
});
