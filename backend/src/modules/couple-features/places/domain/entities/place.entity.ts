import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index
} from "typeorm";
import { User } from "../../../../common-user/user/domain/entities/user.entity";
import { Couple } from "../../../couple/domain/entities/couple.entity";


export enum PlaceType {
    HOME = "HOME",
    SCHOOL = "SCHOOL",
    COMPANY = "COMPANY",
    RESTAURANT = "RESTAURANT",
    CAFE = "CAFE",
    PARK = "PARK",
    MUSEUM = "MUSEUM",
    OTHER = "OTHER"
}


@Index(["coupleId", "createdAt"])
@Index(["coupleId", "updatedAt"])
@Index(["coupleId", "isDeleted"])
@Index(["coupleId", "placeType"])
@Entity("places")
export class Place {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ type: "text", nullable: true })
    address: string | null;

    @Column({ type: "double precision", nullable: true })
    latitude: number|null;

    @Column({ type: "double precision", nullable: true })
    longitude: number|null;

    @Column({ type: "enum", enum: PlaceType, default: PlaceType.OTHER })
    placeType: PlaceType;

    @Column({ type: "int", default: 200 })
    radius: number;

    @Column({ type: "varchar", length: 255, nullable: true })
    iconResName: string | null;

    @Column({ default: true })
    isSynced: boolean;

    @Column({ default: false })
    isDeleted: boolean;

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

    @UpdateDateColumn()
    updatedAt: Date;
}



