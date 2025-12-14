package logging

import (
	"bytes"
	"testing"
)

func TestNew(t *testing.T) {
	t.Run("With Prefix", func(t *testing.T) {
		logger := New("TEST")
		if logger == nil {
			t.Fatal("Expected logger, got nil")
		}

		var buf bytes.Buffer
		logger.SetOutput(&buf)
		// Reset flags to 0 for easier string comparison or just check suffix
		logger.SetFlags(0)

		logger.Print("hello")

		got := buf.String()
		expected := "[TEST] hello\n"
		if got != expected {
			t.Errorf("Expected output %q, got %q", expected, got)
		}
	})

	t.Run("Without Prefix", func(t *testing.T) {
		logger := New("")
		var buf bytes.Buffer
		logger.SetOutput(&buf)
		logger.SetFlags(0)

		logger.Print("world")

		got := buf.String()
		expected := "world\n"
		if got != expected {
			t.Errorf("Expected output %q, got %q", expected, got)
		}
	})
}
