import React, { useMemo } from 'react';
import { useJurisdictionStore, type JurisdictionSelection } from '../../stores/jurisdictionStore';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export function JurisdictionSummary() {
  const { selections, isFederalSelected, removeSelection, clearAll } =
    useJurisdictionStore();

  const grouped = useMemo(() => {
    const federal: JurisdictionSelection[] = [];
    const provincial: JurisdictionSelection[] = [];
    const municipal: JurisdictionSelection[] = [];

    selections.forEach((s) => {
      if (s.level === 'federal') federal.push(s);
      else if (s.level === 'provincial' || s.level === 'territorial') provincial.push(s);
      else if (s.level === 'municipal') municipal.push(s);
    });

    return { federal, provincial, municipal };
  }, [selections]);

  const totalCount = selections.length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Jurisdiction Selections
          {totalCount > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-medium text-white">
              {totalCount}
            </span>
          )}
        </h3>
        {totalCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </div>

      {totalCount === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">
          No jurisdictions selected. Use the map above to select provinces,
          territories, or municipalities.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Federal */}
          {grouped.federal.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Federal
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grouped.federal.map((s) => (
                  <Badge
                    key={s.id}
                    label={s.name}
                    level="federal"
                    onRemove={() => removeSelection(s.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Provincial */}
          {grouped.provincial.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Provincial / Territorial
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grouped.provincial.map((s) => (
                  <Badge
                    key={s.id}
                    label={s.name}
                    level={s.level}
                    onRemove={() => removeSelection(s.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Municipal */}
          {grouped.municipal.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Municipal
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grouped.municipal.map((s) => (
                  <Badge
                    key={s.id}
                    label={`${s.name} (${s.parentName})`}
                    level="municipal"
                    onRemove={() => removeSelection(s.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
