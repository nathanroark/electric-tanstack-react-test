import { QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { Example } from "./components/Example"
import logo from "./assets/logo.svg"
import "@/styles/App.css"
import "@/styles/style.css"
import Spectrogram from "./components/spectrogram"

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
          <Spectrogram />
        </PersistQueryClientProvider>
      </header>
    </div>
  )
}
