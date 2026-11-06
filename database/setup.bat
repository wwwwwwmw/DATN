@echo off
chcp 65001 >nul
echo =============================================
echo   MedTech AI Platform - Database Setup
echo =============================================
echo.

REM === Cau hinh ===
SET "PG_USER=postgres"
SET "PGPASSWORD=123456"
SET "PG_HOST=localhost"
SET "PG_PORT=5432"
SET "SQL_FILE=%~dp0init_all.sql"

REM === Kiem tra psql ===
where psql >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] psql not found! Please install PostgreSQL and add to PATH.
    pause
    exit /b 1
)

REM === Kiem tra file SQL ===
if not exist "%SQL_FILE%" (
    echo [ERROR] File not found: %SQL_FILE%
    pause
    exit /b 1
)

echo [INFO] PostgreSQL User: %PG_USER%
echo [INFO] Host: %PG_HOST%:%PG_PORT%
echo [INFO] SQL File: %SQL_FILE%
echo.
echo [INFO] Running init_all.sql...
echo.

REM === Chay SQL ===
psql -U %PG_USER% -h %PG_HOST% -p %PG_PORT% -f "%SQL_FILE%" -v ON_ERROR_STOP=0

if %ERRORLEVEL% equ 0 (
    echo.
    echo =============================================
    echo   DATABASE SETUP COMPLETE!
    echo =============================================
    echo.
    echo   Database: medtech_db
    echo   User:     medtech_user
    echo   Password: medtech_password_2026
    echo.
    echo   Connection string:
    echo   postgresql://medtech_user:medtech_password_2026@localhost:5432/medtech_db
    echo.
) else (
    echo.
    echo [WARNING] Some errors occurred. Check output above.
    echo [INFO] If extensions failed, install PostGIS and pgvector.
)

pause
