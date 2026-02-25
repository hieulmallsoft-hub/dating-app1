import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../modules/auth/application/auth.service';
import { UsersService } from '../modules/user/application/users.service';
import { UserRole } from '../modules/user/domain/entities/users.model';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const authService = app.get(AuthService);
  const usersService = app.get(UsersService);

  const email = process.argv[2] || 'admin@admin.com'; 

  console.log(`Checking for user: ${email}...`);

  let user = await usersService.getUserByEmail(email);

  if (!user) {
    console.log(`User ${email} not found. checking for ANY user...`);
    // This part might be tricky if no method to get all users, but let's try to assume create-admin might be needed.
    console.log('Please run "npm run create:admin" first to create a default admin user, or provide an existing email.');
    await app.close();
    return;
  }

  console.log(`User found: ${user.fullName} (${user.role})`);
  console.log('Generating token...');

  const tokens = await authService.generateTokens(user);

  const tokenOutput = `
==================================================
ACCESS TOKEN (Copy this to Swagger "Authorize"):
Bearer ${tokens.tokens.access_token}
==================================================
`;
  
  console.log(tokenOutput);
  // Also write to file to be sure
  require('fs').writeFileSync('token_output.txt', tokenOutput);

  await app.close();
}

bootstrap();
