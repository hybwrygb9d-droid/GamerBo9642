@echo off
cd /d "%~dp0"
py -3 research\helper.py
if errorlevel 1 echo Install Python 3 from python.org, then try again.
pause
