import { expect } from "chai";
import { describe } from "mocha";
import forEmit from "../src";

describe("forEmitOf", () => {
    it("should be a function", () => {
        expect(forEmit).to.be.a("function");
    });
});
