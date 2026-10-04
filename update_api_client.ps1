$filePath = "api-client.js"
$content = Get-Content $filePath -Raw -Encoding UTF8

$replacements = @(
    @('fetch("/api/question-papers")', 'fetch("/api/question-papers", { cache: "no-store" })'),
    @('fetch(`/api/submissions${query}`, {`n    headers: {', 'fetch(`/api/submissions${query}`, {`n    cache: "no-store",`n    headers: {'),
    @('fetch("/api/notes")', 'fetch("/api/notes", { cache: "no-store" })'),
    @('fetch("/api/students")', 'fetch("/api/students", { cache: "no-store" })'),
    @('fetch("/api/exams")', 'fetch("/api/exams", { cache: "no-store" })'),
    @('fetch("/api/marks", {`n    headers: {', 'fetch("/api/marks", {`n    cache: "no-store",`n    headers: {')
)

foreach ($rep in $replacements) {
    $content = $content.Replace($rep[0], $rep[1])
}

# Fix missing ones if line endings differ
$content = $content -replace 'fetch\(`/api/submissions\$\{query\}`, {', "fetch(``/api/submissions`$`{query`}``, { cache: 'no-store',"
$content = $content -replace 'fetch\("/api/marks", {', "fetch(`"/api/marks`", { cache: 'no-store',"
$content = $content -replace 'fetch\("/api/question-papers"\)', "fetch(`"/api/question-papers`", { cache: 'no-store' })"
$content = $content -replace 'fetch\("/api/notes"\)', "fetch(`"/api/notes`", { cache: 'no-store' })"
$content = $content -replace 'fetch\("/api/students"\)', "fetch(`"/api/students`", { cache: 'no-store' })"
$content = $content -replace 'fetch\("/api/exams"\)', "fetch(`"/api/exams`", { cache: 'no-store' })"

# Just to be safe since regex replacement might duplicate if we run twice or overlap. I'll just use explicit regex that looks for no cache.
$content = Get-Content $filePath -Raw -Encoding UTF8

$content = $content -replace 'fetch\("/api/question-papers"\)', "fetch(`"/api/question-papers`", { cache: `"no-store`" })"
$content = $content -replace 'fetch\("/api/notes"\)', "fetch(`"/api/notes`", { cache: `"no-store`" })"
$content = $content -replace 'fetch\("/api/students"\)', "fetch(`"/api/students`", { cache: `"no-store`" })"
$content = $content -replace 'fetch\("/api/exams"\)', "fetch(`"/api/exams`", { cache: `"no-store`" })"

# For submissions and marks, they already have a second argument.
$content = $content -replace 'fetch\(`\/api\/submissions\$\{query\}`,\s*\{', "fetch(``/api/submissions`$`{query`}``, { cache: `"no-store`","
$content = $content -replace 'fetch\("/api/marks",\s*\{\s*headers:\s*\{\s*Authorization', "fetch(`"/api/marks`", { cache: `"no-store`", headers: { Authorization"

[IO.File]::WriteAllText("c:\Users\jatin\coaching-submissions\api-client.js", $content, [System.Text.Encoding]::UTF8)
Write-Host "Updated api-client.js"
