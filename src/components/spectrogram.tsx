import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import { getShapeStream, useShape } from '@electric-sql/react';
import { v4 as uuidv4 } from 'uuid';
import { matchStream } from '../match-stream'; // Ensure this is correctly imported
import './spectrogram.css';

// Define the shape of the data items
interface Item {
  id: string;
  values: number[];
}

const baseUrl = import.meta.env.ELECTRIC_URL ?? `http://localhost:3000`;
const baseApiUrl = `http://localhost:3001`;

const itemShape = () => ({
  url: new URL(`/v1/shape/items`, baseUrl).href,
});

async function createItem(newId: string): Promise<Item> {
  const itemsStream = getShapeStream<Item>(itemShape());

  // Match the insert operation
  const findUpdatePromise = matchStream({
    stream: itemsStream,
    operations: [`insert`],
    matchFn: ({ message }) => message.value.id === newId,
  });

  // Insert the new item into the database
  const fetchPromise = fetch(`${baseApiUrl}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: newId, values: Array.from({ length: 100 }, () => Math.random()) }),
  });

  await fetchPromise;

  // Wait for the insert confirmation from the stream
  const changeMessage = await findUpdatePromise;
  return changeMessage.value;
}

async function clearItems(numItems: number): Promise<void> {
  const itemsStream = getShapeStream(itemShape());

  // Match the delete operation if items exist
  const findUpdatePromise = numItems > 0
    ? matchStream({
        stream: itemsStream,
        operations: [`delete`],
        matchFn: () => true, // Match any delete
      })
    : Promise.resolve();

  // Send the delete request to the database
  const fetchPromise = fetch(`${baseApiUrl}/items`, { method: 'DELETE' });

  await fetchPromise;

  // Wait for the delete confirmation from the stream
  await findUpdatePromise;
}

const Spectrogram: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const queryClient = useQueryClient();
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Fetch items using useShape from the shape stream
  const { data: items } = useShape<Item>(itemShape());
  const submissions: Item[] = useMutationState({
    filters: { status: 'pending' },
    select: (mutation) => mutation.state.context as Item | undefined,
  }).filter((item) => item !== undefined);

  // Merge data from shape & optimistic data from fetchers. This removes
  // possible duplicates as there's a potential race condition where
  // useShape updates from the stream slightly before the action has finished.
  const itemsMap = new Map<string, Item>();
  items?.concat(submissions).forEach((item) => {
    itemsMap.set(item.id, { ...itemsMap.get(item.id), ...item });
  });

  // Mutation to add new data items
  const { mutateAsync: addItemMut } = useMutation<Item, Error, string>({
    mutationFn: (newId: string) => createItem(newId),
    onMutate: (id) => {
      const optimisticItem: Item = { id, values: Array.from({ length: 100 }, () => Math.random()) };
      queryClient.setQueryData<Item[]>(['items'], (oldItems = []) => [...oldItems, optimisticItem]);
      return optimisticItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['items']);
    },
  });

  // Mutation to clear all items
  const { mutateAsync: clearItemsMut, isPending: isClearing } = useMutation<void, Error, number>({
    mutationFn: (numItems: number) => clearItems(numItems),
    onMutate: () => {
      queryClient.setQueryData(['items'], []);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['items']);
    },
  });

  // Render the spectrogram when the items change
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

    // Color scale for the spectrogram
    const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([0, 1]);

    const render = (data: Item[]) => {
      const maxFrequency = 100;
      const maxTime = data.length;

      xScale.domain([0, maxTime]);
      yScale.domain([0, maxFrequency]);

      const rectWidth = width / maxTime;
      const rectHeight = height / maxFrequency;

      svg.selectAll('rect').remove();

      // Update the spectrogram with new data
      svg
        .selectAll('rect')
        .data(
          data.flatMap((item, i) =>
            item.values.map((value, j) => ({ value, x: i, y: j }))
          )
        )
        .enter()
        .append('rect')
        .attr('x', (d) => xScale(d.x))
        .attr('y', (d) => yScale(d.y))
        .attr('width', rectWidth)
        .attr('height', rectHeight)
        .attr('fill', (d) => colorScale(d.value));
    };

    render([...itemsMap.values()]);
  }, [itemsMap]);

  // Function to start the data stream simulation
  const startDataStream = () => {
    if (intervalId) return; // Prevent multiple intervals

    const id = setInterval(() => {
      const newId = uuidv4();
      addItemMut(newId);
    }, 1000); // Adjust interval as needed

    setIntervalId(id);
  };

  // Function to stop the data stream simulation
  const stopDataStream = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  // Function to clear all items
  const clearItems = async () => {
    await clearItemsMut(itemsMap.size);
  };

  return (
    <div>
      <button className="button" onClick={startDataStream}>
        Start
      </button>
      <button className="button" onClick={stopDataStream}>
        Stop
      </button>
      <button className="button" onClick={clearItems}>
        Clear
      </button>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default Spectrogram;
