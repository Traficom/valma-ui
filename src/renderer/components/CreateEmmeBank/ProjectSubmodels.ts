export interface ProjectSubmodel {
  id: string;
  name: string;
}

const projectSubmodels: ProjectSubmodel[] = [
  { id: 'koko_suomi', name: 'Koko Suomi' },
  { id: 'alueelliset_osamallit', name: 'Alueelliset osamallit yhdessä' },
  { id: 'koko_suomi_kunta', name: 'Koko Suomi kuntajaossa' },
  { id: 'uusimaa', name: 'Uusimaa' },
  { id: 'lounais_suomi', name: 'Lounais-Suomi' },
  { id: 'ita_suomi', name: 'Itä-Suomi' },
  { id: 'pohjois_suomi', name: 'Pohjois-Suomi' },
];

export default projectSubmodels;