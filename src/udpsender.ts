import dgram from 'node:dgram'
import {createInterface} from 'node:readline/promises'

async function main(){
    const client = dgram.createSocket('udp4')

    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    })
    process.on("SIGINT", () => {
        rl.close()
        client.close(() => {
            console.log("\n Client closed")
        })
    })
    while(true){
        try {
            const msg = await rl.question(">")
            client.send(Buffer.from(msg + '\n'), 42069, '127.0.0.1', (err) => {
                if (err) {
                    console.log("Send error:", err)
                }
            })
        }catch(err) {
            if (err instanceof Error && err.name === "AbortError") {
                break
            }
            console.log(err)
            break
        }
    }
}

main()
