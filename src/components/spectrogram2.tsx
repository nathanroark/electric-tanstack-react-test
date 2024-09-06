// Spectrogram.tsx
import React, { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import {
  useMutation,
  useQueryClient,
  useMutationState,
} from "@tanstack/react-query"
import { getShapeStream, useShape } from "@electric-sql/react"
import { v4 as uuidv4 } from "uuid"
import "./spectrogram.css"
import { matchStream } from "./match-stream"

type Item = { id: string; values: number[] }

const baseUrl = import.meta.env.ELECTRIC_URL ?? `http://localhost:3000`
const baseApiUrl = `http://localhost:3001`

const itemShape = () => ({
  url: new URL(`/v1/shape/items`, baseUrl).href,
})

async function createItem(newId: string): Promise<Item> {
  const itemsStream = getShapeStream<Item>(itemShape())

  const findUpdatePromise = matchStream({
    stream: itemsStream,
    operations: [`insert`],
    matchFn: ({ message }) => message.value.id === newId,
  })

  const fetchPromise = fetch(`${baseApiUrl}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: newId,
      values: Array.from({ length: 100 }, () => Math.random()),
    }),
  })

  await fetchPromise

  const changeMessage = await findUpdatePromise
  return changeMessage.value
}

async function clearItems(): Promise<void> {
  const itemsStream = getShapeStream(itemShape())

  const findUpdatePromise = matchStream({
    stream: itemsStream,
    operations: [`delete`],
    matchFn: () => true,
  })

  const fetchPromise = fetch(`${baseApiUrl}/items`, { method: "DELETE" })

  await fetchPromise

  await findUpdatePromise
}

const Spectrogram: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const queryClient = useQueryClient()
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  const { data: items } = useShape<Item>(itemShape())
  const submissions: Item[] = useMutationState({
    filters: { status: "pending" },
    select: (mutation) => mutation.state.context as Item | undefined,
  }).filter((item) => item !== undefined)

  const itemsMap = new Map<string, Item>()
  items?.concat(submissions).forEach((item) => {
    itemsMap.set(item.id, { ...itemsMap.get(item.id), ...item })
  })

  // Correctly typed useMutation for adding an item
  const addItemMut = useMutation<Item, Error, string>({
    mutationFn: (newId: string) => createItem(newId),
    onMutate: async (id) => {
      const optimisticItem: Item = {
        id,
        values: Array.from({ length: 100 }, () => Math.random()),
      }
      queryClient.setQueryData<Item[]>(["items"], (oldItems = []) => [
        ...oldItems,
        optimisticItem,
      ])
      return optimisticItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["items"])
    },
    onError: (error, newItem, rollback) => {
      console.error("Error adding item:", error)
    },
  })

  // Correctly typed useMutation for clearing items
  const clearItemsMut = useMutation<void, Error, void>({
    mutationFn: () => clearItems(),
    onSuccess: () => {
      queryClient.invalidateQueries(["items"])
    },
    onError: (error) => {
      console.error("Error clearing items:", error)
    },
  })

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    const width = 800
    const height = 400

    svg
      .attr("width", width)
      .attr("height", height)
      .style("border", "1px solid black")

    const xScale = d3.scaleLinear().range([0, width])
    const yScale = d3.scaleLinear().range([height, 0])
    const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([0, 1])

    const render = (data: Item[]) => {
      const maxFrequency = 100
      const maxTime = data.length

      xScale.domain([0, maxTime])
      yScale.domain([0, maxFrequency])

      const rectWidth = width / maxTime
      const rectHeight = height / maxFrequency

      svg.selectAll("rect").remove()

      svg
        .selectAll("rect")
        .data(
          data.flatMap((item, i) =>
            item.values.map((value, j) => ({ value, x: i, y: j }))
          )
        )
        .enter()
        .append("rect")
        .attr("x", (d) => xScale(d.x))
        .attr("y", (d) => yScale(d.y))
        .attr("width", rectWidth)
        .attr("height", rectHeight)
        .attr("fill", (d) => colorScale(d.value))
    }

    render([...itemsMap.values()])
  }, [itemsMap])

  const startDataStream = () => {
    if (intervalId) return

    const id = setInterval(() => {
      const newId = uuidv4()
      addItemMut.mutate(newId)
    }, 1000)

    setIntervalId(id)
  }

  const stopDataStream = () => {
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
    }
  }

  return (
    <div>
      <button className="button" onClick={startDataStream}>
        Start
      </button>
      <button className="button" onClick={stopDataStream}>
        Stop
      </button>
      <button className="button" onClick={() => clearItemsMut.mutate()}>
        Clear
      </button>
      <svg ref={svgRef}></svg>
    </div>
  )
}

export default Spectrogram
