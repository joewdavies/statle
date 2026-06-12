import { ActionIcon, Card, Flex, Group, Modal, Progress, Table, Text, Image } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChartBar } from "@tabler/icons-react";
import { useUserStats } from "../../hooks/useUserStats";
import { MAX_GUESSES } from "../../constants";
import { WorldMap } from './world-map';
import { getFlagURL } from "../../helpers/getFlag";

function formatShortDate(dateStr: string) {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${monthNames[month - 1]}`;
  }
  return dateStr;
}

export function UserStats() {
  const [opened, { open, close }] = useDisclosure(false);
  const { history, userStats, clear } = useUserStats(MAX_GUESSES);

  const distMax = Math.max(1, ...userStats.guessDistribution);

  return (
    <>
      <Modal opened={opened} onClose={close} title="Your stats" centered size="lg" padding="xs">
        <Flex direction="column" gap="sm">
          <Group grow align="stretch" gap="xs">
            <Card withBorder p="xs">
              <Flex direction="column" align="center" justify="center" gap={4} h="100%">
                <Text size="xl" fw={700}>{userStats.played}</Text>
                <Text size="xs" c="dimmed" ta="center">Played</Text>
              </Flex>
            </Card>
            <Card withBorder p="xs">
              <Flex direction="column" align="center" justify="center" gap={4} h="100%">
                <Text size="xl" fw={700}>{Math.round(userStats.winRate * 100)}%</Text>
                <Text size="xs" c="dimmed" ta="center">Win rate</Text>
              </Flex>
            </Card>
            <Card withBorder p="xs">
              <Flex direction="column" align="center" justify="center" gap={4} h="100%">
                <Text size="xl" fw={700}>{userStats.currentStreak}</Text>
                <Text size="xs" c="dimmed" ta="center">Current streak</Text>
              </Flex>
            </Card>
            <Card withBorder p="xs">
              <Flex direction="column" align="center" justify="center" gap={4} h="100%">
                <Text size="xl" fw={700}>{userStats.maxStreak}</Text>
                <Text size="xs" c="dimmed" ta="center">Max streak</Text>
              </Flex>
            </Card>
          </Group>

          <Card withBorder p="xs">
            <div style={{ textAlign: 'center' }}>
              <Text fw={600} size="sm" mb={4}>Countries You’ve Guessed Correctly</Text>
              <WorldMap />
            </div>
          </Card>

          <Card withBorder p="xs">
            <Flex direction="column" gap={10}>
              <Text fw={600} size="sm">Guess distribution</Text>
              <Flex direction="column" gap={8}>
                {userStats.guessDistribution.map((count, i) => (
                  <Flex key={i} align="center" gap={12}>
                    <Text w={24} ta="right">{i + 1}</Text>
                    <Progress value={(count / distMax) * 100} w="100%" />
                    <Text w={32} ta="right">{count}</Text>
                  </Flex>
                ))}
              </Flex>
            </Flex>
          </Card>

          <Card withBorder p="xs">
            <Text fw={600} mb={8}>Recent games</Text>
            <Table striped highlightOnHover withColumnBorders style={{ width: '100%', tableLayout: 'fixed' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ padding: '6px 4px', fontSize: '11px', width: '55px' }}>Date</Table.Th>
                  <Table.Th style={{ padding: '6px 4px', fontSize: '11px' }}>Country</Table.Th>
                  <Table.Th style={{ padding: '6px 4px', fontSize: '11px', width: '65px', textAlign: 'center' }}>Result</Table.Th>
                  <Table.Th style={{ padding: '6px 4px', fontSize: '11px', width: '55px', textAlign: 'center' }}>Guesses</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {[...history].reverse().map((g) => (
                  <Table.Tr key={`${g.date}-${g.finishedAt}`}>
                    <Table.Td style={{ padding: '6px 4px', fontSize: '11px' }}>{formatShortDate(g.date)}</Table.Td>
                    <Table.Td style={{ padding: '6px 4px', fontSize: '11px' }}>
                      <Flex gap={6} align="center" style={{ flexWrap: 'nowrap' }}>
                        <Image
                          src={getFlagURL(g.countryCode)}
                          alt=""
                          radius="xs"
                          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.15)', height: '12px', width: '18px', flexShrink: 0 }}
                        />
                        <Text style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85px' }} title={g.countryName}>
                          {g.countryName}
                        </Text>
                      </Flex>
                    </Table.Td>
                    <Table.Td style={{ padding: '6px 4px', fontSize: '11px', textAlign: 'center' }}>{g.result === "won" ? "✅ Won" : "❌ Lost"}</Table.Td>
                    <Table.Td style={{ padding: '6px 4px', fontSize: '11px', textAlign: 'center' }}>{g.guessCount}</Table.Td>
                  </Table.Tr>
                ))}
                {history.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={4} style={{ padding: '6px 4px', fontSize: '11px' }}>
                      <Text c="dimmed" style={{ fontSize: '11px' }}>No games yet.</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Card>

          <Text size="xs" c="dimmed" ta="center">
            Data saved on this device. <Text span c="blue" style={{ cursor: 'pointer' }} onClick={clear}>Reset</Text>
          </Text>
        </Flex>
      </Modal>

      <ActionIcon onClick={open} size="lg" variant="default" aria-label="Open stats">
        <IconChartBar stroke={1.5} />
      </ActionIcon>
    </>
  );
}
