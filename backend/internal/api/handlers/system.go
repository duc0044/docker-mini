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
