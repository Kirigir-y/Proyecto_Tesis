import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'messages' })
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @Column({ type: 'varchar', length: 100 })
  senderUsername: string;

  @Column({ type: 'varchar', length: 30 })
  senderRole: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  @Column({ type: 'int', nullable: true })
  pinOrder: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pinnedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  pinnedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
