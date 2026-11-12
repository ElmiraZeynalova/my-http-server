import net from "node:net"
import { requestFromReader } from "./request.ts"

async function main(){
    const server = net.createServer(async(socket) => {
        console.log("Client connected")
        socket.on("close", () => {
            console.log("Socket was shut")
        })

        try{
            const {requestLine} = await requestFromReader(socket)
            console.log(`Request line:\n - Method: ${requestLine?.method}\n - Target: ${requestLine?.requestTarget}\n - Version: ${requestLine?.httpVersion}`)
        }catch(err){
            console.error(err)
        }
    })

    server.listen(42069, () => console.log("TCP server running on port 42069..."))
    process.on("SIGINT", () => {
        server.close(() => {
            console.log("Server closed")
        })
    })
}

main()