package repository

import (
	"calculator-workspace/api/internal/models"
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("resource not found")

type Store struct{ DB *sql.DB }

func New(db *sql.DB) *Store { return &Store{DB: db} }

func (s *Store) Threads(ctx context.Context) ([]models.Thread, error) {
	rows, err := s.DB.QueryContext(ctx, "SELECT id,name,created_at,updated_at FROM threads ORDER BY updated_at DESC,id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]models.Thread, 0)
	for rows.Next() {
		item, err := scanThread(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) CreateThread(ctx context.Context, name string) (models.Thread, error) {
	now := time.Now().UTC().Truncate(time.Millisecond)
	item := models.Thread{ID: uuid.NewString(), Name: name, CreatedAt: now, UpdatedAt: now}
	_, err := s.DB.ExecContext(ctx, "INSERT INTO threads(id,name,created_at,updated_at) VALUES(?,?,?,?)", item.ID, item.Name, now.UnixMilli(), now.UnixMilli())
	return item, err
}

func (s *Store) Thread(ctx context.Context, id string) (models.Thread, error) {
	return scanThread(s.DB.QueryRowContext(ctx, "SELECT id,name,created_at,updated_at FROM threads WHERE id=?", id))
}

func (s *Store) RenameThread(ctx context.Context, id, name string) (models.Thread, error) {
	result, err := s.DB.ExecContext(ctx, "UPDATE threads SET name=?,updated_at=? WHERE id=?", name, time.Now().UTC().UnixMilli(), id)
	if err != nil {
		return models.Thread{}, err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return models.Thread{}, err
	}
	if n == 0 {
		return models.Thread{}, ErrNotFound
	}
	return s.Thread(ctx, id)
}

func (s *Store) DeleteThread(ctx context.Context, id string) error {
	result, err := s.DB.ExecContext(ctx, "DELETE FROM threads WHERE id=?", id)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func scanThread(row interface{ Scan(...any) error }) (models.Thread, error) {
	var item models.Thread
	var created, updated int64
	err := row.Scan(&item.ID, &item.Name, &created, &updated)
	if errors.Is(err, sql.ErrNoRows) {
		return item, ErrNotFound
	}
	if err != nil {
		return item, err
	}
	item.CreatedAt = time.UnixMilli(created).UTC()
	item.UpdatedAt = time.UnixMilli(updated).UTC()
	return item, nil
}
