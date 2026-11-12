package calculator

import (
	"calculator-workspace/api/internal/fault"
	"calculator-workspace/api/internal/validation"
	"strings"

	"github.com/shopspring/decimal"
)

const Places int32 = 12

var limit = decimal.New(1, 24)

type Result struct {
	Expression string
	Value      string
}

// Evaluate is pure decimal business logic: no HTTP, database, or binary floats.
func Evaluate(operation string, operands []string) (Result, error) {
	if err := validation.Operands(operation, operands); err != nil {
		return Result{}, err
	}
	a, _ := decimal.NewFromString(operands[0])
	b := decimal.Zero
	if len(operands) == 2 {
		b, _ = decimal.NewFromString(operands[1])
	}
	var value decimal.Decimal
	var expression string
	var nonzero bool
	switch operation {
	case "add":
		value = a.Add(b)
		expression = binary(operands, "+")
		nonzero = !value.IsZero()
	case "subtract":
		value = a.Sub(b)
		expression = binary(operands, "-")
		nonzero = !value.IsZero()
	case "multiply":
		value = a.Mul(b)
		expression = binary(operands, "*")
		nonzero = !value.IsZero()
	case "divide":
		if b.IsZero() {
			return Result{}, fault.New("DIVISION_BY_ZERO", "Cannot divide by zero.")
		}
		value = a.DivRound(b, Places)
		expression = binary(operands, "/")
		nonzero = !a.IsZero()
	case "sqrt":
		if a.IsNegative() {
			return Result{}, fault.New("NEGATIVE_SQUARE_ROOT", "Cannot calculate the square root of a negative number.")
		}
		var err error
		value, err = a.SqrtRound(Places)
		if err != nil {
			return Result{}, fault.New("INVALID_OPERAND", "Cannot calculate this square root.")
		}
		expression = "sqrt(" + operands[0] + ")"
		nonzero = !a.IsZero()
	case "percent":
		value = a.Shift(-2)
		expression = operands[0] + " / 100"
		nonzero = !a.IsZero()
	case "power":
		if !b.Equal(b.Truncate(0)) || b.LessThan(decimal.NewFromInt(-20)) || b.GreaterThan(decimal.NewFromInt(20)) {
			return Result{}, fault.New("INVALID_EXPONENT", "Exponent must be an integer between -20 and 20.")
		}
		n := b.IntPart()
		if a.IsZero() && n < 0 {
			return Result{}, fault.New("ZERO_NEGATIVE_POWER", "Zero cannot be raised to a negative exponent.")
		}
		negative := n < 0
		if negative {
			n = -n
		}
		value = decimal.NewFromInt(1)
		for i := int64(0); i < n; i++ {
			value = value.Mul(a)
		}
		if negative {
			value = decimal.NewFromInt(1).DivRound(value, Places)
		}
		expression = binary(operands, "^")
		nonzero = !a.IsZero() || n == 0
	default:
		return Result{}, fault.New("INVALID_OPERATION", "Choose a supported calculation operation.")
	}
	if value.Abs().GreaterThanOrEqual(limit) {
		return Result{}, fault.New("RESULT_OUT_OF_RANGE", "Result magnitude must be less than 10^24.")
	}
	value = value.Round(Places)
	if nonzero && value.IsZero() {
		return Result{}, fault.New("RESULT_UNDERFLOW", "The nonzero result is too small for 12 decimal places.")
	}
	if value.Abs().GreaterThanOrEqual(limit) {
		return Result{}, fault.New("RESULT_OUT_OF_RANGE", "Result magnitude must be less than 10^24.")
	}
	return Result{Expression: expression, Value: value.String()}, nil
}

func binary(operands []string, symbol string) string {
	left, right := operands[0], operands[1]
	if strings.HasPrefix(left, "-") {
		left = "(" + left + ")"
	}
	if strings.HasPrefix(right, "-") {
		right = "(" + right + ")"
	}
	return left + " " + symbol + " " + right
}
