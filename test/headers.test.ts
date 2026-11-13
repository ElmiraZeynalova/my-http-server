import { parseHeader } from "../src/headers.ts";
import { describe, it} from "node:test";
import assert from 'node:assert/strict'
import type { Headers } from "../src/headers.ts";

describe("Valid field-names", () => {
    it("Host: localhost:42069\r\n\r\n", () => {
        const headers: Headers = {}
        const data = Buffer.from("Host: localhost:42069\r\n\r\n")
        const res = parseHeader(headers, data)

        assert.strictEqual(headers["host"], "localhost:42069")
        assert.strictEqual(res.done, false)
        assert.strictEqual(res.bytesConsumed, 23)
        assert.ok(Object.keys(headers).every(key => key === key.toLowerCase()))
    })
    it("Host:  localhost:42069   \r\n\r\n", () => {
        const headers: Headers = {}
        const data = Buffer.from("Host:  localhost:42069   \r\n\r\n")
        const res = parseHeader(headers, data)

        assert.strictEqual(headers["host"], "localhost:42069")
        assert.strictEqual(res.done, false)
        assert.strictEqual(res.bytesConsumed, 27)
        assert.ok(Object.keys(headers).every(key => key === key.toLowerCase()))
    })
    it("Empty line means headers are done", () => {
        const headers: Headers = {}
        const data = Buffer.from("\r\n")

        const res = parseHeader(headers, data)

        assert.strictEqual(res.done, true)
        assert.strictEqual(res.bytesConsumed, 2)
    })
    it("multiple field-values", () => {
        const headers: Headers = {"set-person": "lane-loves-go"}
        const data = Buffer.from("Set-Person: prime-loves-zig, tj-loves-ocaml\r\n\r\n")
        const res = parseHeader(headers, data)
        console.log("HEADERS: ", headers)
        assert.strictEqual(headers["set-person"], "lane-loves-go, prime-loves-zig, tj-loves-ocaml")
        assert.strictEqual(res.done, false)
        assert.ok(Object.keys(headers).every(key => key === key.toLowerCase()))
    })
})

describe("Invalid field-names", () => {
    it("no colon (Host localhost:42069)", () => {
        const headers: Headers = {}
        const data = Buffer.from("Host localhost:42069\r\n\r\n")
        assert.throws(() => parseHeader(headers, data), { message: "Invalid field-name" });
    })
    it("field-name length = 0 (: localhost:42069)", () => {
        const headers: Headers = {}
        const data = Buffer.from(": localhost:42069\r\n\r\n")
        assert.throws(() => parseHeader(headers, data), { message: "Invalid field-name" });
    })
    it("white space before field-name ( Host: localhost:42069)", () => {
        const headers: Headers = {}
        const data = Buffer.from(" Host: localhost:42069\r\n\r\n")
        assert.throws(() => parseHeader(headers, data),  { message: "Invalid field-name" });
    })
    it("white space before colon (Host : localhost:42069)", () => {
        const headers: Headers = {}
        const data = Buffer.from("Host : localhost:42069\r\n\r\n")
        assert.throws(() => parseHeader(headers, data),  { message: "Invalid field-name" });
    })
    it("invalid char in field-name (H©st: localhost:42069)", () => {
        const headers: Headers = {}
        const data = Buffer.from("H©st: localhost:42069\r\n\r\n")
        assert.throws(() => parseHeader(headers, data),  { message: "Invalid field-name" });
    })
    it("Incomplete header - no crlf", () => {
        const headers: Headers = {}
        const data = Buffer.from("Host: localhost")

        const res = parseHeader(headers, data)

        assert.strictEqual(res.done, false)
        assert.strictEqual(res.bytesConsumed, 0)
        assert.deepStrictEqual(headers, {})
    })
})