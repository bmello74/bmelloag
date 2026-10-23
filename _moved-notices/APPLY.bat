@echo off
REM Run this once bmellodigital.com is live. For each client it replaces the old
REM draft under preview\ with the "your preview has moved" page, then you commit and push.
cd /d "%~dp0.."
for %%s in (superior-soil teshuva-ag lookatme esajian-family-farms) do (
  if exist "preview\%%s" rmdir /s /q "preview\%%s"
  mkdir "preview\%%s"
  copy /y "_moved-notices\%%s\index.html" "preview\%%s\index.html" >nul
  echo moved: preview\%%s
)
rmdir /s /q "_moved-notices"
echo.
echo Done. Now: git add -A  ^&^&  git commit -m "Previews moved to bmellodigital.com"  ^&^&  git push
pause
