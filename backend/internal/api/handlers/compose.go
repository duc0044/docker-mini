package handlers

import (
	"net/http"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

type ComposeHandler struct {
	composeDir string
}

func NewComposeHandler(dir string) *ComposeHandler {
	os.MkdirAll(dir, 0755)
	return &ComposeHandler{composeDir: dir}
}

func (h *ComposeHandler) ListStacks(c *gin.Context) {
	entries, err := os.ReadDir(h.composeDir)
	if err != nil {
		c.JSON(http.StatusOK, []gin.H{})
		return
	}

	var stacks []gin.H
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		composePath := filepath.Join(h.composeDir, entry.Name(), "docker-compose.yml")
		if _, err := os.Stat(composePath); err == nil {
			stacks = append(stacks, gin.H{
				"name":         entry.Name(),
				"compose_file": composePath,
			})
		}
	}

	if stacks == nil {
		stacks = []gin.H{}
	}
	c.JSON(http.StatusOK, stacks)
}

func (h *ComposeHandler) DeployStack(c *gin.Context) {
	stackName := c.PostForm("name")
	if stackName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name required"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file required"})
		return
	}

	stackDir := filepath.Join(h.composeDir, stackName)
	os.MkdirAll(stackDir, 0755)

	filePath := filepath.Join(stackDir, "docker-compose.yml")
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save file"})
		return
	}

	cmd := exec.Command("docker", "compose", "-f", filePath, "-p", stackName, "up", "-d")
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

func (h *ComposeHandler) RemoveStack(c *gin.Context) {
	stackName := c.Param("name")

	stackDir := filepath.Join(h.composeDir, stackName)
	filePath := filepath.Join(stackDir, "docker-compose.yml")

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "stack not found"})
		return
	}

	// Stop first
	exec.Command("docker", "compose", "-f", filePath, "-p", stackName, "down").Run()

	// Remove stack directory
	if err := os.RemoveAll(stackDir); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not remove stack"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "removed"})
}
