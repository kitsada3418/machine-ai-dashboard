import { render, screen } from "@testing-library/react";
import {
  AlarmStatusText,
  SeverityBadge,
  StatusBadge,
} from "@/components/status";

describe("StatusBadge", () => {
  it.each([
    ["RUN", "Running"],
    ["IDLE", "Idle"],
    ["STOP", "Stopped"],
    ["ALARM", "Alarm"],
    ["OFFLINE", "Offline"],
  ] as const)("renders label for %s", (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("applies the status color class", () => {
    render(<StatusBadge status="RUN" />);
    expect(screen.getByText("Running")).toHaveClass("text-running");
  });
});

describe("SeverityBadge", () => {
  it.each(["CRITICAL", "WARNING", "INFO"] as const)(
    "renders severity %s",
    (severity) => {
      render(<SeverityBadge severity={severity} />);
      expect(screen.getByText(severity)).toBeInTheDocument();
    },
  );

  it("applies severity styling", () => {
    render(<SeverityBadge severity="CRITICAL" />);
    expect(screen.getByText("CRITICAL")).toHaveClass("text-alarm");
  });
});

describe("AlarmStatusText", () => {
  it("renders the alarm status", () => {
    render(<AlarmStatusText status="ACTIVE" />);
    expect(screen.getByText("ACTIVE")).toHaveClass("text-alarm");
  });
});
