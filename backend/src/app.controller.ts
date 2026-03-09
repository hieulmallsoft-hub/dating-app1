import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";

@ApiTags("root")
@ApiBearerAuth("JWT-auth")
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}
    @Get()
    @ApiOperation({
        summary: "Health/root endpoint",
        description: "Simple protected endpoint to verify API and JWT auth are working."
    })
    @ApiOkResponse({
        description: "Returns hello message",
        schema: { type: "string", example: "Hello World!11111" }
    })
    @ApiUnauthorizedResponse({
        description: "Missing or invalid access token"
    })
    getHello(): string {
        return "Hello World!11111";
    }
}
