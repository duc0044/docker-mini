package config

import (
	"os"
)

type Config struct {
	RedisURL  string
	JWTSecret string
}

func LoadConfig() *Config {
	return &Config{
		RedisURL:  getEnv("REDIS_URL", "localhost:6379"),
		JWTSecret: getEnv("JWT_SECRET", "supersecretkey"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
