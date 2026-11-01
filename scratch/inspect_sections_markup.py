with open('dashboard.html', 'r', encoding='utf-8') as f:
    html = f.read()

sections_to_check = [
    'Notification Manager',
    'Homework Links Manager',
    'Calendar Events & Test Dates Manager',
    'Grade 12 Class Test Results Link',
    'Resources Manager',
    'CBSE Resources Manager',
    'Active Resources',
    'Exam Management',
    'Add New Student',
    'Class Performance Overview',
    'Bulk Enter Marks',
    'Homework Tracking',
    'Edit or Delete Student Marks'
]

for name in sections_to_check:
    idx = html.find(name)
    if idx != -1:
        # print around the name
        start = html.rfind('<div class="panel-header', 0, idx)
        if start == -1:
            start = html.rfind('<div', 0, idx)
        print(f"=== {name} (pos {idx}) ===")
        print(html[start:idx+250])
        print("...")
    else:
        print(f"=== {name} NOT FOUND! ===")
