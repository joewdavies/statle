// src/components/cheat-detector.tsx
import { useEffect, useRef, useState } from "react";
import { Modal, Button, Text, Flex } from "@mantine/core";

export function CheatDetector({ threshold = 1000 }: { threshold?: number }) {
    const [open, setOpen] = useState(false);
    const hiddenAtRef = useRef<number | null>(null);

    useEffect(() => {
        function markHidden() {
            hiddenAtRef.current = Date.now();
        }

        function markVisible() {
            if (
                hiddenAtRef.current &&
                Date.now() - hiddenAtRef.current > threshold
            ) {
                setOpen(true);
            }
            hiddenAtRef.current = null;
        }

        // visibility API
        function onVis() {
            if (document.visibilityState === "hidden") markHidden();
            else if (document.visibilityState === "visible") markVisible();
        }

        document.addEventListener("visibilitychange", onVis);
        window.addEventListener("blur", markHidden);
        window.addEventListener("focus", markVisible);

        return () => {
            document.removeEventListener("visibilitychange", onVis);
            window.removeEventListener("blur", markHidden);
            window.removeEventListener("focus", markVisible);
        };
    }, [threshold]);

    return (
        <Modal
            opened={open}
            onClose={() => setOpen(false)}
            centered
            title="No cheating!"
        >
            <Text size="sm" mb="md">
                You left the page — make sure you're playing fair! No checking maps 😉
            </Text>

            <Flex justify="flex-end" gap="md">
                <Button variant="default" onClick={() => setOpen(false)}>
                    Sorry!
                </Button>
            </Flex>
        </Modal>
    );
}
