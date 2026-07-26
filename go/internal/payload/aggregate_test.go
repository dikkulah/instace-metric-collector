package payload

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestAggregateMetricsPayloadJSONUsesEmptyArrays(t *testing.T) {
	b, err := json.Marshal(AggregateMetricsPayload(12.5, 100, 200))
	if err != nil {
		t.Fatal(err)
	}
	s := string(b)
	for _, field := range []string{"processInfos", "serviceInfos", "containers", "diskUsage", "networkUsage"} {
		if strings.Contains(s, `"`+field+`":null`) {
			t.Fatalf("json has null %s: %s", field, s)
		}
	}
}
