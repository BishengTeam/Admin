import MockAdapter from 'axios-mock-adapter'
import request from '@/core/request'
import { registerAuthMock } from './auth'
import { registerUsersMock } from './users'
import { registerOrdersMock } from './orders'
import { registerQuizMock } from './quiz'
import { registerContentMock } from './content'
import { registerDashboardMock } from './dashboard'

const mock = new MockAdapter(request, { delayResponse: 300 })

export function registerAllMocks() {
  registerAuthMock(mock)
  registerUsersMock(mock)
  registerOrdersMock(mock)
  registerQuizMock(mock)
  registerContentMock(mock)
  registerDashboardMock(mock)
}
