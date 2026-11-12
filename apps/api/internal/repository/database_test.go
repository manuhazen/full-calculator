package repository

import (
	"os"
	"path/filepath"
	"testing"
)

func TestOpenMigrationsAndReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		query string
		want  int
	}{{"PRAGMA user_version", 1}, {"PRAGMA foreign_keys", 1}, {"PRAGMA busy_timeout", 5000}} {
		var got int
		if err := db.QueryRow(tc.query).Scan(&got); err != nil || got != tc.want {
			t.Fatalf("%s: got %d, err %v", tc.query, got, err)
		}
	}
	var mode string
	if err := db.QueryRow("PRAGMA journal_mode").Scan(&mode); err != nil || mode != "wal" {
		t.Fatalf("mode=%s, err=%v", mode, err)
	}
	if _, err := db.Exec("INSERT INTO threads(id,name,created_at,updated_at) VALUES(?,?,?,?)", "persistent-id", "Saved name", 1, 1); err != nil {
		t.Fatal(err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	db, err = Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var name string
	if err := db.QueryRow("SELECT name FROM threads WHERE id=?", "persistent-id").Scan(&name); err != nil || name != "Saved name" {
		t.Fatalf("name=%s, err=%v", name, err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0600 {
		t.Fatalf("permissions=%o", info.Mode().Perm())
	}
}
