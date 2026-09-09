export interface Submodel {
  id: string;
  name: string;
  index: number;
}

export const SUBMODELS = {
  KOKO_SUOMI: 'koko_suomi',
  UUSIMAA: 'uusimaa',
  LOUNAIS_SUOMI: 'lounais_suomi',
  ITA_SUOMI: 'ita_suomi',
  POHJOIS_SUOMI: 'pohjois_suomi',
} as const;

const submodels: Submodel[] = [
  { id: 'ita_suomi', name: 'Itä Suomi', index: 0 },
  { id: 'lounais_suomi', name: 'Lounais Suomi', index: 1 },
  { id: 'pohjois_suomi', name: 'Pohjois Suomi', index: 2 },
  { id: 'uusimaa', name: 'Uusimaa', index: 2 },
  { id: 'koko_suomi', name: 'Koko Suomi', index: 4 },
];

export default submodels;