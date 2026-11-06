@echo off
chcp 65001 >nul
echo =============================================
echo   MedTech - Database Reset (DANGER!)
echo =============================================
echo.
echo [WARNING] This will DROP the entire medtech_db
echo           and recreate everything from scratch!
echo.
set /p confirm="Type 'YES' to confirm: "
if /i not "%confirm%"=="YES" (
    echo Cancelled.
    pause
    exit /b 0
)

SET "PGPASSWORD=123456"
SET "SQL_FILE=%~dp0init_all.sql"

echo.
echo [INFO] Dropping database medtech_db...
psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS medtech_db;"
psql -U postgres -h localhost -c "DROP ROLE IF EXISTS medtech_user;"

echo [INFO] Recreating from init_all.sql...
psql -U postgres -h localhost -f "%SQL_FILE%" -v ON_ERROR_STOP=0

echo.
echo =============================================
echo   Database reset complete!
echo =============================================
pause
