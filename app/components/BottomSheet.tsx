"use client";

import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
}: BottomSheetProps) {
  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info?.offset?.y > 100) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-dark-bg border-t-2 border-neon-green/30 rounded-t-3xl max-h-[80vh] overflow-hidden"
          >
            <div className="w-12 h-1 bg-neon-green/30 rounded-full mx-auto mt-3 mb-4" />
            {title && (
              <div className="flex items-center justify-between px-6 pb-4 border-b border-neon-green/10">
                <h3 className="text-lg font-bold text-neon-green">{title}</h3>
                <button
                  onClick={onClose}
                  className="text-neon-green/50 hover:text-neon-green"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
