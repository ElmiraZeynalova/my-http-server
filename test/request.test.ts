import {requestFromReader} from '../src/request.ts'
import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {getHeaderValueByKey} from '../src/headers.ts'

describe('Good requests', () => {

    const chunkSize = 3

    function* chunkStream(testString: string): Generator<Buffer> {
        const buffer = Buffer.from(testString)
        for (let i = 0; i < buffer.length; i += chunkSize) {
            yield buffer.subarray(i, i + chunkSize)
        }
    }

    it('request with headers and body', async() => {
        const testString = "POST /submit HTTP/1.1\r\nHost: localhost:42069\r\nContent-Length: 13\r\n\r\nhello world!\n"
        const request = await requestFromReader(chunkStream(testString))
        assert.strictEqual(request.requestLine?.method, "POST");
        assert.strictEqual(request.requestLine?.httpVersion, "1.1");
        assert.strictEqual(request.requestLine?.requestTarget, "/submit");
        assert.strictEqual(request.headers["host"], "localhost:42069");
        assert.strictEqual(request.headers["content-length"], "13");
        assert.strictEqual(String(request.body), "hello world!\n");
    }); 

    it('request with Content-Length:0 and NO body', async() => {
        const testString = "POST /submit HTTP/1.1\r\nHost: localhost:42069\r\nContent-Length: 0\r\n\r\n"
        const request = await requestFromReader(chunkStream(testString))
        assert.strictEqual(request.requestLine?.method, "POST");
        assert.strictEqual(request.requestLine?.httpVersion, "1.1");
        assert.strictEqual(request.requestLine?.requestTarget, "/submit");
        assert.strictEqual(request.headers["host"], "localhost:42069");
        assert.strictEqual(request.headers["content-length"], "0"); 
        assert.strictEqual(request.body.length, 0);
    }); 
    
    it('request with NO Content-Length header and NO body', async() => {
        const testString = "POST /submit HTTP/1.1\r\nHost: localhost:42069\r\n\r\n"
        const request = await requestFromReader(chunkStream(testString))
        assert.strictEqual(request.requestLine?.method, "POST");
        assert.strictEqual(request.requestLine?.httpVersion, "1.1");
        assert.strictEqual(request.requestLine?.requestTarget, "/submit");
        assert.strictEqual(request.headers["host"], "localhost:42069");
        assert.strictEqual(getHeaderValueByKey(request.headers, "content-length"), null);
        assert.strictEqual(request.body.length, 0);
    });

    it('request with NO Content-Length header and existing body', async() => {
        const testString = "POST /submit HTTP/1.1\r\nHost: localhost:42069\r\n\r\nhello world!\n"
        const request = await requestFromReader(chunkStream(testString))
        assert.strictEqual(request.requestLine?.method, "POST");
        assert.strictEqual(request.requestLine?.httpVersion, "1.1");
        assert.strictEqual(request.requestLine?.requestTarget, "/submit");
        assert.strictEqual(request.headers["host"], "localhost:42069");
        assert.strictEqual(request.body.length, 0);
    });


})

describe('Bad requests', () => {
   
    const chunkSize = 11

    function* chunkStream(testString: string): Generator<Buffer> {
        const buffer = Buffer.from(testString)
        for (let i = 0; i < buffer.length; i += chunkSize) {
            yield buffer.subarray(i, i + chunkSize)
        }
    }

    it('malformed header', async() => {
        const testString = "GET / HTTP/1.1\r\nHost localhost:42069\r\n\r\n"
        await assert.rejects(
            requestFromReader(chunkStream(testString)),
            { message: "Invalid field-name" }
        )
    })

    it("body is shorter than Content-Length field-value", async() => {
        const testString = "POST /submit HTTP/1.1\r\nHost: localhost:42069\r\nContent-Length: 20\r\n\r\npartial content"
        await assert.rejects(
          requestFromReader(chunkStream(testString)),
          { message: "Body size is less than Content-Length field-value"}
        )
    })

    it("body is longer than Content-Length field-value", async() => {
        const testString = "POST /submit HTTP/1.1\r\nHost: localhost:42069\r\nContent-Length: 5\r\n\r\nbig content"
        await assert.rejects(
          requestFromReader(chunkStream(testString)),
          { message: "Body size is bigger than Content-Length field-value"}
        )
    })
})
