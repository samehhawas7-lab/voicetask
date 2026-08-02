#Requires -Version 5
# ============================================================
#  الوصول إلى البيت من خارجه — بلا فتح باب في الراوتر
#
#  الراوتر يمنع الوارد، وراوترات الجيل الخامس المنزلية غالباً خلف
#  CGNAT فلا عنوان عامّ لها يُطرق عليه. فالحلّ عكسيّ: يخرج اللابتوب
#  بنفسه فيتصل، ويخرج الجوّال كذلك، فيلتقيان في شبكة خاصة مشفّرة.
#
#  ولا شيء يُوضع على الإنترنت: من لا يملك الحساب لا يرى اللابتوب،
#  بل لا يعرف أنه موجود. وهذا مقصود — فالخادم يُشغّل منصّباً بصلاحية
#  النظام، ووضعُ مثله على الإنترنت المكشوف لا يُحتمل.
#
#  التشغيل من PowerShell بصلاحية المسؤول:
#    irm https://raw.githubusercontent.com/samehhawas7-lab/voicetask/main/tvremote/windows/tailscale.ps1 | iex
#
#  ورسائل النافذة إنجليزية عمداً — القاعدة الثالثة. والخلاصة العربية
#  تُكتب في ملف يُفتح بالمفكرة في آخره.
# ============================================================

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try { [Console]::OutputEncoding = New-Object Text.UTF8Encoding($false) } catch { }

$Root    = "C:\kmc-remote"
$Port    = if ($env:PORT) { [int]$env:PORT } else { 8099 }
$AuthKey = $env:TS_AUTHKEY
$MsiUrl  = "https://pkgs.tailscale.com/stable/tailscale-setup-latest-amd64.msi"
$Exe     = "C:\Program Files\Tailscale\tailscale.exe"

function Say  ($m) { Write-Host $m }
function Ok   ($m) { Write-Host "  [ OK ] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  [WARN] $m" -ForegroundColor Yellow }
function Die  ($m) { throw $m }

$tsIp = ""

