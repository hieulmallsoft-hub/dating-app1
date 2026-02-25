import { NestFactory } from "@nestjs/core";
import * as bcrypt from "bcrypt";
import { AppModule } from "../app.module";
import { UserRole } from "../modules/user/domain/entities/users.model";
import { UserRepository } from "../modules/user/infrastructure/persistence/user.repository";

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    // Using Repository directly is safer if Service logic prevents explicit role assignment
    const userRepository = app.get(UserRepository);

    const email = "admin@admin.com"; // Default Admin email
    const password = "adminpassword"; // Default Admin password (make sure it's long enough!)
    const fullName = "Super Admin";

    console.log(`Checking for admin user: ${email}...`);

    const existingUser = await userRepository.findOne({ where: { email } });

    if (existingUser) {
        console.log("User exists. Updating role to ADMIN and resetting password...");
        existingUser.role = UserRole.ADMIN;
        existingUser.password = await bcrypt.hash(password, 10); // Reset password to ensure access
        await userRepository.save(existingUser);
        console.log(`Success! User ${email} is now an ADMIN with password: ${password}`);
    } else {
        console.log("User not found. Creating new ADMIN user...");

        const hashedPassword = await bcrypt.hash(password, 10);

        // We create directly via entity to bypass DTO restrictions if any
        const newAdmin = userRepository.create({
            email,
            password: hashedPassword,
            fullName,
            role: UserRole.ADMIN,
            isActive: true,
            isVerified: true
        });

        await userRepository.save(newAdmin);
        console.log(`Success! Created Admin: ${email} / ${password}`);
    }

    await app.close();
}

bootstrap();
