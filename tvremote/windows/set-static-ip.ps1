# ============================================================
#  تثبيت عنوان اللابتوب على الشبكة
#
#  عنوان اللابتوب هو ما تكتبه في الآيفون، فإن تبدّل توقّف الاختصار.
#  والراوترات المنزلية للجيل الخامس كثيراً ما تخلو من حجز العناوين،
#  فنثبّته من ويندوز بدلاً منها.
#
#  تكتشف الأداة كل شيء بنفسها — البطاقة والبوّابة وقناع الشبكة — فلا
#  يُطلب من أحد كتابة اسم بطاقةٍ عربيٍّ مشوّه في نافذة لا تعرض العربية.
#  وتتحقّق بعد التغيير من بقاء الاتصال، وترجع تلقائياً إن انقطع.
#
#  التشغيل من PowerShell بصلاحية المسؤول:
#    powershell -ExecutionPolicy Bypass -File C:\kmc-remote\tvremote\windows\set-static-ip.ps1
#
#  وللرجوع إلى التوزيع التلقائي:
#    ... set-static-ip.ps1 -Revert
#
#  رسائل النافذة إنجليزية عمداً: نافذة PowerShell الكلاسيكية لا تعرض
#  العربية وتحوّلها رموزاً.
# ============================================================

param(
  [switch]$Revert,
  [string]$Address = "",     # لفرض عنوان بعينه بدل الاختيار التلقائي
  [int]$Port = 8099
)

$ErrorActionPreference = "Continue"

function Ok   ($m) { Write-Host "  [ OK ] $m"  -ForegroundColor Green }
function Warn ($m) { Write-Host "  [WARN] $m"  -ForegroundColor Yellow }
function Fail ($m) { Write-Host "  [ERROR] $m" -ForegroundColor Red }

$me = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not (New-Object Security.Principal.WindowsPrincipal($me)).IsInRole(
           [Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Fail "Run PowerShell as Administrator"
  exit 1
}

# ---------- البطاقة الموصولة بالإنترنت ----------
# نعرفها من وجود بوّابة افتراضية، لا من اسمها: الأسماء تتغيّر بلغة ويندوز
$cfg = Get-NetIPConfiguration |
       Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
       Select-Object -First 1

if (-not $cfg) { Fail "no connected adapter with a gateway found"; exit 1 }

$idx     = $cfg.InterfaceIndex
$adapter = $cfg.NetAdapter.Name
$gateway = $cfg.IPv4DefaultGateway.NextHop
$current = $cfg.IPv4Address.IPAddress
$prefix  = (Get-NetIPAddress -InterfaceIndex $idx -AddressFamily IPv4 |
            Select-Object -First 1).PrefixLength
if (-not $prefix) { $prefix = 24 }

Write-Host ""
Write-Host "  adapter : $adapter (index $idx)"
Write-Host "  current : $current/$prefix"
Write-Host "  gateway : $gateway"
Write-Host ""

function Set-Dhcp {
  Set-NetIPInterface -InterfaceIndex $idx -AddressFamily IPv4 -Dhcp Enabled -ErrorAction SilentlyContinue
  Set-DnsClientServerAddress -InterfaceIndex $idx -ResetServerAddresses -ErrorAction SilentlyContinue
  Get-NetAdapter -InterfaceIndex $idx | Restart-NetAdapter -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 6
}

if ($Revert) {
  Set-Dhcp
  $now = (Get-NetIPConfiguration -InterfaceIndex $idx).IPv4Address.IPAddress
  Ok "back to automatic addressing - now $now"
  Write-Host ""
  exit 0
}

# ---------- اختيار عنوان حرّ ----------
# نبدأ من 210: موزّع الراوتر يقف عادةً عند 200، فما فوقه أسلم من التصادم
function Alive($ip) {
  try { (New-Object Net.NetworkInformation.Ping).Send($ip, 400).Status -eq "Success" }
  catch { $false }
}

$base = ($gateway -split "\.")[0..2] -join "."
$target = $Address

if (-not $target) {
  Write-Host "  looking for a free address..."
  foreach ($n in @(210..250) + @(60..99)) {
    $cand = "$base.$n"
    if ($cand -eq $current) { $target = $cand; break }   # عنواننا الحالي أولى
    if (-not (Alive $cand)) { $target = $cand; break }
  }
}
if (-not $target) { Fail "no free address found in $base.x"; exit 1 }
Ok "chosen address: $target"

# ---------- التطبيق ----------
Write-Host ""
Write-Host "  applying (the network will blink)..."
Set-NetIPInterface -InterfaceIndex $idx -AddressFamily IPv4 -Dhcp Disabled -ErrorAction SilentlyContinue
Get-NetIPAddress -InterfaceIndex $idx -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Remove-NetIPAddress -Confirm:$false -ErrorAction SilentlyContinue
Remove-NetRoute -InterfaceIndex $idx -DestinationPrefix "0.0.0.0/0" -Confirm:$false -ErrorAction SilentlyContinue

New-NetIPAddress -InterfaceIndex $idx -IPAddress $target -PrefixLength $prefix `
                 -DefaultGateway $gateway -ErrorAction SilentlyContinue | Out-Null
Set-DnsClientServerAddress -InterfaceIndex $idx -ServerAddresses $gateway -ErrorAction SilentlyContinue
Start-Sleep -Seconds 4

# ---------- التحقّق، وإلا فالرجوع ----------
# لا نترك جهازاً بلا شبكة: إن لم تردّ البوّابة رجعنا إلى التوزيع التلقائي
$reachable = $false
foreach ($try in 1..4) {
  if (Alive $gateway) { $reachable = $true; break }
  Start-Sleep -Seconds 2
}

if (-not $reachable) {
  Warn "gateway unreachable - rolling back to automatic"
  Set-Dhcp
  $now = (Get-NetIPConfiguration -InterfaceIndex $idx).IPv4Address.IPAddress
  Fail "static address failed; back on $now. Try -Address with another number."
  exit 1
}

Ok "gateway reachable - address is permanent now"

# ---------- الخلاصة ----------
Write-Host ""
Write-Host "=============================================="
Write-Host "   LAPTOP ADDRESS FIXED" -ForegroundColor Green
Write-Host ""
Write-Host "   open on your iPhone:"
Write-Host "      http://${target}:$Port" -ForegroundColor Cyan
Write-Host "=============================================="
Write-Host ""

try {
  $lines = @(
    "عنوان اللابتوب صار ثابتاً",
    "==============================",
    "",
    "العنوان الجديد: $target",
    "",
    "افتح هذا من سفاري في الآيفون، واحذف الاختصار القديم:",
    "",
    "    http://${target}:$Port",
    "",
    "لن يتغيّر بعد اليوم مهما أُعيد تشغيل الراوتر.",
    "",
    "أما التلفزيون فلا يحتاج تثبيتاً — الخادم يبحث عنه في الشبكة",
    "ويجده مهما تبدّل عنوانه.",
    "",
    "------------------------------",
    "للرجوع إلى التوزيع التلقائي (من PowerShell كمسؤول):",
    "",
    "  powershell -ExecutionPolicy Bypass -File $PSCommandPath -Revert"
  )
  $out = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) "العنوان-الجديد.txt"
  [IO.File]::WriteAllLines($out, $lines, (New-Object Text.UTF8Encoding($true)))
  Start-Process -FilePath notepad.exe -ArgumentList "`"$out`""
} catch { }
