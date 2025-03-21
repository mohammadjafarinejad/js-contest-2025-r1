const PRETTY_BY_ALIAS: Record<string, string | undefined> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  python: 'Python',
  py: 'Python',
  go: 'Go',
  rust: 'Rust',
  func: 'FunC',
  c: 'C',
  'c++': 'C++',
  cpp: 'C++',
  fortran: 'Fortran',
  f90: 'Fortran',
  f: 'Fortran',
  java: 'Java',
  sql: 'SQL',
  swift: 'Swift',
  'objective-c': 'Objective-C',
  kotlin: 'Kotlin',
  ruby: 'Ruby',
  rb: 'Ruby',
  php: 'PHP',
  perl: 'Perl',
  bash: 'Bash',
  sh: 'Shell',
  markdown: 'Markdown',
  'c#': 'C#',
  cs: 'C#',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  solidity: 'Solidity',
  sol: 'Solidity',
  tl: 'TL',
};

export const ALL_SUPPORTED_LANGUAGES = [...new Set(Object.keys(PRETTY_BY_ALIAS))];

export function getPrettyCodeLanguageName(codeLanguage: string) {
  const prettyLangName = PRETTY_BY_ALIAS[codeLanguage.toLowerCase()];
  return prettyLangName ?? codeLanguage;
}
