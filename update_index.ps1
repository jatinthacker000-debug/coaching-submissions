$filePath = "index.html"
$content = Get-Content $filePath -Raw -Encoding UTF8

$startMarker = "    <!-- NEW STUDENT REPORT SECTION -->"
$endMarker = "    <div class=""mobile-footer"""

$startIndex = $content.IndexOf($startMarker)
$endIndex = $content.IndexOf($endMarker)

if ($startIndex -ge 0 -and $endIndex -ge 0) {
    $newContent = $content.Substring(0, $startIndex) + "    <!-- Student report section has been moved to grade12.html -->`r`n" + $content.Substring($endIndex)
    [IO.File]::WriteAllText("c:\Users\jatin\coaching-submissions\index.html", $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "Successfully updated index.html"
} else {
    Write-Host "Markers not found in index.html"
}
