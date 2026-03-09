package routes

import (
	"docker-mini-backend/internal/api/handlers"
	"docker-mini-backend/internal/auth"
	"docker-mini-backend/internal/docker"
	"docker-mini-backend/internal/services"
	"docker-mini-backend/internal/websocket"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine, redisService *services.RedisService, dockerCli *docker.DockerClient, authService *auth.AuthService) {
	containerHandler := handlers.NewContainerHandler(dockerCli)
	imageHandler := handlers.NewImageHandler(dockerCli)
	systemHandler := handlers.NewSystemHandler(dockerCli)
	authHandler := handlers.NewAuthHandler(authService)
	wsHandler := websocket.NewWsHandler(dockerCli)
	composeHandler := handlers.NewComposeHandler("/tmp/stacks")

	api := r.Group("/api")
	{
		api.POST("/auth/login", authHandler.Login)

		// Protected routes
		protected := api.Group("")
		protected.Use(auth.AuthMiddleware(authService))
		{
			containers := protected.Group("/containers")
			{
				containers.GET("", containerHandler.ListContainers)
				containers.POST("/:id/start", containerHandler.StartContainer)
				containers.POST("/:id/stop", containerHandler.StopContainer)
				containers.POST("/:id/restart", containerHandler.RestartContainer)
				containers.DELETE("/:id", containerHandler.RemoveContainer)
			}

			images := protected.Group("/images")
			{
				images.GET("", imageHandler.ListImages)
				images.POST("/pull", imageHandler.PullImage)
				images.DELETE("/:id", imageHandler.RemoveImage)
			}

			system := protected.Group("/system")
			{
				system.GET("/info", systemHandler.GetInfo)
			}
			
			compose := protected.Group("/compose")
			{
				compose.POST("/deploy", composeHandler.DeployStack)
				compose.POST("/stop/:name", composeHandler.StopStack)
			}
		}
	}

	ws := r.Group("/ws")
	// For dev, ws is not strictly auth protected by header since browser WebSocket API doesn't support headers well.
	// We'd typically use a ticket system or token in query param. We'll leave it open for simplicity in dev, or add token query param check.
	{
		ws.GET("/logs/:id", wsHandler.HandleLogs)
		ws.GET("/stats/:id", wsHandler.HandleStats)
	}
}
