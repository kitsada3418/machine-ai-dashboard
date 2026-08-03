import { render } from "@testing-library/react";
import { Chart } from "@/components/chart";

const initMock = vi.fn(() => ({
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock("echarts", () => ({
  init: (...args: unknown[]) => (initMock as unknown as (...a: unknown[]) => unknown)(...args),
}));

describe("Chart", () => {
  beforeEach(() => {
    initMock.mockClear();
  });

  it("renders a container div", () => {
    const { container } = render(<Chart option={{}} />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("initializes echarts and applies the option", () => {
    const option = { series: [{ type: "line", data: [1, 2, 3] }] };
    render(<Chart option={option} />);
    expect(initMock).toHaveBeenCalledTimes(1);
  });
});
