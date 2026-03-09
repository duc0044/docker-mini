# Docker Management Platform

A lightweight, fast, and DevOps-friendly Docker management platform built with Golang and Next.js.

## Features

- **Authentication**: JWT-based login (Admin/User roles).
- **Dashboard**: Real-time system metrics (CPU, RAM, Running/Total Containers).
- **Containers**: Start, Stop, Restart, Remove, and view list of containers.
- **Container Details**: View live WebSocket-streamed Logs and live Container Stats (CPU/Memory).
- **Images**: List images, pull from Docker Hub, remove images.
- **Docker Compose**: Upload `docker-compose.yml` to deploy stacks and stop them.
- **Security**: The backend communicates with `docker.sock` internally, exposing only REST/WS APIs to the frontend via JWT auth.

## Tech Stack

- **Backend**: Golang, Gin, Docker Go SDK, WebSocket.
- **Frontend**: Next.js 14, TailwindCSS, shadcn/ui, Zustand, React Query.
- **Cache**: Redis.

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### Running locally

1. Clone or navigate to this repository.
2. Run the deployment:

```bash
docker compose up -d --build
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080/api

### Default Credentials

- Admin User: `admin` / Password: `admin`
- Standard User: `user` / Password: `user`

## Environment Variables

### Backend (`docker-compose.yml`)
- `REDIS_URL`: URL to Redis server (e.g. `redis:6379`)
- `JWT_SECRET`: Secret key for signing JWT tokens

### Frontend (`docker-compose.yml`)
- `NEXT_PUBLIC_API_URL`: URL to the backend API

## API Documentation

### REST API

- `POST /api/auth/login`: Login with username/password, returns JWT token.
- `GET /api/containers`: List all containers.
- `POST /api/containers/{id}/start`: Start a container.
- `POST /api/containers/{id}/stop`: Stop a container.
- `POST /api/containers/{id}/restart`: Restart a container.
- `DELETE /api/containers/{id}`: Remove a container.
- `GET /api/images`: List all images.
- `POST /api/images/pull`: Pull an image (body: `{ "image": "name:tag" }`).
- `DELETE /api/images/{id}`: Remove an image.
- `POST /api/compose/deploy`: Deploy a stack (form data: `name`, `file`).
- `POST /api/compose/stop/{name}`: Stop a stack.
- `GET /api/system/info`: Get system information.

### WebSocket API

- `ws://<host>/ws/logs/{id}`: Stream container logs in real-time.
- `ws://<host>/ws/stats/{id}`: Stream container statistics in real-time.
