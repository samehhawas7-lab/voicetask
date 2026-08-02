#Requires -Version 5
# ============================================================
#  منصّب خادم ريموت KMC على ويندوز
#
#  يجعل لابتوباً قديماً خادماً بيتياً دائماً:
#    • ينزّل المشروع ويثبّت اعتماداته
#    • يمنع الجهاز من النوم ويجعل إغلاق الغطاء لا يفعل شيئاً
#    • يفتح المنفذ في جدار الحماية
#    • يسجّله مهمّة تعمل مع إقلاع ويندوز قبل تسجيل الدخول
#
#  التشغيل من PowerShell بصلاحية المسؤول:
#    irm https://raw.githubusercontent.com/samehhawas7-lab/voicetask/main/tvremote/windows/install.ps1 | iex
#
#  ملاحظة على اللغة: رسائل النافذة إنجليزية قصيرة عمداً — نافذة
#  PowerShell الكلاسيكية لا تعرض العربية وتحوّلها رموزاً. والخلاصة
#  العربية تُكتب في ملف يُفتح بالمفكرة في آخر التنصيب.
# ============================================================

# ErrorActionPreference لا يُضبط على Stop: الأوامر الأصلية مثل npm
# و robocopy تكتب على مجرى الأخطاء في أحوالها العادية فتُجهض السكربت.
$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try { [Console]::OutputEncoding = New-Object Text.UTF8Encoding($false) } catch { }

# ويندوز يمنع تشغيل السكربتات افتراضياً، و npm على ويندوز سكربت.
# نرفع المنع لهذه العملية وحدها — لا يمسّ إعدادات الجهاز.
try { Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force -ErrorAction SilentlyContinue } catch { }

$Root     = "C:\kmc-remote"
$TvIp     = if ($env:TV_IP) { $env:TV_IP } else { "192.168.8.77" }
$Port     = if ($env:PORT)  { [int]$env:PORT } else { 8099 }
$ZipUrl   = "https://github.com/samehhawas7-lab/voicetask/archive/refs/heads/main.zip"
$InstallerUrl = "https://raw.githubusercontent.com/samehhawas7-lab/voicetask/main/tvremote/windows/install.ps1"
$TaskName = "KMC TV Remote"

function Say  ($m) { Write-Host $m }
function Ok   ($m) { Write-Host "  [ OK ] $m"   -ForegroundColor Green }
function Warn ($m) { Write-Host "  [WARN] $m"   -ForegroundColor Yellow }
function Die  ($m) { throw $m }

$healthy = $false
$rolledBack = $false
$ips = @()
$WinDir = Join-Path $Root "tvremote\windows"

try {

Say ""
Say "=============================================="
Say "   KMC TV Remote - installing"
Say "=============================================="
Say ""

# ---------- ١) الصلاحيات ----------
$me = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal($me)).IsInRole(
             [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Die "Run PowerShell as Administrator (right-click > Run as administrator)"
}
Ok "administrator"

# ---------- ٢) Node.js ----------
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) { Die "Node.js not found. Install it from nodejs.org, then reopen PowerShell" }
$nodeExe = $nodeCmd.Source
$nodeDir = Split-Path $nodeExe -Parent
Ok ("Node.js " + (& node -v))

# npm.cmd لا npm: الأخير سكربت PowerShell تحجبه سياسة التنفيذ
$npmCmd = Join-Path $nodeDir "npm.cmd"
if (-not (Test-Path $npmCmd)) { Die "npm.cmd not found next to node.exe" }

# ---------- ٣) جلب المشروع ----------
Say ""
Say "  downloading project..."
$tmpZip = Join-Path $env:TEMP "voicetask.zip"
$tmpDir = Join-Path $env:TEMP "voicetask-extract"
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }

try {
  # لاحقة عشوائية تكسر أي تخزين مؤقّت في الطريق: التنصيب على نسخة قديمة
  # يترك المستخدم يشغّل أداةً لا وجود لها عنده ويحتار في سبب غيابها
  Invoke-WebRequest -Uri ($ZipUrl + "?t=" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) `
                    -OutFile $tmpZip -UseBasicParsing -Headers @{ "Cache-Control" = "no-cache" } `
                    -ErrorAction Stop
} catch {
  Die "download failed - check internet and system date. ($($_.Exception.Message))"
}

try {
  Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force -ErrorAction Stop
} catch {
  Die "could not extract archive. ($($_.Exception.Message))"
}

