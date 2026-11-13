import {requestFromReader} from '../src/request.ts'
import {describe, it} from 'node:test'
import assert from 'node:assert/strict'

describe('Good requests', () => {

    const testString = "GET / HTTP/1.1\r\nHost: localhost:42069\r\nUser-Agent: curl/7.81.0\r\nAccept: */*\r\n\r\n"
    const chunkSize = 3

    function* chunkStream(): Generator<Buffer> {
        const buffer = Buffer.from(testString)
        for (let i = 0; i < buffer.length; i += chunkSize) {
            yield buffer.subarray(i, i + chunkSize)
        }
    }

    it('Good GET Request with headers', async() => {
        const request = await requestFromReader(chunkStream())
        assert.strictEqual(request.requestLine?.method, "GET");
        assert.strictEqual(request.requestLine?.httpVersion, "1.1");
        assert.strictEqual(request.requestLine?.requestTarget, "/");
        assert.strictEqual(request.headers["host"], "localhost:42069");
        assert.strictEqual(request.headers["user-agent"], "curl/7.81.0");
        assert.strictEqual(request.headers["accept"], "*/*");
    });
})

describe('Bad requests', () => {

    const testString = "GET / HTTP/1.1\r\nHost localhost:42069\r\n\r\n"
    const chunkSize = 3

    function* chunkStream(): Generator<Buffer> {
        const buffer = Buffer.from(testString)
        for (let i = 0; i < buffer.length; i += chunkSize) {
            yield buffer.subarray(i, i + chunkSize)
        }
    }
    it('Malformed header', async() => {
        await assert.rejects(
            requestFromReader(chunkStream()),
            { message: "Invalid field-name" }
        )
    })
})