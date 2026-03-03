import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../../../../common-user/user/domain/entities/users.enity";
import { Couple } from "../../../couple/domain/entities/couple.entity";

@Entity("places")
export class Place {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string;

    @Column({ type: "text", nullable: true })
    address: string;

    @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
    latitude: number;

    @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
    longitude: number;

    @Column({ nullable: true })
    type: string; // restaurant, cafe, etc.

    @ManyToOne(() => Couple)
    @JoinColumn({ name: "coupleId" })
    couple: Couple;

    @Column()
    coupleId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "sharedBy" })
    sharedByUser: User;

    @Column()
    sharedBy: string;

    @CreateDateColumn()
    createdAt: Date;
}



