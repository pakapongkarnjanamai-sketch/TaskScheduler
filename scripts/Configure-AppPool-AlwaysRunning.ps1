<#
.SYNOPSIS
    ตั้งค่า IIS App Pool ของ TaskScheduler API ให้ทำงานตลอดเวลา
    เพื่อแก้ปัญหา SchedulerWorker (BackgroundService) หยุดทำงานเมื่อ IIS Idle Timeout

.DESCRIPTION
    สาเหตุที่ Task ไม่รันตาม Schedule:
    - IIS App Pool มี Idle Timeout ค่าเริ่มต้น 20 นาที
    - เมื่อไม่มี HTTP request เข้ามา IIS จะ shutdown worker process
    - SchedulerWorker (BackgroundService) จึงถูกหยุดไปด้วย

    Script นี้จะแก้โดย:
    1. Idle Timeout = 0         (ปิด auto-shutdown เมื่อไม่มี traffic)
    2. Start Mode = AlwaysRunning   (เริ่ม process ทันทีหลัง recycle หรือ IIS restart)
    3. preloadEnabled = true    (ให้ IIS warmup application หลัง process start)
    4. Periodic Recycle = 0     (ปิด scheduled recycle ที่ทำให้ worker หยุดชั่วคราว)

.PARAMETER SiteName
    ชื่อ IIS Site ที่ deploy TaskScheduler ไว้ (ค่าเริ่มต้น: 'Default Web Site')

.PARAMETER AppRelativePath
    Path ของ Application ภายใน Site ที่เป็น API service
    (ค่าเริ่มต้น: 'Tools/TaskScheduler/Service')

.PARAMETER AppPoolName
    กำหนด App Pool Name โดยตรง (ถ้าไม่กำหนดจะ auto-detect จาก AppRelativePath)

.EXAMPLE
    # รันด้วย parameter ค่าเริ่มต้น (ต้องรันในฐานะ Administrator บน production server)
    .\Configure-AppPool-AlwaysRunning.ps1

.EXAMPLE
    # ระบุ Site และ Path เองถ้าโครงสร้าง IIS แตกต่างออกไป
    .\Configure-AppPool-AlwaysRunning.ps1 -SiteName 'Default Web Site' -AppRelativePath 'Tools/TaskScheduler/Service'

.NOTES
    ต้องรันในฐานะ Administrator บน production server (ap-ntc2138-qawb)
    ต้องการ: IIS Application Initialization feature (เปิดใช้ผ่าน Windows Features)
    หลัง script รัน ให้ทำ iisreset หรือ Recycle App Pool แล้วตรวจสอบ Worker Event Log
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$SiteName = 'Default Web Site',
    [string]$AppRelativePath = 'Tools/TaskScheduler/Service',
    [string]$AppPoolName = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

#region ── Prerequisites ─────────────────────────────────────────────────────

# ตรวจสอบว่ารันในฐานะ Administrator
$currentPrincipal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Script นี้ต้องรันในฐานะ Administrator (Run as Administrator)'
}

# โหลด WebAdministration module (IIS PowerShell)
Import-Module WebAdministration -ErrorAction Stop

#endregion

#region ── Detect App Pool ───────────────────────────────────────────────────

if ([string]::IsNullOrWhiteSpace($AppPoolName)) {
    # Normalize path: ลบ leading slash ออก เพราะ Get-WebApplication ใช้ path แบบ '/Tools/...'
    $normalizedAppPath = '/' + $AppRelativePath.TrimStart('/')

    Write-Host "ค้นหา IIS Application: Site='$SiteName', Path='$normalizedAppPath'" -ForegroundColor Cyan

    $webApp = Get-WebApplication -Site $SiteName | Where-Object { $_.Path -eq $normalizedAppPath }

    if (-not $webApp) {
        Write-Host ""
        Write-Host "ไม่พบ Application ที่ path '$normalizedAppPath' บน site '$SiteName'" -ForegroundColor Yellow
        Write-Host "Applications ที่พบบน site '$SiteName':" -ForegroundColor Yellow
        Get-WebApplication -Site $SiteName | Select-Object Path, ApplicationPool | Format-Table -AutoSize
        throw "ระบุ -AppRelativePath หรือ -AppPoolName ให้ตรงกับ IIS configuration"
    }

    $AppPoolName = $webApp.ApplicationPool
    Write-Host "พบ App Pool: '$AppPoolName'" -ForegroundColor Green
}
else {
    Write-Host "ใช้ App Pool ที่กำหนด: '$AppPoolName'" -ForegroundColor Cyan
    $webApp = $null
}

# ตรวจสอบว่า App Pool มีอยู่จริง
$appPoolPath = "IIS:\AppPools\$AppPoolName"
if (-not (Test-Path $appPoolPath)) {
    throw "ไม่พบ App Pool '$AppPoolName' บน IIS"
}

#endregion

#region ── แสดงค่าปัจจุบัน ─────────────────────────────────────────────────

Write-Host ""
Write-Host "─── ค่าปัจจุบันของ App Pool '$AppPoolName' ───" -ForegroundColor Yellow

