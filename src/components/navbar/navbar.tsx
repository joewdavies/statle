import { ActionIcon, Flex, Tooltip } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";
import { Logo } from "./logo";
import { ModeToggle } from "./mode-toggle";
import { UserStats } from "./user-stats";
import { About } from "./about";
import { useLanguage } from "../../hooks/useLanguage";

export function Navbar() {
  const { language, setLanguage } = useLanguage();

  return (
    <Flex justify={"space-between"} align="center" w={"100%"} className="statle-navbar">
      <Flex gap={16}>
        <About />
        <UserStats />
      </Flex>
      <Logo />
      <Flex gap={16}>
        <Tooltip label="Toggle Language" withArrow>
          <ActionIcon
            size={"lg"}
            variant="default"
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
          >
            <IconLanguage stroke={1.5} />
          </ActionIcon>
        </Tooltip>
        <ModeToggle />
      </Flex>
    </Flex>
  );
}
