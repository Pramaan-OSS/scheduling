import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import Credits from "./Credits";
test("does not link to an original product or release service", () => { const view = render(<Credits />); expect(view.container.querySelector("a")).toBeNull(); });
