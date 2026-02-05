import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useJurisdictionStore } from '../../stores/jurisdictionStore';
import { Button } from '../common/Button';

// ---------- Province SVG path data ----------
// Simplified but recognizable paths for each Canadian province/territory.
// Coordinates are in a custom viewBox coordinate system (0-1000 x, 0-800 y).

interface ProvincePathData {
  code: string;
  name: string;
  path: string;
  center: [number, number];
  level: 'provincial' | 'territorial';
  legalSystem: 'common_law' | 'civil_law';
}

const PROVINCE_PATHS: ProvincePathData[] = [
  // Territories (north)
  {
    code: 'YT',
    name: 'Yukon',
    path: 'M80,30 L160,30 L160,180 L140,200 L80,200 Z',
    center: [120, 115],
    level: 'territorial',
    legalSystem: 'common_law',
  },
  {
    code: 'NT',
    name: 'Northwest Territories',
    path: 'M165,30 L370,30 L400,80 L380,140 L350,180 L300,210 L250,200 L200,210 L165,200 L165,180 Z',
    center: [280, 120],
    level: 'territorial',
    legalSystem: 'common_law',
  },
  {
    code: 'NU',
    name: 'Nunavut',
    path: 'M375,30 L580,30 L620,60 L650,30 L700,50 L680,100 L620,130 L660,170 L630,210 L570,190 L530,220 L480,200 L450,230 L405,200 L385,140 L405,80 Z',
    center: [540, 130],
    level: 'territorial',
    legalSystem: 'common_law',
  },
  // Western provinces
  {
    code: 'BC',
    name: 'British Columbia',
    path: 'M50,205 L80,205 L140,205 L155,210 L160,260 L170,290 L150,340 L130,380 L100,420 L70,440 L50,410 L40,360 L45,300 Z',
    center: [105, 320],
    level: 'provincial',
    legalSystem: 'common_law',
  },
  {
    code: 'AB',
    name: 'Alberta',
    path: 'M160,210 L250,210 L250,420 L160,420 L150,340 L170,290 L160,260 Z',
    center: [205, 320],
    level: 'provincial',
    legalSystem: 'common_law',
  },
  {
    code: 'SK',
    name: 'Saskatchewan',
    path: 'M255,215 L350,215 L350,420 L255,420 Z',
    center: [302, 320],
    level: 'provincial',
    legalSystem: 'common_law',
  },
  {
    code: 'MB',
    name: 'Manitoba',
    path: 'M355,215 L450,215 L460,250 L445,300 L455,350 L450,420 L355,420 Z',
    center: [405, 320],
    level: 'provincial',
    legalSystem: 'common_law',
  },
  // Central provinces
  {
    code: 'ON',
    name: 'Ontario',
    path: 'M455,215 L530,225 L560,250 L580,300 L590,350 L600,400 L620,450 L600,480 L560,500 L520,490 L490,470 L470,440 L455,420 Z',
    center: [525, 370],
    level: 'provincial',
    legalSystem: 'common_law',
  },
  {
    code: 'QC',
    name: 'Quebec',
    path: 'M565,200 L630,215 L680,180 L720,200 L740,250 L730,300 L710,350 L690,390 L660,420 L630,450 L605,470 L565,500 L560,460 L575,420 L585,380 L595,350 L585,300 L565,250 Z',
    center: [650, 330],
    level: 'provincial',
    legalSystem: 'civil_law',
  },
  // Atlantic provinces
  {
    code: 'NL',
    name: 'Newfoundland and Labrador',
    path: 'M725,200 L780,180 L800,200 L790,250 L770,280 L745,260 L725,240 Z M760,300 L810,290 L830,310 L820,350 L790,370 L760,350 Z',
    center: [785, 320],
    level: 'provincial',
    legalSystem: 'common_law',
  },
  {
    code: 'NB',
    name: 'New Brunswick',
    path: 'M680,420 L720,410 L740,430 L730,465 L700,475 L680,460 Z',
    center: [710, 443],
    level: 'provincial',
    legalSystem: 'common_law',
  },
  {
    code: 'NS',
    name: 'Nova Scotia',
    path: 'M720,470 L740,465 L780,470 L800,485 L790,500 L760,505 L730,495 Z',
    center: [760, 485],
    level: 'provincial',
    legalSystem: 'common_law',
  },
  {
    code: 'PE',
    name: 'Prince Edward Island',
    path: 'M745,440 L775,435 L780,448 L750,452 Z',
    center: [762, 444],
    level: 'provincial',
    legalSystem: 'common_law',
  },
];

const COLORS = {
  unselected: '#E5E7EB',
  hover: '#93C5FD',
  selected: '#2563EB',
  federal: '#10B981',
  stroke: '#9CA3AF',
  strokeSelected: '#1D4ED8',
  civilLawPattern: '#EDE9FE',
};

