import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, OneToOne, JoinColumn } from "typeorm";
import { User } from "../../../user/domain/entities/users.model";

@Entity("security_settings")
export class SecuritySetting {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @OneToOne(() => User)
    @JoinColumn({ name: "userId" })
    user: User;

    @Column()
    userId: string;

    @Column({ select: false, nullable: true })
    pinHash: string;

    @Column({ type: "simple-json", nullable: true })
    securityQuestions: { question: string; answerHash: string }[];

    @UpdateDateColumn()
    updatedAt: Date;
}
