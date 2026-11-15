import net from "node:net";
import type { Server, Socket } from "node:net";
import { requestFromReader, type Request } from "./request.ts";
import {writeStatusLine, getDefaultHeaders, writeHeaders} from "./response.ts"

type ServerInstance = {
  server: Server
  isRunning: boolean
};

type HandlerError = {
  statusCode: number
  message: string
}

type ResponseWriter = { buffer: Buffer }

type HandlerFn = (writer: ResponseWriter, req: Request) => HandlerError | null

const PORT = 42069;

async function serve(port: number, handler: HandlerFn): Promise<ServerInstance> {
  const serverInstance: ServerInstance = {
    server: net.createServer(async (socket) => await handle(socket, handler)),
    isRunning: false,
  };

  await new Promise<void>((resolve, reject) => {
    serverInstance.server.once("listening", resolve);
    serverInstance.server.once("error", reject);

    serverInstance.server.listen(port);
  });

  serverInstance.isRunning = true;

  return serverInstance;
}

async function handle(socket: Socket, handler: HandlerFn) {
  let parsedRequest
  try {
    parsedRequest = await requestFromReader(socket) 
    const { requestLine, headers, body } = parsedRequest
    console.log(
      `Request line:\n - Method: ${requestLine?.method}\n - Target: ${requestLine?.requestTarget}\n - Version: ${requestLine?.httpVersion}`,
    );
    console.log("Headers:");
    Object.entries(headers ?? {}).forEach(([name, value]) =>
      console.log(`- ${name}: ${value}`),
    );
    console.log(`Body:\n ${String(body)}`);
  } catch (err) {
    console.error(err);
    socket.end()
    return
  }

  const writer = { buffer: Buffer.alloc(0) }
  const res = handler(writer, parsedRequest!)

  if(res !== null){
    const defaultHeaders = getDefaultHeaders(Buffer.byteLength(res.message, "utf-8"))
    writeStatusLine(socket, res.statusCode)
    writeHeaders(socket, defaultHeaders)
    socket.write(Buffer.from(res.message));
  }else{
    const defaultHeaders = getDefaultHeaders(writer.buffer.length)
    writeStatusLine(socket, 200)
    writeHeaders(socket, defaultHeaders)
    socket.write(writer.buffer);
  }

  socket.end();
}

function close(serverInstance: ServerInstance) {
  serverInstance.server.close(() => {
    serverInstance.isRunning = false;
    console.log("Server closed");
  });
}

async function main() {

  const handler: HandlerFn = (writer: ResponseWriter, req: Request) => {
    if(req.requestLine?.requestTarget === "/yourProblem"){
      return {
        statusCode: 400,
        message: "Your problem is not my problem\n"
      }
    }
    if(req.requestLine?.requestTarget === "/myProblem"){
      return {
        statusCode: 500,
        message: "Woopsie, my bad\n"
      }
    }
    writer.buffer = Buffer.concat([writer.buffer, Buffer.from("All good, frfr\n")])
    return null
  }

  try {
    const serverInstance = await serve(PORT, handler);
    console.log(`Server running on port ${PORT}`);

    process.on("SIGINT", () => close(serverInstance));
    process.on("SIGTERM", () => close(serverInstance));
  } catch (err) {
    console.error(err);
  }
}

main();
