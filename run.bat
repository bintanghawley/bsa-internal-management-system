@echo off
cd /d C:\bsa-system

start http://bsa.system:8000

php artisan serve --host=bsa.system --port=8000

pause