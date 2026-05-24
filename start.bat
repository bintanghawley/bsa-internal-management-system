@echo off

cd /d C:\bsa-internal-management-system\app

start http://bsa.system:8000

C:\bsa-internal-management-system\php\php.exe artisan serve --host=0.0.0.0 --port=8000

pause