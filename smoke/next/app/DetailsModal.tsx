'use client';

import { Button, Modal, Text } from '@fossil-design/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

/** Motion runs the panel through renderPanel; Fossil keeps the dialog's lifecycle. */
export function DetailsModal() {
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
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Details"
        onShowingChange={(showing) => {
          document.documentElement.dataset.modalShowing = String(showing);
        }}
        renderPanel={({ open: panelOpen, panelProps, onExitComplete }) => (
          <AnimatePresence onExitComplete={onExitComplete}>
            {panelOpen && (
              <motion.div
                key="panel"
                {...panelProps}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
              />
            )}
          </AnimatePresence>
        )}
      >
        <Text>Motion animates this panel.</Text>
      </Modal>
    </>
  );
}
