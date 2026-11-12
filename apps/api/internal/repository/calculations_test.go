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
