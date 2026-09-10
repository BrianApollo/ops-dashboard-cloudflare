@echo off
title AdsPower bridge
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0adspower-bridge.ps1"
pause
