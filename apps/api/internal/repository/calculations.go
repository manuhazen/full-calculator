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

func (s *Store) Calculations(ctx context.Context, threadID string) ([]models.Calculation, error) {
	if _, err := s.Thread(ctx, threadID); err != nil {
		return nil, err
	}
	rows, err := s.DB.QueryContext(ctx, "SELECT id,thread_id,operation,operands,expression,result,created_at FROM calculations WHERE thread_id=? ORDER BY sequence ASC", threadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]models.Calculation, 0)
	for rows.Next() {
		var item models.Calculation
		var operands string
		var created int64
		if err := rows.Scan(&item.ID, &item.ThreadID, &item.Operation, &operands, &item.Expression, &item.Result, &created); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(operands), &item.Operands); err != nil {
			return nil, err
		}
		item.CreatedAt = time.UnixMilli(created).UTC()
		items = append(items, item)
	}
	return items, rows.Err()
}

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
