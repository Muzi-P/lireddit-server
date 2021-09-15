import { Field, Int, ObjectType } from 'type-graphql';
import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, BaseEntity } from 'typeorm';

@ObjectType()
@Entity()
export class User extends BaseEntity {

  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @CreateDateColumn()
  updatedAt: Date;

  @Field()
  @Column({ unique: true })
  username!: string;

  @Field()
  @Column()
  email!: string;

  @Column()
  password!: string;

}
