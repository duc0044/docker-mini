package handlers

import (
	"context"
	"net/http"

	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"github.com/gin-gonic/gin"
)

type VolumeHandler struct {
	dockerCli *client.Client
}

func NewVolumeHandler(dockerCli *client.Client) *VolumeHandler {
	return &VolumeHandler{dockerCli: dockerCli}
}

func (h *VolumeHandler) ListVolumes(c *gin.Context) {
	resp, err := h.dockerCli.VolumeList(context.Background(), volume.ListOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp.Volumes)
}

type CreateVolumeRequest struct {
	Name   string `json:"name"`
	Driver string `json:"driver"`
}

func (h *VolumeHandler) CreateVolume(c *gin.Context) {
	var req CreateVolumeRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Driver == "" {
		req.Driver = "local"
	}

	vol, err := h.dockerCli.VolumeCreate(context.Background(), volume.CreateOptions{
		Name:   req.Name,
		Driver: req.Driver,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, vol)
}

func (h *VolumeHandler) RemoveVolume(c *gin.Context) {
	name := c.Param("name")
	if err := h.dockerCli.VolumeRemove(context.Background(), name, false); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "removed"})
}
