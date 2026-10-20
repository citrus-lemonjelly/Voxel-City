@echo off
title Voxel City - Ship It
cd /d "%~dp0"
echo Voxel City SHIP IT: version check, sim, collisions, build, smoke test, then push to the website (about 2 minutes)...
echo.
call node tools/ship.mjs %*
echo.
if errorlevel 1 (echo  NOT SHIPPED - take a screenshot of this window and send it to Claude.) else (echo  SHIPPED - the website updates in about a minute.)
echo.
pause
