import { useState, useCallback, useRef, useEffect } from "react";

export interface UseOverlayStateOptions {
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useOverlayState({
  isOpen: controlledIsOpen,
  defaultOpen = false,
  onOpen,
  onClose,
}: UseOverlayStateOptions = {}) {
  const isControlled = controlledIsOpen !== undefined;
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const prevOpenRef = useRef(isOpen);

  useEffect(() => {
    if (prevOpenRef.current !== isOpen) {
      if (isOpen) {
        onOpen?.();
      } else {
        onClose?.();
      }
      prevOpenRef.current = isOpen;
    }
  }, [isOpen, onOpen, onClose]);

  const open = useCallback(() => {
    if (!isControlled) {
      setInternalIsOpen(true);
    }
  }, [isControlled]);

  const close = useCallback(() => {
    if (!isControlled) {
      setInternalIsOpen(false);
    }
  }, [isControlled]);

  const toggle = useCallback(() => {
    if (!isControlled) {
      setInternalIsOpen((prev) => !prev);
    }
  }, [isControlled]);

  return {
    isOpen,
    open,
    close,
    toggle,
    isControlled,
  };
}
