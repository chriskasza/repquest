import { useEffect, useState, useCallback } from "react";
import type { BaseLocationHook } from "wouter";

function currentHashPath(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return hash || "/";
}

export const useHashLocation: BaseLocationHook = () => {
  const [path, setPath] = useState(currentHashPath());

  useEffect(() => {
    const handler = () => setPath(currentHashPath());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return [path, navigate];
};
