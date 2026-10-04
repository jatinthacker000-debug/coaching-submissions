$filePath = "grade12.html"
$content = Get-Content $filePath -Raw -Encoding UTF8

$marker = "    <!-- OSEM AND NALANDA SECTIONS -->"
$index = $content.IndexOf($marker)

if ($index -ge 0) {
    $insertHtml = @"
    <!-- STUDENT PERFORMANCE REPORT -->
    <div id="student-report-section" style="background: var(--surface-card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: var(--shadow);">
      <h2 style="margin: 0 0 1rem 0; font-size: 1.25rem; color: var(--text); text-align: center;">&#128200; My Performance Report</h2>
      <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center;">
        <div id="student-report-content" style="width: 100%; max-width: 600px; display: none; margin-top: 0.5rem; overflow-x: auto;"></div>
      </div>
    </div>

"@
    $newContent = $content.Substring(0, $index) + $insertHtml + $content.Substring($index)
    [IO.File]::WriteAllText("c:\Users\jatin\coaching-submissions\grade12.html", $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "Successfully updated grade12.html"
} else {
    Write-Host "Marker not found in grade12.html"
}
