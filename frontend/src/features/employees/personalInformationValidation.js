const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_PATTERN = /^[+\d][\d\s-]{6,}$/

const MIN_AGE_YEARS = 16

export const validatePersonalInformation = (values) => {
  const errors = {}

  if (!values.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required.'
  } else {
    const birthDate = new Date(`${values.dateOfBirth}T00:00:00`)
    const earliestAllowed = new Date()
    earliestAllowed.setFullYear(earliestAllowed.getFullYear() - MIN_AGE_YEARS)

    if (Number.isNaN(birthDate.getTime())) {
      errors.dateOfBirth = 'Enter a valid date.'
    } else if (birthDate > earliestAllowed) {
      errors.dateOfBirth = `Employee must be at least ${MIN_AGE_YEARS} years old.`
    }
  }

  if (!values.nationality?.trim()) errors.nationality = 'Nationality is required.'
  if (!values.nationalId?.trim()) errors.nationalId = 'National ID is required.'

  if (!values.personalEmail?.trim()) {
    errors.personalEmail = 'Personal email is required.'
  } else if (!EMAIL_PATTERN.test(values.personalEmail.trim())) {
    errors.personalEmail = 'Enter a valid email address.'
  }

  if (!values.addressLine1?.trim()) errors.addressLine1 = 'Address line 1 is required.'
  if (!values.city?.trim()) errors.city = 'City is required.'
  if (!values.country?.trim()) errors.country = 'Country is required.'

  if (!values.postalCode?.trim()) {
    errors.postalCode = 'Postal code is required.'
  } else if (!/^\d{4,10}$/.test(values.postalCode.trim())) {
    errors.postalCode = 'Postal code must be 4–10 digits.'
  }

  if (!values.emergencyContact?.name?.trim()) {
    errors['emergencyContact.name'] = 'Emergency contact name is required.'
  }
  if (!values.emergencyContact?.relationship?.trim()) {
    errors['emergencyContact.relationship'] = 'Relationship is required.'
  }
  if (!values.emergencyContact?.phone?.trim()) {
    errors['emergencyContact.phone'] = 'Emergency contact number is required.'
  } else if (!PHONE_PATTERN.test(values.emergencyContact.phone.trim())) {
    errors['emergencyContact.phone'] = 'Enter a valid phone number.'
  }

  return errors
}
