"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Plus, Loader2 } from "lucide-react";
import { LazyStore } from "@tauri-apps/plugin-store";

const store = new LazyStore("projects.json");

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

export function NewProjectModal({ isOpen, onClose, onProjectCreated }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [template, setTemplate] = useState("Empty");
  const [templatesList, setTemplatesList] = useState<string[]>(["Empty"]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      invoke<string[]>("get_templates")
        .then((fetchedTemplates) => {
          if (fetchedTemplates && fetchedTemplates.length > 0) {
            setTemplatesList(fetchedTemplates);
            setTemplate(fetchedTemplates[0]);
          } else {
            setTemplatesList(["Empty"]);
            setTemplate("Empty");
          }
        })
        .catch((err) => {
          console.error("Failed to fetch templates:", err);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
      });
      if (selectedPath) {
        setPath(selectedPath as string);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    setError("");
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    if (!path.trim()) {
      setError("Project location is required");
      return;
    }

    setIsCreating(true);
    try {
      const fullPath = await invoke<string>("create_project", {
        name: name.trim(),
        path: path.trim(),
        template,
      });

      const newProject = {
        id: Date.now().toString(),
        name: name.trim(),
        path: fullPath,
        template,
        createdAt: new Date().toISOString()
      };
      
      let projects: any[] = await store.get("projects") || [];
      projects.push(newProject);
      await store.set("projects", projects);
      await store.save();

      await invoke("open_in_antigravity", { projectPath: fullPath });
      
      onProjectCreated();
      onClose();
    } catch (err) {
      setError(err as string);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">Create New Project</h2>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="e.g. my-latex-doc"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Template
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {templatesList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={path}
                readOnly
                className="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 cursor-not-allowed"
                placeholder="Select a folder..."
              />
              <button
                onClick={handleSelectFolder}
                className="flex items-center justify-center rounded-lg bg-zinc-200 px-3 py-2 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                title="Browse..."
              >
                <FolderOpen className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
