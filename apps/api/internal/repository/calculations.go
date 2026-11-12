package repository

import (
	"calculator-workspace/api/internal/models"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

func (s *Store) SaveCalculation(ctx context.Context, item models.Calculation) (models.Calculation, error) {
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return item, err
	}
	defer tx.Rollback()
	var exists int
	if err := tx.QueryRowContext(ctx, "SELECT 1 FROM threads WHERE id=?", item.ThreadID).Scan(&exists); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return item, ErrNotFound
		}
		return item, err
	}
	item.ID = uuid.NewString()
	item.CreatedAt = time.Now().UTC().Truncate(time.Millisecond)
	operands, err := json.Marshal(item.Operands)
	if err != nil {
		return item, err
	}
	_, err = tx.ExecContext(ctx, "INSERT INTO calculations(id,thread_id,operation,operands,expression,result,created_at) VALUES(?,?,?,?,?,?,?)", item.ID, item.ThreadID, item.Operation, string(operands), item.Expression, item.Result, item.CreatedAt.UnixMilli())
	if err != nil {
		return item, err
	}
	if _, err = tx.ExecContext(ctx, "UPDATE threads SET updated_at=? WHERE id=?", item.CreatedAt.UnixMilli(), item.ThreadID); err != nil {
		return item, err
	}
	return item, tx.Commit()
}
