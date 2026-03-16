import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CoupleStatus } from "../../domain/entities/couple.entity";
import { InviteStatus } from "../../../invites/domain/entities/invite.entity";

export class JoinCoupleDto {
    @ApiProperty({
        description: "Partner 6-digit account code",
        example: "123456"
    })
    @IsString()
    @IsNotEmpty()
    inviteCode: string;
}

export class UpdateCoupleDto {
    @ApiPropertyOptional({
        description: "Couple start date (ISO-8601)",
        example: "2026-03-09T00:00:00.000Z"
    })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({
        description: "Client update time (Unix milliseconds, UTC). Required when startDate is sent.",
        example: 1773651600000
    })
    @IsNumber()
    @Min(0)
    @IsOptional()
    updateTime?: number;
}

export class CouplePartnerResponseDto {
    @ApiProperty({
        description: "Partner user id",
        example: "cd0b85d4-56a9-4976-bc98-076f1967e172"
    })
    id: string;

    @ApiProperty({
        description: "Partner email",
        example: "partner@example.com"
    })
    email: string;

    @ApiPropertyOptional({
        description: "Partner full name",
        example: "Partner User",
        nullable: true
    })
    fullName?: string | null;

    @ApiPropertyOptional({
        description: "Partner avatar URL",
        example: "https://cdn.example.com/avatars/partner.jpg",
        nullable: true
    })
    avatar?: string | null;

    @ApiPropertyOptional({
        description: "Partner gender code: 0=MALE, 1=FEMALE, 2=OTHER",
        enum: [0, 1, 2],
        type: Number,
        example: 0,
        nullable: true
    })
    gender?: 0 | 1 | 2 | null;

    @ApiPropertyOptional({
        description: "Partner birth date (YYYY-MM-DD)",
        example: "2000-01-01",
        nullable: true
    })
    birthDate?: string | null;
}

export class CoupleProfileResponseDto {
    @ApiPropertyOptional({
        description: "Partner user id",
        example: "cd0b85d4-56a9-4976-bc98-076f1967e172",
        nullable: true
    })
    id?: string | null;

    @ApiProperty({
        description: "Couple status",
        enum: CoupleStatus,
        example: CoupleStatus.ACTIVE
    })
    status: CoupleStatus;

    @ApiPropertyOptional({
        description: "Relationship start date",
        example: "2026-03-09",
        nullable: true
    })
    startDate?: string | null;

    @ApiPropertyOptional({
        description: "Last updated time of relationship start date (ISO-8601)",
        example: "2026-03-16T10:12:00.000Z",
        nullable: true
    })
    startDateAt?: string | null;

    @ApiPropertyOptional({
        description: "Partner birth date (YYYY-MM-DD)",
        example: "2000-01-01",
        nullable: true
    })
    birthDate?: string | null;

    @ApiPropertyOptional({
        description: "Partner email",
        example: "partner@example.com",
        nullable: true
    })
    email?: string | null;

    @ApiPropertyOptional({
        description: "Partner full name",
        example: "Partner User",
        nullable: true
    })
    fullName?: string | null;

    @ApiPropertyOptional({
        description: "Partner latitude",
        type: Number,
        example: 10.762622,
        nullable: true
    })
    latitude?: number | null;

    @ApiPropertyOptional({
        description: "Partner longitude",
        type: Number,
        example: 106.660172,
        nullable: true
    })
    longitude?: number | null;
}

export class CoupleResponseDto {

    @ApiPropertyOptional({
        description: "User 2 id",
        example: "cd0b85d4-56a9-4976-bc98-076f1967e172",
        nullable: true
    })
    user2Id?: string | null;

    @ApiProperty({
        description: "Couple status",
        enum: CoupleStatus,
        example: CoupleStatus.ACTIVE
    })
    status: CoupleStatus;

    @ApiPropertyOptional({
        description: "Relationship start date",
        example: "2026-03-09",
        nullable: true
    })
    startDate?: string | null;

