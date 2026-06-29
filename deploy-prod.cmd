@echo off
setlocal
set "GIT_BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%GIT_BASH%" (
  echo Git Bash not found: %GIT_BASH%
  exit /b 1
)
set "DEPLOY_SSH_BIN=C:/Windows/System32/OpenSSH/ssh.exe"
set "DEPLOY_SCP_BIN=C:/Windows/System32/OpenSSH/scp.exe"
"%GIT_BASH%" -lc "cd \"$(cygpath -u '%~dp0')\" && bash scripts/deploy-prod.sh %*"
