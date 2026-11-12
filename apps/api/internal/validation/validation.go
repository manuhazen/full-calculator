package validation

import (
	"bytes"
	"calculator-workspace/api/internal/fault"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
)

const MaxBodyBytes int64 = 8192

var decimalPattern = regexp.MustCompile(`^-?(0|[1-9][0-9]{0,23})(\.[0-9]{1,12})?$`)

func Decode(w http.ResponseWriter, r *http.Request, destination any) error {
	media, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || media != "application/json" {
		return fault.New("UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.")
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBodyBytes))
	if err != nil {
		var size *http.MaxBytesError
		if errors.As(err, &size) {
			return fault.New("BODY_TOO_LARGE", "Request body exceeds 8192 bytes.")
		}
		return fault.New("INVALID_JSON", "Cannot read the JSON request.")
	}
	if !utf8.Valid(body) {
		return fault.New("INVALID_JSON", "JSON must use valid UTF-8 encoding.")
	}
	trimmed := bytes.TrimSpace(body)
	if len(trimmed) == 0 || trimmed[0] != '{' {
		return fault.New("INVALID_JSON", "Request must be a JSON object.")
	}
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return fault.New("INVALID_JSON", "Request contains invalid JSON, unexpected fields, or incorrect value types.")
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return fault.New("INVALID_JSON", "Request must contain exactly one JSON object.")
	}
	return nil
}

func UUID(id string) error {
	parsed, err := uuid.Parse(id)
	if err != nil || parsed.String() != id {
		return fault.New("INVALID_THREAD_ID", "Thread ID must be a canonical UUID.")
	}
	return nil
}

func Name(raw json.RawMessage, defaultName bool) (string, error) {
	if len(raw) == 0 && defaultName {
		return "Untitled Thread", nil
	}
	var name string
	if len(raw) == 0 || string(raw) == "null" || json.Unmarshal(raw, &name) != nil {
		return "", fault.New("INVALID_THREAD_NAME", "Thread name must be a string.")
	}
	name = strings.TrimSpace(name)
	if !utf8.ValidString(name) || utf8.RuneCountInString(name) < 1 || utf8.RuneCountInString(name) > 80 {
		return "", fault.New("INVALID_THREAD_NAME", "Thread name must contain 1 to 80 characters.")
	}
	return name, nil
}

func Decimal(value string) error {
	if len(value) > 38 || !decimalPattern.MatchString(value) {
		return fault.New("INVALID_OPERAND", "Operands must be decimal strings with at most 24 integer digits and 12 decimal places.")
	}
	return nil
}

func Operands(operation string, operands []string) error {
	count := 2
	switch operation {
	case "add", "subtract", "multiply", "divide", "power":
	case "sqrt", "percent":
		count = 1
	default:
		return fault.New("INVALID_OPERATION", "Choose a supported calculation operation.")
	}
	if len(operands) != count {
		return fault.New("INVALID_OPERAND_COUNT", "Incorrect number of operands for this operation.")
	}
	for _, operand := range operands {
		if err := Decimal(operand); err != nil {
			return err
		}
	}
	return nil
}
