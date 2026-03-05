declare module "react-grid-layout" {
  import type { ComponentType } from "react";

  export type Layout = {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
  };

  const GridLayout: ComponentType<Record<string, unknown>>;
  export function WidthProvider(
    component: ComponentType<Record<string, unknown>>
  ): ComponentType<Record<string, unknown>>;

  export default GridLayout;
}