    @ApiPropertyOptional({
        description: "Last updated time of relationship start date (ISO-8601)",
        example: "2026-03-16T10:12:00.000Z",
        nullable: true
    })
    startDateAt?: string | null;
}

export class CoupleLocationUserResponseDto {
    @ApiProperty({
        description: "User id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    id: string;

    @ApiPropertyOptional({
        description: "User full name",
        example: "Mobile User",
        nullable: true
    })
    fullName?: string | null;

    @ApiProperty({
        description: "User email",
        example: "mobile.user@example.com"
    })
    email: string;

    @ApiPropertyOptional({
        description: "Avatar URL",
        example: "https://cdn.example.com/avatars/me.jpg",
        nullable: true
    })
    avatar?: string | null;

    @ApiPropertyOptional({
        description: "Latitude",
        type: Number,
        example: 10.762622,
        nullable: true
    })
    latitude?: number | null;

    @ApiPropertyOptional({
        description: "Longitude",
        type: Number,
        example: 106.660172,
        nullable: true
    })
    longitude?: number | null;

    @ApiPropertyOptional({
        description: "Last active time (ISO-8601)",
        example: "2026-03-09T09:00:00.000Z",
        nullable: true
    })
    lastActiveAt?: string | null;
}

export class CoupleLocationsResponseDto {
    @ApiPropertyOptional({
        description: "Current user location payload",
        type: () => CoupleLocationUserResponseDto,
        nullable: true
    })
    me?: CoupleLocationUserResponseDto | null;

    @ApiPropertyOptional({
        description: "Partner location payload",
        type: () => CoupleLocationUserResponseDto,
        nullable: true
    })
    partner?: CoupleLocationUserResponseDto | null;
}

export class CoupleLocationHistoryPointResponseDto {
    @ApiProperty({
        description: "Location history id",
        example: "e4f676e1-e160-45e3-a124-a52ad0087d7f"
    })
    id: string;

    @ApiProperty({
        description: "User id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    userId: string;

    @ApiProperty({
        description: "Latitude",
        type: Number,
        example: 10.762622
    })
    latitude: number;

    @ApiProperty({
        description: "Longitude",
        type: Number,
        example: 106.660172
    })
    longitude: number;

    @ApiPropertyOptional({
        description: "Accuracy in meters",
        type: Number,
        example: 15,
        nullable: true
    })
    accuracy?: number | null;

    @ApiProperty({
        description: "Created time (ISO-8601)",
        example: "2026-03-09T09:00:00.000Z"
    })
    createdAt: string;
}

export class CoupleLocationHistoryResponseDto {
    @ApiProperty({
        description: "Current user location history",
        type: () => CoupleLocationHistoryPointResponseDto,
        isArray: true
    })
    me: CoupleLocationHistoryPointResponseDto[];

    @ApiProperty({
        description: "Partner location history",
        type: () => CoupleLocationHistoryPointResponseDto,
        isArray: true
    })
    partner: CoupleLocationHistoryPointResponseDto[];
}

export class InviteResponseDto {
    @ApiProperty({
        description: "Invite id",
        example: "bdb8e066-9de6-4fa4-a2fd-f79f66f5e20d"
    })
    id: string;

    @ApiProperty({
        description: "Inviter user id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    inviterId: string;

    @ApiProperty({
        description: "Invite code",
        example: "A1B2C3D4"
    })
    inviteCode: string;

    @ApiProperty({
        description: "Invite status",
        enum: InviteStatus,
        example: InviteStatus.PENDING
    })
    status: InviteStatus;

    @ApiProperty({
        description: "Expiration time (ISO-8601)",
        example: "2026-03-16T08:00:00.000Z"
    })
    expiresAt: string;

    @ApiProperty({
        description: "Created time (ISO-8601)",
        example: "2026-03-09T08:00:00.000Z"
    })
    createdAt: string;
}
