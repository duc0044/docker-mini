package services

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

var ctx = context.Background()

type RedisService struct {
	client *redis.Client
}

func NewRedisService(redisURL string) (*RedisService, error) {
	client := redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	// Test connection
	_, err := client.Ping(ctx).Result()
	if err != nil {
		return nil, fmt.Errorf("redis connection failed: %v", err)
	}

	return &RedisService{client: client}, nil
}

func (s *RedisService) Set(key string, value []byte, expiration time.Duration) error {
	return s.client.Set(ctx, key, value, expiration).Err()
}

func (s *RedisService) Get(key string) ([]byte, error) {
	return s.client.Get(ctx, key).Bytes()
}
