package appmode

// Mode identifies agent vs hub runtime.
type Mode string

const (
	Agent Mode = "agent"
	Hub   Mode = "hub"
)
