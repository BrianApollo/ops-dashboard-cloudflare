@echo off
title AdsPower bridge
rem Runs the AdsPower bridge. Uses adspower-bridge.ps1 next to this file if present,
rem otherwise downloads the latest copy from the dashboard.
set "PS1=%~dp0adspower-bridge.ps1"
if not exist "%PS1%" (
  set "PS1=%TEMP%\adspower-bridge.ps1"
  echo Downloading the bridge script...
  powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing 'https://app.accotta.com/adspower-bridge.ps1' -OutFile '%TEMP%\adspower-bridge.ps1'"
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
pause
