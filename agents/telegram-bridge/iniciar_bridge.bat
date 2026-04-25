@echo off
chcp 65001 > nul
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
echo Iniciando Bridge CEO ^<-^> Telegram...
echo.
echo IMPORTANTE: Antes de usar, envie /start para o seu bot no Telegram.
echo.
python bridge.py
pause
