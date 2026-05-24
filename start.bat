@echo off

cd /d C:\bsa-management-internal-system\app

start http://bsa.system:8000

C:\bsa-management-internal-system\php\php.exe artisan serve --host=0.0.0.0 --port=8000

pause