$src = Join-Path $tmpDir "voicetask-main"
if (-not (Test-Path $src)) { Die "unexpected archive layout" }

New-Item -ItemType Directory -Path $Root -Force | Out-Null

# نسخة احتياطية قبل الاستبدال: التحديث صار يقع تلقائياً بلا أحدٍ يراقبه،
# فدفعةٌ معطوبة تترك البيت بلا ريموت. نستثني node_modules لأنه ثقيل
# ولا يُستبدل استبدالاً هادماً.
$Backup = $Root + ".bak"
$hadPrev = Test-Path (Join-Path $Root "tvremote\webos\server.js")
if ($hadPrev) {
  if (Test-Path $Backup) { Remove-Item $Backup -Recurse -Force -ErrorAction SilentlyContinue }
  & robocopy $Root $Backup /E /XD node_modules .git /NFL /NDL /NJH /NJS /NP /R:0 /W:0 | Out-Null
  Ok "backup kept at $Backup"
}

# robocopy يُرجع رموزاً دون 8 عند النجاح (1 = نُسخت ملفات)، فلا نعدّها أخطاء
& robocopy $src $Root /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null
if ($LASTEXITCODE -ge 8) { Die "copy to $Root failed (robocopy $LASTEXITCODE)" }
Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue
Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

# نتحقّق أن النسخ وصل فعلاً بدل الاكتفاء برمز robocopy: الأدوات تُضاف
# تباعاً، وصمتُ التنصيب عن نقصها يُوقع في حيرة طويلة
$expect = @("tv.html", "tvremote\webos\server.js", "tvremote\windows\run.cmd",
            "tvremote\webos\tuya.js", "tvremote\webos\tuya-cloud.js",
            "tvremote\webos\adb.js", "tvremote\webos\wol.js",
            "tvremote\webos\survey.js", "tvremote\webos\router.js",
            "tvremote\windows\tailscale.ps1",
            "tvremote\tools\probe-device.js", "tvremote\tools\scan.js")
$missing = @($expect | Where-Object { -not (Test-Path (Join-Path $Root $_)) })
if ($missing.Count) { Die ("copy incomplete, missing: " + ($missing -join ", ")) }
Ok ("files in $Root  (" + (Get-ChildItem $Root -Recurse -File).Count + " files)")

$WebosDir = Join-Path $Root "tvremote\webos"
$runCmd   = Join-Path $WinDir "run.cmd"
if (-not (Test-Path $runCmd)) { Die "missing $runCmd" }

# ---------- ٤) الاعتمادات ----------
Say ""
Say "  installing dependencies (about a minute)..."
$prevLoc = Get-Location
Set-Location $WebosDir
try {
  & $npmCmd install --omit=dev --no-audit --no-fund --loglevel=error 2>&1 | Out-Null
  $npmCode = $LASTEXITCODE
} finally {
  Set-Location $prevLoc
}
if (-not (Test-Path (Join-Path $WebosDir "node_modules\ws")) -or
    -not (Test-Path (Join-Path $WebosDir "node_modules\tuyapi"))) {
  Die "npm install failed (exit $npmCode) - check internet and rerun"
}
Ok "dependencies ready"

# ---------- ٥) الإعدادات ----------
# بلا BOM: قارئ JSON في Node يرفض الحرف الخفيّ الذي يضيفه Set-Content
# نقرأ الموجود قبل الكتابة: عنوان بطاقة التلفزيون لا يُعرف إلا والتلفزيون
# شغّال، فمسحُه في كل تحديث يُبطل إيقاظه وهو مطفأ — وهو الغرض منه.
$cfgPath = Join-Path $WebosDir "config.json"
$old = $null
if (Test-Path $cfgPath) {
  try { $old = Get-Content $cfgPath -Raw -ErrorAction Stop | ConvertFrom-Json } catch { }
}
$cfg = [ordered]@{
  tvIp   = if ($env:TV_IP) { $TvIp } elseif ($old -and $old.tvIp) { $old.tvIp } else { $TvIp }
  tvMac  = if ($old -and $old.tvMac) { $old.tvMac } else { "" }
  projIp = if ($old -and $old.projIp) { $old.projIp } else { "192.168.8.13" }
  autoUpdate = if ($old -and ($null -ne $old.autoUpdate)) { [bool]$old.autoUpdate } else { $true }
  tvPort = 3001
  port   = $Port
}
[IO.File]::WriteAllText($cfgPath, ($cfg | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))

