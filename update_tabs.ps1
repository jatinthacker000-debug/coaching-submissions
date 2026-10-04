$files = @("index.html", "grade10.html", "grade12.html")
$oldTab = '<button class="notif-tab" data-inst="Nerd Tutors">Nerd Tutors</button>'
$newTab = '<button class="notif-tab" data-inst="Nerd Tutors">Nerd Tutors</button> <button class="notif-tab" data-inst="Nerd Tutors Nalanda">Nerd Tutors Nalanda</button>'

foreach ($file in $files) {
    $filePath = "c:\Users\jatin\coaching-submissions\$file"
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        $content = $content.Replace($oldTab, $newTab)
        [IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Updated $file"
    }
}
