package repository

import (
	"calculator-workspace/api/internal/models"
	"context"
	"errors"
	"path/filepath"
	"testing"
)

func TestSaveCalculation(t *testing.T) {
	db, err := Open(filepath.Join(t.TempDir(), "save.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	s := New(db)
	ctx := context.Background()
	thread, err := s.CreateThread(ctx, "Stored")
	if err != nil {
		t.Fatal(err)
	}
	item, err := s.SaveCalculation(ctx, models.Calculation{ThreadID: thread.ID, Operation: "add", Operands: []string{"12.50", "7.25"}, Expression: "12.50 + 7.25", Result: "19.75"})
	if err != nil {
		t.Fatal(err)
	}
	var operands, result string
	if err := db.QueryRow("SELECT operands,result FROM calculations WHERE id=?", item.ID).Scan(&operands, &result); err != nil || operands != `["12.50","7.25"]` || result != "19.75" {
		t.Fatal(operands, result, err)
	}
	if _, err := s.SaveCalculation(ctx, models.Calculation{ThreadID: "missing"}); !errors.Is(err, ErrNotFound) {
		t.Fatal(err)
	}
}

func TestHistoryPersistsAcrossReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "persistent.db")
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	s := New(db)
	ctx := context.Background()
	thread, err := s.CreateThread(ctx, "Saved workspace")
	if err != nil {
		t.Fatal(err)
	}
	for _, value := range []string{"3", "7"} {
		if _, err := s.SaveCalculation(ctx, models.Calculation{ThreadID: thread.ID, Operation: "add", Operands: []string{"1", "2"}, Expression: "1 + 2", Result: value}); err != nil {
			t.Fatal(err)
		}
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	db, err = Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	s = New(db)
	items, err := s.Calculations(ctx, thread.ID)
	if err != nil || len(items) != 2 || items[0].Result != "3" || items[1].Result != "7" {
		t.Fatalf("history=%+v,err=%v", items, err)
	}
	stored, err := s.Thread(ctx, thread.ID)
	if err != nil || stored.Name != "Saved workspace" {
		t.Fatal(stored, err)
	}
}

func TestCalculationAndThreadTouchAreAtomic(t *testing.T) {
	db, err := Open(filepath.Join(t.TempDir(), "atomic.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	s := New(db)
	ctx := context.Background()
	thread, err := s.CreateThread(ctx, "Atomic")
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec("CREATE TRIGGER reject_touch BEFORE UPDATE ON threads BEGIN SELECT RAISE(ABORT,'simulated failure'); END")
	if err != nil {
		t.Fatal(err)
	}
	_, err = s.SaveCalculation(ctx, models.Calculation{ThreadID: thread.ID, Operation: "add", Operands: []string{"1", "2"}, Expression: "1 + 2", Result: "3"})
	if err == nil {
		t.Fatal("expected simulated update failure")
	}
	items, err := s.Calculations(ctx, thread.ID)
	if err != nil || len(items) != 0 {
		t.Fatalf("partial calculation persisted: %+v,err=%v", items, err)
	}
	stored, err := s.Thread(ctx, thread.ID)
	if err != nil || !stored.UpdatedAt.Equal(thread.UpdatedAt) {
		t.Fatal(stored, err)
	}
}

func TestForeignKeysApplyToReplacementConnections(t *testing.T) {
	db, err := Open(filepath.Join(t.TempDir(), "connections.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxIdleConns(0)
	for range 3 {
		var enabled int
		if err := db.QueryRow("PRAGMA foreign_keys").Scan(&enabled); err != nil || enabled != 1 {
			t.Fatalf("foreign_keys=%d,error=%v", enabled, err)
		}
	}
}
