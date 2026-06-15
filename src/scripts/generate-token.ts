import { NestFactory } from "@nestjs/core";
import * as fs from "fs";
import { AppModule } from "../app.module";
import { AuthService } from "../modules/common-user/auth/application/auth.service";
import { UsersService } from "../modules/common-user/user/application/user.service";

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const authService = app.get(AuthService);
    const usersService = app.get(UsersService);

    const email = process.argv[2] || "user@example.com";

    console.log(`Checking for user: ${email}...`);

    const user = await usersService.getUserByEmail(email);

    if (!user) {
        console.log(`User ${email} not found. Please pass an existing email as argument.`);
        await app.close();
        return;
    }

    console.log(`User found: ${user.fullName} (${user.role})`);
    console.log("Generating token...");

    const tokens = await authService.generateTokens(user);

    const tokenOutput = `
==================================================
ACCESS TOKEN (Copy this to Swagger "Authorize"):
Bearer ${tokens.tokens.access_token}
==================================================
`;

    console.log(tokenOutput);
    // Also write to file to be sure
    fs.writeFileSync("token_output.txt", tokenOutput);

    await app.close();
}

bootstrap();

