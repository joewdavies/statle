import { ActionIcon, Flex, Menu, Tooltip } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";
import { Logo } from "./logo";
import { ModeToggle } from "./mode-toggle";
import { UserStats } from "./user-stats";
import { About } from "./about";
import { useLanguage } from "../../hooks/useLanguage";

export function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
  ] as const;

  return (
    <Flex justify={"space-between"} align="center" w={"100%"} className="statle-navbar">
      <Flex gap={16}>
        <About />
        <UserStats />
      </Flex>
      <Logo />
      <Flex gap={16}>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <Tooltip label={t("Change language")} withArrow>
              <ActionIcon
                size="lg"
                variant="default"
                aria-label={t("Change language")}
              >
                <IconLanguage stroke={1.5} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            {languages.map(({ code, label }) => (
              <Menu.Item
                key={code}
                onClick={() => setLanguage(code)}
                rightSection={language === code ? "✓" : null}
                aria-current={language === code ? "true" : undefined}
              >
                {label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
        <ModeToggle />
      </Flex>
    </Flex>
  );
}
