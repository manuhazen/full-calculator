package calculator

import (
	"calculator-workspace/api/internal/fault"
	"errors"
	"testing"
)

func TestAdvancedArithmetic(t *testing.T) {
	for _, tc := range []struct {
		name, operation string
		operands        []string
		want, code      string
	}{
		{"power", "power", []string{"20", "2"}, "400", ""}, {"negative exponent", "power", []string{"2", "-3"}, "0.125", ""}, {"negative base odd", "power", []string{"-2", "3"}, "-8", ""}, {"negative base even", "power", []string{"-2", "2"}, "4", ""}, {"zero exponent", "power", []string{"5", "0"}, "1", ""}, {"zero zero", "power", []string{"0", "0"}, "1", ""}, {"max exponent", "power", []string{"2", "20"}, "1048576", ""}, {"min exponent", "power", []string{"2", "-20"}, "0.000000953674", ""}, {"fractional exponent", "power", []string{"2", "0.5"}, "", "INVALID_EXPONENT"}, {"exponent too high", "power", []string{"2", "21"}, "", "INVALID_EXPONENT"}, {"exponent too low", "power", []string{"2", "-21"}, "", "INVALID_EXPONENT"}, {"zero negative", "power", []string{"0", "-1"}, "", "ZERO_NEGATIVE_POWER"}, {"power overflow", "power", []string{"1000000000000", "20"}, "", "RESULT_OUT_OF_RANGE"}, {"power underflow", "power", []string{"0.000000000001", "20"}, "", "RESULT_UNDERFLOW"}, {"negative power underflow", "power", []string{"1000", "-20"}, "", "RESULT_UNDERFLOW"}, {"sqrt", "sqrt", []string{"144"}, "12", ""}, {"irrational sqrt", "sqrt", []string{"2"}, "1.414213562373", ""}, {"tiny sqrt", "sqrt", []string{"0.000000000001"}, "0.000001", ""}, {"sqrt zero", "sqrt", []string{"0"}, "0", ""}, {"negative sqrt", "sqrt", []string{"-1"}, "", "NEGATIVE_SQUARE_ROOT"}, {"percent", "percent", []string{"25"}, "0.25", ""}, {"negative percent", "percent", []string{"-25"}, "-0.25", ""}, {"percent zero", "percent", []string{"0"}, "0", ""}, {"percent underflow", "percent", []string{"0.000000000001"}, "", "RESULT_UNDERFLOW"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			result, err := Evaluate(tc.operation, tc.operands)
			if tc.code != "" {
				var issue *fault.Error
				if !errors.As(err, &issue) || issue.Code != tc.code {
					t.Fatalf("err=%v,want=%s", err, tc.code)
				}
				return
			}
			if err != nil || result.Value != tc.want {
				t.Fatalf("result=%+v,err=%v,want=%s", result, err, tc.want)
			}
		})
	}
}
