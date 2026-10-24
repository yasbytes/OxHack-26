export function authErrorMessage(error: unknown): string {
  if (error instanceof TypeError || (error instanceof Error && /fetch|network|timeout/i.test(error.message))) {
    return 'We could not reach the account service. Check your connection and try again.'
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

