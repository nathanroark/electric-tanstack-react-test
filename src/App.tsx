import { QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
// import Spectrogram from "./components/spectrogram"

import { Example } from "./Example"
import logo from "./assets/logo.svg"
import "./App.css"
import "./style.css"
// import DynamicBarChart from "./components/dynamic-bar-chart"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: Infinity,
    },
  },
})

// Using offline persistence, see:
// https://tanstack.com/query/latest/docs/framework/react/guides/mutations#persisting-offline-mutations
const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

export default function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister }}
        >
          <Example />
          {/* <DynamicBarChart /> */}
        </PersistQueryClientProvider>
      </header>
    </div>
  )
}
