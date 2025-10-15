import { ActionIcon, Card, Flex, Group, Modal, Progress, Table, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChartBar } from "@tabler/icons-react";
import { useUserStats } from "../hooks/useUserStats";
import { MAX_GUESSES } from "../constants";

export function UserStats() {
  const [opened, { open, close }] = useDisclosure(false);
  const { history, stats, clear } = useUserStats(MAX_GUESSES);

  const distMax = Math.max(1, ...stats.guessDistribution);

  return (
    <>
      <Modal opened={opened} onClose={close} title="Your stats" centered size="lg">
        <Flex direction="column" gap={20}>
          <Group grow>
            <Card withBorder>
              <Flex direction="column" align="center" gap={4}>
                <Text size="xl" fw={700}>{stats.played}</Text>
                <Text size="xs" c="dimmed">Played</Text>
              </Flex>
            </Card>
            <Card withBorder>
              <Flex direction="column" align="center" gap={4}>
                <Text size="xl" fw={700}>{Math.round(stats.winRate * 100)}%</Text>
                <Text size="xs" c="dimmed">Win rate</Text>
              </Flex>
            </Card>
            <Card withBorder>
              <Flex direction="column" align="center" gap={4}>
                <Text size="xl" fw={700}>{stats.currentStreak}</Text>
                <Text size="xs" c="dimmed">Current streak</Text>
              </Flex>
            </Card>
            <Card withBorder>
              <Flex direction="column" align="center" gap={4}>
                <Text size="xl" fw={700}>{stats.maxStreak}</Text>
                <Text size="xs" c="dimmed">Max streak</Text>
              </Flex>
            </Card>
          </Group>

          <Card withBorder>
            <Flex direction="column" gap={10}>
              <Text fw={600}>Guess distribution</Text>
              <Flex direction="column" gap={8}>
                {stats.guessDistribution.map((count, i) => (
                  <Flex key={i} align="center" gap={12}>
                    <Text w={24} ta="right">{i + 1}</Text>
                    <Progress value={(count / distMax) * 100} w="100%" />
                    <Text w={32} ta="right">{count}</Text>
                  </Flex>
                ))}
              </Flex>
            </Flex>
          </Card>

          <Card withBorder>
            <Text fw={600} mb={8}>Recent games</Text>
            <Table striped highlightOnHover withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Country</Table.Th>
                  <Table.Th>Result</Table.Th>
                  <Table.Th>Guesses</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {[...history].slice(-10).reverse().map((g) => (
                  <Table.Tr key={`${g.date}-${g.finishedAt}`}>
                    <Table.Td>{g.date}</Table.Td>
                    <Table.Td>{g.countryName}</Table.Td>
                    <Table.Td>{g.result === "won" ? "✅ Won" : "❌ Lost"}</Table.Td>
                    <Table.Td>{g.guessCount}</Table.Td>
                  </Table.Tr>
                ))}
                {history.length === 0 && (
                  <Table.Tr><Table.Td colSpan={4}><Text c="dimmed">No games yet.</Text></Table.Td></Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Card>

          <Text size="xs" c="dimmed" ta="center">
            Data saved on this device. <Text span c="blue" style={{cursor:'pointer'}} onClick={clear}>Reset</Text>
          </Text>
        </Flex>
      </Modal>

      <ActionIcon onClick={open} size="lg" variant="default" aria-label="Open stats">
        <IconChartBar stroke={1.5} />
      </ActionIcon>
    </>
  );
}
