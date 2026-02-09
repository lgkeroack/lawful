/**
 * Simplified SVG path data for the Canada map.
 * Each province/territory has an approximate outline path, center coordinates for labels,
 * and whether it's a territory (for styling with dashed borders).
 */
export interface ProvinceMapData {
  code: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
  isTerritory: boolean;
}

// SVG viewBox is 0 0 1000 700
// Paths are simplified representations of Canadian provinces/territories
export const PROVINCE_MAP_DATA: ProvinceMapData[] = [
  {
    code: 'BC',
    name: 'British Columbia',
    path: 'M80,250 L80,180 L100,140 L120,120 L110,100 L130,80 L150,90 L160,110 L170,130 L180,160 L190,180 L200,200 L200,250 L195,280 L185,310 L175,340 L160,360 L140,370 L110,360 L90,340 L80,310 Z',
    labelX: 140,
    labelY: 230,
    isTerritory: false,
  },
  {
    code: 'AB',
    name: 'Alberta',
    path: 'M200,200 L200,130 L210,110 L230,100 L260,100 L270,120 L270,200 L270,280 L270,340 L260,360 L240,370 L220,370 L200,360 L195,340 L195,280 Z',
    labelX: 235,
    labelY: 240,
    isTerritory: false,
  },
  {
    code: 'SK',
    name: 'Saskatchewan',
    path: 'M270,120 L270,100 L300,90 L330,90 L350,100 L350,120 L350,200 L350,280 L350,340 L340,360 L320,370 L300,370 L280,370 L270,340 L270,280 L270,200 Z',
    labelX: 310,
    labelY: 240,
    isTerritory: false,
  },
  {
    code: 'MB',
    name: 'Manitoba',
    path: 'M350,120 L350,100 L380,85 L410,80 L430,90 L440,110 L440,200 L435,250 L430,300 L420,340 L410,360 L390,370 L370,370 L350,340 L350,280 L350,200 Z',
    labelX: 395,
    labelY: 240,
    isTerritory: false,
  },
  {
    code: 'ON',
    name: 'Ontario',
    path: 'M440,110 L460,90 L490,80 L520,85 L550,95 L570,110 L580,130 L590,160 L600,190 L610,220 L600,260 L585,300 L570,330 L555,360 L540,380 L520,400 L500,410 L480,400 L460,390 L445,370 L430,350 L420,320 L425,280 L430,240 L435,200 L440,160 Z',
    labelX: 510,
    labelY: 260,
    isTerritory: false,
  },
  {
    code: 'QC',
    name: 'Quebec',
    path: 'M590,160 L610,130 L630,110 L660,90 L690,80 L720,75 L740,80 L750,100 L755,130 L750,170 L740,210 L730,250 L710,280 L690,310 L670,340 L650,360 L630,370 L610,370 L590,355 L575,330 L570,300 L580,260 L590,220 L595,190 Z',
    labelX: 670,
    labelY: 220,
    isTerritory: false,
  },
  {
    code: 'NB',
    name: 'New Brunswick',
    path: 'M750,310 L760,290 L775,280 L790,285 L800,300 L805,320 L800,340 L790,355 L775,360 L760,355 L750,340 Z',
    labelX: 777,
    labelY: 320,
    isTerritory: false,
  },
  {
    code: 'NS',
    name: 'Nova Scotia',
    path: 'M790,340 L810,330 L830,325 L850,330 L860,345 L855,360 L840,370 L820,375 L800,370 L790,355 Z',
    labelX: 825,
    labelY: 350,
    isTerritory: false,
  },
  {
    code: 'PE',
    name: 'Prince Edward Island',
    path: 'M805,295 L820,290 L835,293 L840,302 L835,310 L820,312 L808,308 Z',
    labelX: 822,
    labelY: 302,
    isTerritory: false,
  },
  {
    code: 'NL',
    name: 'Newfoundland and Labrador',
    path: 'M760,180 L780,160 L800,150 L820,155 L840,170 L850,190 L855,215 L850,240 L835,260 L815,270 L795,270 L775,260 L760,240 L755,215 Z',
    labelX: 805,
    labelY: 215,
    isTerritory: false,
  },
  {
    code: 'YT',
    name: 'Yukon',
    path: 'M80,30 L80,80 L100,100 L130,80 L150,70 L170,60 L190,50 L200,40 L200,20 L180,10 L150,5 L120,10 L95,20 Z',
    labelX: 140,
    labelY: 50,
    isTerritory: true,
  },
  {
    code: 'NT',
    name: 'Northwest Territories',
    path: 'M200,20 L200,40 L210,60 L230,80 L260,90 L300,85 L340,80 L380,70 L410,60 L430,50 L440,40 L440,25 L420,15 L390,8 L350,5 L310,5 L270,8 L240,12 Z',
    labelX: 320,
    labelY: 45,
    isTerritory: true,
  },
  {
    code: 'NU',
    name: 'Nunavut',
    path: 'M440,25 L440,40 L450,60 L470,75 L500,80 L540,85 L580,90 L620,85 L660,75 L690,60 L700,40 L700,25 L680,12 L640,5 L600,3 L560,5 L520,8 L480,15 Z',
    labelX: 570,
    labelY: 45,
    isTerritory: true,
  },
];
