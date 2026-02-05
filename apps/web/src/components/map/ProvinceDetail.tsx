import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useJurisdictionStore } from '../../stores/jurisdictionStore';
import { Button } from '../common/Button';

export function ProvinceDetail() {
  const {
    activeProvince,
    provinces,
    selections,
    setActiveProvince,
    toggleMunicipality,
    toggleEntireProvince,
  } = useJurisdictionStore();

  const [searchQuery, setSearchQuery] = useState('');

  const province = useMemo(
    () => provinces.find((p) => p.code === activeProvince),
    [provinces, activeProvince]
  );

  const isEntireProvinceSelected = useMemo(
    () =>
      selections.some(
        (s) =>
          (s.level === 'provincial' || s.level === 'territorial') &&
          s.id === activeProvince
      ),
    [selections, activeProvince]
  );

  const selectedMunicipalityCodes = useMemo(() => {
    const codes = new Set<string>();
    selections.forEach((s) => {
      if (s.level === 'municipal' && s.parentCode === activeProvince) {
        codes.add(s.id);
      }
    });
    return codes;
  }, [selections, activeProvince]);

  const filteredMunicipalities = useMemo(() => {
    if (!province) return [];
    const q = searchQuery.toLowerCase();
    return province.municipalities.filter((m) =>
      m.name.toLowerCase().includes(q)
    );
  }, [province, searchQuery]);

  if (!activeProvince || !province) return null;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setActiveProvince(null)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to map
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {province.name}
            </h3>
            <p className="text-sm text-gray-500">
              {province.level === 'territorial' ? 'Territory' : 'Province'} &middot;{' '}
              {province.legalSystem === 'civil_law' ? 'Civil Law' : 'Common Law'}
            </p>
          </div>
          <Button
            variant={isEntireProvinceSelected ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => toggleEntireProvince(province.code)}
          >
            {isEntireProvinceSelected ? 'Entire Province Selected' : 'Select Entire Province'}
          </Button>
        </div>

        {/* Municipality search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search municipalities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Municipalities list */}
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {filteredMunicipalities.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              {searchQuery
                ? 'No municipalities match your search.'
                : 'No municipalities available.'}
            </p>
          ) : (
            filteredMunicipalities.map((muni) => {
              const isChecked =
                isEntireProvinceSelected ||
                selectedMunicipalityCodes.has(muni.code);

              return (
                <label
                  key={muni.code}
                  className={`
                    flex cursor-pointer items-center gap-3 rounded-md px-3 py-2
                    transition-colors hover:bg-gray-50
                    ${isChecked ? 'bg-blue-50' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isEntireProvinceSelected}
                    onChange={() =>
                      toggleMunicipality(province.code, muni)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">{muni.name}</span>
                  <span className="text-xs text-gray-400">{muni.code}</span>
                </label>
              );
            })
          )}
        </div>

        {isEntireProvinceSelected && (
          <p className="mt-3 text-xs text-blue-600">
            The entire province is selected. Individual municipality toggles are disabled.
          </p>
        )}
      </div>
    </div>
  );
}
