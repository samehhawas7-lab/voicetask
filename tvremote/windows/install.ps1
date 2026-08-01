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
# ============================================================

# لا نضع ErrorActionPreference على Stop: الأوامر الأصلية مثل npm و robocopy
# تكتب على مجرى الأخطاء في أحوالها العادية، فتُجهض السكربت بلا سبب.
# نتحقّق من كل خطوة صراحةً بدلاً من ذلك.
$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root     = "C:\kmc-remote"
$TvIp     = if ($env:TV_IP) { $env:TV_IP } else { "192.168.8.77" }
$Port     = if ($env:PORT)  { [int]$env:PORT } else { 8099 }
$ZipUrl   = "https://github.com/samehhawas7-lab/voicetask/archive/refs/heads/main.zip"
$TaskName = "KMC TV Remote"

function Say  ($m) { Write-Host $m }
function Ok   ($m) { Write-Host "  [ تم ] $m"   -ForegroundColor Green }
function Warn ($m) { Write-Host "  [تنبيه] $m" -ForegroundColor Yellow }
function Die  ($m) { throw $m }

try {

Say ""
Say "=============================================="
Say "   خادم ريموت KMC — التنصيب"
Say "=============================================="
Say ""

# ---------- ١) الصلاحيات ----------
$me = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal($me)).IsInRole(
             [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Die "شغّل PowerShell بصلاحية المسؤول: زر ويندوز ← اكتب powershell ← بالزر الأيمن ← تشغيل كمسؤول"
}
Ok "الصلاحيات كافية"

# ---------- ٢) Node.js ----------
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) { Die "Node.js غير منصّب. نزّله من nodejs.org ثم أغلق PowerShell وافتحه من جديد" }
$nodeExe = $nodeCmd.Source
Ok ("Node.js " + (& node -v) + "  ($nodeExe)")

# ---------- ٣) جلب المشروع ----------
Say ""
Say "  تنزيل المشروع…"
$tmpZip = Join-Path $env:TEMP "voicetask.zip"
$tmpDir = Join-Path $env:TEMP "voicetask-extract"
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }

try {
  Invoke-WebRequest -Uri $ZipUrl -OutFile $tmpZip -UseBasicParsing -ErrorAction Stop
} catch {
  Die "تعذّر التنزيل من GitHub — تأكد من الإنترنت ومن صحّة تاريخ الجهاز. ($($_.Exception.Message))"
}

try {
  Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force -ErrorAction Stop
} catch {
  Die "تعذّر فكّ الأرشيف. ($($_.Exception.Message))"
}

$src = Join-Path $tmpDir "voicetask-main"
if (-not (Test-Path $src)) { Die "محتوى الأرشيف غير متوقّع" }

New-Item -ItemType Directory -Path $Root -Force | Out-Null
# robocopy يُرجع رموزاً دون 8 عند النجاح (1 = نُسخت ملفات)، فلا نعدّها أخطاء
& robocopy $src $Root /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null
if ($LASTEXITCODE -ge 8) { Die "فشل نسخ الملفات إلى $Root (robocopy $LASTEXITCODE)" }
Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue
Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
Ok "الملفات في $Root"

$WinDir  = Join-Path $Root "tvremote\windows"
$WebosDir = Join-Path $Root "tvremote\webos"
$runCmd  = Join-Path $WinDir "run.cmd"
if (-not (Test-Path $runCmd)) { Die "ما لقيت $runCmd" }

# ---------- ٤) الاعتمادات ----------
Say ""
Say "  تثبيت الاعتمادات (قد يأخذ دقيقة)…"
Push-Location $WebosDir
& npm install --omit=dev --no-audit --no-fund --loglevel=error 2>&1 | Out-Null
$npmCode = $LASTEXITCODE
Pop-Location
if ($npmCode -ne 0 -or -not (Test-Path (Join-Path $WebosDir "node_modules\ws"))) {
  Die "فشل npm install — تأكد من الإنترنت وأعد تشغيل المنصّب"
}
Ok "الاعتمادات جاهزة"