export function JurisdictionMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const {
    selections,
    isFederalSelected,
    activeProvince,
    toggleFederal,
    toggleProvince,
    setActiveProvince,
  } = useJurisdictionStore();

  // Memoize selected province codes for quick lookup
  const selectedCodes = useMemo(() => {
    const codes = new Set<string>();
    selections.forEach((s) => {
      if (s.level === 'provincial' || s.level === 'territorial') {
        codes.add(s.id);
      }
      // Also consider a province "partially selected" if it has municipalities selected
      if (s.level === 'municipal' && s.parentCode) {
        codes.add(s.parentCode);
      }
    });
    return codes;
  }, [selections]);

  const hasPartialSelection = useCallback(
    (code: string) => {
      // Has municipalities but not the entire province
      const hasMunis = selections.some(
        (s) => s.level === 'municipal' && s.parentCode === code
      );
      const hasProvince = selections.some(
        (s) => (s.level === 'provincial' || s.level === 'territorial') && s.id === code
      );
      return hasMunis && !hasProvince;
    },
    [selections]
  );

  const getFillColor = useCallback(
    (code: string) => {
      if (isFederalSelected) return COLORS.federal;
      const isSelected = selections.some(
        (s) =>
          (s.level === 'provincial' || s.level === 'territorial') && s.id === code
      );
      if (isSelected) return COLORS.selected;
      if (hasPartialSelection(code)) return '#60A5FA'; // partial = lighter blue
      if (hoveredProvince === code) return COLORS.hover;
      return COLORS.unselected;
    },
    [isFederalSelected, selections, hoveredProvince, hasPartialSelection]
  );

  const handleProvinceClick = useCallback(
    (code: string) => {
      const isAlreadySelected = selections.some(
        (s) =>
          (s.level === 'provincial' || s.level === 'territorial') && s.id === code
      );

      if (isAlreadySelected || hasPartialSelection(code)) {
        // Second click on selected province -> drill down
        setActiveProvince(code);
      } else {
        toggleProvince(code);
      }
    },
    [selections, toggleProvince, setActiveProvince, hasPartialSelection]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, code: string) => {
      setHoveredProvince(code);
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setTooltipPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 10,
        });
      }
    },
    []
  );

  // Memoized province elements
  const provinceElements = useMemo(
    () =>
      PROVINCE_PATHS.map((prov) => {
        const fill = getFillColor(prov.code);
        const isTerritory = prov.level === 'territorial';
        const isQC = prov.code === 'QC';
        const isSelected =
          isFederalSelected ||
          selections.some(
            (s) =>
              (s.level === 'provincial' || s.level === 'territorial') &&
              s.id === prov.code
          );

        return (
          <g key={prov.code}>
            {/* Civil law background pattern for Quebec */}
            {isQC && !isSelected && !isFederalSelected && (
              <path
                d={prov.path}
                fill={COLORS.civilLawPattern}
                stroke="none"
              />
            )}
            <path
              d={prov.path}
              fill={fill}
              stroke={isSelected ? COLORS.strokeSelected : COLORS.stroke}
              strokeWidth={isSelected ? 2 : 1}
              strokeDasharray={isTerritory ? '4,3' : undefined}
              className="cursor-pointer transition-colors duration-150"
              onClick={() => handleProvinceClick(prov.code)}
              onMouseMove={(e) => handleMouseMove(e, prov.code)}
              onMouseLeave={() => setHoveredProvince(null)}
              opacity={isQC && !isSelected && !isFederalSelected ? 0.85 : 1}
            />
            {/* Province label */}
            <text
              x={prov.center[0]}
              y={prov.center[1]}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none select-none text-[11px] font-medium"
              fill={isSelected || isFederalSelected ? '#FFFFFF' : '#374151'}
            >
              {prov.code}
            </text>
          </g>
        );
      }),
    [getFillColor, isFederalSelected, selections, handleProvinceClick, handleMouseMove]
  );

  // If a province is active for drill-down, don't show the map
  if (activeProvince) return null;

  return (
    <div className="w-full">
      {/* Federal toggle */}
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant={isFederalSelected ? 'primary' : 'secondary'}
          size="sm"
          onClick={toggleFederal}
          className={
            isFederalSelected
              ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              : ''
          }
        >
          {isFederalSelected ? 'Federal Selected' : 'Applies to all of Canada'}
        </Button>
        {isFederalSelected && (
          <span className="text-xs text-green-700">
            All provinces and territories are included
          </span>
        )}
      </div>

      {/* Map */}
      <div className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
        <svg
          ref={svgRef}
          viewBox="0 0 870 540"
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Water background */}
          <rect width="870" height="540" fill="#F0F9FF" rx="8" />

          {provinceElements}

          {/* Legend */}
          <g transform="translate(20, 480)">
            <rect x="0" y="0" width="12" height="12" fill={COLORS.unselected} stroke={COLORS.stroke} strokeWidth="1" rx="2" />
            <text x="18" y="10" className="text-[10px]" fill="#6B7280">Unselected</text>

            <rect x="90" y="0" width="12" height="12" fill={COLORS.selected} stroke={COLORS.strokeSelected} strokeWidth="1" rx="2" />
            <text x="108" y="10" className="text-[10px]" fill="#6B7280">Selected</text>

            <rect x="175" y="0" width="12" height="12" fill={COLORS.federal} stroke={COLORS.stroke} strokeWidth="1" rx="2" />
            <text x="193" y="10" className="text-[10px]" fill="#6B7280">Federal</text>

            <rect x="250" y="0" width="12" height="12" fill={COLORS.unselected} stroke={COLORS.stroke} strokeWidth="1" strokeDasharray="3,2" rx="2" />
            <text x="268" y="10" className="text-[10px]" fill="#6B7280">Territory</text>

            <rect x="340" y="0" width="12" height="12" fill={COLORS.civilLawPattern} stroke={COLORS.stroke} strokeWidth="1" rx="2" />
            <text x="358" y="10" className="text-[10px]" fill="#6B7280">Civil Law (QC)</text>
          </g>
        </svg>

        {/* Tooltip */}
        {hoveredProvince && (
          <div
            className="pointer-events-none absolute z-10 rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {PROVINCE_PATHS.find((p) => p.code === hoveredProvince)?.name}
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Click a province to select it. Click a selected province to drill down into municipalities.
      </p>
    </div>
  );
}