try {

Say ""
Say "=============================================="
Say "   KMC Remote - access from outside the home"
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

# ---------- ٢) التنصيب ----------
# ويندوز على هذا اللابتوب ٦٤ بت، والحزمة تُنصَّب صامتةً فتُسجّل نفسها
# خدمةً تلقائية — وهو ما نريد: تعمل قبل تسجيل الدخول لا بعده
if (Test-Path $Exe) {
  Ok "tailscale already installed"
} else {
  $msi = Join-Path $env:TEMP "tailscale-setup.msi"
  Say "  downloading tailscale ..."
  try {
    Invoke-WebRequest -Uri $MsiUrl -OutFile $msi -UseBasicParsing -ErrorAction Stop
  } catch {
    Die "download failed: $($_.Exception.Message)"
  }
  # TS_UNATTENDEDMODE=always يبقي الاتصال قائماً بلا مستخدم مسجَّل —
  # ولولاه لسقط الوصول كلما أُقفل الجهاز، وهو حاله أكثر الوقت
  $p = Start-Process msiexec.exe -Wait -PassThru -ArgumentList @(
        "/i", "`"$msi`"", "/quiet", "/norestart", "TS_UNATTENDEDMODE=always")
  Remove-Item $msi -Force -ErrorAction SilentlyContinue
  # 3010 يعني «تمّ ويطلب إعادة تشغيل» — والخدمة تعمل قبلها، فلا يُعدّ فشلاً
  if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) {
    Die "installer exited with $($p.ExitCode)"
  }
  if (-not (Test-Path $Exe)) { Die "installed but tailscale.exe not found" }
  Ok "tailscale installed"
}

# ---------- ٣) الخدمة تعمل مع الإقلاع ----------
# القاعدة الرابعة: لا يُترك إعداد يُظنّ صحيحاً — يُضبط ويُتحقّق منه
$svc = Get-Service Tailscale -ErrorAction SilentlyContinue
if (-not $svc) { Die "Tailscale service missing after install" }
Set-Service Tailscale -StartupType Automatic -ErrorAction SilentlyContinue
if ($svc.Status -ne "Running") { Start-Service Tailscale -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 3
$svc = Get-Service Tailscale -ErrorAction SilentlyContinue
if ($svc.Status -ne "Running") { Die "Tailscale service did not start" }
Ok "service running, starts with windows"

# ---------- ٤) الدخول ----------
# المفتاح يأتي من متغيّر بيئة لا من وسيط سطر أوامر: الوسائط تُسجَّل في
# سجلّ الأوامر، والمفتاح سرّ. وإن لم يُعطَ فُتح المتصفح ليدخل بنفسه.
# قبل الدخول يخرج status بلا JSON صالح أحياناً، فلا يُترك ليُجهض
$already = $false
try {
  $state = (& $Exe status --json 2>$null) -join "" | ConvertFrom-Json -ErrorAction Stop
  $already = ($state.BackendState -eq "Running")
} catch { $already = $false }

if ($already) {
  Ok "already signed in"
} elseif ($AuthKey) {
  Say "  signing in with auth key ..."
  & $Exe up --authkey="$AuthKey" --hostname=kmc --accept-dns=false 2>&1 | Out-Null
} else {
  Say ""
  Say "  a browser will open - sign in with the SAME account"
  Say "  you used on your iPhone, then come back here."
  Say ""
  & $Exe up --hostname=kmc --accept-dns=false 2>&1 | Out-Null
}

# ---------- ٥) نتحقّق أنه اتصل فعلاً ----------
# لا يُقال «تمّ» ثم يجد الجهاز خلافه — يُنتظر العنوان ويُقرأ
$tsIp = ""
foreach ($i in 1..20) {
  $out = & $Exe ip -4 2>$null
  if ($out) { $tsIp = ($out | Select-Object -First 1).Trim() }
  if ($tsIp -match "^100\.") { break }
  Start-Sleep -Seconds 2
}
if ($tsIp -notmatch "^100\.") { Die "signed in but no address yet - run 'tailscale status' to check" }
Ok "address on your private network: $tsIp"

# ---------- ٦) جدار الحماية ----------
# قاعدة المنفذ في المنصِّب profile=any فتشمل البطاقة الجديدة. لكن
# ويندوز قد يصنّف الشبكة الجديدة عامّةً ويشدّد عليها، فنُضيف قاعدة
# مقصورة على مدى الشبكة الخاصة وحده — لا على الإنترنت كلّه
& netsh advfirewall firewall delete rule "name=KMC TV Remote (tailnet)" 2>&1 | Out-Null
& netsh advfirewall firewall add rule "name=KMC TV Remote (tailnet)" dir=in action=allow `
    protocol=TCP "localport=$Port" "remoteip=100.64.0.0/10" profile=any 2>&1 | Out-Null
Ok "port $Port reachable from your private network only"

# ---------- ٧) نتأكّد أن الخادم يُجيب على العنوان الجديد ----------
$reached = $false
try {
  $r = Invoke-WebRequest -Uri "http://${tsIp}:$Port/health" -UseBasicParsing -TimeoutSec 8
  $reached = ($r.StatusCode -eq 200)
} catch { }
if ($reached) { Ok "server answers on $tsIp" }
else { Warn "server did not answer yet - it may still be starting" }

Say ""
Say "=============================================="
Say "   done - open this on your phone, anywhere:"
Say "   http://${tsIp}:$Port"
Say "=============================================="
Say ""

}
catch {
  Say ""
  Write-Host "  [FAIL] $($_.Exception.Message)" -ForegroundColor Red
  Say ""
}

# ---------- الخلاصة بالعربية ----------
# القاعدة الثالثة: العربية حيث تُقرأ. النافذة تُشوّهها، والمفكرة لا
$lines = @()
if ($tsIp -match "^100\.") {
  $lines += "تمّ. صار بيتك يوصَل من أي مكان."
  $lines += ""
  $lines += "العنوان — احفظه في شاشة جوّالك الرئيسية:"
  $lines += ""
  $lines += "    http://${tsIp}:$Port"
  $lines += ""
  $lines += "وهذا العنوان يعمل في البيت وخارجه سواء، فلا تحتاج عنوانين."
  $lines += ""
  $lines += "يبقى شرط واحد: أن يكون Tailscale مفتوحاً في جوّالك."
  $lines += "افتح تطبيقه مرّة وفعّل المفتاح، ثم انسه — يبقى شغّالاً."
  $lines += ""
  $lines += "ولا شيء من هذا مفتوح على الإنترنت: من لا يدخل بحسابك"
  $lines += "لا يرى اللابتوب أصلاً."
} else {
  $lines += "لم يكتمل الإعداد."
  $lines += ""
  $lines += "افتح PowerShell بصلاحية المسؤول واكتب:"
  $lines += ""
  $lines += "    & 'C:\Program Files\Tailscale\tailscale.exe' status"
  $lines += ""
  $lines += "وأرسل لي ما ظهر."
}
$readme = Join-Path $Root "اقرأني-الوصول-من-الخارج.txt"
try {
  New-Item -ItemType Directory -Force -Path $Root -ErrorAction SilentlyContinue | Out-Null
  $lines -join "`r`n" | Out-File -FilePath $readme -Encoding UTF8
  Start-Process notepad.exe $readme
} catch { }
