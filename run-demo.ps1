# Lineage, one-command local demo.
# Starts the FastAPI backend on :8000 and the Next.js frontend on :3000,
# each in its own window, then opens the browser.
#
# First time only:
#   cd wealth_story_ai;  python -m venv .venv;  .\.venv\Scripts\Activate.ps1;  pip install -r requirements.txt
#   cd ..\frontend;  npm install
# Optional, in wealth_story_ai\.env:  ANTHROPIC_API_KEY (for live agents),  MONGODB_URI (else JSON fallback).

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Lineage backend on http://localhost:8000 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\wealth_story_ai'; .\.venv\Scripts\python.exe -m uvicorn app:app --port 8000"

Write-Host "Starting Lineage frontend on http://localhost:3000 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Start-Sleep -Seconds 4
Write-Host ""
Write-Host "Lineage is starting."
Write-Host "  Frontend  http://localhost:3000"
Write-Host "  Backend   http://localhost:8000/api/health"
Start-Process "http://localhost:3000"
