export interface Submodel {
  id: string;
  name: string;
}

const submodels: Submodel[] = [
  { id: 'koko_suomi', name: 'Koko Suomi' },
  { id: 'uusimaa', name: 'Uusimaa' },
  { id: 'lounais_suomi', name: 'Lounais Suomi' },
  { id: 'ita_suomi', name: 'Itä Suomi' },
  { id: 'pohjois_suomi', name: 'Pohjois Suomi' },
];

export default submodels;