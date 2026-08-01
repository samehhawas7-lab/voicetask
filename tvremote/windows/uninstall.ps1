# ============================================================
#  إزالة خادم ريموت KMC من ويندوز
#
#  يوقف المهمة ويحذفها، ويزيل قاعدة جدار الحماية، ويعيد إعدادات
#  الطاقة إلى سلوك اللابتوب المعتاد. الملفات في C:\kmc-remote تبقى
#  ما لم تمرّر -Purge.
#
#  التشغيل من PowerShell بصلاحية المسؤول:
#    powershell -ExecutionPolicy Bypass -File C:\kmc-remote\tvremote\windows\uninstall.ps1
# ============================================================

param([switch]$Purge)

$ErrorActionPreference = "Continue"
$TaskName = "KMC TV Remote"
$Root = "C:\kmc-remote"

$admin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
         ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
  Write-Host "شغّل PowerShell بصلاحية المسؤول" -ForegroundColor Red
  exit 1
}

Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  [ تم ] أُوقفت المهمة وحُذفت" -ForegroundColor Green

& netsh advfirewall firewall delete rule "name=$TaskName" 2>&1 | Out-Null
Write-Host "  [ تم ] أُزيلت قاعدة جدار الحماية" -ForegroundColor Green

# إعادة سلوك اللابتوب المعتاد: ينام بعد نصف ساعة، وإغلاق الغطاء يُنيمه
$LID_SUB = "4f971e89-eebd-4455-a8de-9e59040e7347"
$LID_ACT = "5ca83367-6e45-459f-a27b-476b1d01c936"
& powercfg /change standby-timeout-ac 30 | Out-Null
& powercfg /change monitor-timeout-ac 10 | Out-Null
& powercfg /setacvalueindex SCHEME_CURRENT $LID_SUB $LID_ACT 1 | Out-Null
& powercfg /setdcvalueindex SCHEME_CURRENT $LID_SUB $LID_ACT 1 | Out-Null
& powercfg /setactive SCHEME_CURRENT | Out-Null
Write-Host "  [ تم ] أُعيدت إعدادات الطاقة" -ForegroundColor Green

if ($Purge -and (Test-Path $Root)) {
  Remove-Item $Root -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host "  [ تم ] حُذف $Root" -ForegroundColor Green
} elseif (Test-Path $Root) {
  Write-Host "  الملفات باقية في $Root — أضف -Purge لحذفها" -ForegroundColor Yellow
}

Write-Host ""
