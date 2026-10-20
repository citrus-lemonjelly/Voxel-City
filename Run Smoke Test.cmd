@echo off
title Voxel City - smoke test
cd /d "%~dp0"
echo Voxel City quick test (about 1 minute)...
echo.
call npm run smoke
echo.
if errorlevel 1 (echo  SOMETHING FAILED - take a screenshot of this window and send it to Claude.) else (echo  ALL PASSED - nothing to do.)
echo.
pause
