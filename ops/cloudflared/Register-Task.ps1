# Register-Task.ps1
# Windows 작업 스케줄러에 "로그온 시 cloudflared 자동 시작" 작업을 등록한다.
# 반드시 관리자 권한 PowerShell에서 1회 실행:
#   powershell -ExecutionPolicy Bypass -File .\Register-Task.ps1
#
# 동작: 로그온 시 + 1시간마다 start-cloudflared.ps1 실행(이미 떠 있으면 아무 일 안 함 = idempotent).

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Launcher  = Join-Path $ScriptDir "start-cloudflared.ps1"
$TaskName  = "Cloudflared-Tunnel-Autostart"

$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Launcher`""

# 트리거: 로그온 시 1회 + 1시간마다 재확인(터널이 죽어도 다음 정각에 자동 복구)
$AtLogon = New-ScheduledTaskTrigger -AtLogOn
$Repeat  = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration ([TimeSpan]::MaxValue)

$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew

$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $Action `
  -Trigger @($AtLogon, $Repeat) -Settings $Settings -Principal $Principal -Force

Write-Host "등록 완료: $TaskName"
Write-Host "지금 즉시 한 번 실행해서 복구하려면:"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
