# Go Example for BSM Runner

This example demonstrates Go language support in the BSM platform runner agent.

## Build

```bash
go build -o app main.go
```

## Run

```bash
./app
```

or directly:

```bash
go run main.go
```

## Test

```bash
go test -v
```

## Expected Output

Build and run:
```
Hello from BSM Go Support!
BSM Platform now supports Go builds and tests
```

Test output:
```
=== RUN   TestAdd
--- PASS: TestAdd (0.00s)
=== RUN   TestAddNegative
--- PASS: TestAddNegative (0.00s)
PASS
ok      github.com/LexBANK/BSM/examples/go-example     0.001s
```
