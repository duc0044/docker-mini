package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/gin-gonic/gin"
)

type EventsHandler struct {
	dockerCli *client.Client
}

func NewEventsHandler(dockerCli *client.Client) *EventsHandler {
	return &EventsHandler{dockerCli: dockerCli}
}

func (h *EventsHandler) GetEvents(c *gin.Context) {
	since := time.Now().Add(-1 * time.Hour)

	opts := events.ListOptions{
		Since:   since.Format(time.RFC3339),
		Filters: filters.NewArgs(),
	}

	evtCh, errCh := h.dockerCli.Events(context.Background(), opts)

	var evts []events.Message
	timeout := time.After(500 * time.Millisecond)

loop:
	for {
		select {
		case evt := <-evtCh:
			evts = append(evts, evt)
			if len(evts) >= 100 {
				break loop
			}
		case <-errCh:
			break loop
		case <-timeout:
			break loop
		}
	}

	// Reverse to get newest last
	for i, j := 0, len(evts)-1; i < j; i, j = i+1, j-1 {
		evts[i], evts[j] = evts[j], evts[i]
	}

	if evts == nil {
		evts = []events.Message{}
	}
	c.JSON(http.StatusOK, evts)
}
