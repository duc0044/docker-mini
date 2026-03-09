package handlers

import (
	"context"
	"net/http"

	"github.com/docker/docker/api/types/container"
	"github.com/gin-gonic/gin"
	"github.com/docker/docker/client"
)

type ContainerHandler struct {
	dockerCli *client.Client
}

func NewContainerHandler(dockerCli *client.Client) *ContainerHandler {
	return &ContainerHandler{dockerCli: dockerCli}
}

func (h *ContainerHandler) ListContainers(c *gin.Context) {
	containers, err := h.dockerCli.ContainerList(context.Background(), container.ListOptions{All: true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, containers)
}

func (h *ContainerHandler) StartContainer(c *gin.Context) {
	id := c.Param("id")
	if err := h.dockerCli.ContainerStart(context.Background(), id, container.StartOptions{}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "started", "id": id})
}

func (h *ContainerHandler) StopContainer(c *gin.Context) {
	id := c.Param("id")
	// Use NoWait timeout as nil
	if err := h.dockerCli.ContainerStop(context.Background(), id, container.StopOptions{}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "stopped", "id": id})
}

func (h *ContainerHandler) RestartContainer(c *gin.Context) {
	id := c.Param("id")
	if err := h.dockerCli.ContainerRestart(context.Background(), id, container.StopOptions{}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "restarted", "id": id})
}

func (h *ContainerHandler) RemoveContainer(c *gin.Context) {
	id := c.Param("id")
	if err := h.dockerCli.ContainerRemove(context.Background(), id, container.RemoveOptions{Force: true}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "removed", "id": id})
}
