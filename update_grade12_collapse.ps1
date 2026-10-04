$filePath = "grade12.html"
$content = Get-Content $filePath -Raw -Encoding UTF8

$startMarker = "    <!-- STUDENT PERFORMANCE REPORT -->"
$endMarker = "    <!-- OSEM AND NALANDA SECTIONS -->"

$startIndex = $content.IndexOf($startMarker)
$endIndex = $content.IndexOf($endMarker)

if ($startIndex -ge 0 -and $endIndex -ge 0) {
    $insertHtml = @"
    <!-- STUDENT PERFORMANCE REPORT -->
    <details id="student-report-section" style="background: var(--surface-card); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 2rem; box-shadow: var(--shadow);" open>
      <summary style="padding: 1.5rem; cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: center; outline: none; user-select: none;">
        <h2 style="margin: 0; font-size: 1.25rem; color: var(--text); text-align: center;">&#128200; My Performance Report <span style="font-size: 0.9em; margin-left: 0.5rem;">&#9660;</span></h2>
      </summary>
      <div style="padding: 0 1.5rem 1.5rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; align-items: center; border-top: 1px solid var(--border);">
        <div id="student-report-content" style="width: 100%; max-width: 600px; display: none; margin-top: 0.5rem; overflow-x: auto;"></div>
      </div>
    </details>

"@
    $newContent = $content.Substring(0, $startIndex) + $insertHtml + $content.Substring($endIndex)
    [IO.File]::WriteAllText("c:\Users\jatin\coaching-submissions\grade12.html", $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "Successfully updated grade12.html"
} else {
    Write-Host "Marker not found in grade12.html"
}
