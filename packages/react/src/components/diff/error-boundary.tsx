/* oxlint-disable react/no-class-component -- an error boundary can only be a class component. */

import { Component } from "react";
import type { ReactNode } from "react";

interface BoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  resetKey: string;
}

interface BoundaryState {
  failed: boolean;
  key: string;
}

/**
 * A render failure shows the
 * fallback until `resetKey` changes.
 */
export class DiffErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { failed: false, key: props.resetKey };
  }

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: BoundaryProps,
    state: BoundaryState
  ): Partial<BoundaryState> | null {
    return props.resetKey === state.key
      ? null
      : { failed: false, key: props.resetKey };
  }

  // oxlint-disable-next-line typescript/promise-function-async -- render returns ReactNode, whose type includes promises; React renders it synchronously here.
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
