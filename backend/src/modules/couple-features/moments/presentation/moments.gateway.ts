import { WebSocketGateway } from "@nestjs/websockets";

@WebSocketGateway({
    cors: {
        origin: "*"
    }
})

export class MomentsGateway {
    // Implement WebSocket logic for moments if needed
}