import { FORGET_PASSWORD_PREFIX } from './../constants';
import { validateRegister } from './../utils/validateRegister';
import { User } from '../entities/User';
import { MyContext } from 'src/types';
import { Field, Resolver, Mutation, Arg, Ctx, ObjectType, Query } from 'type-graphql';
import argon2  from 'argon2';
import { COOKIE_NAME } from '../constants';
import { UsernamePasswordInput } from './UsernamePasswordInput';
import { sendEmail } from '../utils/sendEmail';
import { v4 } from 'uuid';
import { getConnection } from 'typeorm';


@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
export class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg ('token') token: string,
      @Arg ('newPassword') newPassword: string,
      @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 3) {
      return { errors: [{
        field: 'newPassword',
        message: 'password length must be great than 3'
      }] };

    }

    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return { errors: [{
        field: 'token',
        message: 'token expired'
      }] };
    }

    const userIdNum = parseInt(userId);
    const user = await User.findOne(userIdNum);

    if (!user) {
      return { errors: [{
        field: 'token',
        message: 'user no longer exits'
      }] };
    }

    await User.update({ id: userIdNum }, { password: await argon2.hash(newPassword) });

    redis.del(key);

    // log in user after changing password
    req.session.userId = user.id;

    return { user };
  }


  @Mutation(() => Boolean)
  async forgotPassword(@Arg('email') email: string, @Ctx() { redis }: MyContext): Promise<boolean> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return true;
    }

    const token = v4();
    await redis.set(FORGET_PASSWORD_PREFIX + token, user.id, 'ex', 1000 * 60 * 60 * 24 * 3); //expire after 3 days

    await sendEmail(email,`<a href="http://localhost:3000/change-password/${token}">reset password</a>`);
    return true;
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx(){ req }: MyContext): Promise<User| undefined>  {
    if (!req.session.userId) {
      return undefined;
    }
    return await User.findOne(req.session.userId);
  }

  @Query(() => [User], { nullable: true })
  async all(): Promise<User[]| null>  {
    return User.find();
  }

  @Mutation(() => UserResponse)
  async register (
    @Arg('options', () => UsernamePasswordInput) options: UsernamePasswordInput,
      @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);

    if (errors) {
      return { errors };
    }
    const hashedPassword = await argon2.hash(options.password);
    let user;
    try {
      const result = await getConnection().createQueryBuilder().insert().into(User).values(
        {
          username : options.username,
          email : options.email,
          password : hashedPassword,
        }
      ).returning('*').execute();
      console.log(result);
      user = result.raw[0];
    } catch (err) {
      console.log(err);
      if (err.code === '23505') {
        return {
          errors: [
            {
              field: 'usernameOrEmail',
              message: 'username or email already taken'
            },
          ]
        };
      }
    }

    // login user
    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => UserResponse)
  async login (
    @Arg('usernameOrEmail') usernameOrEmail: string,
      @Arg('password') password: string,
      @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes('@') ?
        { where:{ email : usernameOrEmail } } :
        { where: { username : usernameOrEmail } }
    );

    if (!user) {
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: 'username does not exits'
          },
        ],
      };
    }

    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [
          {
            field: 'password',
            message: 'incorrect password'
          },
        ]
      };
    }

    req.session.userId = user.id;
    return {
      user
    };
  }

  @Mutation(() => Boolean)
  logout (
    @Ctx() { req, res }: MyContext
  ): Promise<boolean> {
    return new Promise (resolve => req.session.destroy(err => {
      res.clearCookie(COOKIE_NAME);
      if (err) {
        resolve(false);
      }
      resolve(true);
    }));
  }
}