@echo off
chcp 65001 >nul
echo =============================================
echo   MedTech - Database Migration (Add New)
echo =============================================
echo.
echo This script re-runs init_all.sql safely.
echo All statements use IF NOT EXISTS / ON CONFLICT.
echo Existing data will NOT be deleted or modified.
echo Only NEW tables/columns/rows will be added.
echo.

SET "PG_HOST=localhost"
SET "PG_PORT=5432"
SET "PGPASSWORD=123456"
SET "SQL_FILE=%~dp0init_all.sql"

echo [INFO] Running migration...
psql -U postgres -h %PG_HOST% -p %PG_PORT% -f "%SQL_FILE%" -v ON_ERROR_STOP=0

echo.
echo =============================================
echo   Migration complete!
echo   New tables/data added (if any).
echo   Existing data preserved.
echo =============================================
pause
