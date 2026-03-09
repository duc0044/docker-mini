package websocket

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
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
		line := scanner.Bytes()
		if len(line) > 8 {
			line = line[8:]
		}
		if err := conn.WriteMessage(websocket.TextMessage, line); err != nil {
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
			break
		}
		msg, _ := json.Marshal(statData)
		if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			break
		}
	}
}

// HandleExec – WebSocket TTY exec into container
func (h *WsHandler) HandleExec(c *gin.Context) {
	containerID := c.Param("id")
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("upgrade err:", err)
		return
	}
	defer conn.Close()

	cmd := c.DefaultQuery("cmd", "/bin/sh")
	execCfg := container.ExecOptions{
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,
		Cmd:          []string{cmd},
	}

	execID, err := h.dockerCli.ContainerExecCreate(context.Background(), containerID, execCfg)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("exec create err: "+err.Error()))
		return
	}

	resp, err := h.dockerCli.ContainerExecAttach(context.Background(), execID.ID, container.ExecStartOptions{Tty: true})
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("exec attach err: "+err.Error()))
		return
	}
	defer resp.Close()

	// docker → ws
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := resp.Reader.Read(buf)
			if err != nil {
				if err != io.EOF {
					conn.WriteMessage(websocket.TextMessage, []byte("read err: "+err.Error()))
				}
				conn.Close()
				return
			}
			if err := conn.WriteMessage(websocket.TextMessage, buf[:n]); err != nil {
				return
			}
		}
	}()

	// ws → docker
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		if _, err := resp.Conn.Write(msg); err != nil {
			break
		}
	}
}