# ---------- ٥) الإعدادات ----------
# بلا BOM: قارئ JSON في Node يرفض الحرف الخفيّ الذي يضيفه Set-Content
$cfgPath = Join-Path $WebosDir "config.json"
$cfgJson = @{ tvIp = $TvIp; tvPort = 3001; port = $Port } | ConvertTo-Json
[IO.File]::WriteAllText($cfgPath, $cfgJson, (New-Object Text.UTF8Encoding($false)))

# مسار node مثبَّت للمهمة: SYSTEM قد يقلع قبل أن يلتقط PATH الجهاز
[IO.File]::WriteAllText((Join-Path $WinDir "node-path.cmd"),
  "set `"NODE_EXE=$nodeExe`"`r`n", (New-Object Text.ASCIIEncoding))
Ok "عنوان التلفزيون: $TvIp   ·   منفذ الخادم: $Port"

# ---------- ٦) منع النوم ----------
# الجهاز النائم لا يخدم أحداً: يُقطع المعالج والشبكة. فنطفئ الشاشة
# ونُبقي الجهاز مستيقظاً — نحو ٧ واط، أي أقل من ريال شهرياً.
Say ""
Say "  ضبط الطاقة…"
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
Ok "لا ينام، وإغلاق الغطاء لا يوقفه"

# بطاقة الشبكة قد تُطفئ نفسها لتوفير الطاقة فينقطع الخادم بلا سبب ظاهر
try {
  Get-NetAdapter -Physical -ErrorAction Stop |
    Where-Object { $_.Status -eq "Up" } |
    Disable-NetAdapterPowerManagement -NoRestart -ErrorAction SilentlyContinue
  Ok "بطاقة الشبكة لن تُطفأ لتوفير الطاقة"
} catch {
  Warn "تعذّر ضبط بطاقة الشبكة — غير حرج"
}

# ---------- ٧) جدار الحماية ----------
# الوسائط تُمرَّر مقتبسةً كاملةً: اسم القاعدة فيه مسافات، ولولا ذلك
# لقسّمها PowerShell وسائطَ منفصلة فتفشل netsh بصمت
Say ""
& netsh advfirewall firewall delete rule "name=$TaskName" 2>&1 | Out-Null
& netsh advfirewall firewall add rule "name=$TaskName" dir=in action=allow `
    protocol=TCP "localport=$Port" profile=any 2>&1 | Out-Null
Ok "المنفذ $Port مفتوح للشبكة المحلية"

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
    -Description "خادم ريموت تلفزيون KMC" -ErrorAction Stop | Out-Null
Ok "سيعمل تلقائياً مع كل إقلاع"

# ---------- ٩) التشغيل والتحقّق ----------
Say ""
Say "  تشغيل الخادم…"
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 6

$healthy = $false
foreach ($try in 1..5) {
  try {
    $r = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 4 -ErrorAction Stop
    if ($r.ok) { $healthy = $true; break }
  } catch { Start-Sleep -Seconds 3 }
}

$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
       Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
       Select-Object -ExpandProperty IPAddress

Say ""
Say "=============================================="
if ($healthy) {
  Write-Host "   الخادم يعمل" -ForegroundColor Green
  Say ""
  Say "   افتح من الآيفون:"
  foreach ($ip in $ips) { Write-Host "      http://$ip`:$Port" -ForegroundColor Cyan }
} else {
  Write-Host "   الخادم لم يستجب بعد" -ForegroundColor Yellow
  Say ""
  Say "   راجع السجل:"
  Say "      notepad $WinDir\server.log"
  Say ""
  Say "   وإن كان Avast منصّباً فقد يحجب المنفذ — راجع WINDOWS.md"
}
Say "=============================================="
Say ""
Say "  ثبّت عنوان اللابتوب من إعدادات الراوتر (DHCP Reservation)"
Say "  وإلا تغيّر بعد إعادة تشغيل الراوتر وتوقّف الاختصار في الآيفون."
Say ""

} catch {
  Write-Host ""
  Write-Host ("  [خطأ] " + $_.Exception.Message) -ForegroundColor Red
  Write-Host ""
}
