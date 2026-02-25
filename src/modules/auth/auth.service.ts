import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../user/user.service";
import * as bcrypt from "bcrypt";
import { RegisterDto, LoginDto } from "../user/dto/user.dto";

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) {}

    async register(registerDto: RegisterDto) {
        const { email, password, fullName } = registerDto;

        // Check if user exists
        const existingUser = await this.usersService.findOneByEmail(email);
        if (existingUser) {
            throw new ConflictException("Email already exists");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await this.usersService.create({
            email,
            password: hashedPassword,
            fullName
        });

        return {
            message: "User registered successfully",
            userId: user.id
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;
        const user = await this.usersService.findOneByEmail(email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const payload = { email: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName
            }
        };
    }
}
