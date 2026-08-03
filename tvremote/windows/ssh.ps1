#Requires -Version 5
# ============================================================
#  بابُ الطوارئ — صدفةٌ لا تمرّ بخادمنا
#
#  كل زرٍّ في التطبيق يسقط بسقوط الخادم. وقد وقع ذلك فعلاً: علِق قفل
#  التحديث وصاحب البيت في مكتبه، فلم يفكّه إلا القيام إلى اللابتوب.
#
#  فيُفتح بابٌ مستقلّ: OpenSSH في ويندوز، بشرطين لا يُتساهل فيهما:
#    • المنفذ ٢٢ من الشبكة الخاصة وحدها (100.64.0.0/10) — لا من كل
#      وارد، ولا من شبكة البيت. فمن ليس في تِلنِته لا يرى المنفذ
#    • بالمفتاح لا بكلمة المرور — والكلمات تُخمَّن، والمفاتيح لا
#
#  التشغيل (يناديه الخادم، ويصحّ يدوياً):
#    powershell -ExecutionPolicy Bypass -File ssh.ps1 -PublicKey "ssh-ed25519 AAAA... me@iphone"
#
#  ورسائل النافذة إنجليزية — القاعدة الثالثة.
# ============================================================

param(
  [Parameter(Mandatory = $true)]
  [string]$PublicKey
)

$ErrorActionPreference = "Continue"
try { [Console]::OutputEncoding = New-Object Text.UTF8Encoding($false) } catch { }

$Root    = "C:\kmc-remote"
$LogFile = Join-Path $Root "tvremote\windows\ssh.log"
$AuthKeys = "C:\ProgramData\ssh\administrators_authorized_keys"
$SshdCfg  = "C:\ProgramData\ssh\sshd_config"
$TailNet  = "100.64.0.0/10"

function Say ($m) {
  $line = (Get-Date -Format "HH:mm:ss") + "  " + $m
  Write-Host $line
  try { Add-Content -Path $LogFile -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue } catch { }
}
function Ok   ($m) { Say "[ OK ] $m" }
function Warn ($m) { Say "[WARN] $m" }
function Die  ($m) { Say "[FAIL] $m"; throw $m }

