package handlers

import (
	"net/http"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

type ComposeHandler struct {
	// Simple handler that uses os/exec to run docker compose
	composeDir string
}

func NewComposeHandler(dir string) *ComposeHandler {
	// Create a directory to store uploaded compose files
	os.MkdirAll(dir, 0755)
	return &ComposeHandler{composeDir: dir}
}

func (h *ComposeHandler) DeployStack(c *gin.Context) {
	stackName := c.PostForm("name")
	if stackName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name requested"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file requested"})
		return
	}

	stackDir := filepath.Join(h.composeDir, stackName)
	os.MkdirAll(stackDir, 0755)
	
	filePath := filepath.Join(stackDir, "docker-compose.yml")
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save file"})
		return
	}

	// docker compose up -d
	cmd := exec.Command("docker", "compose", "-f", filePath, "-p", stackName, "up", "-d")
	// If running in container, this requires docker binary to be installed in the backend container 
	// OR using docker cli via socket if bound.
	// For simplicity, we assume 'docker' CLI is available.
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": string(output)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deployed", "output": string(output)})
}

func (h *ComposeHandler) StopStack(c *gin.Context) {
	stackName := c.Param("name")
	
	stackDir := filepath.Join(h.composeDir, stackName)
	filePath := filepath.Join(stackDir, "docker-compose.yml")

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "stack not found"})
		return
	}

	cmd := exec.Command("docker", "compose", "-f", filePath, "-p", stackName, "down")
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": string(output)})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"status": "stopped", "output": string(output)})
}
