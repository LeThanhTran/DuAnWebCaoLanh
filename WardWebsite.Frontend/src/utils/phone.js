const VN_MOBILE_PHONE_REGEX = /^0(?:3|5|7|8|9)\d{8}$/

const INVALID_VN_PHONE_MESSAGE = 'Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).'

export const normalizeVietnamPhone = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  let digits = trimmed.replace(/\D/g, '')
  if (digits.startsWith('84')) {
    digits = `0${digits.slice(2)}`
  }

  return digits
}

export const validateVietnamPhone = (value, { required = false } = {}) => {
  const normalized = normalizeVietnamPhone(value)

  if (!normalized) {
    if (required) {
      return {
        isValid: false,
        normalized,
        message: 'Vui lòng nhập số điện thoại'
      }
    }

    return {
      isValid: true,
      normalized,
      message: ''
    }
  }

  if (!VN_MOBILE_PHONE_REGEX.test(normalized)) {
    return {
      isValid: false,
      normalized,
      message: INVALID_VN_PHONE_MESSAGE
    }
  }

  return {
    isValid: true,
    normalized,
    message: ''
  }
}