# مسار node مثبَّت للمهمة: SYSTEM قد يقلع قبل أن يلتقط PATH الجهاز
[IO.File]::WriteAllText((Join-Path $WinDir "node-path.cmd"),
  "set `"NODE_EXE=$nodeExe`"`r`n", (New-Object Text.ASCIIEncoding))
# رقم النسخة المنصّبة: به يعرف التطبيق أن ثمّة تحديثاً فيعرض زرّه.
# وتعذُّر السؤال لا يُفشل التنصيب — يُكتب فارغاً ويُكتفى بالتاريخ.
$sha = ""
try {
  $sha = (Invoke-RestMethod -Uri "https://api.github.com/repos/samehhawas7-lab/voicetask/commits/main" `
            -Headers @{ "User-Agent" = "kmc-remote"; "Accept" = "application/vnd.github.sha" } `
            -TimeoutSec 8 -ErrorAction Stop).ToString().Trim()
  if ($sha -notmatch '^[0-9a-f]{40}$') { $sha = "" }
} catch { $sha = "" }
$ver = [ordered]@{ sha = $sha; installedAt = (Get-Date).ToString("o") }
[IO.File]::WriteAllText((Join-Path $WinDir "version.json"),
  ($ver | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))

$macNote = if ($cfg.tvMac) { "  ·  MAC kept" } else { "" }
Ok ("TV " + $cfg.tvIp + "  ·  server port " + $Port + $macNote)

# ---------- ٦) منع النوم ----------
# الجهاز النائم لا يخدم أحداً: يُقطع المعالج والشبكة. فنطفئ الشاشة
# ونُبقي الجهاز مستيقظاً — نحو ٧ واط، أي أقل من ريال شهرياً.
Say ""
Say "  power settings..."
$LID_SUB = "4f971e89-eebd-4455-a8de-9e59040e7347"   # أزرار الطاقة والغطاء
$LID_ACT = "5ca83367-6e45-459f-a27b-476b1d01c936"   # إجراء إغلاق الغطاء

& powercfg /change standby-timeout-ac 0     2>&1 | Out-Null   # لا سكون بالكهرباء
& powercfg /change hibernate-timeout-ac 0   2>&1 | Out-Null
& powercfg /change disk-timeout-ac 0        2>&1 | Out-Null
& powercfg /change monitor-timeout-ac 10    2>&1 | Out-Null   # الشاشة وحدها تنطفئ
& powercfg /change standby-timeout-dc 30    2>&1 | Out-Null   # على البطارية: نصف ساعة ثم ينام
& powercfg /change monitor-timeout-dc 3     2>&1 | Out-Null
& powercfg /setacvalueindex SCHEME_CURRENT $LID_SUB $LID_ACT 0 2>&1 | Out-Null
& powercfg /setdcvalueindex SCHEME_CURRENT $LID_SUB $LID_ACT 0 2>&1 | Out-Null
& powercfg /setactive SCHEME_CURRENT        2>&1 | Out-Null
& powercfg /hibernate off                   2>&1 | Out-Null   # يحرّر عدة غيغابايت أيضاً
Ok "never sleeps; lid close does nothing"

# بطاقة الشبكة قد تُطفئ نفسها لتوفير الطاقة فينقطع الخادم بلا سبب ظاهر
try {
  Get-NetAdapter -Physical -ErrorAction Stop |
    Where-Object { $_.Status -eq "Up" } |
    Disable-NetAdapterPowerManagement -NoRestart -ErrorAction SilentlyContinue
  Ok "network adapter power saving off"
} catch {
  Warn "could not adjust network adapter - not critical"
}

# ---------- ٧) جدار الحماية ----------
# الوسائط تُمرَّر مقتبسةً كاملةً: اسم القاعدة فيه مسافات، ولولا ذلك
# لقسّمها PowerShell وسائطَ منفصلة فتفشل netsh بصمت
Say ""
& netsh advfirewall firewall delete rule "name=$TaskName" 2>&1 | Out-Null
& netsh advfirewall firewall add rule "name=$TaskName" dir=in action=allow `
    protocol=TCP "localport=$Port" profile=any 2>&1 | Out-Null
Ok "port $Port open on the local network"

# ---------- ٨) التشغيل التلقائي ----------
# SYSTEM ومع الإقلاع: يعمل قبل تسجيل الدخول، فلا يلزم فتح الجهاز أصلاً.
# و run.cmd يعيد تشغيل الخادم لو تعثّر، والمهمة بلا حدّ زمني.
$action = New-ScheduledTaskAction -Execute $env:ComSpec -Argument "/c `"$runCmd`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartInterval (New-TimeSpan -Minutes 1) -RestartCount 999 `
    -MultipleInstances IgnoreNew

Stop-ScheduledTask       -TaskName $TaskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# إيقاف المهمة يقتل cmd.exe ولا يقتل node.exe الذي أطلقه، فيبقى القديم
# ممسكاً بالمنفذ ويفشل الجديد في الاستماع ويعيد المحاولة أبداً بصمت.
# فنقتل ما بقي منه صراحةً — وما يخصّنا وحده لا كل node على الجهاز.
Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='cmd.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and ($_.CommandLine -like "*kmc-remote*" -or $_.CommandLine -like "*tvremote*webos*") } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings `
    -Description "KMC TV Remote home server" -ErrorAction Stop | Out-Null
Ok "registered to start with Windows"

# ---------- ٨٫٥) اختصار على سطح المكتب ----------
# زرُّ التحديث داخل التطبيق لا يفيد حين يتعذّر الوصول إلى الخادم أصلاً.
# فيبقى مخرجٌ لا يحتاج نسخاً ولا لصقاً ولا فتح PowerShell: نقرتان.
try {
  $desktop = [Environment]::GetFolderPath("CommonDesktopDirectory")
  if (-not $desktop) { $desktop = [Environment]::GetFolderPath("Desktop") }
  $lnk = Join-Path $desktop "تحديث ريموت البيت.lnk"
  $ws = New-Object -ComObject WScript.Shell
  $sc = $ws.CreateShortcut($lnk)
  $sc.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $sc.Arguments  = "-NoProfile -ExecutionPolicy Bypass -Command `"irm '$InstallerUrl' | iex; Read-Host 'اضغط Enter للإغلاق'`""
  $sc.IconLocation = "$env:SystemRoot\System32\shell32.dll,238"
  $sc.Description = "يجلب آخر نسخة من ريموت البيت ويعيد تشغيل الخادم"
  $sc.Save()

  # خاصيّة «تشغيل كمسؤول» لا تُضبط من WScript.Shell: بتٌّ في رأس الملف
  $bytes = [IO.File]::ReadAllBytes($lnk)
  $bytes[0x15] = $bytes[0x15] -bor 0x20
  [IO.File]::WriteAllBytes($lnk, $bytes)
  Ok "desktop shortcut created"
} catch {
  Warn "could not create the desktop shortcut - not critical"
}

# ---------- ٩) التشغيل والتحقّق ----------
Say ""
Say "  starting server..."
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 6

foreach ($try in 1..5) {
  try {
    $r = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 4 -ErrorAction Stop
    if ($r.ok) { $healthy = $true; break }
  } catch { Start-Sleep -Seconds 3 }
}

$ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
       Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
       Select-Object -ExpandProperty IPAddress)

Say ""
Say "=============================================="
if ($healthy) {
  Write-Host "   SERVER RUNNING" -ForegroundColor Green
  Say ""
  Say "   open on your iPhone:"
  foreach ($ip in $ips) { Write-Host "      http://$ip`:$Port" -ForegroundColor Cyan }
} elseif ($hadPrev -and (Test-Path $Backup)) {
  # لا نترك البيت بلا ريموت: نرجع إلى النسخة التي كانت تعمل ونعيد تشغيلها
  Write-Host "   NEW VERSION DID NOT START - ROLLING BACK" -ForegroundColor Yellow
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='cmd.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -like "*kmc-remote*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
  & robocopy $Backup $Root /E /XD node_modules .git /NFL /NDL /NJH /NJS /NP /R:0 /W:0 | Out-Null
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 8
  $back = $false
  try { $back = [bool](Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 5 -ErrorAction Stop).ok } catch { }
  if ($back) {
    Write-Host "   ROLLED BACK - the previous version is running again" -ForegroundColor Green
    $healthy = $true
    $rolledBack = $true
  } else {
    Write-Host "   ROLLBACK FAILED - see the log" -ForegroundColor Red
  }
  Say ""
  Say "   log: $WinDir\server.log"
} else {
  Write-Host "   SERVER DID NOT RESPOND YET" -ForegroundColor Yellow
  Say ""
  Say "   last lines of the log:"
  Say ""
  $logFile = Join-Path $WinDir "server.log"
  if (Test-Path $logFile) {
    Get-Content $logFile -Tail 20 -ErrorAction SilentlyContinue |
      ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
  } else {
    Say "     (no log yet - the task may not have started)"
  }
  Say ""
  Say "   full log: $WinDir\server.log"
}
Say "=============================================="

# ---------- ٩هـ) الوصول من خارج البيت — باختياره ----------
# لا يُنصَّب شيء على جهازه بلا إذن صريح، ولو كان نافعاً. والسؤال
# يُتخطّى صامتاً في التحديثات التلقائية، إذ لا أحد أمام الشاشة حينها.
if ($healthy -and -not $env:KMC_NO_PROMPT) {
  Say ""
  Say "  Access the remote from outside the home?"
  Say "  (installs Tailscale - a private network between your"
  Say "   phone and this laptop; nothing is exposed to the internet)"
  $ans = Read-Host "  type y for yes, anything else to skip"
  if ($ans -match "^\s*[yY]") {
    $tsScript = Join-Path $WinDir "tailscale.ps1"
    if (Test-Path $tsScript) { & $tsScript }
    else { Warn "tailscale.ps1 not found - re-run the installer" }
  } else {
    Say "  skipped - you can run tvremote\windows\tailscale.ps1 later"
  }
}

} catch {
  Write-Host ""
  Write-Host ("  [ERROR] " + $_.Exception.Message) -ForegroundColor Red
  Write-Host ""
}

