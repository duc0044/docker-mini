package handlers

import (
	"context"
	"net/http"

	"github.com/docker/docker/client"
	"github.com/gin-gonic/gin"
)

type SystemHandler struct {
	dockerCli *client.Client
}

func NewSystemHandler(dockerCli *client.Client) *SystemHandler {
	return &SystemHandler{dockerCli: dockerCli}
}

func (h *SystemHandler) GetInfo(c *gin.Context) {
	info, err := h.dockerCli.Info(context.Background())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, info)
}

func (h *SystemHandler) GetStats(c *gin.Context) {
	info, err := h.dockerCli.Info(context.Background())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"containers":         info.Containers,
		"containers_running": info.ContainersRunning,
		"containers_stopped": info.ContainersStopped,
		"containers_paused":  info.ContainersPaused,
		"images":             info.Images,
		"mem_total":          info.MemTotal,
		"ncpu":               info.NCPU,
		"docker_version":     info.ServerVersion,
		"os":                 info.OperatingSystem,
		"arch":               info.Architecture,
		"name":               info.Name,
	})
}
