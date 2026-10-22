import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import BookingPageTagManager from "./BookingPageTagManager";
test("booking pages do not inject tracking scripts", () => { const view = render(<BookingPageTagManager />); expect(view.container.querySelector("script")).toBeNull(); });
