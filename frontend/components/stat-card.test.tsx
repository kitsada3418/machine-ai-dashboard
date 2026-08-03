import { render, screen } from "@testing-library/react";
import { StatCard } from "@/components/stat-card";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="OEE" value="92.4%" />);
    expect(screen.getByText("OEE")).toBeInTheDocument();
    expect(screen.getByText("92.4%")).toBeInTheDocument();
  });

  it("renders the hint when provided", () => {
    render(<StatCard label="Output" value="8260" hint="Today" />);
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("does not render a hint when absent", () => {
    render(<StatCard label="Output" value="8260" />);
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });

  it("renders the status dot when a color is provided", () => {
    const { container } = render(
      <StatCard label="Running" value="12" dotColor="bg-running" />,
    );
    expect(container.querySelector("span.bg-running")).toBeInTheDocument();
  });
});
