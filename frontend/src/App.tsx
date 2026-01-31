import React from 'react';
import { useEntities, useRelations } from './api';
import Graph from './Graph';
import { sampleEntities, sampleRelations } from './sampleData';

function App() {
  const entities = useEntities();
  const relations = useRelations();

  const nodesToUse = entities.length ? entities : sampleEntities;
  const linksToUse = relations.length ? relations : sampleRelations;

  return (
    <div>
      <h1>Relation Map Frontend</h1>
      <p>React + TypeScript + D3.js</p>

      <h2>Graph (sample data used if API empty)</h2>
      <Graph entities={nodesToUse} relations={linksToUse} width={900} height={600} />

      <h2>Entities</h2>
      <ul>
        {nodesToUse.map(e => (
          <li key={e.id}>{e.name} ({e.type})</li>
        ))}
      </ul>

      <h2>Relations</h2>
      <ul>
        {linksToUse.map(r => (
          <li key={r.id}>{`${r.source_id} -[${r.relation_type}]-> ${r.target_id}`}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
