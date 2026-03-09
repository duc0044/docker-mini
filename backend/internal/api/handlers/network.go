package handlers

import (
	"context"
	"net/http"

	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/gin-gonic/gin"
)

type NetworkHandler struct {
	dockerCli *client.Client
}

func NewNetworkHandler(dockerCli *client.Client) *NetworkHandler {
	return &NetworkHandler{dockerCli: dockerCli}
}

func (h *NetworkHandler) ListNetworks(c *gin.Context) {
	networks, err := h.dockerCli.NetworkList(context.Background(), network.ListOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, networks)
}

type CreateNetworkRequest struct {
	Name   string `json:"name"`
	Driver string `json:"driver"`
	Subnet string `json:"subnet"`
}

func (h *NetworkHandler) CreateNetwork(c *gin.Context) {
	var req CreateNetworkRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	if req.Driver == "" {
		req.Driver = "bridge"
	}

	opts := network.CreateOptions{
		Driver: req.Driver,
	}
	if req.Subnet != "" {
		opts.IPAM = &network.IPAM{
			Config: []network.IPAMConfig{{Subnet: req.Subnet}},
		}
	}

	resp, err := h.dockerCli.NetworkCreate(context.Background(), req.Name, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": resp.ID})
}

func (h *NetworkHandler) RemoveNetwork(c *gin.Context) {
	id := c.Param("id")
	if err := h.dockerCli.NetworkRemove(context.Background(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "removed"})
}

type ConnectRequest struct {
	ContainerID string `json:"container_id"`
}

func (h *NetworkHandler) ConnectContainer(c *gin.Context) {
	id := c.Param("id")
	var req ConnectRequest
	if err := c.BindJSON(&req); err != nil || req.ContainerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "container_id required"})
		return
	}
	if err := h.dockerCli.NetworkConnect(context.Background(), id, req.ContainerID, nil); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "connected"})
}

func (h *NetworkHandler) DisconnectContainer(c *gin.Context) {
	id := c.Param("id")
	var req ConnectRequest
	if err := c.BindJSON(&req); err != nil || req.ContainerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "container_id required"})
		return
	}
	if err := h.dockerCli.NetworkDisconnect(context.Background(), id, req.ContainerID, false); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "disconnected"})
}
