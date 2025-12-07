import { countriesMap } from "../../data/countries/countries";
import { Popover, ActionIcon, Image, Text } from "@mantine/core";
import { countryCodeToEmoji, getFlagURL } from "../../helpers/getFlag";

export function LandBorders({ borders }: { borders: string[] }) {
  const items = borders.map((code) => {
    const found = countriesMap.get(code);
    return {
      code,
      name: found ? found.name : code,
      flag: getFlagURL(code),
      emoji: countryCodeToEmoji(code),
    };
  });

  return (
    <span
      // keep container inline so it sits within the stat-value inline row
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25ch",
        lineHeight: 1,
        verticalAlign: "middle",
      }}
    >
      {items.map((b) => (
        <Popover key={b.code} position="bottom" withArrow>
          <Popover.Target>
            <ActionIcon
              variant="transparent"
              aria-label={b.name}
              // don't use px – let CSS class control sizing so it's consistent with text
              className="land-border-flag flag-button"
              tabIndex={0}
            >
              {/* Mantine Image will render an <img> inside; CSS above targets it */}
              <Image
                src={b.flag}
                alt={b.name}
                // fallback: show nothing if image fails — keeps size stable because container has fixed em-based size
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </ActionIcon>
          </Popover.Target>

          <Popover.Dropdown>
            <Text size="sm">{b.name}</Text>
            <Text size="xs" color="dimmed">
              {b.code}
            </Text>
          </Popover.Dropdown>
        </Popover>
      ))}
    </span>
  );
}
