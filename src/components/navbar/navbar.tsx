import { ActionIcon, Flex } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";
import { Logo } from "./logo";
import { ModeToggle } from "./mode-toggle";
import { Rules } from "./rules";
import { UserStats } from "./user-stats";

export function Navbar() {
  return (
    <Flex justify={"space-between"} align="center" w={"100%"} className="statle-navbar">
      <Flex gap={16}>
        <Rules />
        <UserStats />
      </Flex>
      <Logo />
      <Flex gap={16}>
        <ActionIcon
          size={"lg"}
          variant="default"
          onClick={() =>
            window.open("https://github.com/joewdavies/statle", "_blank")
          }
        >
          <IconBrandGithub stroke={1.5} />
        </ActionIcon>
        <ModeToggle />
      </Flex>
    </Flex>
  );
}
