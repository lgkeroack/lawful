export type JurisdictionLevel = 'federal' | 'provincial' | 'territorial' | 'municipal';

export type LegalSystem = 'common_law' | 'civil_law';

export interface Jurisdiction {
  id: string;
  name: string;
  code: string;
  level: JurisdictionLevel;
  parentId: string | null;
  legalSystem: LegalSystem;
  geoCode: string | null;
  population: number | null;
  createdAt: string;
}

export interface JurisdictionTreeNode extends Jurisdiction {
  children: JurisdictionTreeNode[];
}

export interface ProvinceData {
  name: string;
  code: string;
  level: 'provincial' | 'territorial';
  legalSystem: LegalSystem;
  municipalities: MunicipalityData[];
}

export interface MunicipalityData {
  name: string;
  code: string;
}
