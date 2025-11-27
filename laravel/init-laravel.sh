#!/bin/bash

# Create new Laravel project if it doesn't exist
if [ ! -f "composer.json" ]; then
    composer create-project laravel/laravel .
    
    # Install Horizon
    composer require laravel/horizon
    
    # Publish Horizon assets
    php artisan horizon:install
    php artisan vendor:publish --provider="Laravel\Horizon\HorizonServiceProvider"
    
    # Set up .env file
    cp .env.example .env
    
    # Generate application key
    php artisan key:generate
    
    # Update .env for database and Redis
    sed -i 's/DB_HOST=127.0.0.1/DB_HOST=mysql/g' .env
    sed -i 's/REDIS_HOST=127.0.0.1/REDIS_HOST=redis/g' .env
    
    echo "Laravel project initialized successfully!"
else
    echo "Laravel project already exists."
fi

# Install dependencies
composer install --no-interaction --prefer-dist --optimize-autoloader

# Set proper permissions
chown -R www-data:www-data /var/www/storage
chown -R www-data:www-data /var/www/bootstrap/cache
chmod -R 775 /var/www/storage
chmod -R 775 /var/www/bootstrap/cache
