import React from 'react';
import { useEntities, useRelations } from './api';

function App() {
  const entities = useEntities();
  const relations = useRelations();

  return (
    <div>
      <h1>Relation Map Frontend</h1>
      <p>React + TypeScript + D3.js</p>
      <h2>Entities</h2>
      <ul>
        {entities.map(e => (
          <li key={e.id}>{e.name} ({e.type})</li>
        ))}
      </ul>
      <h2>Relations</h2>
      <ul>
        {relations.map(r => (
          <li key={r.id}>{`${r.source_id} -[${r.relation_type}]-> ${r.target_id}`}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
