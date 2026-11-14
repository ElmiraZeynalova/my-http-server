import net from "node:net"
import type { Server, Socket } from "node:net"
import { requestFromReader } from "./request.ts"

type ServerInstance = {
    server: Server 
    isRunning: boolean
}

const PORT = 42069

async function serve(port: number): Promise<ServerInstance>{
    const serverInstance: ServerInstance = {
            server: net.createServer(async(socket) => await handle(socket)),
            isRunning: false
        }

    await new Promise<void>((resolve, reject) => {
        serverInstance.server.once("listening", resolve)
        serverInstance.server.once("error", reject)

        serverInstance.server.listen(port)
    })

    serverInstance.isRunning = true

    return serverInstance
}

async function handle(socket: Socket){
    try{
        const {requestLine, headers, body} = await requestFromReader(socket)
        console.log(`Request line:\n - Method: ${requestLine?.method}\n - Target: ${requestLine?.requestTarget}\n - Version: ${requestLine?.httpVersion}`)
        console.log("Headers:")
        Object.entries(headers ?? {}).forEach(([name, value]) => console.log(`- ${name}: ${value}`))
        console.log(`Body:\n ${String(body)}`)
    }catch(err){
        console.error(err)
    }
    const response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 13\r\n\r\nHello World!\n"
    socket.write(Buffer.from(response))
    socket.end()
}


function close(serverInstance: ServerInstance){
    serverInstance.server.close(() => {
        serverInstance.isRunning = false
        console.log("Server closed")
    })
}

async function main(){
    try{
        const serverInstance = await serve(PORT)
        console.log(`Server running on port ${PORT}`)

        process.on("SIGINT", () => close(serverInstance))
        process.on("SIGTERM", () => close(serverInstance))
    }catch(err){
        console.error(err)
    }
}

main()

