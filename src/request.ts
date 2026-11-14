import { parseHeader, getHeaderValueByKey } from "./headers.ts"
export type Headers = Record<string, string>

type RequestLine = {
    httpVersion: string
    requestTarget: string
    method: string
}

type ParseRequestLineResult = {
    bytesConsumed: number
    requestLine?: RequestLine
}

type ParserState = "initialized" | "parsing headers" | "parsing body" | "done" 

type Request = {
    requestLine?: RequestLine
    headers: Headers
    body: Buffer
    state: ParserState
}

export async function requestFromReader(reader: AsyncIterable<Uint8Array> | Iterable<Uint8Array>): Promise<Request>{
    const request: Request = {state: "initialized", headers: {}, body: Buffer.alloc(0)}
    let buff = Buffer.alloc(0)

    for await (const chunk of reader){
        buff = Buffer.concat([buff, Buffer.from(chunk)])
        const bytesConsumed = parse(request, buff)
        if(bytesConsumed > 0) buff = buff.subarray(bytesConsumed)

        
        if(request.state === "done") return request
    }
    
    if(request.state === "parsing body"){
      const contentLengthValue = getHeaderValueByKey(request.headers, "content-length")
      if(contentLengthValue !== null && request.body.length < Number(contentLengthValue)) throw new Error("Body size is less than Content-Length field-value")
    }

    throw new Error("Invalid request string")
}

function parse(request: Request, bytes: Buffer){
    let bytesConsumedPerChunk = 0
    let buff = Buffer.from(bytes)
    while(request.state !== "done"){
        const parsedBytes = parseSingle(buff.subarray(bytesConsumedPerChunk), request)
        if(parsedBytes === 0){
            return bytesConsumedPerChunk
        }
        bytesConsumedPerChunk += parsedBytes
    }
    return bytesConsumedPerChunk
}

function parseSingle(bytes: Buffer, request: Request){
    switch(request.state){
        case 'initialized':
            const {bytesConsumed, requestLine} = parseRequestLine(bytes)
            if(requestLine){
                request.requestLine = requestLine
                request.state = "parsing headers"
            }
            return bytesConsumed
        case 'parsing headers':
            const res = parseHeader(request.headers, bytes)
            if(res.done){
                request.state = "parsing body"
            }
            return res.bytesConsumed
        case "parsing body":
            const contentLengthValue = getHeaderValueByKey(request.headers, "content-length")
            if(Number(contentLengthValue) === 0){
              request.state = "done"
              return bytes.length
            }

            request.body = Buffer.concat([request.body, bytes])

            if(request.body.length < Number(contentLengthValue)){
              return bytes.length
            }
            if(request.body.length > Number(contentLengthValue)) throw new Error("Body size is bigger than Content-Length field-value")

            request.state = "done"
            return bytes.length
        case "done":
            return 0
    }
}

function parseRequestLine(bytes: Buffer): ParseRequestLineResult {
    const delimiter = Buffer.from("\r\n")
    const index = bytes.indexOf(delimiter)
    if(index === -1) return {bytesConsumed: 0}

    const requestLine = bytes.subarray(0, index).toString("utf8")
    const parts = requestLine.split(" ")
    if(parts.length != 3) throw new Error("Invalid number of parts")

    const method = parts[0]
    if(!/^[A-Z]+$/.test(method)) throw new Error("Invalid request method")

    const httpVersion = parts[2]
    const versionParts = httpVersion.split("/")
    if(versionParts.length !== 2 || versionParts[0] !== "HTTP" || versionParts[1] !== "1.1") throw new Error("Invalid HTTP version")

    const requestTarget = parts[1]
    if(requestTarget[0] !== "/" || requestTarget.includes(" ")) throw new Error("Invalid request target")
    

    return {bytesConsumed: index + delimiter.length, requestLine: {httpVersion: versionParts[1], requestTarget, method}}
}
