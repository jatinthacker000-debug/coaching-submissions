$filePath = "dashboard.html"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Replace checkbox
$oldCheckbox = '<label style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" value="Nerd Tutors"> Nerd Tutors</label>'
$newCheckbox = '<label style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" value="Nerd Tutors"> Nerd Tutors</label><label style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" value="Nerd Tutors Nalanda"> Nerd Tutors Nalanda</label>'
$content = $content.Replace($oldCheckbox, $newCheckbox)

# Replace option
$oldOption = '<option value="Nerd Tutors">Nerd Tutors</option>'
$newOption = '<option value="Nerd Tutors">Nerd Tutors</option><option value="Nerd Tutors Nalanda">Nerd Tutors Nalanda</option>'
$content = $content.Replace($oldOption, $newOption)

[IO.File]::WriteAllText("c:\Users\jatin\coaching-submissions\dashboard.html", $content, [System.Text.Encoding]::UTF8)
Write-Host "Updated dashboard.html"
