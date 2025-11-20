export interface Department {
  code: string
  name: string
  bbox: {
    south: number
    west: number
    north: number
    east: number
  }
}

// French departments with approximate bounding boxes
// Starting with Gard (30) for testing
export const departments: Department[] = [
  {
    code: '30',
    name: 'Gard',
    bbox: {
      south: 43.4,
      west: 3.2,
      north: 44.4,
      east: 4.8
    }
  },
  {
    code: '01',
    name: 'Ain',
    bbox: {
      south: 45.2,
      west: 4.8,
      north: 46.4,
      east: 5.8
    }
  },
  {
    code: '02',
    name: 'Aisne',
    bbox: {
      south: 49.0,
      west: 3.0,
      north: 50.1,
      east: 4.2
    }
  },
  {
    code: '03',
    name: 'Allier',
    bbox: {
      south: 45.9,
      west: 2.2,
      north: 46.8,
      east: 3.8
    }
  },
  {
    code: '04',
    name: 'Alpes-de-Haute-Provence',
    bbox: {
      south: 43.7,
      west: 5.5,
      north: 44.9,
      east: 7.1
    }
  },
  {
    code: '05',
    name: 'Hautes-Alpes',
    bbox: {
      south: 44.2,
      west: 5.5,
      north: 45.1,
      east: 7.0
    }
  },
  {
    code: '06',
    name: 'Alpes-Maritimes',
    bbox: {
      south: 43.5,
      west: 6.6,
      north: 44.4,
      east: 7.7
    }
  },
  {
    code: '07',
    name: 'Ardèche',
    bbox: {
      south: 44.3,
      west: 3.9,
      north: 45.3,
      east: 4.9
    }
  },
  {
    code: '08',
    name: 'Ardennes',
    bbox: {
      south: 49.2,
      west: 4.4,
      north: 50.2,
      east: 5.3
    }
  },
  {
    code: '09',
    name: 'Ariège',
    bbox: {
      south: 42.6,
      west: 0.6,
      north: 43.2,
      east: 2.1
    }
  },
  {
    code: '10',
    name: 'Aube',
    bbox: {
      south: 47.9,
      west: 3.4,
      north: 48.5,
      east: 4.8
    }
  },
  {
    code: '11',
    name: 'Aude',
    bbox: {
      south: 42.6,
      west: 1.7,
      north: 43.5,
      east: 3.2
    }
  },
  {
    code: '12',
    name: 'Aveyron',
    bbox: {
      south: 43.7,
      west: 1.8,
      north: 44.9,
      east: 3.3
    }
  },
  {
    code: '13',
    name: 'Bouches-du-Rhône',
    bbox: {
      south: 43.2,
      west: 4.2,
      north: 43.9,
      east: 5.8
    }
  },
  {
    code: '14',
    name: 'Calvados',
    bbox: {
      south: 48.8,
      west: -1.2,
      north: 49.4,
      east: 0.5
    }
  },
  {
    code: '15',
    name: 'Cantal',
    bbox: {
      south: 44.6,
      west: 2.0,
      north: 45.3,
      east: 3.4
    }
  },
  {
    code: '16',
    name: 'Charente',
    bbox: {
      south: 45.2,
      west: -0.4,
      north: 46.2,
      east: 0.9
    }
  },
  {
    code: '17',
    name: 'Charente-Maritime',
    bbox: {
      south: 45.1,
      west: -1.6,
      north: 46.3,
      east: -0.3
    }
  },
  {
    code: '18',
    name: 'Cher',
    bbox: {
      south: 46.6,
      west: 1.8,
      north: 47.6,
      east: 3.2
    }
  },
  {
    code: '19',
    name: 'Corrèze',
    bbox: {
      south: 45.0,
      west: 1.2,
      north: 45.8,
      east: 2.5
    }
  },
  {
    code: '2A',
    name: 'Corse-du-Sud',
    bbox: {
      south: 41.4,
      west: 8.5,
      north: 42.2,
      east: 9.4
    }
  },
  {
    code: '2B',
    name: 'Haute-Corse',
    bbox: {
      south: 42.0,
      west: 9.0,
      north: 43.0,
      east: 9.6
    }
  },
  {
    code: '21',
    name: 'Côte-d\'Or',
    bbox: {
      south: 46.9,
      west: 4.3,
      north: 47.8,
      east: 5.5
    }
  },
  {
    code: '22',
    name: 'Côtes-d\'Armor',
    bbox: {
      south: 48.1,
      west: -3.7,
      north: 48.8,
      east: -1.9
    }
  },
  {
    code: '23',
    name: 'Creuse',
    bbox: {
      south: 45.8,
      west: 1.4,
      north: 46.5,
      east: 2.6
    }
  },
  {
    code: '24',
    name: 'Dordogne',
    bbox: {
      south: 44.5,
      west: 0.2,
      north: 45.8,
      east: 1.7
    }
  },
  {
    code: '25',
    name: 'Doubs',
    bbox: {
      south: 47.0,
      west: 6.0,
      north: 47.6,
      east: 7.2
    }
  },
  {
    code: '26',
    name: 'Drôme',
    bbox: {
      south: 44.1,
      west: 4.7,
      north: 45.3,
      east: 5.8
    }
  },
  {
    code: '27',
    name: 'Eure',
    bbox: {
      south: 48.7,
      west: 0.5,
      north: 49.5,
      east: 1.8
    }
  },
  {
    code: '28',
    name: 'Eure-et-Loir',
    bbox: {
      south: 48.0,
      west: 0.8,
      north: 48.8,
      east: 1.9
    }
  },
  {
    code: '29',
    name: 'Finistère',
    bbox: {
      south: 47.7,
      west: -4.8,
      north: 48.7,
      east: -3.4
    }
  },
  {
    code: '31',
    name: 'Haute-Garonne',
    bbox: {
      south: 43.0,
      west: 0.4,
      north: 43.8,
      east: 1.9
    }
  },
  {
    code: '32',
    name: 'Gers',
    bbox: {
      south: 43.3,
      west: -0.1,
      north: 44.0,
      east: 1.2
    }
  },
  {
    code: '33',
    name: 'Gironde',
    bbox: {
      south: 44.2,
      west: -1.5,
      north: 45.6,
      east: -0.2
    }
  },
  {
    code: '34',
    name: 'Hérault',
    bbox: {
      south: 43.2,
      west: 2.5,
      north: 44.0,
      east: 4.2
    }
  },
  {
    code: '35',
    name: 'Ille-et-Vilaine',
    bbox: {
      south: 47.6,
      west: -2.3,
      north: 48.7,
      east: -1.0
    }
  },
  {
    code: '36',
    name: 'Indre',
    bbox: {
      south: 46.4,
      west: 0.8,
      north: 47.3,
      east: 2.3
    }
  },
  {
    code: '37',
    name: 'Indre-et-Loire',
    bbox: {
      south: 46.8,
      west: 0.1,
      north: 47.7,
      east: 1.4
    }
  },
  {
    code: '38',
    name: 'Isère',
    bbox: {
      south: 44.7,
      west: 4.7,
      north: 45.9,
      east: 6.5
    }
  },
  {
    code: '39',
    name: 'Jura',
    bbox: {
      south: 46.2,
      west: 5.3,
      north: 47.3,
      east: 6.2
    }
  },
  {
    code: '40',
    name: 'Landes',
    bbox: {
      south: 43.5,
      west: -1.6,
      north: 44.6,
      east: -0.1
    }
  },
  {
    code: '41',
    name: 'Loir-et-Cher',
    bbox: {
      south: 47.3,
      west: 0.6,
      north: 48.0,
      east: 2.3
    }
  },
  {
    code: '42',
    name: 'Loire',
    bbox: {
      south: 45.3,
      west: 3.7,
      north: 46.3,
      east: 4.8
    }
  },
  {
    code: '43',
    name: 'Haute-Loire',
    bbox: {
      south: 44.9,
      west: 3.1,
      north: 45.4,
      east: 4.3
    }
  },
  {
    code: '44',
    name: 'Loire-Atlantique',
    bbox: {
      south: 46.8,
      west: -2.6,
      north: 47.8,
      east: -0.9
    }
  },
  {
    code: '45',
    name: 'Loiret',
    bbox: {
      south: 47.5,
      west: 1.5,
      north: 48.4,
      east: 3.1
    }
  },
  {
    code: '46',
    name: 'Lot',
    bbox: {
      south: 44.2,
      west: 1.1,
      north: 44.8,
      east: 2.2
    }
  },
  {
    code: '47',
    name: 'Lot-et-Garonne',
    bbox: {
      south: 44.1,
      west: -0.1,
      north: 44.6,
      east: 1.2
    }
  },
  {
    code: '48',
    name: 'Lozère',
    bbox: {
      south: 44.1,
      west: 3.0,
      north: 44.9,
      east: 4.0
    }
  },
  {
    code: '49',
    name: 'Maine-et-Loire',
    bbox: {
      south: 47.0,
      west: -1.4,
      north: 47.8,
      east: 0.3
    }
  },
  {
    code: '50',
    name: 'Manche',
    bbox: {
      south: 48.4,
      west: -1.9,
      north: 49.7,
      east: -0.7
    }
  },
  {
    code: '51',
    name: 'Marne',
    bbox: {
      south: 48.5,
      west: 3.4,
      north: 49.4,
      east: 4.8
    }
  },
  {
    code: '52',
    name: 'Haute-Marne',
    bbox: {
      south: 47.6,
      west: 4.6,
      north: 48.7,
      east: 5.9
    }
  },
  {
    code: '53',
    name: 'Mayenne',
    bbox: {
      south: 47.8,
      west: -1.2,
      north: 48.5,
      east: -0.0
    }
  },
  {
    code: '54',
    name: 'Meurthe-et-Moselle',
    bbox: {
      south: 48.4,
      west: 5.4,
      north: 49.6,
      east: 7.1
    }
  },
  {
    code: '55',
    name: 'Meuse',
    bbox: {
      south: 48.4,
      west: 5.0,
      north: 49.5,
      east: 5.9
    }
  },
  {
    code: '56',
    name: 'Morbihan',
    bbox: {
      south: 47.3,
      west: -3.6,
      north: 48.2,
      east: -2.1
    }
  },
  {
    code: '57',
    name: 'Moselle',
    bbox: {
      south: 48.5,
      west: 6.1,
      north: 49.5,
      east: 7.6
    }
  },
  {
    code: '58',
    name: 'Nièvre',
    bbox: {
      south: 46.8,
      west: 2.8,
      north: 47.6,
      east: 4.2
    }
  },
  {
    code: '59',
    name: 'Nord',
    bbox: {
      south: 50.0,
      west: 2.1,
      north: 51.1,
      east: 4.2
    }
  },
  {
    code: '60',
    name: 'Oise',
    bbox: {
      south: 49.0,
      west: 1.7,
      north: 49.8,
      east: 3.2
    }
  },
  {
    code: '61',
    name: 'Orne',
    bbox: {
      south: 48.2,
      west: -0.9,
      north: 48.9,
      east: 0.9
    }
  },
  {
    code: '62',
    name: 'Pas-de-Calais',
    bbox: {
      south: 50.0,
      west: 1.6,
      north: 51.0,
      east: 2.9
    }
  },
  {
    code: '63',
    name: 'Puy-de-Dôme',
    bbox: {
      south: 45.3,
      west: 2.4,
      north: 46.1,
      east: 3.9
    }
  },
  {
    code: '64',
    name: 'Pyrénées-Atlantiques',
    bbox: {
      south: 42.8,
      west: -1.8,
      north: 43.6,
      east: -0.1
    }
  },
  {
    code: '65',
    name: 'Hautes-Pyrénées',
    bbox: {
      south: 42.7,
      west: -0.1,
      north: 43.5,
      east: 0.9
    }
  },
  {
    code: '66',
    name: 'Pyrénées-Orientales',
    bbox: {
      south: 42.3,
      west: 1.7,
      north: 42.9,
      east: 3.2
    }
  },
  {
    code: '67',
    name: 'Bas-Rhin',
    bbox: {
      south: 48.1,
      west: 7.0,
      north: 49.1,
      east: 8.2
    }
  },
  {
    code: '68',
    name: 'Haut-Rhin',
    bbox: {
      south: 47.4,
      west: 6.8,
      north: 48.3,
      east: 7.6
    }
  },
  {
    code: '69',
    name: 'Rhône',
    bbox: {
      south: 45.4,
      west: 4.2,
      north: 46.3,
      east: 5.2
    }
  },
  {
    code: '70',
    name: 'Haute-Saône',
    bbox: {
      south: 47.3,
      west: 5.4,
      north: 47.9,
      east: 6.8
    }
  },
  {
    code: '71',
    name: 'Saône-et-Loire',
    bbox: {
      south: 46.2,
      west: 3.6,
      north: 47.1,
      east: 5.5
    }
  },
  {
    code: '72',
    name: 'Sarthe',
    bbox: {
      south: 47.6,
      west: -0.3,
      north: 48.5,
      east: 1.0
    }
  },
  {
    code: '73',
    name: 'Savoie',
    bbox: {
      south: 45.1,
      west: 5.6,
      north: 45.9,
      east: 7.2
    }
  },
  {
    code: '74',
    name: 'Haute-Savoie',
    bbox: {
      south: 45.8,
      west: 5.8,
      north: 46.4,
      east: 7.0
    }
  },
  {
    code: '75',
    name: 'Paris',
    bbox: {
      south: 48.8,
      west: 2.2,
      north: 48.9,
      east: 2.5
    }
  },
  {
    code: '76',
    name: 'Seine-Maritime',
    bbox: {
      south: 49.2,
      west: 0.1,
      north: 50.1,
      east: 1.8
    }
  },
  {
    code: '77',
    name: 'Seine-et-Marne',
    bbox: {
      south: 48.1,
      west: 2.4,
      north: 49.1,
      east: 3.6
    }
  },
  {
    code: '78',
    name: 'Yvelines',
    bbox: {
      south: 48.4,
      west: 1.4,
      north: 49.1,
      east: 2.3
    }
  },
  {
    code: '79',
    name: 'Deux-Sèvres',
    bbox: {
      south: 46.1,
      west: -1.0,
      north: 47.1,
      east: 0.2
    }
  },
  {
    code: '80',
    name: 'Somme',
    bbox: {
      south: 49.6,
      west: 1.4,
      north: 50.4,
      east: 3.2
    }
  },
  {
    code: '81',
    name: 'Tarn',
    bbox: {
      south: 43.4,
      west: 1.5,
      north: 44.2,
      east: 2.9
    }
  },
  {
    code: '82',
    name: 'Tarn-et-Garonne',
    bbox: {
      south: 43.8,
      west: 0.7,
      north: 44.4,
      east: 1.9
    }
  },
  {
    code: '83',
    name: 'Var',
    bbox: {
      south: 43.0,
      west: 5.7,
      north: 43.8,
      east: 6.9
    }
  },
  {
    code: '84',
    name: 'Vaucluse',
    bbox: {
      south: 43.7,
      west: 4.6,
      north: 44.4,
      east: 5.8
    }
  },
  {
    code: '85',
    name: 'Vendée',
    bbox: {
      south: 46.3,
      west: -2.4,
      north: 47.1,
      east: -0.5
    }
  },
  {
    code: '86',
    name: 'Vienne',
    bbox: {
      south: 46.1,
      west: 0.0,
      north: 47.2,
      east: 1.4
    }
  },
  {
    code: '87',
    name: 'Haute-Vienne',
    bbox: {
      south: 45.5,
      west: 0.6,
      north: 46.4,
      east: 1.8
    }
  },
  {
    code: '88',
    name: 'Vosges',
    bbox: {
      south: 47.8,
      west: 5.4,
      north: 48.5,
      east: 7.2
    }
  },
  {
    code: '89',
    name: 'Yonne',
    bbox: {
      south: 47.3,
      west: 2.9,
      north: 48.4,
      east: 4.3
    }
  },
  {
    code: '90',
    name: 'Territoire de Belfort',
    bbox: {
      south: 47.4,
      west: 6.8,
      north: 47.8,
      east: 7.1
    }
  },
  {
    code: '91',
    name: 'Essonne',
    bbox: {
      south: 48.3,
      west: 1.9,
      north: 48.8,
      east: 2.6
    }
  },
  {
    code: '92',
    name: 'Hauts-de-Seine',
    bbox: {
      south: 48.7,
      west: 2.1,
      north: 48.9,
      east: 2.4
    }
  },
  {
    code: '93',
    name: 'Seine-Saint-Denis',
    bbox: {
      south: 48.8,
      west: 2.3,
      north: 49.0,
      east: 2.6
    }
  },
  {
    code: '94',
    name: 'Val-de-Marne',
    bbox: {
      south: 48.6,
      west: 2.3,
      north: 48.8,
      east: 2.6
    }
  },
  {
    code: '95',
    name: 'Val-d\'Oise',
    bbox: {
      south: 48.9,
      west: 1.6,
      north: 49.2,
      east: 2.6
    }
  }
]

export function getDepartmentByCode(code: string): Department | undefined {
  return departments.find(dept => dept.code === code)
}

export function getAllDepartmentCodes(): string[] {
  return departments.map(dept => dept.code)
}

// France overall bounding box for Overture Maps
export const FRANCE_BBOX = {
  south: 41.3,  // Southern Corsica
  west: -5.2,   // Atlantic coast
  north: 51.1,  // Northern border
  east: 9.6     // Eastern border (Alps)
}