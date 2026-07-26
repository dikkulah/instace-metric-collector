package push

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/dikkulah/instance-metric-collector/go/internal/payload"
)

func TestSpoolPutPeekDelete(t *testing.T) {
	dir := t.TempDir()
	spool, err := OpenSpool(filepath.Join(dir, "spool.db"), 10)
	if err != nil {
		t.Fatal(err)
	}
	defer spool.Close()

	env := envelope{
		AgentID:  "a1",
		Hostname: "host",
		Snapshot: payload.Snapshot{CollectedAt: "t1"},
	}
	if err := spool.Put(env); err != nil {
		t.Fatal(err)
	}
	id, got, ok, err := spool.Peek()
	if err != nil || !ok {
		t.Fatalf("peek: ok=%v err=%v", ok, err)
	}
	if id <= 0 || got.Snapshot.CollectedAt != "t1" {
		t.Fatalf("peek = %+v id=%d", got, id)
	}
	if err := spool.Delete(id); err != nil {
		t.Fatal(err)
	}
	_, _, ok, err = spool.Peek()
	if err != nil || ok {
		t.Fatalf("expected empty spool, ok=%v err=%v", ok, err)
	}
}

func TestSpoolTrimOldest(t *testing.T) {
	dir := t.TempDir()
	spool, err := OpenSpool(filepath.Join(dir, "spool.db"), 2)
	if err != nil {
		t.Fatal(err)
	}
	defer spool.Close()

	for i := 0; i < 3; i++ {
		env := envelope{
			AgentID:  "a1",
			Hostname: "host",
			Snapshot: payload.Snapshot{CollectedAt: time.Now().UTC().Format(time.RFC3339Nano)},
		}
		if err := spool.Put(env); err != nil {
			t.Fatal(err)
		}
	}
	n, err := spool.Len()
	if err != nil || n != 2 {
		t.Fatalf("len = %d err=%v", n, err)
	}
}
