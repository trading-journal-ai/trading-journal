import { expect, it } from "vitest";
import { cashFlowTotal } from "./analyticsMoney";
it("rounds exact half cents symmetrically after summing decimal fill cash flows", () => {
  expect(cashFlowTotal([{value:-10,quantity:100},{value:10.00005,quantity:100}])).toBe(.01);
  expect(cashFlowTotal([{value:10,quantity:100},{value:-10.00005,quantity:100}])).toBe(-.01);
  expect(cashFlowTotal([{value:.004},{value:.004}])).toBe(.01);
  expect(cashFlowTotal([{value:.004},{value:-.004}])).toBe(0);
});
it("preserves fractional quantities, tiny scientific notation and empty totals", () => {
  expect(cashFlowTotal([{value:1e-7,quantity:50000}])).toBe(.01);
  expect(cashFlowTotal([{value:12.34,quantity:.5}])).toBe(6.17);
  expect(cashFlowTotal([{value:1e21},{value:-1e21},{value:.01}])).toBe(.01);
  expect(cashFlowTotal([])).toBe(0);
  expect(()=>cashFlowTotal([{value:NaN}])).toThrow("finite");
});
