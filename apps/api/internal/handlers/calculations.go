package handlers

import (
	"calculator-workspace/api/internal/calculator"
	"calculator-workspace/api/internal/models"
	"calculator-workspace/api/internal/validation"
	"net/http"
)

func (a *API) calculate(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ThreadID  string   `json:"threadId"`
		Operation string   `json:"operation"`
		Operands  []string `json:"operands"`
	}
	if err := validation.Decode(w, r, &input); err != nil {
		a.fail(w, r, err)
		return
	}
	if err := validation.UUID(input.ThreadID); err != nil {
		a.fail(w, r, err)
		return
	}
	result, err := calculator.Evaluate(input.Operation, input.Operands)
	if err != nil {
		a.fail(w, r, err)
		return
	}
	item, err := a.store.SaveCalculation(r.Context(), models.Calculation{ThreadID: input.ThreadID, Operation: input.Operation, Operands: input.Operands, Expression: result.Expression, Result: result.Value})
	if err != nil {
		a.fail(w, r, err)
		return
	}
	write(w, 201, item)
}
