import {requestFromReader} from '../src/request.ts'
import {describe, it} from 'node:test'
import assert from 'node:assert/strict'

const testString = "GET / HTTP/1.1\r\nHost: localhost:42069\r\nUser-Agent: curl/7.81.0\r\nAccept: */*\r\n\r\n"
const chunkSize = 3

function* chunkStream(): Generator<Buffer> {
    const buffer = Buffer.from(testString)

    for (let i = 0; i < buffer.length; i += chunkSize) {
        yield buffer.subarray(i, i + chunkSize)
    }
}

describe('Good requests', () => {
    it('Good GET Request line', async() => {
        const request = await requestFromReader(chunkStream())
        assert.strictEqual(request.requestLine?.method, "GET");
        assert.strictEqual(request.requestLine?.httpVersion, "1.1");
        assert.strictEqual(request.requestLine?.requestTarget, "/");
    });
})