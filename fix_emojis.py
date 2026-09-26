import os

def fix_file(filepath, replacements):
    if not os.path.exists(filepath):
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

index_reps = {
    '<span class="notif-icon">??</span>': '<span class="notif-icon">🔔</span>',
    'Coach Dashboard ??</a>': 'Coach Dashboard ⚙️</a>',
    '<span class="search-icon">??</span>': '<span class="search-icon">🔍</span>',
    '<span class="cbse-card-icon">???</span>': '<span class="cbse-card-icon">🗺️</span>',
    '<span class="subject-icon">??</span><h4>History</h4>': '<span class="subject-icon">🏛️</span><h4>History</h4>',
    '<span class="subject-icon">??</span><h4>Geography</h4>': '<span class="subject-icon">🌍</span><h4>Geography</h4>',
    '<span class="subject-icon">???</span><h4>Civics</h4>': '<span class="subject-icon">⚖️</span><h4>Civics</h4>',
    '<span class="subject-icon">??</span><h4>Economics</h4>': '<span class="subject-icon">📈</span><h4>Economics</h4>',
    '<h5 class="resource-group-title">?? Other Materials</h5>': '<h5 class="resource-group-title">📁 Other Materials</h5>',
    '<h5 class="resource-group-title">?? Study Notes</h5>': '<h5 class="resource-group-title">📚 Study Notes</h5>',
    '<h5 class="resource-group-title">?? Worksheets</h5>': '<h5 class="resource-group-title">📝 Worksheets</h5>',
    '<div class="empty-state-icon" id="no-notes-icon">??</div>': '<div class="empty-state-icon" id="no-notes-icon">📭</div>',
    '?? My Performance Report': '📊 My Performance Report',
    '?? General Resources': '📚 General Resources'
}

dash_reps = {
    '<span class="search-icon">??</span>': '<span class="search-icon">🔍</span>'
}

submit_reps = {
    'class="note-link">??? ${chapterBadge}': 'class="note-link">📁 ${chapterBadge}',
    'class="note-link">?? ${chapterBadge}': 'class="note-link">📝 ${chapterBadge}',
    'class="note-link">?? ${prefix}${chapterBadge}': 'class="note-link">📚 ${prefix}${chapterBadge}',
    '<span class="subject-icon">??</span>\n            <h4>General Resources</h4>': '<span class="subject-icon">📚</span>\n            <h4>General Resources</h4>',
    '<span class="accordion-icon" style="margin-left: auto; transition: transform 0.2s;">?</span>': '<span class="accordion-icon" style="margin-left: auto; transition: transform 0.2s;">▼</span>',
    'if (iconEl) iconEl.textContent = "??"; // failed to load': 'if (iconEl) iconEl.textContent = "❌";',
    'if (iconEl) iconEl.textContent = "??"; // no matching': 'if (iconEl) iconEl.textContent = "🔍";',
}

fix_file('index.html', index_reps)
fix_file('dashboard.html', dash_reps)
fix_file('submit.js', submit_reps)

# For the two submit.js dynamic assignments, let's just use string replace carefully
with open('submit.js', 'r', encoding='utf-8') as f:
    submit_content = f.read()

submit_content = submit_content.replace('iconEl.textContent = "??";', 'iconEl.textContent = "❌";', 1)
submit_content = submit_content.replace('iconEl.textContent = "??";', 'iconEl.textContent = "🔍";', 1)
submit_content = submit_content.replace('<span class="subject-icon">??</span>', '<span class="subject-icon">📚</span>')
submit_content = submit_content.replace('<span class="accordion-icon" style="margin-left: auto; transition: transform 0.2s;">?</span>', '<span class="accordion-icon" style="margin-left: auto; transition: transform 0.2s;">▼</span>')

with open('submit.js', 'w', encoding='utf-8') as f:
    f.write(submit_content)

print("Emojis fixed.")
