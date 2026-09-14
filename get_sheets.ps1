$res = Invoke-WebRequest -Uri "https://docs.google.com/spreadsheets/d/1aeC42-OHdS_aAb_65GXuaEUfjBhqA-Jydb-HjiZtA-8/edit"
$content = $res.Content
[regex]::Matches($content, 'sheetId":(\d+)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
