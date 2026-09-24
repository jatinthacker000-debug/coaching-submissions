$content = Get-Content index.html -Raw -Encoding UTF8
$content = $content -replace '<span class="subject-icon">\?\?</span><h4>History</h4>', '<span class="subject-icon">📜</span><h4>History</h4>'
$content = $content -replace '<span class="subject-icon">\?\?</span><h4>Geography</h4>', '<span class="subject-icon">🌍</span><h4>Geography</h4>'
$content = $content -replace '<span class="subject-icon">\?\?</span><h4>Civics</h4>', '<span class="subject-icon">🏛️</span><h4>Civics</h4>'
$content = $content -replace '<span class="subject-icon">\?\?</span><h4>Economics</h4>', '<span class="subject-icon">📈</span><h4>Economics</h4>'
$content = $content -replace '<h5 class="resource-group-title">\?\? Other Materials</h5>', '<h5 class="resource-group-title">📦 Other Materials</h5>'
$content = $content -replace '<h5 class="resource-group-title">\?\? Study Notes</h5>', '<h5 class="resource-group-title">📚 Study Notes</h5>'
$content = $content -replace '<h5 class="resource-group-title">\?\? Worksheets</h5>', '<h5 class="resource-group-title">📝 Worksheets</h5>'
$content = $content -replace '<span class="notif-icon">\?\?</span>', '<span class="notif-icon">🔔</span>'
$content = $content -replace 'Coach Dashboard \?\?</a>', 'Coach Dashboard 👉</a>'
$content = $content -replace '<span class="search-icon">\?\?</span>', '<span class="search-icon">🔍</span>'
$content = $content -replace '<span class="cbse-card-icon">\?\?</span>', '<span class="cbse-card-icon">🗺️</span>'
$content = $content -replace '>⏳ Prelims Exam Countdown', '>⏳ Prelims Exam Countdown' # already fixed but just in case
$content = $content -replace '<div class="empty-state-icon" id="no-notes-icon">\?\?</div>', '<div class="empty-state-icon" id="no-notes-icon">📁</div>'
$content = $content -replace '.*? My Performance Report</h2>', '      <h2 style="margin: 0 0 1rem 0; font-size: 1.25rem; color: var(--text); text-align: center;">📊 My Performance Report</h2>'
Set-Content index.html -Value $content -Encoding UTF8
Write-Output "Done"