try {

New-Item -ItemType Directory -Force -Path (Split-Path $LogFile) -ErrorAction SilentlyContinue | Out-Null
Say "=== enabling emergency SSH ==="

# ---------- ١) الصلاحيات ----------
$me = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal($me)).IsInRole(
             [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { Die "must run as Administrator (the server runs as SYSTEM, so this is normal)" }
Ok "running as $($me.Name)"

# ---------- ٢) المفتاح يُتحقّق منه هنا أيضاً ----------
# الخادم يتحقّق قبل أن ينادي، لكن السكربت يصحّ يدوياً كذلك — فلا
# يُترك التحقّق لمُنادٍ واحد
$PublicKey = $PublicKey.Trim()
if ($PublicKey -match "[\r\n]") { Die "public key must be a single line" }
if ($PublicKey -notmatch '^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(256|384|521)) [A-Za-z0-9+/]{40,}={0,3}( [^\s"''`$;&|<>]{0,64})?$') {
  Die "that is not a valid public key line"
}
Ok "public key looks well formed"

# ---------- ٣) الخدمة ----------
$cap = Get-WindowsCapability -Online -Name "OpenSSH.Server*" -ErrorAction SilentlyContinue |
       Select-Object -First 1
if ($cap -and $cap.State -ne "Installed") {
  Say "installing OpenSSH server feature ..."
  Add-WindowsCapability -Online -Name $cap.Name -ErrorAction Stop | Out-Null
  Ok "feature installed"
} elseif ($cap) {
  Ok "feature already installed"
} else {
  Warn "could not query the OpenSSH capability - trying the service anyway"
}

$svc = Get-Service sshd -ErrorAction SilentlyContinue
if (-not $svc) { Die "sshd service missing - this build of Windows may not ship OpenSSH" }
Set-Service sshd -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service sshd -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
if ((Get-Service sshd).Status -ne "Running") { Die "sshd did not start" }
Ok "sshd running, starts with windows"

# ---------- ٤) المفتاح ----------
# الحساب الذي نصل به مسؤول، وويندوز يقرأ مفاتيح المسؤولين من ملفٍ
# واحد لا من مجلّد المستخدم
New-Item -ItemType Directory -Force -Path (Split-Path $AuthKeys) -ErrorAction SilentlyContinue | Out-Null
$existing = @()
if (Test-Path $AuthKeys) {
  $existing = @(Get-Content $AuthKeys -ErrorAction SilentlyContinue | Where-Object { $_.Trim() })
}
if ($existing -contains $PublicKey) {
  Ok "key already present"
} else {
  $all = @($existing + $PublicKey)
  # بلا BOM: sshd يقرأ الملف بايتاً بايتاً ولا يفهم علامة الترتيب
  [IO.File]::WriteAllLines($AuthKeys, $all, (New-Object Text.UTF8Encoding($false)))
  Ok "key added ($($all.Count) key(s) total)"
}

# صلاحيات هذا الملف شرطٌ عند sshd: إن ورث صلاحيات أوسع رفضه صامتاً
# ولم يقل لماذا — وهي عثرةٌ يضيع فيها وقتٌ طويل. وبالمعرّفات لا
# بالأسماء، فويندوز المعرّب يترجمها.
& icacls $AuthKeys /inheritance:r /grant:r "*S-1-5-18:(F)" "*S-1-5-32-544:(F)" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Ok "key file locked to SYSTEM + Administrators" }
else { Warn "could not tighten the key file - sshd may refuse it" }

# ---------- ٥) بالمفتاح لا بالكلمة ----------
if (Test-Path $SshdCfg) {
  $cfg = Get-Content $SshdCfg -Raw
  $cfg = [regex]::Replace($cfg, '(?im)^\s*#?\s*PasswordAuthentication\s+.*$', 'PasswordAuthentication no')
  if ($cfg -notmatch '(?im)^\s*PasswordAuthentication\s+no') { $cfg += "`r`nPasswordAuthentication no" }
  $cfg = [regex]::Replace($cfg, '(?im)^\s*#?\s*PubkeyAuthentication\s+.*$', 'PubkeyAuthentication yes')
  if ($cfg -notmatch '(?im)^\s*PubkeyAuthentication\s+yes') { $cfg += "`r`nPubkeyAuthentication yes" }
  [IO.File]::WriteAllText($SshdCfg, $cfg, (New-Object Text.UTF8Encoding($false)))
  Restart-Service sshd -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  Ok "password login disabled, key login enabled"
} else {
  Warn "sshd_config not found - password login may still be allowed"
}

# ---------- ٦) الجدار: الشبكة الخاصة وحدها ----------
# ويندوز يفتح قاعدةً عامّة للمنفذ ٢٢ عند تنصيب الخدمة. نُعطّلها
# ونضع مكانها واحدةً مقصورة على مدى تِلنِت — فلا يُطرق المنفذ من
# الإنترنت ولا من شبكة البيت
Get-NetFirewallRule -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -like "*OpenSSH*" -and $_.Direction -eq "Inbound" } |
  ForEach-Object { Disable-NetFirewallRule -Name $_.Name -ErrorAction SilentlyContinue }

& netsh advfirewall firewall delete rule "name=KMC SSH (tailnet)" 2>&1 | Out-Null
& netsh advfirewall firewall add rule "name=KMC SSH (tailnet)" dir=in action=allow `
    protocol=TCP localport=22 "remoteip=$TailNet" profile=any 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Ok "port 22 open to $TailNet only" }
else { Warn "could not add the firewall rule" }

# ---------- ٧) لا نقول تمّ حتى نقيس ----------
# القاعدة الخامسة: النجاح يُقاس بالأثر لا بالردّ
$listening = $false
try {
  $listening = [bool](Get-NetTCPConnection -State Listen -LocalPort 22 -ErrorAction Stop)
} catch {
  $listening = [bool](& netstat -an | Select-String ":22\s.*LISTENING")
}
if (-not $listening) { Die "sshd is running but nothing is listening on port 22" }
Ok "port 22 is listening"

$ts = ""
try { $ts = (& "C:\Program Files\Tailscale\tailscale.exe" ip -4 2>$null | Select-Object -First 1).Trim() } catch { }

# اسم الدخول ليس اسم من يشغّل هذا السكربت: الخادم يناديه بحساب SYSTEM،
# وSYSTEM لا يُدخَل به. فالمفتاح في ملف المسؤولين، ويُدخَل بحساب
# مسؤولٍ حقيقيّ على الجهاز — فنسمّيه له
$who = ""
try {
  $admins = Get-LocalGroupMember -Group "Administrators" -ErrorAction Stop |
            Where-Object { $_.ObjectClass -eq "User" -and $_.Name -notmatch '\\(Administrator|SYSTEM)$' }
  $who = ($admins | Select-Object -First 1).Name -replace '^.*\\', ''
} catch { }
if (-not $who) { $who = $env:USERNAME }

Say ""
Ok "done"
if ($ts) { Say "connect with:  ssh $who@$ts" }
else     { Say "connect with:  ssh $who@<the 100.x address of this laptop>" }
Say "if that user is refused, try another administrator account on this laptop"

}
catch {
  Say "[FAIL] $($_.Exception.Message)"
}
