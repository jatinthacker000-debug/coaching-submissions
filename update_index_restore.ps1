$filePath = "index.html"
$content = Get-Content $filePath -Raw -Encoding UTF8

$marker = "    <!-- Student report section has been moved to grade12.html -->"
$index = $content.IndexOf($marker)

if ($index -ge 0) {
    $insertHtml = @"
    <!-- STUDENT REPORT SECTION -->
    <details id="student-report-section" style="background: var(--surface-card); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 2rem; box-shadow: var(--shadow);">
      <summary style="padding: 1.5rem; cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: center; outline: none; user-select: none;">
        <h2 style="margin: 0; font-size: 1.25rem; color: var(--text); text-align: center;">&#128200; My Performance Report <span style="font-size: 0.9em; margin-left: 0.5rem;">&#9660;</span></h2>
      </summary>
      
      <div style="padding: 0 1.5rem 1.5rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; align-items: center; border-top: 1px solid var(--border);">
        <p class="muted-text" style="margin: 0; text-align: center;">Select your group and name to view your exam scores.</p>
        
        <div class="custom-select-wrapper" style="width: 100%; max-width: 300px;">
          <select id="student-report-group-select" class="custom-select" style="width: 100%;">
            <option value="">Select your group...</option>
            <option value="loading">Loading groups...</option>
          </select>
        </div>

        <div class="custom-select-wrapper" style="width: 100%; max-width: 300px;">
          <select id="student-report-select" class="custom-select" style="width: 100%;" disabled>
            <option value="">Select your name...</option>
          </select>
        </div>
        
        <div id="student-report-content" style="width: 100%; max-width: 600px; display: none; margin-top: 1.5rem; overflow-x: auto;"></div>
      </div>
    </details>
"@
    $newContent = $content.Substring(0, $index) + $insertHtml + $content.Substring($index + $marker.Length)
    [IO.File]::WriteAllText("c:\Users\jatin\coaching-submissions\index.html", $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "Successfully updated index.html"
} else {
    Write-Host "Marker not found in index.html"
}
