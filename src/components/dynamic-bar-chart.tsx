import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import './spectrogram.css'; // Basic CSS styling for SVG

type Item = { id: string; value: number };

const baseUrl = import.meta.env.ELECTRIC_URL ?? `http://localhost:3000`
const baseApiUrl = `http://localhost:3001`;

// Fetch all items from the server
async function fetchItems(): Promise<Item[]> {
  const response = await fetch(`${baseApiUrl}/items`);
  if (!response.ok) throw new Error('Failed to fetch items');
  return response.json();
}

// Function to add an item to the server
async function addItem(newItem: Item) {
  const response = await fetch(`${baseApiUrl}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newItem),
  });
  if (!response.ok) throw new Error('Failed to add item');
  return response.json();
}

// Function to clear all items from the server
async function clearItems() {
  const response = await fetch(`${baseApiUrl}/items`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to clear items');
  return response.json();
}

const DynamicBarChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const queryClient = useQueryClient();
  const { data: items = [], refetch } = useQuery(['items'], fetchItems);

  // Mutation to add a new data point
  const { mutateAsync: addItemMutate } = useMutation(addItem, {
    onSuccess: () => {
      queryClient.invalidateQueries(['items']);
    },
  });

  // Mutation to clear all items
  const { mutateAsync: clearItemsMutate } = useMutation(clearItems, {
    onSuccess: () => {
      queryClient.invalidateQueries(['items']);
    },
  });

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 400;

    // Clear previous renders
    svg.selectAll('*').remove();

    // Set up the SVG canvas
    svg
      .attr('width', width)
      .attr('height', height)
      .style('border', '1px solid black');

    // Define scales
    const xScale = d3.scaleBand()
      .domain(items.map((_, index) => index.toString())) // Create a band for each data point
      .range([0, width])
      .padding(0.1); // Add some padding between bars

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(items, d => d.value)!]) // Scale from 0 to the max value in the data
      .range([height, 0]); // Inverted because SVG's y-axis starts at the top

    // Create bars
    svg.selectAll('rect')
      .data(items)
      .enter()
      .append('rect')
      .attr('x', (_, index) => xScale(index.toString())!) // Position each bar
      .attr('y', d => yScale(d.value)) // Set the height of each bar
      .attr('width', xScale.bandwidth()) // Set the width based on the scale
      .attr('height', d => height - yScale(d.value)) // Set the height of the bar
      .attr('fill', 'steelblue'); // Fill color for the bars

    // Add x-axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`) // Move the axis to the bottom of the SVG
      .call(d3.axisBottom(xScale).tickFormat(index => `Item ${index}`));

    // Add y-axis
    svg.append('g')
      .call(d3.axisLeft(yScale));
  }, [items]); // Redraw the chart whenever items change

  // Function to add a new random data point
  const addDataPoint = async () => {
    const newItem = { id: uuidv4(), value: Math.floor(Math.random() * 400) };
    await addItemMutate(newItem);
  };

  // Function to clear all items
  const clearAllItems = async () => {
    await clearItemsMutate();
  };

  return (
    <div>
      <button className="button" onClick={addDataPoint}>
        Add Data Point
      </button>
      <button className="button" onClick={clearAllItems}>
        Clear All
      </button>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default DynamicBarChart;
