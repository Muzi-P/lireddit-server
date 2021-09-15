import { UsernamePasswordInput } from 'src/resolvers/UsernamePasswordInput';

export const validateRegister = (options: UsernamePasswordInput): any => {
  console.log(options);
  if (!options.email.includes('@')) {
    return [{
      field: 'email',
      message: 'invalid email'
    }];

  }

  if (options.username.length <= 2) {
    return [{
      field: 'username',
      message: 'username length must be great than 2'
    }];

  }

  if (options.username.includes('@')) {
    return [{
      field: 'username',
      message: 'cannot include an @'
    }];

  }


  if (options.password.length <= 3) {
    return [{
      field: 'password',
      message: 'password length must be great than 3'
    }];

  }

  return null;

};