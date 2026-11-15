import net from "node:net";
import type { Server, Socket } from "node:net";
import { requestFromReader, type Request } from "./request.ts";
import {getWriter, getDefaultHeaders, type Writer} from "./response.ts"

type ServerInstance = {
  server: Server
  isRunning: boolean
};

type HandlerFn = (writer: Writer, req: Request) => void

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

  const writer: Writer = getWriter(socket)
  try {
    handler(writer, parsedRequest)
  } catch (err) {
      console.error("Handler error:", err)
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
  const handler: HandlerFn = (writer: Writer, req: Request) => {
    if(req.requestLine?.requestTarget === "/yourProblem"){
      const bodyContent = Buffer.from(
        `<html>
          <head>
            <title>400 Bad Request</title>
          </head>
          <body>
            <h1>Bad Request</h1>
            <p>Your request honestly kinda sucked.</p>
          </body>
        </html>`
      )
      const defaultHeaders = getDefaultHeaders(bodyContent.length)
      defaultHeaders["Content-Type"] = "text/html"

      writer.writeStatusLine(400)
      writer.writeHeaders(defaultHeaders)
      writer.writeBody(bodyContent)
      return
    }

    if(req.requestLine?.requestTarget === "/myProblem"){
      const bodyContent = Buffer.from(
        `<html>
          <head>
            <title>500 Internal Server Error</title>
          </head>
          <body>
            <h1>Internal Server Error</h1>
            <p>Okay, you know what? This one is on me.</p>
          </body>
        </html>`
      )
      const defaultHeaders = getDefaultHeaders(bodyContent.length)
      defaultHeaders["Content-Type"] = "text/html"

      writer.writeStatusLine(500)
      writer.writeHeaders(defaultHeaders)
      writer.writeBody(bodyContent)
      return
    }

    const bodyContent = Buffer.from(
      `<html>
        <head>
          <title>200 OK</title>
        </head>
        <body>
          <h1>Success!</h1>
          <p>Your request was an absolute banger.</p>
        </body>
      </html>`
    )
    const defaultHeaders = getDefaultHeaders(bodyContent.length)
    defaultHeaders["Content-Type"] = "text/html"
    writer.writeStatusLine(200)
    writer.writeHeaders(defaultHeaders)
    writer.writeBody(bodyContent)
    return
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
