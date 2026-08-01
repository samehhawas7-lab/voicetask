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
$TaskName = "KMC TV Remote"

function Say  ($m) { Write-Host $m }
function Ok   ($m) { Write-Host "  [ OK ] $m"   -ForegroundColor Green }
function Warn ($m) { Write-Host "  [WARN] $m"   -ForegroundColor Yellow }
function Die  ($m) { throw $m }

$healthy = $false
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
  Invoke-WebRequest -Uri $ZipUrl -OutFile $tmpZip -UseBasicParsing -ErrorAction Stop
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
# robocopy يُرجع رموزاً دون 8 عند النجاح (1 = نُسخت ملفات)، فلا نعدّها أخطاء
& robocopy $src $Root /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null
if ($LASTEXITCODE -ge 8) { Die "copy to $Root failed (robocopy $LASTEXITCODE)" }
Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue
Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
Ok "files in $Root"

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
if (-not (Test-Path (Join-Path $WebosDir "node_modules\ws"))) {
  Die "npm install failed (exit $npmCode) - check internet and rerun"
}
Ok "dependencies ready"

# ---------- ٥) الإعدادات ----------
# بلا BOM: قارئ JSON في Node يرفض الحرف الخفيّ الذي يضيفه Set-Content
$cfgPath = Join-Path $WebosDir "config.json"
$cfgJson = @{ tvIp = $TvIp; tvPort = 3001; port = $Port } | ConvertTo-Json
[IO.File]::WriteAllText($cfgPath, $cfgJson, (New-Object Text.UTF8Encoding($false)))

# مسار node مثبَّت للمهمة: SYSTEM قد يقلع قبل أن يلتقط PATH الجهاز
[IO.File]::WriteAllText((Join-Path $WinDir "node-path.cmd"),
  "set `"NODE_EXE=$nodeExe`"`r`n", (New-Object Text.ASCIIEncoding))
Ok "TV $TvIp  ·  server port $Port"

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
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings `
    -Description "KMC TV Remote home server" -ErrorAction Stop | Out-Null
Ok "registered to start with Windows"

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
} else {
  Write-Host "   SERVER DID NOT RESPOND YET" -ForegroundColor Yellow
  Say ""
  Say "   log: $WinDir\server.log"
}
Say "=============================================="

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
