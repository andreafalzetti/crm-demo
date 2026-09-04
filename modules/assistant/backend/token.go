package assistant

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

type delegationClaims struct {
	UserID    string `json:"sub"`
	SessionID string `json:"sid"`
	ExpiresAt int64  `json:"exp"`
}

func signDelegation(secret string, claims delegationClaims) (string, error) {
	if len(secret) < 32 {
		return "", errors.New("assistant shared secret must be at least 32 characters")
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	encoded := base64.RawURLEncoding.EncodeToString(payload)
	signature := hmac.New(sha256.New, []byte(secret))
	_, _ = signature.Write([]byte(encoded))
	return encoded + "." + base64.RawURLEncoding.EncodeToString(signature.Sum(nil)), nil
}

func verifyDelegation(secret, token string, now time.Time) (delegationClaims, error) {
	var claims delegationClaims
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return claims, errors.New("invalid delegation token")
	}
	expected := hmac.New(sha256.New, []byte(secret))
	_, _ = expected.Write([]byte(parts[0]))
	provided, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || !hmac.Equal(provided, expected.Sum(nil)) {
		return claims, errors.New("invalid delegation signature")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil || json.Unmarshal(payload, &claims) != nil {
		return claims, errors.New("invalid delegation payload")
	}
	if claims.UserID == "" || claims.SessionID == "" || claims.ExpiresAt <= now.Unix() {
		return claims, errors.New("expired delegation token")
	}
	return claims, nil
}
