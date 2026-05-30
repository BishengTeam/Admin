import type MockAdapter from 'axios-mock-adapter'

export function registerAuthMock(mock: MockAdapter) {
  mock.onPost('/admin/auth/login').reply((config) => {
    const { username, password } = JSON.parse(config.data)
    if (username === 'admin' && password === 'admin123') {
      return [
        200,
        {
          code: 0,
          message: 'ok',
          data: {
            access_token: 'mock-jwt-token-admin',
            admin: {
              id: 1,
              username: 'admin',
              role: 'super_admin',
            },
            permissions: [
              'dashboard:view',
              'user:list',
              'order:list',
              'order:refund',
              'quiz:list',
              'quiz:import',
              'content:list',
              'content:banner',
              'course:list',
            ],
          },
        },
      ]
    }
    return [200, { code: 401, message: '用户名或密码错误', data: null }]
  })

  mock.onPost('/admin/auth/logout').reply(200, {
    code: 0,
    message: 'ok',
    data: null,
  })
}
