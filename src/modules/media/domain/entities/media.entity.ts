import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../user/domain/entities/users.model';
import { Couple } from '../../../couple/domain/entities/couple.entity';

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Couple)
  @JoinColumn({ name: 'coupleId' })
  couple: Couple;

  @Column()
  coupleId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  @Column()
  uploaderId: string;

  @Column()
  url: string;

  @Column({ default: 'image' })
  type: string;

  @CreateDateColumn()
  createdAt: Date;
}
