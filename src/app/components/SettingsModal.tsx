"use client";

import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Settings, X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [templateFolderPath, setTemplateFolderPath] = useState("");
  const [editorCommand, setEditorCommand] = useState("antigravity-ide");

  useEffect(() => {
    if (isOpen) {
      const savedTemplatePath = localStorage.getItem("templateFolderPath") || "";
      const savedEditorCommand = localStorage.getItem("editorCommand") || "antigravity-ide";
      setTemplateFolderPath(savedTemplatePath);
      setEditorCommand(savedEditorCommand);
    }
  }, [isOpen]);

  const handleSelectTemplateFolder = async () => {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
      });
      if (selectedPath) {
        setTemplateFolderPath(selectedPath as string);
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to select folder: ${err}`);
    }
  };

  const handleSave = () => {
    localStorage.setItem("templateFolderPath", templateFolderPath);
    localStorage.setItem("editorCommand", editorCommand);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-950/50">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 font-semibold">
                <Settings className="h-5 w-5" />
                <h2>Settings</h2>
              </div>
              <button 
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Templates Folder Path
                </label>
                <p className="text-xs text-zinc-500 mb-2 dark:text-zinc-400">
                  Select the folder that contains your LaTeX templates.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={templateFolderPath}
                    onChange={(e) => setTemplateFolderPath(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    placeholder="e.g. C:\Users\Documents\Templates"
                  />
                  <button
                    onClick={handleSelectTemplateFolder}
                    className="flex items-center justify-center rounded-lg bg-zinc-200 px-3 py-2 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    title="Browse..."
                  >
                    <FolderOpen className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Editor Command
                </label>
                <p className="text-xs text-zinc-500 mb-2 dark:text-zinc-400">
                  The command used to open your projects (e.g., <code>code</code> for VS Code, <code>nvim</code> for Neovim, <code>antigravity-ide</code>).
                </p>
                <input
                  type="text"
                  value={editorCommand}
                  onChange={(e) => setEditorCommand(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  placeholder="e.g. code"
                />
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-950/50 flex justify-end gap-3 mt-auto">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Settings
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
