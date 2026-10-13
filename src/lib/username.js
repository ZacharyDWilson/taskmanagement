// A username is the person's first and last name in some form. Keep in step with
// supabase/012_username.sql (the database enforces it too).
const RE = /^([A-Za-z][A-Za-z'-]*[ ._]+[A-Za-z][A-Za-z'-]*|[A-Z][a-z]+[A-Z][a-z]+)[0-9]{0,4}$/

export function usernameProblem(value) {
  const v = (value ?? '').trim()
  if (!v) return 'Enter your first and last name.'
  if (v.length > 40) return 'That is a bit long. 40 characters at most.'
  if (!RE.test(v)) return 'Use your first and last name, like Jane Doe, jane.doe or JaneDoe.'
  return ''
}
