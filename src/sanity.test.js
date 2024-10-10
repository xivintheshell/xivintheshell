import {render, screen, findBy} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {within} from "@testing-library/dom";

import Main from "./Components/Main";
import {act} from "react-dom/test-utils";

// Need to mock window.URL.createObjectURL
// https://stackoverflow.com/questions/52968969/jest-url-createobjecturl-is-not-a-function
// https://stackoverflow.com/questions/61593774/how-do-i-test-code-that-uses-requestanimationframe-in-jest

// [myn] and also mock ResizeObserver
// https://stackoverflow.com/questions/64558062/how-to-mock-resizeobserver-to-work-in-unit-tests-using-react-testing-library

class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

beforeEach(() => {
    window.URL.createObjectURL = jest.fn();
    window.ResizeObserver = ResizeObserver;
});

afterEach(() => {
    jest.restoreAllMocks();
});

// Basic sanity test to ensure the webpage doesn't crash on load,
// https://create-react-app.dev/docs/running-tests/
it("renders without crashing", async () => {
    const {container} = render(<Main />);
    await act(async () => {
        expect(container).toBeTruthy();
    })
});

// Tests adding an ability to the timeline does not cause a crash
// https://testing-library.com/docs/react-testing-library/example-intro
it("allows timeline inputs without crashing", async () => {
    const user = userEvent.setup();
    const {container} = render(<Main />);
    // Sprint applies instantaneously, and will show up in the damage table instantaneously
    const skillButtonId = "skillButton-Sprint";
    const skillButton = container.querySelector(`[data-tooptip-id="${skillButtonId}"]`);
    const damageTable = container.querySelector("#damageTable");
    // Before clicking Sprint, it won't show up anywhere
    expect(within(damageTable).queryByText("Sprint")).not.toBeInTheDocument();
    // click a skill
    await user.click(skillButton);
    // sz: I'm having a real bad time getting assertions involving DOM elements to work, so I
    // will leave the testing of the webpage's responsiveness to a later date.
    // Ideally we should assert that "Sprint" shows up in the damage table, since checking
    // the timeline canvas is difficult.
});