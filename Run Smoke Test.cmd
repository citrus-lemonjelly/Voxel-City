@echo off
title Voxel City - smoke test
cd /d "%~dp0"
echo Voxel City quick test: parts collision check + game smoke test (about 1 minute)...
echo.
call npm run collide
set CERR=%errorlevel%
echo.
call npm run smoke
if not "%CERR%"=="0" cmd /c exit 1
echo.
if errorlevel 1 (echo  SOMETHING FAILED - take a screenshot of this window and send it to Claude.) else (echo  ALL PASSED - nothing to do.)
echo.
pause
