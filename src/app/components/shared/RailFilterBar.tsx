import type { ChangeEvent } from "react";
import { T, border, font, radius, space, surface, tint, typeScale, typeWeight } from "../../tokens";

export interface RailFilterOption {
  id: string;
  label: string;
}

export function RailFilterBar({
  ariaLabel,
  query,
  onQueryChange,
  queryPlaceholder,
  options,
  value,
  onValueChange,
}: {
  ariaLabel: string;
  query?: string;
  onQueryChange?: (query: string) => void;
  queryPlaceholder?: string;
  options: RailFilterOption[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const onInput = (event: ChangeEvent<HTMLInputElement>) => onQueryChange?.(event.target.value);

  return (
    <div aria-label={ariaLabel} style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
      {onQueryChange ? (
        <input
          type="search"
          value={query}
          onChange={onInput}
          placeholder={queryPlaceholder ?? "Search"}
          aria-label={`${ariaLabel} search`}
          style={{
            width: "100%",
            minHeight: 32,
            border: `1px solid ${border.default}`,
            borderRadius: radius.sm,
            background: surface.control,
            color: T.textPrimary,
            padding: `0 ${space.md}px`,
            fontFamily: font.sans,
            fontSize: typeScale.label,
          }}
        />
      ) : null}
      <div role="group" aria-label={`${ariaLabel} filters`} style={{ display: "flex", flexWrap: "wrap", gap: space.xs }}>
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onValueChange(option.id)}
              style={{
                minHeight: 26,
                border: `1px solid ${selected ? tint(T.cyan, 0.48) : border.soft}`,
                borderRadius: radius.sm,
                background: selected ? tint(T.cyan, 0.13) : "transparent",
                color: selected ? T.cyan : T.textMuted,
                padding: `0 ${space.sm}px`,
                fontFamily: font.sans,
                fontSize: typeScale.caption,
                fontWeight: typeWeight.semibold,
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
