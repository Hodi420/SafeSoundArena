#!/bin/bash

# Create Laravel project if it doesn't exist
if [ ! -f "laravel/composer.json" ]; then
    echo "Creating new Laravel project..."
    docker run --rm -v $(pwd)/laravel:/app composer create-project laravel/laravel .
    
    # Install Horizon
    echo "Installing Laravel Horizon..."
    docker run --rm -v $(pwd)/laravel:/app composer require laravel/horizon
    
    # Copy environment file
    cp laravel/.env.example laravel/.env
    
    # Update .env file for Docker
    sed -i 's/DB_HOST=127.0.0.1/DB_HOST=mysql/g' laravel/.env
    sed -i 's/REDIS_HOST=127.0.0.1/REDIS_HOST=redis/g' laravel/.env
    
    # Generate application key
    docker run --rm -v $(pwd)/laravel:/app php:8.2-cli php artisan key:generate
    
    # Publish Horizon assets
    docker run --rm -v $(pwd)/laravel:/app php:8.2-cli php artisan horizon:install
    
    # Set proper permissions
    chmod -R 777 laravel/storage laravel/bootstrap/cache
    
    echo "Laravel project created successfully!"
else
    echo "Laravel project already exists."
fi

# Start the services
echo "Starting services..."
docker-compose -f docker-compose.laravel.yml up -d

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
until docker-compose -f docker-compose.laravel.yml exec -T mysql mysql -ularavel -psecret -e "status" &> /dev/null; do
    echo "Waiting for MySQL..."
    sleep 2
done

# Run database migrations
echo "Running database migrations..."
docker-compose -f docker-compose.laravel.yml exec laravel php artisan migrate --force

echo "Laravel setup completed successfully!"
echo "Access your application at: http://localhost:8000"
echo "Access Horizon dashboard at: http://localhost:8000/horizon"
