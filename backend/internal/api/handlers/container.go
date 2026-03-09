package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
	"github.com/gin-gonic/gin"
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

func (h *ContainerHandler) GetContainer(c *gin.Context) {
	id := c.Param("id")
	info, _, err := h.dockerCli.ContainerInspectWithRaw(context.Background(), id, false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, info)
}

func (h *ContainerHandler) GetContainerLogs(c *gin.Context) {
	id := c.Param("id")
	tail := c.DefaultQuery("tail", "500")

	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       tail,
		Timestamps: true,
	}

	reader, err := h.dockerCli.ContainerLogs(context.Background(), id, options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer reader.Close()

	data, err := io.ReadAll(reader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	cleanedLines := cleanDockerLogs(data)
	c.JSON(http.StatusOK, gin.H{"logs": cleanedLines})
}

func cleanDockerLogs(data []byte) []string {
	var lines []string
	for i := 0; i < len(data); {
		if i+8 > len(data) {
			break
		}
		size := int(data[i+4])<<24 | int(data[i+5])<<16 | int(data[i+6])<<8 | int(data[i+7])
		i += 8
		if i+size > len(data) {
			break
		}
		chunk := string(data[i : i+size])
		start := 0
		for j := 0; j < len(chunk); j++ {
			if chunk[j] == '\n' {
				line := chunk[start:j]
				if line != "" {
					lines = append(lines, line)
				}
				start = j + 1
			}
		}
		if start < len(chunk) {
			if line := chunk[start:]; line != "" {
				lines = append(lines, line)
			}
		}
		i += size
	}
	return lines
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

// PortBinding for create container request
type PortBinding struct {
	Host      string `json:"host"`
	Container string `json:"container"`
	Proto     string `json:"proto"`
}

// VolumeMount for create container request
type VolumeMount struct {
	Host      string `json:"host"`
	Container string `json:"container"`
}

type CreateContainerRequest struct {
	Name          string        `json:"name"`
	Image         string        `json:"image"`
	Ports         []PortBinding `json:"ports"`
	Volumes       []VolumeMount `json:"volumes"`
	Env           []string      `json:"env"`
	RestartPolicy string        `json:"restart_policy"`
	Network       string        `json:"network"`
	Cmd           []string      `json:"cmd"`
	AutoStart     bool          `json:"auto_start"`
}

func (h *ContainerHandler) CreateContainer(c *gin.Context) {
	var req CreateContainerRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Image == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "image is required"})
		return
	}

	// Port mappings
	exposedPorts := nat.PortSet{}
	portBindings := nat.PortMap{}
	for _, p := range req.Ports {
		proto := p.Proto
		if proto == "" {
			proto = "tcp"
		}
		containerPort := nat.Port(p.Container + "/" + proto)
		exposedPorts[containerPort] = struct{}{}
		portBindings[containerPort] = []nat.PortBinding{{HostPort: p.Host}}
	}

	// Volume bindings
	var binds []string
	for _, v := range req.Volumes {
		if v.Host != "" && v.Container != "" {
			binds = append(binds, v.Host+":"+v.Container)
		}
	}

	// Restart policy
	restartPolicy := container.RestartPolicy{Name: container.RestartPolicyDisabled}
	switch req.RestartPolicy {
	case "always":
		restartPolicy.Name = container.RestartPolicyAlways
	case "unless-stopped":
		restartPolicy.Name = container.RestartPolicyUnlessStopped
	case "on-failure":
		restartPolicy.Name = container.RestartPolicyOnFailure
	}

	cfg := &container.Config{
		Image:        req.Image,
		Env:          req.Env,
		ExposedPorts: exposedPorts,
		Cmd:          req.Cmd,
	}

	hostCfg := &container.HostConfig{
		PortBindings:  portBindings,
		Binds:         binds,
		RestartPolicy: restartPolicy,
	}

	resp, err := h.dockerCli.ContainerCreate(
		context.Background(),
		cfg,
		hostCfg,
		nil, nil,
		req.Name,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Auto start
	if req.AutoStart {
		h.dockerCli.ContainerStart(context.Background(), resp.ID, container.StartOptions{})
	}

	_ = json.NewDecoder
	c.JSON(http.StatusOK, gin.H{"id": resp.ID, "warnings": resp.Warnings})
}
