package handlers

import (
	"context"
	"io"
	"net/http"

	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
	"github.com/gin-gonic/gin"
)

type ImageHandler struct {
	dockerCli *client.Client
}

func NewImageHandler(dockerCli *client.Client) *ImageHandler {
	return &ImageHandler{dockerCli: dockerCli}
}

func (h *ImageHandler) ListImages(c *gin.Context) {
	images, err := h.dockerCli.ImageList(context.Background(), image.ListOptions{All: true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, images)
}

func (h *ImageHandler) PullImage(c *gin.Context) {
	var req struct {
		Image string `json:"image"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	reader, err := h.dockerCli.ImagePull(context.Background(), req.Image, image.PullOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer reader.Close()
	// Discard output for simple pull, or we could stream it back
	io.Copy(io.Discard, reader)

	c.JSON(http.StatusOK, gin.H{"status": "pulled", "image": req.Image})
}

func (h *ImageHandler) RemoveImage(c *gin.Context) {
	id := c.Param("id")
	_, err := h.dockerCli.ImageRemove(context.Background(), id, image.RemoveOptions{Force: true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "removed", "id": id})
}
