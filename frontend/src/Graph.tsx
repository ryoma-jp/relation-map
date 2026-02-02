import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Entity, Relation } from './api';

type Props = {
  entities: Entity[];
  relations: Relation[];
  width?: number;
  height?: number;
  onEditEntity?: (entity: Entity) => void;
  onDeleteEntity?: (entity: Entity) => void;
  onEditRelation?: (relation: Relation) => void;
  onDeleteRelation?: (relation: Relation) => void;
  onViewEntity?: (entity: Entity) => void;
};

export default function Graph({
  entities,
  relations,
  width = 800,
  height = 600,
  onEditEntity,
  onDeleteEntity,
  onEditRelation,
  onDeleteRelation,
  onViewEntity,
}: Props) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const nodeMap = new Map<number, Entity>();
    entities.forEach(e => nodeMap.set(e.id, e));

    const nodes = entities.map(e => ({ id: e.id, name: e.name }));
    const links = relations
      .map(r => ({
        id: r.id,
        source: r.source_id,
        target: r.target_id,
        type: r.relation_type,
      }))
      .filter(l => nodeMap.has(l.source) && nodeMap.has(l.target));

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const container = svg.append('g');

    // Links
    const link = container
      .append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke-width', 2)
      .attr('id', (d: any) => `link-${d.id}`)
      .style('cursor', 'pointer')
      .on('mouseover', (event: any) => {
        d3.select(event.target).attr('stroke', '#ff6b6b').attr('stroke-width', 3);
      })
      .on('mouseout', (event: any) => {
        d3.select(event.target).attr('stroke', '#999').attr('stroke-width', 2);
      });

    // Link labels
    const linkLabel = container
      .append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('text-anchor', 'middle')
      .attr('dy', -6)
      .style('font-family', 'sans-serif')
      .style('font-size', 11)
      .style('pointer-events', 'none')
      .text((d: any) => d.type);

    // Nodes
    const node = container
      .append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        const entity = nodeMap.get(d.id);
        if (entity && onViewEntity) {
          onViewEntity(entity);
        }
      })
      .call(
        d3
          .drag()
          .on('start', (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event: any, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node.append('circle').attr('r', 18).attr('fill', '#4DA1FF');
    node
      .append('text')
      .attr('x', 22)
      .attr('y', 5)
      .text((d: any) => d.name)
      .style('font-family', 'sans-serif')
      .style('font-size', 12)
      .style('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => (d.source as any).x)
        .attr('y1', (d: any) => (d.source as any).y)
        .attr('x2', (d: any) => (d.target as any).x)
        .attr('y2', (d: any) => (d.target as any).y);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);

      linkLabel
        .attr('x', (d: any) => (((d.source as any).x + (d.target as any).x) / 2))
        .attr('y', (d: any) => (((d.source as any).y + (d.target as any).y) / 2));
    });

    svg.call(
      d3
        .zoom()
        .scaleExtent([0.2, 3])
        .on('zoom', (event: any) => {
          container.attr('transform', event.transform);
        })
    );

    return () => {
      simulation.stop();
    };
  }, [entities, relations, width, height]);

  return <svg ref={ref} width={width} height={height} />;
}
