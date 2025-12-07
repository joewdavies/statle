import { Card } from "@mantine/core";
import { Country } from "../../data/countries/countries";
import { CountryCard } from "./country-card";

type PaperItemProps = {
  index: number;
  guessCount: number;
  guess: string;
  guessCountry?: Country;
  country: Country;
};

export const CardItem = ({
  index,
  guessCount,
  guess,
  guessCountry,
  country,
}: PaperItemProps) => {
  const isActive = index === guessCount;
  const borderColor = isActive ? "var(--mantine-color-blue-6)" : "";
  const isCorrect = guess === country.name;
  const isEmpty = guess === "";

  return (
    <Card
      key={index}
      w={"100%"}
      shadow="xs"
      withBorder
      h={24}
      px={24}
      style={{
        background: isCorrect
          ? "var(--mantine-color-green-0)"
          : isEmpty
          ? "var(--mantine-color-gray-3)"  // ⬅️ grey bar
          : "transparent",
        border: isCorrect
          ? "1px solid var(--mantine-color-green-4)"
          : borderColor,
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isEmpty ? (
        // ⬅️ nothing inside, just the grey bar
        <></>
      ) : (
        <CountryCard guessCountry={guessCountry!} country={country} />
      )}
    </Card>
  );
};
