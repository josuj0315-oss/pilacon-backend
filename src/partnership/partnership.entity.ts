import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('partnership_inquiries')
export class PartnershipInquiry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column()
  companyName: string;

  @Column()
  businessCategory: string; // CENTER_PILATES | CENTER_FITNESS | BRAND | IT_SERVICE | EDUCATION | AGENCY | ETC

  @Column({ nullable: true })
  businessCategoryEtc: string;

  @Column()
  interestType: string; // RECRUITMENT | ADVERTISEMENT | PARTNERSHIP | CONTENT | ETC

  @Column({ nullable: true })
  interestTypeEtc: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