$currentPool = Get-ItemProperty $appPoolPath
$currentIdleTimeout = $currentPool.processModel.idleTimeout
$currentStartMode   = $currentPool.startMode
$currentRecycleTime = $currentPool.recycling.periodicRestart.time

Write-Host "  Idle Timeout:     $currentIdleTimeout"
Write-Host "  Start Mode:       $currentStartMode"
Write-Host "  Recycle Interval: $currentRecycleTime"

if ($webApp) {
    $appConfigPath = "IIS:\Sites\$SiteName$($webApp.Path)"
    $currentPreload = (Get-ItemProperty $appConfigPath -Name preloadEnabled -ErrorAction SilentlyContinue)
    Write-Host "  preloadEnabled:   $($currentPreload.Value)"
}

Write-Host ""

#endregion

#region ── Apply Settings ────────────────────────────────────────────────────

Write-Host "─── กำลังตั้งค่า App Pool สำหรับ Always-Running ───" -ForegroundColor Cyan

# 1. ปิด Idle Timeout (ตั้งเป็น 0 หมายความว่าไม่มี timeout)
if ($PSCmdlet.ShouldProcess($AppPoolName, 'Set Idle Timeout = 0 (Disabled)')) {
    Set-ItemProperty $appPoolPath -Name processModel.idleTimeout -Value '00:00:00'
    Write-Host "  [OK] Idle Timeout       = 0 (Disabled)" -ForegroundColor Green
}

# 2. ตั้ง Start Mode เป็น AlwaysRunning (ต้องการ Application Initialization feature)
if ($PSCmdlet.ShouldProcess($AppPoolName, 'Set Start Mode = AlwaysRunning')) {
    Set-ItemProperty $appPoolPath -Name startMode -Value 'AlwaysRunning'
    Write-Host "  [OK] Start Mode         = AlwaysRunning" -ForegroundColor Green
}

# 3. ปิด Periodic Recycle (ถ้าต้องการ recycle ให้ตั้งเวลาจำเพาะแทน เช่น 03:00 ตี 3)
if ($PSCmdlet.ShouldProcess($AppPoolName, 'Set Periodic Recycle Interval = 0 (Disabled)')) {
    Set-ItemProperty $appPoolPath -Name recycling.periodicRestart.time -Value '00:00:00'
    Write-Host "  [OK] Periodic Recycle   = 0 (Disabled)" -ForegroundColor Green
}

# 4. เปิด preloadEnabled บน IIS Application (ถ้าระบุ AppRelativePath)
if ($webApp) {
    $appConfigPath = "IIS:\Sites\$SiteName$($webApp.Path)"
    if ($PSCmdlet.ShouldProcess($appConfigPath, 'Set preloadEnabled = True')) {
        Set-ItemProperty $appConfigPath -Name preloadEnabled -Value $true
        Write-Host "  [OK] preloadEnabled     = True" -ForegroundColor Green
    }
}
else {
    Write-Host "  [SKIP] preloadEnabled — ไม่ได้ระบุ AppRelativePath, ข้ามขั้นตอนนี้" -ForegroundColor Yellow
    Write-Host "         ถ้าต้องการตั้งค่า ให้รันอีกครั้งด้วย -AppRelativePath" -ForegroundColor Yellow
}

#endregion

#region ── Verify ────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "─── ค่าหลังการตั้งค่า ───" -ForegroundColor Yellow

$updatedPool = Get-ItemProperty $appPoolPath
Write-Host "  Idle Timeout:     $($updatedPool.processModel.idleTimeout)"
Write-Host "  Start Mode:       $($updatedPool.startMode)"
Write-Host "  Recycle Interval: $($updatedPool.recycling.periodicRestart.time)"

if ($webApp) {
    $updatedPreload = Get-ItemProperty $appConfigPath -Name preloadEnabled -ErrorAction SilentlyContinue
    Write-Host "  preloadEnabled:   $($updatedPreload.Value)"
}

#endregion

#region ── Next Steps ────────────────────────────────────────────────────────

Write-Host ""
Write-Host "─── ขั้นตอนถัดไป ───" -ForegroundColor Cyan
Write-Host "  1. ตรวจสอบว่า 'Application Initialization' Windows Feature ถูกเปิดใช้แล้ว:"
Write-Host "     Get-WindowsFeature Web-AppInit"
Write-Host ""
Write-Host "  2. Recycle App Pool เพื่อให้ค่าที่ตั้งมีผล:"
Write-Host "     Restart-WebAppPool -Name '$AppPoolName'"
Write-Host ""
Write-Host "  3. ตรวจสอบว่า Process ทำงานอยู่:"
Write-Host "     Get-Process -Name 'dotnet' -ErrorAction SilentlyContinue"
Write-Host ""
Write-Host "  4. ดู Windows Event Log หรือ IIS stdout log เพื่อยืนยัน SchedulerWorker Started:"
Write-Host "     Get-EventLog -LogName Application -Source 'IIS*' -Newest 20"

#endregion

Write-Host ""
Write-Host "ตั้งค่า App Pool สำเร็จ" -ForegroundColor Green
