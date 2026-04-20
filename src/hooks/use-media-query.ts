import { createSignal, onCleanup, onMount } from "solid-js";

export function useMediaQuery(query: string): () => boolean {
  const [value, setValue] = createSignal(false);

  onMount(() => {
    const result = matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setValue(event.matches);
    result.addEventListener("change", onChange);
    setValue(result.matches);
    onCleanup(() => result.removeEventListener("change", onChange));
  });

  return value;
}
