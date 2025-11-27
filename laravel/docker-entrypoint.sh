#!/bin/sh

# Exit on error
set -e

# Install dependencies if not already installed
if [ ! -d "vendor" ]; then
    composer install --no-interaction --prefer-dist --optimize-autoloader
fi

# Generate application key if not set
if [ -z "$(grep APP_KEY=base64 .env)" ]; then
    php artisan key:generate
fi

# Wait for database to be ready
echo "Waiting for database..."
while ! nc -z mysql 3306; do
    sleep 0.5
done

echo "Database is ready!"

# Run migrations
php artisan migrate --force

# Clear caches
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start Horizon
php artisan horizon
