package docker

import (
	"github.com/docker/docker/client"
)

// DockerClient is an alias for client.Client
type DockerClient = client.Client

func NewDockerClient() (*DockerClient, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	return cli, nil
}
