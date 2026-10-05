import {
  Box,
  Button,
  Card,
  CloseIcon,
  Icon,
  Link,
  SkipLink,
  Stack,
  Tabs,
  Text,
} from '@fossil-design/react';
import { DetailsModal } from './DetailsModal';

/** A Server Component: Fossil's server-safe components render here, and its client ones hydrate. */
export default function Page() {
  return (
    <>
      <SkipLink href="#main">Skip to content</SkipLink>
      <Box
        as="main"
        id="main"
        tabIndex={-1}
        padding={{ default: 'm', tablet: 'xl' }}
      >
        <Stack gap="l">
          <Text as="h1" variant="heading-xl">
            Fossil smoke test
          </Text>
          <Card title="Server rendered" titleAs="h2">
            Box, Stack, Text and Card render on the server.
          </Card>
          <Stack direction="row" gap="s" align="center">
            <Button tone="primary">Save</Button>
            <Icon icon={CloseIcon} label="Close" />
            <Link href="https://example.com" target="_blank" rel="noreferrer">
              An external link
            </Link>
          </Stack>
          <Tabs
            label="Smoke"
            tabs={[
              { id: 'one', label: 'One', content: <Text>First panel</Text> },
              { id: 'two', label: 'Two', content: <Text>Second panel</Text> },
            ]}
          />
          <DetailsModal />
        </Stack>
      </Box>
    </>
  );
}
