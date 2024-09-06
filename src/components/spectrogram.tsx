import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';

const Spectrogram: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dataStream, setDataStream] = useState<number[][]>([]);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 400;
    
    // Set up the SVG canvas
    svg
      .attr('width', width)
      .attr('height', height)
      .style('border', '1px solid black');

    // Scales and axes
    const xScale = d3.scaleLinear().range([0, width]);
    const yScale = d3.scaleLinear().range([height, 0]);

    // Log scale for color to better represent signal power in RF spectrograms
    const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([-40, 0]); // dB scale example

    // Render function to update the spectrogram with new data
    const render = (data: number[][]) => {
      const maxFrequency = 100; // Adjust this to match realistic RF frequencies
      const maxTime = data.length;

      xScale.domain([0, maxTime]);
      yScale.domain([0, maxFrequency]);

      const rectWidth = width / maxTime;
      const rectHeight = height / maxFrequency;

      svg.selectAll('rect').remove();

      // Update the spectrogram with new data
      svg
        .selectAll('rect')
        .data(data.flatMap((d, i) => d.map((value, j) => ({ value, x: i, y: j }))))
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.x))
        .attr('y', d => yScale(d.y))
        .attr('width', rectWidth)
        .attr('height', rectHeight)
        .attr('fill', d => colorScale(Math.max(-40, 20 * Math.log10(d.value)))); // Converting to dB scale
    };

    render(dataStream);

  }, [dataStream]);

  // Function to simulate RF data stream
  const startDataStream = () => {
    if (intervalId) return; // Prevent multiple intervals

    const id = setInterval(() => {
      setDataStream(prev => {
        // Generate realistic RF-like signals with sine waves and noise
        const frequencyCount = 100;
        const newData = Array.from({ length: frequencyCount }, (_, freqIdx) => {
          const baseSignal = Math.sin(2 * Math.PI * (freqIdx / frequencyCount));
          const noise = Math.random() * 0.3; // Simulated noise
          return baseSignal + noise;
        });
        
        const updatedData = [...prev, newData];
        if (updatedData.length > 300) updatedData.shift(); // Limit the data stream length
        return updatedData;
      });
    }, 1);

    setIntervalId(id);
  };

  // Function to stop the data stream
  const stopDataStream = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  return (
    <div>
      <button className="button" onClick={startDataStream}>Start</button>
      <button className="button" onClick={stopDataStream}>Stop</button>
      <svg ref={svgRef}></svg>
    </div>
  );
}

export default Spectrogram;
