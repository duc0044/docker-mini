package websocket

import (
	"bufio"
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all cross-origin for dev
	},
}

type WsHandler struct {
	dockerCli *client.Client
}

func NewWsHandler(dockerCli *client.Client) *WsHandler {
	return &WsHandler{dockerCli: dockerCli}
}

func (h *WsHandler) HandleLogs(c *gin.Context) {
	containerID := c.Param("id")
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("upgrade err:", err)
		return
	}
	defer conn.Close()

	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
		Tail:       "100",
	}

	reader, err := h.dockerCli.ContainerLogs(context.Background(), containerID, options)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("Error getting logs: "+err.Error()))
		return
	}
	defer reader.Close()

	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		// Docker multiplexes stdout/stderr with a 8-byte header.
		// For simplicity, we just send the raw bytes, stripping the first 8 bytes if present.
		line := scanner.Bytes()
		if len(line) > 8 {
			line = line[8:]
		}
		if err := conn.WriteMessage(websocket.TextMessage, line); err != nil {
			log.Println("ws write err:", err)
			break
		}
	}
}

func (h *WsHandler) HandleStats(c *gin.Context) {
	containerID := c.Param("id")
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("upgrade err:", err)
		return
	}
	defer conn.Close()

	stats, err := h.dockerCli.ContainerStats(context.Background(), containerID, true)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("Error getting stats: "+err.Error()))
		return
	}
	defer stats.Body.Close()

	decoder := json.NewDecoder(stats.Body)
	for {
		var statData interface{}
		if err := decoder.Decode(&statData); err != nil {
			log.Println("stats decode err:", err)
			break
		}
		
		msg, _ := json.Marshal(statData)
		if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			log.Println("ws write err:", err)
			break
		}
	}
}
