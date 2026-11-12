package calculator

import (
	"calculator-workspace/api/internal/fault"
	"calculator-workspace/api/internal/validation"
	"errors"
	"testing"
)

func TestResultBoundariesRemainReusable(t *testing.T) {
	for _, tc := range []struct {
		operation string
		operands  []string
		want      string
	}{
		{"add", []string{"999999999999999999999999.999999999999", "0"}, "999999999999999999999999.999999999999"},
		{"add", []string{"0.000000000001", "0"}, "0.000000000001"},
		{"subtract", []string{"0.000000000001", "0.000000000001"}, "0"},
		{"multiply", []string{"0.000000000001", "0.5"}, "0.000000000001"},
		{"multiply", []string{"-0.000000000001", "0.5"}, "-0.000000000001"},
	} {
		result, err := Evaluate(tc.operation, tc.operands)
		if err != nil || result.Value != tc.want {
			t.Fatalf("result=%+v,err=%v,want=%s", result, err, tc.want)
		}
		if err := validation.Decimal(result.Value); err != nil {
			t.Fatalf("result cannot be reused: %s: %v", result.Value, err)
		}
	}
}

func TestBasicArithmetic(t *testing.T) {
	for _, tc := range []struct {
		name, operation string
		operands        []string
		want, code      string
	}{
		{"decimal add", "add", []string{"0.1", "0.2"}, "0.3", ""}, {"preserve operands", "add", []string{"12.50", "7.25"}, "19.75", ""}, {"negative", "add", []string{"-5", "2"}, "-3", ""}, {"subtract", "subtract", []string{"2", "5"}, "-3", ""}, {"multiply", "multiply", []string{"-2.5", "4"}, "-10", ""}, {"zero multiply", "multiply", []string{"0", "999"}, "0", ""}, {"divide", "divide", []string{"40", "2"}, "20", ""}, {"round thirds", "divide", []string{"1", "3"}, "0.333333333333", ""}, {"round sixth", "divide", []string{"1", "6"}, "0.166666666667", ""}, {"negative division", "divide", []string{"-1", "6"}, "-0.166666666667", ""}, {"positive tie", "multiply", []string{"0.000000000001", "1.5"}, "0.000000000002", ""}, {"negative tie", "multiply", []string{"-0.000000000001", "1.5"}, "-0.000000000002", ""}, {"zero", "divide", []string{"-0", "2"}, "0", ""}, {"division zero", "divide", []string{"1", "-0.0"}, "", "DIVISION_BY_ZERO"}, {"tiny result", "divide", []string{"0.000000000001", "100"}, "", "RESULT_UNDERFLOW"}, {"overflow", "add", []string{"999999999999999999999999", "1"}, "", "RESULT_OUT_OF_RANGE"}, {"invalid", "add", []string{"NaN", "1"}, "", "INVALID_OPERAND"}, {"count", "add", []string{"1"}, "", "INVALID_OPERAND_COUNT"}, {"operation", "arbitrary", []string{"1"}, "", "INVALID_OPERATION"},
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
			if tc.name == "preserve operands" && result.Expression != "12.50 + 7.25" {
				t.Fatal(result.Expression)
			}
		})
	}
}
