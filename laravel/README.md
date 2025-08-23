# Laravel Horizon Integration

This directory contains the Laravel application with Horizon for queue management in the SafeSoundArena project.

## Getting Started

### Prerequisites

- Docker and Docker Compose
- PHP 8.2+
- Composer
- Node.js (for frontend assets if needed)

### Installation

1. **Start the services**
   ```bash
   # From the project root
   docker-compose -f docker-compose.laravel.yml up -d
   ```

2. **Initialize Laravel**
   ```bash
   # Enter the Laravel container
   docker-compose -f docker-compose.laravel.yml exec laravel bash
   
   # Inside the container, run:
   chmod +x init-laravel.sh
   ./init-laravel.sh
   ```

3. **Access the Horizon Dashboard**
   - Open your browser to: `http://localhost:8000/horizon`
   - (Note: You may need to set up authentication for production use)

## API Endpoints

### Process a Video
```http
POST /api/videos/process
Content-Type: application/json

{
    "video_id": "video123",
    "user_id": "user456"
}
```

### Check Job Status
```http
GET /api/videos/status/{jobId}
```

## Development

### Running Queue Workers
Horizon is already configured to run in the `horizon` service. You can monitor it at `/horizon`.

### Viewing Logs
```bash
docker-compose -f docker-compose.laravel.yml logs -f laravel
```

## Production Considerations

1. **Security**:
   - Set up proper authentication for the Horizon dashboard
   - Use HTTPS in production
   - Set `APP_DEBUG=false` in production

2. **Performance**:
   - Configure Redis persistence
   - Set up proper queue worker processes in `horizon.php`
   - Consider using a process manager like Supervisor for production

3. **Monitoring**:
   - Set up Laravel Telescope for debugging
   - Configure proper logging
   - Set up alerts for failed jobs

## License

This project is part of the SafeSoundArena ecosystem.
