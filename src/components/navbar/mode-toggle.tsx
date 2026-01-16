import cx from "clsx";
import {
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
  Group,
} from "@mantine/core";
import { IconSun, IconSnowflake, IconMoon } from "@tabler/icons-react";
import classes from "./mode-toggle.module.css";
import { isChristmas } from "../../helpers/isChristmas";

export function ModeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const christmas = isChristmas();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  return (
    <Group justify="center">
      <ActionIcon
        onClick={() =>
          setColorScheme(computedColorScheme === "light" ? "dark" : "light")
        }
        variant="default"
        size="lg"
        aria-label="Toggle color scheme"
      >
        <IconSun className={cx(classes.icon, classes.light)} stroke={1.5} />
        {christmas ? (
          <IconSnowflake className={cx(classes.icon, classes.dark)} stroke={1.5} />
        ) : (
          <IconMoon className={cx(classes.icon, classes.dark)} stroke={1.5} />
        )}
      </ActionIcon>
    </Group>
  );
}
