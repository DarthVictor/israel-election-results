import { createContext, type ParentProps, useContext } from "solid-js";
import type { ElectionResultsStore } from "./create-election-results-store";

const ElectionResultsContext = createContext<ElectionResultsStore>();

export function ElectionResultsProvider(props: ParentProps<{ store: ElectionResultsStore }>) {
  return (
    <ElectionResultsContext.Provider value={props.store}>
      {props.children}
    </ElectionResultsContext.Provider>
  );
}

export function useElectionResults() {
  const store = useContext(ElectionResultsContext);
  if (!store) throw new Error("useElectionResults must be used inside ElectionResultsProvider");
  return store;
}
