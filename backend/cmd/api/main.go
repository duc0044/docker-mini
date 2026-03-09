package main

import (
	"log"

	"docker-mini-backend/internal/api/routes"
	"docker-mini-backend/internal/auth"
	"docker-mini-backend/internal/docker"
	"docker-mini-backend/internal/services"
	"docker-mini-backend/pkg/config"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

func main() {
	cfg := config.LoadConfig()

	redisService, err := services.NewRedisService(cfg.RedisURL)
	if err != nil {
		log.Fatalf("Failed to connect to redis: %v", err)
	}

	dockerCli, err := docker.NewDockerClient()
	if err != nil {
		log.Fatalf("Failed to init docker client: %v", err)
	}

	authService := auth.NewAuthService(cfg.JWTSecret)

	r := gin.Default()
	r.Use(CORSMiddleware())

	routes.SetupRoutes(r, redisService, dockerCli, authService)

	log.Println("Starting server on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
