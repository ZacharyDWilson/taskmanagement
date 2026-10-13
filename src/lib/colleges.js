// A starter list for the sign-up "college" field. People can type any school, these just make it quick.
// DOMAINS lets the form fill the college in for you from a .edu email address.
export const COLLEGES = [
  'Gordon College', 'Harvard University', 'MIT', 'Boston College', 'Boston University', 'Northeastern University',
  'UMass Amherst', 'Wheaton College', 'Endicott College', 'Salem State University', 'Merrimack College', 'Babson College',
  'Brandeis University', 'Tufts University', 'Wellesley College', 'Providence College', 'Brown University', 'Yale University',
  'UConn', 'University of New Hampshire', 'Penn State', 'NYU', 'Cornell University', 'Not a student / other',
]

export const DOMAINS = {
  'gordon.edu': 'Gordon College', 'harvard.edu': 'Harvard University', 'mit.edu': 'MIT', 'bc.edu': 'Boston College',
  'bu.edu': 'Boston University', 'northeastern.edu': 'Northeastern University', 'umass.edu': 'UMass Amherst',
  'wheatoncollege.edu': 'Wheaton College', 'endicott.edu': 'Endicott College', 'salemstate.edu': 'Salem State University',
  'merrimack.edu': 'Merrimack College', 'babson.edu': 'Babson College', 'brandeis.edu': 'Brandeis University',
  'tufts.edu': 'Tufts University', 'wellesley.edu': 'Wellesley College', 'providence.edu': 'Providence College',
  'brown.edu': 'Brown University', 'yale.edu': 'Yale University', 'uconn.edu': 'UConn', 'unh.edu': 'University of New Hampshire',
  'psu.edu': 'Penn State', 'nyu.edu': 'NYU', 'cornell.edu': 'Cornell University',
}

// "jane@students.gordon.edu" -> "Gordon College" (matches the end of the domain)
export function collegeFromEmail(email) {
  const domain = String(email ?? '').split('@')[1]?.toLowerCase().trim()
  if (!domain) return ''
  const hit = Object.keys(DOMAINS).find(d => domain === d || domain.endsWith('.' + d))
  return hit ? DOMAINS[hit] : ''
}
