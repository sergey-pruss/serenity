@echo off
setlocal
set "GIT_BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%GIT_BASH%" (
  echo Git Bash not found: %GIT_BASH%
  exit /b 1
)
"%GIT_BASH%" -lc "cd \"$(cygpath -u '%~dp0')\" && bash scripts/deploy-dev.sh %*"
