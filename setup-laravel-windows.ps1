# Setup script for Laravel on Windows

# Create necessary directories
$directories = @(
    "laravel\app\Http\Controllers",
    "laravel\app\Jobs",
    "laravel\config",
    "laravel\routes"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-Host "Created directory: $dir"
    }
}

# Create .env file if it doesn't exist
$envFile = "laravel\.env"
if (-not (Test-Path $envFile)) {
    Copy-Item "laravel\.env.example" $envFile -Force
    
    # Update .env settings
    (Get-Content $envFile) -replace 'DB_HOST=127.0.0.1', 'DB_HOST=mysql' | Set-Content $envFile
    (Get-Content $envFile) -replace 'REDIS_HOST=127.0.0.1', 'REDIS_HOST=redis' | Set-Content $envFile
    (Get-Content $envFile) -replace 'QUEUE_CONNECTION=sync', 'QUEUE_CONNECTION=redis' | Set-Content $envFile
    
    Write-Host "Created and configured .env file"
}

# Start Docker services
Write-Host "Starting Docker services..."
docker-compose -f docker-compose.laravel.yml up -d

# Wait for MySQL to be ready
Write-Host "Waiting for MySQL to be ready..."
$maxRetries = 30
$retryCount = 0
$mysqlReady = $false

do {
    try {
        $result = docker-compose -f docker-compose.laravel.yml exec -T mysql mysql -ularavel -psecret -e "SELECT 1;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $mysqlReady = $true
            Write-Host "MySQL is ready!"
        }
    } catch {
        # Ignore errors, just retry
    }
    
    if (-not $mysqlReady) {
        $retryCount++
        if ($retryCount -ge $maxRetries) {
            Write-Error "Failed to connect to MySQL after $maxRetries attempts. Please check the MySQL container logs."
            exit 1
        }
        Write-Host "Waiting for MySQL... (Attempt $retryCount/$maxRetries)"
        Start-Sleep -Seconds 5
    }
} while (-not $mysqlReady)

# Install Composer dependencies
Write-Host "Installing Composer dependencies..."
docker run --rm -v ${PWD}/laravel:/app composer install --no-interaction --prefer-dist --optimize-autoloader

# Generate application key
Write-Host "Generating application key..."
docker-compose -f docker-compose.laravel.yml exec laravel php artisan key:generate

# Run database migrations
Write-Host "Running database migrations..."
docker-compose -f docker-compose.laravel.yml exec laravel php artisan migrate --force

# Install Horizon
Write-Host "Installing Laravel Horizon..."
docker-compose -f docker-compose.laravel.yml exec laravel composer require laravel/horizon --no-interaction
docker-compose -f docker-compose.laravel.yml exec laravel php artisan horizon:install

# Set proper permissions
Write-Host "Setting file permissions..."
docker-compose -f docker-compose.laravel.yml exec laravel chown -R www-data:www-data /var/www/storage

# Restart the Laravel container to apply changes
Write-Host "Restarting services..."
docker-compose -f docker-compose.laravel.yml restart laravel horizon

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Laravel setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Access your application at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Access Horizon dashboard at: http://localhost:8000/horizon" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop the services, run:" -ForegroundColor Yellow
Write-Host "docker-compose -f docker-compose.laravel.yml down" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green
