package assistant

import (
	"strings"
	"testing"
	"time"
)

func TestDelegationToken(t *testing.T) {
	secret := strings.Repeat("a", 64)
	now := time.Date(2026, 9, 5, 12, 0, 0, 0, time.UTC)
	token, err := signDelegation(secret, delegationClaims{UserID: "user-1", SessionID: "session-1", ExpiresAt: now.Add(time.Minute).Unix()})
	if err != nil {
		t.Fatal(err)
	}
	claims, err := verifyDelegation(secret, token, now)
	if err != nil {
		t.Fatal(err)
	}
	if claims.UserID != "user-1" || claims.SessionID != "session-1" {
		t.Fatalf("unexpected claims: %#v", claims)
	}
	if _, err := verifyDelegation(secret, token+"tampered", now); err == nil {
		t.Fatal("tampered token was accepted")
	}
	if _, err := verifyDelegation(secret, token, now.Add(2*time.Minute)); err == nil {
		t.Fatal("expired token was accepted")
	}
}
