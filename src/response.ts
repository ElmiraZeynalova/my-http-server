import type { Socket } from "node:net";
import type { Headers } from "./request.ts";

export type WriterStatus =
  "writing status line" | "writing headers" | "writing body" | "done" | "writing chunked body" 
export type Writer = {
  socket: Socket;
  status: WriterStatus;
  writeStatusLine: (statusCode: number) => void;
  writeHeaders: (headers: Headers) => void;
  writeBody: (body: Uint8Array<ArrayBuffer>) => void;
  writeChunkedBody: (body: Uint8Array<ArrayBuffer>) => void;
  writeChunkedBodyDone: () => void;
  writeTrailers: (headers: Headers) => void;
};

export const statusLines = new Map();
statusLines.set(200, "HTTP/1.1 200 OK\r\n");
statusLines.set(400, "HTTP/1.1 400 Bad Request\r\n");
statusLines.set(500, "HTTP/1.1 500 Internal Server Error\r\n");

export function getDefaultHeaders(contentLength: number): Headers {
  return {
    "Content-Length": String(contentLength),
    "Connection": "close",
    "Content-Type": "text/plain",
  };
}

export function getWriter(socket: Socket): Writer {
  const writer: Writer = {
    socket: socket,
    status: "writing status line",

    writeStatusLine(statusCode) {
      if (this.status !== "writing status line"){
        throw new Error("Cannot write status line in current state")
      }
      statusLines.has(statusCode)
        ? socket.write(statusLines.get(statusCode))
        : socket.write(`HTTP/1.1 ${statusCode} \r\n`);
      this.status = "writing headers";
    },

    writeHeaders(headers) {
      if (this.status !== "writing headers"){
        throw new Error("Cannot write headers in current state")
      }
      let headerString = "";
      for (const [key, value] of Object.entries(headers)) {
        headerString += `${key}: ${value}\r\n`;
      }
      socket.write(headerString + "\r\n");
      this.status = headers["transfer-encoding"] 
        ? "writing chunked body"
        : "writing body"
    },

    writeBody(body) {
      if (this.status !== "writing body"){
        throw new Error("Cannot write body in current state")
      }
      socket.write(body);
      this.status = "done";
    },

    writeChunkedBody(body) {
      if (this.status !== "writing chunked body"){
        throw new Error("Cannot write chunked body in current state")
      }
      const size = body.length.toString(16)
      const buff = Buffer.concat([Buffer.from(`${size}\r\n`), body, Buffer.from("\r\n")])
      socket.write(buff);
    },

    writeChunkedBodyDone() {
      if (this.status !== "writing chunked body") {
        throw new Error("Cannot finish chunked body in current state")
      }
      socket.write("0\r\n\r\n");
      this.status = "done";
    },

    writeTrailers(headers){
      if (this.status !== "writing chunked body") {
        throw new Error("Cannot finish chunked body in current state")
      }
      socket.write("0\r\n");
      let headerString = "";
      for (const [key, value] of Object.entries(headers)) {
        headerString += `${key}: ${value}\r\n`;
      }
      socket.write(headerString + "\r\n");
      this.status = "done";
    },
  };

  return writer;
}
