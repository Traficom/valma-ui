export function cutUnvantedCharacters(input: string) {
  if (!input || input === '') {
    return '';
  }

  // Remove characters: < > % [ ]
  const unwantedCharactersRegExp = /[<>%\[\]]/g;

  return input.replace(unwantedCharactersRegExp, '');
}