# ---------- ١٠) الخلاصة بالعربية ----------
# النافذة لا تعرض العربية، فنكتبها ملفاً ونفتحه بالمفكرة.
# مع BOM عمداً: مفكرة ويندوز تعتمده لتعرف أن الملف UTF-8.
try {
  $lines = New-Object Collections.Generic.List[string]
  $lines.Add("خادم ريموت KMC")
  $lines.Add("==============================")
  $lines.Add("")
  if ($healthy) {
    $lines.Add("الخادم يعمل الآن، وسيعمل تلقائياً مع كل إقلاع للّابتوب.")
    $lines.Add("")
    $lines.Add("افتح هذا العنوان من سفاري في الآيفون:")
    foreach ($ip in $ips) { $lines.Add("    http://${ip}:$Port") }
    $lines.Add("")
    $lines.Add("ثم: مشاركة ← إضافة إلى الشاشة الرئيسية، فيصير كتطبيق.")
    $lines.Add("العنوان هو عنوان اللابتوب لا التلفزيون.")
  } else {
    $lines.Add("التنصيب لم يكتمل، أو الخادم لم يستجب بعد.")
    $lines.Add("")
    $lines.Add("راجع السجل:")
    $lines.Add("    $WinDir\server.log")
    $lines.Add("")
    $lines.Add("وإن كان Avast منصّباً فقد يحجب المنفذ — أضف C:\kmc-remote")
    $lines.Add("إلى الاستثناءات: Menu ثم Settings ثم Exceptions.")
  }
  $lines.Add("")
  $lines.Add("------------------------------")
  $lines.Add("الجهاز لن ينام، وإغلاق الغطاء لن يوقفه. الشاشة وحدها تنطفئ")
  $lines.Add("بعد عشر دقائق. الاستهلاك نحو سبعة واط.")
  $lines.Add("")
  $lines.Add("ثبّت عنوان اللابتوب من إعدادات الراوتر (DHCP Reservation)")
  $lines.Add("وإلا تغيّر بعد إعادة تشغيل الراوتر وتوقّف الاختصار في الآيفون.")
  $lines.Add("")
  $lines.Add("أوامر تحتاجها لاحقاً (من PowerShell كمسؤول):")
  $lines.Add("")
  $lines.Add("  هل يعمل؟")
  $lines.Add("    irm http://127.0.0.1:$Port/health")
  $lines.Add("")
  $lines.Add("  إعادة تشغيله")
  $lines.Add("    Stop-ScheduledTask `"$TaskName`"; Start-ScheduledTask `"$TaskName`"")
  $lines.Add("")
  $lines.Add("  السجل")
  $lines.Add("    Get-Content $WinDir\server.log -Tail 40")
  $lines.Add("")
  $lines.Add("الدليل الكامل: $WinDir\WINDOWS.md")

  New-Item -ItemType Directory -Path $Root -Force -ErrorAction SilentlyContinue | Out-Null
  $reportPath = Join-Path $Root "اقرأني.txt"
  [IO.File]::WriteAllLines($reportPath, $lines, (New-Object Text.UTF8Encoding($true)))
  Start-Process -FilePath notepad.exe -ArgumentList "`"$reportPath`""
} catch { }
