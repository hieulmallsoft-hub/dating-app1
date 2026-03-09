import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";

@ApiTags("root")
@ApiBearerAuth("JWT-auth")
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

}
