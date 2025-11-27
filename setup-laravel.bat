@echo off
setlocal enabledelayedexpansion

echo Checking if Laravel project exists...
if not exist "laravel\composer.json" (
    echo Creating new Laravel project...
    docker run --rm -v %cd%/laravel:/app composer create-project laravel/laravel .
    
    echo Installing Laravel Horizon...
    docker run --rm -v %cd%/laravel:/app composer require laravel/horizon
    
    echo Configuring environment...
    copy /Y laravel\.env.example laravel\.env
    
    powershell -Command "(Get-Content laravel\.env) -replace 'DB_HOST=127.0.0.1', 'DB_HOST=mysql' | Set-Content laravel\.env"
    powershell -Command "(Get-Content laravel\.env) -replace 'REDIS_HOST=127.0.0.1', 'REDIS_HOST=redis' | Set-Content laravel\.env"
    
    echo Generating application key...
    docker run --rm -v %cd%/laravel:/app php:8.2-cli php artisan key:generate
    
    echo Installing Horizon...
    docker run --rm -v %cd%/laravel:/app php:8.2-cli php artisan horizon:install
    
    echo Setting permissions...
    icacls "laravel\storage" /grant "Everyone:(OI)(CI)F" /T
    icacls "laravel\bootstrap\cache" /grant "Everyone:(OI)(CI)F" /T
    
    echo Laravel project created successfully!
) else (
    echo Laravel project already exists.
)

echo Starting services...
docker-compose -f docker-compose.laravel.yml up -d

echo Waiting for MySQL to be ready...
:wait_mysql
docker-compose -f docker-compose.laravel.yml exec -T mysql mysql -ularavel -psecret -e "status" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Waiting for MySQL...
    timeout /t 2 >nul
    goto wait_mysql
)

echo Running database migrations...
docker-compose -f docker-compose.laravel.yml exec laravel php artisan migrate --force

echo.
echo =========================================
echo Laravel setup completed successfully!
echo.
echo Access your application at: http://localhost:8000
echo Access Horizon dashboard at: http://localhost:8000/horizon
echo.
echo To stop the services, run:
echo docker-compose -f docker-compose.laravel.yml down
echo =========================================

endlocal
