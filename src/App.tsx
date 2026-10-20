import { useState } from 'react';
import { getSpec } from './calculators/registry';
import { Selector } from './screens/Selector';
import { Simulator } from './screens/Simulator';

const STORAGE_KEY = 'calcsim:v1:lastModel';

function readLastModel(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function rememberModel(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode / disabled storage: the app still works.
  }
}

export default function App() {
  const [lastId, setLastId] = useState<string | null>(readLastModel);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const spec = getSpec(selectedId);

  const choose = (id: string) => {
    setSelectedId(id);
    setLastId(id);
    rememberModel(id);
  };

  if (spec) {
    return <Simulator key={spec.id} spec={spec} onBack={() => setSelectedId(null)} />;
  }

  return <Selector onSelect={choose} lastId={lastId} />;
}
