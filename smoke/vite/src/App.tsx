import {
  Box,
  Button,
  Card,
  Carousel,
  CloseIcon,
  Link,
  Modal,
  Popover,
  Stack,
  Tabs,
  Text,
  Tooltip,
} from '@fossil-design/react';
import { useState } from 'react';
import styles from './app.module.css';

/** Every kind of Fossil component, on React 18. */
export function App() {
  const [open, setOpen] = useState(false);
  return (
    <Box as="main" padding="l" className={styles.app}>
      <Stack gap="l">
        <Text as="h1" variant="heading-xl">
          Fossil smoke test
        </Text>
        <Card title="React 18" titleAs="h2">
          Rendered by React 18 from the packed tarballs.
        </Card>
        <Stack direction="row" gap="s" align="center">
          <Tooltip content="Close the panel">
            <Button icon={CloseIcon} label="Close" />
          </Tooltip>
          <Popover
            label="About"
            content={<Link href="#source">Read the source</Link>}
          >
            <Button>About</Button>
          </Popover>
          <Button
            tone="primary"
            onClick={() => {
              setOpen(true);
            }}
          >
            Open details
          </Button>
        </Stack>
        <Tabs
          label="Smoke"
          tabs={[
            { id: 'one', label: 'One', content: <Text>First panel</Text> },
            { id: 'two', label: 'Two', content: <Text>Second panel</Text> },
          ]}
        />
        <Carousel label="Cards">
          {['One', 'Two', 'Three'].map((title) => (
            <Card key={title} title={title} titleAs="h3">
              A card in a carousel.
            </Card>
          ))}
        </Carousel>
        <Modal open={open} onOpenChange={setOpen} title="Details">
          <Text>Fossil's own CSS fade runs this panel.</Text>
        </Modal>
      </Stack>
    </Box>
  );
}
