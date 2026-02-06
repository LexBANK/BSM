package main

import "testing"

func TestAdd(t *testing.T) {
	result := Add(2, 3)
	expected := 5
	if result != expected {
		t.Errorf("Add(2, 3) = %d; want %d", result, expected)
	}
}

func TestAddNegative(t *testing.T) {
	result := Add(-1, 1)
	expected := 0
	if result != expected {
		t.Errorf("Add(-1, 1) = %d; want %d", result, expected)
	}
}
