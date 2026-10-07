import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Box } from '../Box/Box.js';
import { Button } from '../Button/Button.js';
import { Link } from '../Link/Link.js';
import { Text } from '../Text/Text.js';
import { Modal, type ModalProps } from './Modal.js';

function Demo({
  startOpen = false,
  ...args
}: ModalProps & { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open details
      </Button>
      <Modal
        {...args}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          args.onOpenChange(next);
        }}
      />
    </>
  );
}

const meta = {
  title: 'Overlays/Modal',
  component: Modal,
  args: {
    open: false,
    onOpenChange: fn(),
    onShowingChange: fn(),
    title: 'Project details',
    children: (
      <Text>
        A design system for agentic coding. Read the{' '}
        <Link href="#adr">decision records</Link> for the reasoning.
      </Text>
    ),
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(page.getByRole('button', { name: 'Open details' }));
    const dialog = await page.findByRole('dialog', { name: 'Project details' });
    await expect(
      page.getByRole('heading', { name: 'Project details' }),
    ).toHaveFocus();
    await expect(args.onShowingChange).toHaveBeenLastCalledWith(true);

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close' }),
    );
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() =>
      expect(args.onShowingChange).toHaveBeenLastCalledWith(false),
    );
    await expect((dialog as HTMLDialogElement).open).toBe(false);
  },
};

/**
 * The app keeps `open` in state: the trigger sets it, and every way out calls
 * `onOpenChange(false)`.
 */
export const ProjectDetails: Story = {
  tags: ['example'],
  render: function ProjectDetails() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          Open details
        </Button>
        <Modal open={open} onOpenChange={setOpen} title="Project details">
          <Text>A design system for agentic coding.</Text>
        </Modal>
      </>
    );
  },
};

export const WithHeaderContent: Story = {
  args: { headerContent: <Button size="s">Share</Button> },
  render: (args) => <Demo {...args} startOpen />,
  // Open, the modal would cover its own docs page.
  tags: ['!autodocs'],
};

/**
 * renderPanel animates the panel itself: here with the Web Animations API, in an app with a
 * library such as Motion. The dialog closes when the panel calls onExitComplete.
 */
export const RenderPanel: Story = {
  args: {
    renderPanel: ({ open, panelProps, onExitComplete }) => (
      <AnimatedPanel
        open={open}
        onExitComplete={onExitComplete}
        {...panelProps}
      />
    ),
  },
  play: async ({ canvasElement, args, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(page.getByRole('button', { name: 'Open details' }));
    const dialog = await page.findByRole('dialog', { name: 'Project details' });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close' }),
    );
    await expect((dialog as HTMLDialogElement).open).toBe(true);
    await waitFor(() => expect((dialog as HTMLDialogElement).open).toBe(false));
    await expect(args.onShowingChange).toHaveBeenLastCalledWith(false);
  },
};

function AnimatedPanel({
  open,
  onExitComplete,
  className,
  children,
}: {
  open: boolean;
  onExitComplete: () => void;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);

  useEffect(() => {
    const panel = ref.current;
    if (open || !panel) return;
    const exit = panel.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 120,
      fill: 'forwards',
    });
    exit.finished.then(
      () => {
        setShown(false);
        onExitComplete();
      },
      () => undefined,
    );
    return () => {
      exit.cancel();
    };
  }, [open, onExitComplete]);

  if (!shown) return null;
  return (
    <Box ref={ref} className={className}>
      {children}
    </Box>
  );
}

export const Open: Story = {
  render: (args) => <Demo {...args} startOpen />,
  // Open, the modal would cover its own docs page.
  tags: ['!autodocs'],
};

export const OpenDark: Story = {
  render: (args) => <Demo {...args} startOpen />,
  globals: { theme: 'dark' },
  tags: ['!dev', '!autodocs'],
};
