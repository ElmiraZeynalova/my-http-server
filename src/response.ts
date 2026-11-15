import type { Socket } from "node:net"
import type { Headers } from "./request.ts"
type StatusCode = 200 | 400 | 500 | number

const statusLines = new Map()
statusLines.set(200, "HTTP/1.1 200 OK\r\n")
statusLines.set(400, "HTTP/1.1 400 Bad Request\r\n")
statusLines.set(500, "HTTP/1.1 500 Internal Server Error\r\n")

export function writeStatusLine(socket: Socket, statusCode: StatusCode){
    return( statusLines.has(statusCode) 
        ? socket.write(statusLines.get(statusCode))
        : socket.write(`HTTP/1.1 ${statusCode} \r\n`)
    )
}

export function getDefaultHeaders(contentLength: number): Headers{
    return ({
        "Content-Length": String(contentLength),
        "Connection": "close",
        "Content-Type": "text/plain"
    })
}

export function writeHeaders(socket: Socket, headers: Headers){
    let headerString = ""
    for(const [key, value] of Object.entries(headers)){
        headerString += `${key}: ${value}\r\n`
    }

    return socket.write(Buffer.from(headerString + "\r\n")) 
}

