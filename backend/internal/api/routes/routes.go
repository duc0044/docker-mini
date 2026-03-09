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
	networkHandler := handlers.NewNetworkHandler(dockerCli)
	volumeHandler := handlers.NewVolumeHandler(dockerCli)
	eventsHandler := handlers.NewEventsHandler(dockerCli)
	authHandler := handlers.NewAuthHandler(authService)
	wsHandler := websocket.NewWsHandler(dockerCli)
	composeHandler := handlers.NewComposeHandler("/tmp/stacks")

	api := r.Group("/api")
	{
		api.POST("/auth/login", authHandler.Login)

		protected := api.Group("")
		protected.Use(auth.AuthMiddleware(authService))
		{
			// Containers
			containers := protected.Group("/containers")
			{
				containers.GET("", containerHandler.ListContainers)
				containers.POST("", containerHandler.CreateContainer)
				containers.GET("/:id", containerHandler.GetContainer)
				containers.GET("/:id/logs", containerHandler.GetContainerLogs)
				containers.POST("/:id/start", containerHandler.StartContainer)
				containers.POST("/:id/stop", containerHandler.StopContainer)
				containers.POST("/:id/restart", containerHandler.RestartContainer)
				containers.DELETE("/:id", containerHandler.RemoveContainer)
			}

			// Images
			images := protected.Group("/images")
			{
				images.GET("", imageHandler.ListImages)
				images.GET("/:id", imageHandler.GetImage)
				images.GET("/:id/history", imageHandler.GetImageHistory)
				images.POST("/pull", imageHandler.PullImage)
				images.DELETE("/:id", imageHandler.RemoveImage)
			}

			// Networks
			networks := protected.Group("/networks")
			{
				networks.GET("", networkHandler.ListNetworks)
				networks.POST("", networkHandler.CreateNetwork)
				networks.DELETE("/:id", networkHandler.RemoveNetwork)
				networks.POST("/:id/connect", networkHandler.ConnectContainer)
				networks.POST("/:id/disconnect", networkHandler.DisconnectContainer)
			}

			// Volumes
			volumes := protected.Group("/volumes")
			{
				volumes.GET("", volumeHandler.ListVolumes)
				volumes.POST("", volumeHandler.CreateVolume)
				volumes.DELETE("/:name", volumeHandler.RemoveVolume)
			}

			// System
			system := protected.Group("/system")
			{
				system.GET("/info", systemHandler.GetInfo)
				system.GET("/stats", systemHandler.GetStats)
			}

			// Events
			protected.GET("/events", eventsHandler.GetEvents)

			// Compose / Stacks
			compose := protected.Group("/compose")
			{
				compose.GET("/stacks", composeHandler.ListStacks)
				compose.POST("/deploy", composeHandler.DeployStack)
				compose.POST("/stop/:name", composeHandler.StopStack)
				compose.DELETE("/stacks/:name", composeHandler.RemoveStack)
			}
		}
	}

	// WebSocket
	ws := r.Group("/ws")
	{
		ws.GET("/logs/:id", wsHandler.HandleLogs)
		ws.GET("/stats/:id", wsHandler.HandleStats)
		ws.GET("/exec/:id", wsHandler.HandleExec)
	}
}
