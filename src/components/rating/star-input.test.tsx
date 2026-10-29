import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StarInput } from "./star-input";

const labels = ["Muy mal", "Mal", "Regular", "Bien", "Excelente"];

describe("StarInput", () => {
  it("exposes an accessible radio group and reports the chosen value", () => {
    const onChange = vi.fn();
    render(<StarInput value={null} onChange={onChange} labels={labels} name="clarity" ariaLabel="Claridad" />);
    expect(screen.getByRole("radiogroup", { name: "Claridad" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "4 – Bien" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("marks the current value as checked", () => {
    render(<StarInput value={2} onChange={() => {}} labels={labels} name="clarity" ariaLabel="Claridad" />);
    expect(screen.getByRole("radio", { name: "2 – Mal" })).toBeChecked();
    expect(screen.getByText("Mal")).toBeInTheDocument();
  });
});
