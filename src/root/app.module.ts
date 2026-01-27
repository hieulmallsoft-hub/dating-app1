import { Module } from '@nestjs/common';
import AppController from './app.controller';
import UserController from './user/user.controller';
import { AppService } from './app.service';
@Module({
  imports: [],        // module con (UserModule, AuthModule, ...)
  controllers: [AppController,UserController],    // controller (AppController, ...)
  providers: [AppService],      // service/provider (AppService, Guard, ...)
})
export class AppModule {}
