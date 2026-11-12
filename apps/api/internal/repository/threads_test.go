package repository

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	"github.com/google/uuid"
)

func TestThreadRepository(t *testing.T) {
	db, err := Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	s := New(db)
	ctx := context.Background()
	items, err := s.Threads(ctx)
	if err != nil || items == nil || len(items) != 0 {
		t.Fatalf("empty list=%v, err=%v", items, err)
	}
	first, err := s.CreateThread(ctx, "Budget'); DROP TABLE threads;--")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := uuid.Parse(first.ID); err != nil {
		t.Fatal(err)
	}
	second, err := s.CreateThread(ctx, "Second")
	if err != nil {
		t.Fatal(err)
	}
	found, err := s.Thread(ctx, first.ID)
	if err != nil || found != first {
		t.Fatalf("found=%+v, err=%v", found, err)
	}
	renamed, err := s.RenameThread(ctx, first.ID, "Renamed")
	if err != nil || renamed.Name != "Renamed" {
		t.Fatalf("renamed=%+v,err=%v", renamed, err)
	}
	if err := s.DeleteThread(ctx, first.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Thread(ctx, first.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing error=%v", err)
	}
	if err := s.DeleteThread(ctx, first.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("repeat delete=%v", err)
	}
	if _, err := s.RenameThread(ctx, first.ID, "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing rename=%v", err)
	}
	items, err = s.Threads(ctx)
	if err != nil || len(items) != 1 || items[0].ID != second.ID {
		t.Fatalf("remaining=%v,err=%v", items, err)
	}
}
