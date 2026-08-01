@echo off
REM ============================================================
REM  KMC TV Remote - server loop
REM
REM  Kept in plain ASCII on purpose: cmd.exe mangles non-Latin
REM  text depending on the console code page, and this file runs
REM  unattended as SYSTEM where nobody is watching the output.
REM  All Arabic-facing messages live in the .ps1 scripts instead.
REM
REM  Restarts the server if it ever exits, and trims the log so a
REM  machine left running for months cannot fill a small eMMC.
REM ============================================================

setlocal
set "HERE=%~dp0"
set "LOG=%HERE%server.log"

REM SYSTEM may start before the machine PATH is picked up, so the
REM installer writes the resolved node.exe path next to this file.
set "NODE_EXE=node"
if exist "%HERE%node-path.cmd" call "%HERE%node-path.cmd"

:loop
if exist "%LOG%" for %%A in ("%LOG%") do if %%~zA GTR 5000000 del "%LOG%"
cd /d "%HERE%..\webos"
"%NODE_EXE%" server.js >> "%LOG%" 2>&1
REM not `timeout`: it aborts when stdin is not a console, as under SYSTEM
ping -n 6 127.0.0.1 >nul
goto loop
