package models

import "time"

type Thread struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Calculation struct {
	ID         string    `json:"id"`
	ThreadID   string    `json:"threadId"`
	Operation  string    `json:"operation"`
	Operands   []string  `json:"operands"`
	Expression string    `json:"expression"`
	Result     string    `json:"result"`
	CreatedAt  time.Time `json:"createdAt"`
}
