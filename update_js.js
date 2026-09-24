const fs = require('fs');
let c = fs.readFileSync('dashboard.js', 'utf8');

c = c.replace(/examForm\.addEventListener\("submit", async \(e\) => {[\s\S]*?await createExam\({[\s\S]*?name: examNameInput\.value\.trim\(\),[\s\S]*?total_marks: examTotalInput\.value[\s\S]*?}\);/m, 
`examForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    examSubmitBtn.disabled = true;
    examSubmitBtn.textContent = "Creating...";
    try {
      const checkedGroups = Array.from(document.querySelectorAll('#exam-groups-container input:checked')).map(cb => cb.value);
      await createExam({
        name: examNameInput.value.trim(),
        total_marks: examTotalInput.value,
        target_groups: checkedGroups
      });`);

c += `

// STUDENT GROUPS MANAGEMENT
const manageGroupStudent = document.getElementById("manage-group-student");
const manageGroupSelect = document.getElementById("manage-group-select");
const manageGroupUpdateBtn = document.getElementById("manage-group-update-btn");
const manageGroupStatus = document.getElementById("manage-group-status");

async function populateGroupManager() {
  if (!manageGroupStudent) return;
  try {
    const { students } = await fetchStudents();
    manageGroupStudent.innerHTML = '<option value="">Select Student...</option>';
    students.forEach(s => {
      manageGroupStudent.innerHTML += \`<option value="\${s.id}" data-group="\${s.group_name || ''}">\${escapeHtml(s.name)} \${s.group_name ? \`(\${escapeHtml(s.group_name)})\` : ''}</option>\`;
    });
  } catch(e) {}
}

if (manageGroupStudent) {
  manageGroupStudent.addEventListener("change", (e) => {
    const opt = e.target.options[e.target.selectedIndex];
    manageGroupSelect.value = opt.getAttribute("data-group") || "";
  });
}

if (manageGroupUpdateBtn) {
  manageGroupUpdateBtn.addEventListener("click", async () => {
    const sid = manageGroupStudent.value;
    const grp = manageGroupSelect.value;
    if (!sid) return alert("Select student first");
    manageGroupUpdateBtn.disabled = true;
    try {
      const studentName = manageGroupStudent.options[manageGroupStudent.selectedIndex].text.split(' (')[0];
      await fetch("/api/students", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ name: studentName, group_name: grp })
      });
      manageGroupStatus.textContent = "Group updated!";
      manageGroupStatus.style.display = "block";
      manageGroupStatus.style.color = "#059669";
      setTimeout(() => manageGroupStatus.style.display="none", 3000);
      await populateGroupManager();
      await loadExamData();
    } catch (e) {
      alert(e.message);
    }
    manageGroupUpdateBtn.disabled = false;
  });
}

// Call on startup
document.addEventListener("DOMContentLoaded", populateGroupManager);

// GROUP FILTER LOGIC FOR PERFORMANCE
const perfGroupFilter = document.getElementById("performance-group-filter");
if (perfGroupFilter) {
  perfGroupFilter.addEventListener("change", () => {
    applyGroupFilterAndRender();
  });
}

function applyGroupFilterAndRender() {
  if (!globalStudents || !globalExams) return;
  
  const selectedGrp = perfGroupFilter ? perfGroupFilter.value : "";
  let filteredStudents = globalStudents;
  if (selectedGrp) {
    filteredStudents = globalStudents.filter(s => s.group_name === selectedGrp);
  }
  
  const validStudentIds = new Set(filteredStudents.map(s => s.id));
  const filteredMarks = globalMarks.filter(m => validStudentIds.has(m.student_id));
  
  renderPerformanceTable(globalExams, filteredMarks, filteredStudents);
  updateAnalyticsDropdowns(filteredStudents);
  if (typeof updateEditMarksDropdowns === 'function') updateEditMarksDropdowns(filteredStudents);
  
  calculateClassStats(globalExams, globalMarksByStudent);
  renderAttentionList(globalExams, globalMarksByStudent, filteredStudents);
}
`;

// Override loadExamData
c = c.replace(/async function loadExamData\(\) \{[\s\S]*?renderAttentionList\(globalExams, globalMarksByStudent\);\n    \} catch \(err\) \{/m, 
`async function loadExamData() {
    try {
      const [examsRes, marksRes, studentsRes] = await Promise.all([
        fetchExams(),
        fetchMarks(),
        fetchStudents()
      ]);
      
      globalExams = (examsRes.exams || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      globalMarks = marksRes.marks || [];
      globalStudents = studentsRes.students || [];
      
      renderExamsList(globalExams);
      applyGroupFilterAndRender();
    } catch (err) {`);

// Make sure updateAnalyticsDropdowns accepts students param
c = c.replace(/function updateAnalyticsDropdowns\(\) \{/g, `function updateAnalyticsDropdowns(studentsToUse = globalStudents) {`);
c = c.replace(/globalStudents\.forEach\(s => \{/g, `studentsToUse.forEach(s => {`);

// Make sure updateEditMarksDropdowns accepts students param
c = c.replace(/function updateEditMarksDropdowns\(\) \{/g, `function updateEditMarksDropdowns(studentsToUse = globalStudents) {`);

// Make sure renderAttentionList accepts students param and filters
c = c.replace(/function renderAttentionList\(exams, marksByStudent\) \{/g, `function renderAttentionList(exams, marksByStudent, studentsToUse = globalStudents) {`);
c = c.replace(/globalStudents\.forEach\(student => \{/g, `studentsToUse.forEach(student => {`);

fs.writeFileSync('dashboard.js', c, 'utf8');
console.log('Done dashboard.js update');
