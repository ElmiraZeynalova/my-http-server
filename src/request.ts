import { parseHeader } from "./headers.ts"
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

type ParserState = "initialized" | "parsing headers" | "done"

type Request = {
    requestLine?: RequestLine
    headers: Headers
    state: ParserState
}

export async function requestFromReader(reader: AsyncIterable<Uint8Array> | Iterable<Uint8Array>): Promise<Request>{
    const request: Request = {state: "initialized", headers: {}}
    let buff = Buffer.alloc(0)

    for await (const chunk of reader){
        buff = Buffer.concat([buff, Buffer.from(chunk)])
        const bytesConsumed = parse(request, buff)
        if(bytesConsumed > 0) buff = buff.subarray(bytesConsumed)

        if(request.state === "done") return request
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
                request.state = "done"
            }
            return res.bytesConsumed
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
