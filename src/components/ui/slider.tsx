"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

type SliderProps = Omit<
  React.ComponentProps<typeof SliderPrimitive.Root>,
  "value" | "onValueChange" | "defaultValue"
> & {
  value: number;
  onValueChange: (value: number) => void;
  /** Color del tramo lleno (por ejemplo, el de la familia de la emoción). */
  color?: string;
  label: string;
  valueText?: (value: number) => string;
};

/** Slider grande y táctil, de un solo valor. */
export function Slider({
  value,
  onValueChange,
  color,
  label,
  valueText,
  className,
  min = 0,
  max = 100,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      value={[value]}
      min={min}
      max={max}
      onValueChange={(v) => onValueChange(v[0])}
      className={cn("relative flex h-10 w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="bg-muted relative h-3 w-full grow overflow-hidden rounded-full">
        <SliderPrimitive.Range
          className="bg-primary absolute h-full rounded-full"
          style={color ? { background: color } : undefined}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={label}
        aria-valuetext={valueText?.(value)}
        className="border-card bg-primary focus-visible:ring-ring/40 block size-8 rounded-full border-4 shadow-md ring-1 ring-black/10 transition-transform focus-visible:scale-110 focus-visible:ring-4 focus-visible:outline-none active:scale-110"
        style={color ? { background: color } : undefined}
      />
    </SliderPrimitive.Root>
  );
}
