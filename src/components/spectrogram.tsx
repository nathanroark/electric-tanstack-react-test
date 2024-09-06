import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './spectrogram.css'; // Basic CSS styling for SVG

const DynamicBarChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [data, setData] = useState<number[]>([30, 86, 168, 281, 303, 365]);

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
      .domain(data.map((_, index) => index.toString())) // Create a band for each data point
      .range([0, width])
      .padding(0.1); // Add some padding between bars

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data)!]) // Scale from 0 to the max value in the data
      .range([height, 0]); // Inverted because SVG's y-axis starts at the top

    // Create bars
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (_, index) => xScale(index.toString())!) // Position each bar
      .attr('y', y => yScale(y)) // Set the height of each bar
      .attr('width', xScale.bandwidth()) // Set the width based on the scale
      .attr('height', y => height - yScale(y)) // Set the height of the bar
      .attr('fill', 'steelblue'); // Fill color for the bars

    // Add x-axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`) // Move the axis to the bottom of the SVG
      .call(d3.axisBottom(xScale).tickFormat(index => `Item ${index}`));

    // Add y-axis
    svg.append('g')
      .call(d3.axisLeft(yScale));
  }, [data]); // Redraw the chart whenever data changes

  // Function to add a new random data point
  const addDataPoint = () => {
    const newPoint = Math.floor(Math.random() * 400); // Random number for demonstration
    setData(prevData => [...prevData, newPoint]);
  };

  return (
    <div>
      <button className="button" onClick={addDataPoint}>
        Add Data Point
      </button>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default DynamicBarChart;
