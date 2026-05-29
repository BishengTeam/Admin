import dayjs from 'dayjs'

export function formatDate(date: string | Date, fmt = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(date).format(fmt)
}

export function formatPrice(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`
}

export function formatPhone(phone: string): string {
  if (phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}
